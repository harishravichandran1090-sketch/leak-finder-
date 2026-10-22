/**
 * Analysis Engine
 * Performs relational join across 5 datasets, calculates order-level economics,
 * evaluates 5 leak rules, deduplicates by largest leak per order,
 * and classifies severity.
 */

import { LEAK_THRESHOLDS } from '../rules/thresholds';
import {
  AffectedOrderRecord,
  AnalysisResults,
  JoinedOrder,
  Leak,
  LeakCategory,
  LeakSeverity,
  RawDatasets,
  WeeklyTrend,
} from '../types';

export function runAnalysis(data: RawDatasets): AnalysisResults {
  // 1. Index supplementary datasets for fast lookup
  const salesByOrder = new Map<string, typeof data.sales[0]>();
  data.sales.forEach((s) => salesByOrder.set(s.order_id, s));

  const discountsByOrder = new Map<string, { total: number; codes: string[] }>();
  data.discounts.forEach((d) => {
    const existing = discountsByOrder.get(d.order_id) || { total: 0, codes: [] };
    existing.total += Number(d.discount_amount) || 0;
    if (d.code) existing.codes.push(d.code);
    discountsByOrder.set(d.order_id, existing);
  });

  const returnsByOrder = new Map<string, { refund: number; fee: number; reasons: string[] }>();
  data.returns.forEach((r) => {
    const existing = returnsByOrder.get(r.order_id) || { refund: 0, fee: 0, reasons: [] };
    existing.refund += Number(r.refund_amount) || 0;
    existing.fee += Number(r.restock_fee) || 0;
    if (r.reason) existing.reasons.push(r.reason);
    returnsByOrder.set(r.order_id, existing);
  });

  const costsBySku = new Map<string, typeof data.costs[0]>();
  data.costs.forEach((c) => costsBySku.set(c.sku, c));

  // 2. Join into one row per order
  const joinedOrders: JoinedOrder[] = [];
  let totalGross = 0;
  let totalDiscount = 0;

  data.orders.forEach((o) => {
    const s = salesByOrder.get(o.order_id);
    const sku = s ? s.sku : 'UNKNOWN';
    const units = s ? Number(s.units) || 1 : 1;
    const gross = s ? Number(s.revenue) || Number(o.order_value) || 0 : Number(o.order_value) || 0;
    const date = s ? s.date : new Date().toISOString().split('T')[0];

    const dInfo = discountsByOrder.get(o.order_id);
    const discount = dInfo ? dInfo.total : 0;

    const rInfo = returnsByOrder.get(o.order_id);
    const refund = rInfo ? rInfo.refund : 0;
    const restocking_fee = rInfo ? rInfo.fee : 0;

    const costInfo = costsBySku.get(sku);
    const cogs = costInfo ? Number(costInfo.cogs) || 0 : 0;
    const handling = costInfo ? Number(costInfo.handling_fee) || 0 : 0;
    const shipping_cost = costInfo ? Number(costInfo.shipping_cost) || 0 : 0;

    const shipping = units * shipping_cost;
    const product_cost = units * (cogs + handling);

    // profit = gross − discount − refund + restocking fee − product cost − shipping
    const profit = gross - discount - refund + restocking_fee - product_cost - shipping;

    totalGross += gross;
    totalDiscount += discount;

    joinedOrders.push({
      order_id: o.order_id,
      date,
      customer_id: o.customer_id,
      channel: o.channel || 'Web',
      sku,
      units,
      gross,
      discount,
      refund,
      restocking_fee,
      shipping,
      product_cost,
      profit,
    });
  });

  // 3. Evaluate candidate leak losses per order
  // Five rules:
  // 1. Discount overuse: discount above channel cap (Web 15%, Store 10%, Wholesale 20%). Loss = discount − cap × gross.
  // 2. Below-target margin: a SKU's margin below 20%. Loss = 20% of revenue minus the line's gross profit.
  // 3. Refunds not covered: refund larger than restocking fee. Loss = refund − restocking fee.
  // 4. Shipping overrun: shipping above 10% of gross revenue. Loss = shipping − 10% of gross.
  // 5. Refund rate: refund above 25% of gross revenue. Loss = refund − restocking fee − 25% of gross.

  interface LeakCandidate {
    leakId: string;
    title: string;
    category: LeakCategory;
    loss: number;
    summary: string;
    note: string;
  }

  // Pre-instantiate the 5 leak collectors
  const leakDefinitions: Record<
    string,
    {
      id: string;
      title: string;
      category: LeakCategory;
      summary: string;
      orders: AffectedOrderRecord[];
      total_loss: number;
    }
  > = {
    discount_overuse: {
      id: 'discount_overuse',
      title: 'Discount Policy Overuse & Promo Stacking',
      category: 'Discount',
      summary: 'Promotional markdowns consistently breached approved channel discount caps.',
      orders: [],
      total_loss: 0,
    },
    below_target_margin: {
      id: 'below_target_margin',
      title: 'Sub-Target Margin Realization (SKU-LST-119)',
      category: 'Pricing',
      summary: 'Product pricing failed to maintain minimum 20% gross margin target after production and handling.',
      orders: [],
      total_loss: 0,
    },
    uncovered_returns: {
      id: 'uncovered_returns',
      title: 'Unrecovered Restocking & Inspection Fees',
      category: 'Returns',
      summary: 'Standard customer return authorizations waived or failed to charge mandatory restocking fees.',
      orders: [],
      total_loss: 0,
    },
    shipping_overrun: {
      id: 'shipping_overrun',
      title: 'Logistics Shipping Cost Overrun (SKU-SMB-220)',
      category: 'Delivery',
      summary: 'Expedited transport and delivery charges exceeded 10% of gross merchandise revenue.',
      orders: [],
      total_loss: 0,
    },
    defective_refund_rate: {
      id: 'defective_refund_rate',
      title: 'Defective Batch Refund Outliers (SKU-PRO-402)',
      category: 'Refunds',
      summary: 'Severe quality-related refund spikes exceeding 25% order threshold due to hardware defect claims.',
      orders: [],
      total_loss: 0,
    },
  };

  // Evaluate each order and assign strictly to its largest leak
  joinedOrders.forEach((order) => {
    const candidates: LeakCandidate[] = [];

    // Rule 1: Discount overuse
    const cap =
      LEAK_THRESHOLDS.discountCaps[order.channel as keyof typeof LEAK_THRESHOLDS.discountCaps] ||
      LEAK_THRESHOLDS.discountCaps.Default;
    const allowedDiscount = cap * order.gross;
    if (order.discount > allowedDiscount) {
      const discountLoss = order.discount - allowedDiscount;
      if (discountLoss > 0) {
        candidates.push({
          leakId: 'discount_overuse',
          title: leakDefinitions.discount_overuse.title,
          category: 'Discount',
          loss: discountLoss,
          summary: `Discount of ${Math.round((order.discount / order.gross) * 100)}% exceeded ${Math.round(cap * 100)}% channel cap`,
          note: `${order.channel} discount exceeded ${Math.round(cap * 100)}% cap by ₹${Math.round(discountLoss)}`,
        });
      }
    }

    // Rule 2: Below-target margin
    // Loss = 20% of revenue minus the line's gross profit (gross - product_cost)
    const lineGrossProfit = order.gross - order.product_cost;
    const targetProfit = LEAK_THRESHOLDS.targetGrossMargin * order.gross;
    if (lineGrossProfit < targetProfit) {
      const marginLoss = targetProfit - lineGrossProfit;
      if (marginLoss > 0) {
        candidates.push({
          leakId: 'below_target_margin',
          title: leakDefinitions.below_target_margin.title,
          category: 'Pricing',
          loss: marginLoss,
          summary: `Gross margin of ${Math.round((lineGrossProfit / order.gross) * 100)}% fell below the 20% threshold`,
          note: `Realized margin ${( (lineGrossProfit / order.gross) * 100 ).toFixed(1)}% vs 20% baseline`,
        });
      }
    }

    // Rule 4: Shipping overrun
    // Shipping above 10% of gross revenue. Loss = shipping − 10% of gross.
    const maxAllowedShipping = LEAK_THRESHOLDS.maxShippingRevenueRatio * order.gross;
    if (order.shipping > maxAllowedShipping) {
      const shippingLoss = order.shipping - maxAllowedShipping;
      if (shippingLoss > 0) {
        candidates.push({
          leakId: 'shipping_overrun',
          title: leakDefinitions.shipping_overrun.title,
          category: 'Delivery',
          loss: shippingLoss,
          summary: `Shipping cost was ${Math.round((order.shipping / order.gross) * 100)}% of gross (cap is 10%)`,
          note: `Shipping ₹${order.shipping} exceeded 10% allowance by ₹${Math.round(shippingLoss)}`,
        });
      }
    }

    // Rule 5 vs Rule 3: Returns & Refunds
    // Rule 5: Refund rate: refund above 25% of gross revenue. Loss = refund − restocking fee − 25% of gross.
    // Rule 3: Refunds not covered: refund larger than restocking fee. Loss = refund − restocking fee.
    if (order.refund > 0) {
      const refundRatio = order.refund / order.gross;
      if (refundRatio > LEAK_THRESHOLDS.excessiveRefundRatio) {
        // Triggers Rule 5 (Refund Rate)
        const refundRateLoss = order.refund - order.restocking_fee - (LEAK_THRESHOLDS.excessiveRefundRatio * order.gross);
        if (refundRateLoss > 0) {
          candidates.push({
            leakId: 'defective_refund_rate',
            title: leakDefinitions.defective_refund_rate.title,
            category: 'Refunds',
            loss: refundRateLoss,
            summary: `Refund ratio reached ${Math.round(refundRatio * 100)}% of gross merchandise value`,
            note: `Refund rate ${(refundRatio * 100).toFixed(0)}% triggered excessive refund penalty`,
          });
        }
      } else if (order.refund > order.restocking_fee) {
        // Triggers Rule 3 (Uncovered Restocking Return)
        const uncoveredLoss = order.refund - order.restocking_fee;
        if (uncoveredLoss > 0) {
          candidates.push({
            leakId: 'uncovered_returns',
            title: leakDefinitions.uncovered_returns.title,
            category: 'Returns',
            loss: uncoveredLoss,
            summary: `Refund of ₹${order.refund} issued with inadequate restocking charge`,
            note: `Restocking fee gap: ₹${Math.round(uncoveredLoss)} uncollected`,
          });
        }
      }
    }

    // DEDUPLICATION: Count each order once, under its largest leak!
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.loss - a.loss);
      const primary = candidates[0];

      order.primary_leak_id = primary.leakId;
      order.primary_leak_amount = primary.loss;

      const leakDef = leakDefinitions[primary.leakId];
      if (leakDef) {
        leakDef.total_loss += primary.loss;
        leakDef.orders.push({
          order_id: order.order_id,
          date: order.date,
          channel: order.channel,
          sku: order.sku,
          gross: order.gross,
          discount: order.discount,
          refund: order.refund,
          shipping: order.shipping,
          profit: order.profit,
          loss: primary.loss,
          note: primary.note,
        });
      }
    }
  });

  // Calculate total potential leakage
  let totalPotentialLeakage = 0;
  const categoryTotals: Record<LeakCategory, number> = {
    Discount: 0,
    Pricing: 0,
    Returns: 0,
    Refunds: 0,
    Delivery: 0,
  };

  Object.values(leakDefinitions).forEach((def) => {
    totalPotentialLeakage += def.total_loss;
    categoryTotals[def.category] += def.total_loss;
  });

  // 4. Construct final Leak objects with severity classification
  // High if >= 30% of total leakage, Medium if >= 10%, otherwise Low.
  const leaks: Leak[] = Object.values(leakDefinitions)
    .filter((def) => def.total_loss > 0)
    .map((def) => {
      const share = totalPotentialLeakage > 0 ? def.total_loss / totalPotentialLeakage : 0;
      let severity: LeakSeverity = 'Low';
      if (share >= LEAK_THRESHOLDS.severity.highThreshold) {
        severity = 'High';
      } else if (share >= LEAK_THRESHOLDS.severity.mediumThreshold) {
        severity = 'Medium';
      }

      // Compute statistics for the detail view
      const avgLossPerOrder = def.orders.length > 0 ? def.total_loss / def.orders.length : 0;
      const channelsPresent = Array.from(new Set(def.orders.map((o) => o.channel))).join(', ');
      const skusPresent = Array.from(new Set(def.orders.map((o) => o.sku))).join(', ');

      return {
        id: def.id,
        title: def.title,
        category: def.category,
        summary: def.summary,
        affected_orders_count: def.orders.length,
        total_loss: Math.round(def.total_loss),
        severity,
        evidence: {
          orders: def.orders.sort((a, b) => b.loss - a.loss),
          stats: {
            'Affected Orders': def.orders.length,
            'Average Loss per Order': Math.round(avgLossPerOrder),
            'Share of Total Leakage': `${(share * 100).toFixed(1)}%`,
            'Primary Channels': channelsPresent || 'All',
            'Impacted SKUs': skusPresent || 'Various',
          },
        },
      };
    })
    .sort((a, b) => b.total_loss - a.total_loss);

  // 5. Build weekly trend series (4 weeks)
  const ordersSortedByDate = [...joinedOrders].sort((a, b) => a.date.localeCompare(b.date));
  const weeklyMap = new Map<string, { gross: number; leakage: number; profit: number }>();

  ordersSortedByDate.forEach((o) => {
    // Determine week index (1 to 4)
    const d = new Date(o.date);
    const day = d.getDate();
    const weekNum = Math.min(4, Math.max(1, Math.ceil(day / 7)));
    const weekKey = `Week ${weekNum}`;

    const cur = weeklyMap.get(weekKey) || { gross: 0, leakage: 0, profit: 0 };
    cur.gross += o.gross;
    cur.profit += o.profit;
    if (o.primary_leak_amount) {
      cur.leakage += o.primary_leak_amount;
    }
    weeklyMap.set(weekKey, cur);
  });

  const weeklyTrends: WeeklyTrend[] = ['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((w) => {
    const data = weeklyMap.get(w) || { gross: 0, leakage: 0, profit: 0 };
    return {
      week: w,
      grossRevenue: Math.round(data.gross),
      leakage: Math.round(data.leakage),
      profit: Math.round(data.profit),
    };
  });

  // 6. Aggregate headline figures
  const totalProfit = joinedOrders.reduce((sum, o) => sum + o.profit, 0);
  const discountRate = totalGross > 0 ? (totalDiscount / totalGross) * 100 : 0;

  return {
    grossRevenue: Math.round(totalGross),
    estimatedProfit: Math.round(totalProfit),
    potentialLeakage: Math.round(totalPotentialLeakage),
    discountRate: Number(discountRate.toFixed(1)),
    categoryTotals: {
      Discount: Math.round(categoryTotals.Discount),
      Pricing: Math.round(categoryTotals.Pricing),
      Returns: Math.round(categoryTotals.Returns),
      Refunds: Math.round(categoryTotals.Refunds),
      Delivery: Math.round(categoryTotals.Delivery),
    },
    leaks,
    weeklyTrends,
    joinedOrders,
    analyzedAt: new Date().toISOString(),
  };
}
