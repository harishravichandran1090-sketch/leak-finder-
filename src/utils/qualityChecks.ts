/**
 * Data Quality Checks
 * Runs 6 validation invariants across the 5 commerce datasets:
 * 1. unique order IDs
 * 2. every sales order exists in Orders
 * 3. order value matches sales revenue within 1%
 * 4. no order discounted beyond its value
 * 5. every discount and return record links to an order
 * 6. no negative amounts
 */

import { QualityCheckResult, RawDatasets } from '../types';

export function runQualityChecks(data: RawDatasets): QualityCheckResult[] {
  const checks: QualityCheckResult[] = [];

  // 1. Unique order IDs in Orders
  const orderIds = data.orders.map((o) => o.order_id);
  const uniqueOrderIds = new Set(orderIds);
  const duplicateOrders = orderIds.length - uniqueOrderIds.size;
  if (duplicateOrders === 0 && orderIds.length > 0) {
    checks.push({
      id: 'unique_orders',
      name: 'Unique Order IDs',
      status: 'PASS',
      detail: `All ${orderIds.length} orders have unique identifiers with 0 duplicates.`,
    });
  } else {
    checks.push({
      id: 'unique_orders',
      name: 'Unique Order IDs',
      status: 'CHECK',
      detail: `Detected ${duplicateOrders} duplicate order identifier(s) in Orders dataset.`,
    });
  }

  // 2. Every sales order exists in Orders
  const missingOrderRefs = data.sales.filter((s) => !uniqueOrderIds.has(s.order_id));
  if (missingOrderRefs.length === 0 && data.sales.length > 0) {
    checks.push({
      id: 'sales_in_orders',
      name: 'Sales-to-Orders Referential Integrity',
      status: 'PASS',
      detail: `100% of sales transactions (${data.sales.length} rows) link to a valid record in Orders.`,
    });
  } else {
    checks.push({
      id: 'sales_in_orders',
      name: 'Sales-to-Orders Referential Integrity',
      status: 'CHECK',
      detail: `${missingOrderRefs.length} sales line item(s) reference order IDs not found in Orders.`,
    });
  }

  // 3. Order value matches sales revenue within 1%
  const salesRevenueByOrder = new Map<string, number>();
  data.sales.forEach((s) => {
    const current = salesRevenueByOrder.get(s.order_id) || 0;
    salesRevenueByOrder.set(s.order_id, current + (Number(s.revenue) || 0));
  });

  let varianceDiscrepancies = 0;
  data.orders.forEach((o) => {
    const sRev = salesRevenueByOrder.get(o.order_id);
    if (sRev !== undefined && sRev > 0) {
      const orderVal = Number(o.order_value) || 0;
      const diff = Math.abs(orderVal - sRev);
      const ratio = diff / sRev;
      if (ratio > 0.01001) {
        varianceDiscrepancies++;
      }
    }
  });

  if (varianceDiscrepancies === 0 && data.orders.length > 0) {
    checks.push({
      id: 'order_value_match',
      name: 'Order Value vs Sales Revenue Variance',
      status: 'PASS',
      detail: 'Order values match aggregated sales line revenues within the 1.0% tolerance margin.',
    });
  } else {
    checks.push({
      id: 'order_value_match',
      name: 'Order Value vs Sales Revenue Variance',
      status: 'CHECK',
      detail: `${varianceDiscrepancies} order(s) exhibit a revenue discrepancy exceeding 1.0%.`,
    });
  }

  // 4. No order discounted beyond its value
  const discountsByOrder = new Map<string, number>();
  data.discounts.forEach((d) => {
    const current = discountsByOrder.get(d.order_id) || 0;
    discountsByOrder.set(d.order_id, current + (Number(d.discount_amount) || 0));
  });

  let excessiveDiscountCount = 0;
  data.orders.forEach((o) => {
    const dAmt = discountsByOrder.get(o.order_id) || 0;
    const oVal = Number(o.order_value) || 0;
    if (dAmt > oVal + 0.01) {
      excessiveDiscountCount++;
    }
  });

  if (excessiveDiscountCount === 0) {
    checks.push({
      id: 'discount_limit',
      name: 'Discount Value Integrity',
      status: 'PASS',
      detail: 'No order has discount amounts exceeding 100% of gross order value.',
    });
  } else {
    checks.push({
      id: 'discount_limit',
      name: 'Discount Value Integrity',
      status: 'CHECK',
      detail: `${excessiveDiscountCount} order(s) have discounts exceeding total gross order value.`,
    });
  }

  // 5. Every discount and return record links to an order
  const unlinkedDiscounts = data.discounts.filter((d) => !uniqueOrderIds.has(d.order_id));
  const unlinkedReturns = data.returns.filter((r) => !uniqueOrderIds.has(r.order_id));
  const totalUnlinked = unlinkedDiscounts.length + unlinkedReturns.length;

  if (totalUnlinked === 0) {
    checks.push({
      id: 'discounts_returns_linked',
      name: 'Discount & Return Order References',
      status: 'PASS',
      detail: `All discounts (${data.discounts.length}) and return records (${data.returns.length}) resolve to recognized orders.`,
    });
  } else {
    checks.push({
      id: 'discounts_returns_linked',
      name: 'Discount & Return Order References',
      status: 'CHECK',
      detail: `${totalUnlinked} discount or return record(s) lack matching order records.`,
    });
  }

  // 6. No negative amounts
  let negativeCount = 0;
  data.sales.forEach((s) => {
    if (s.revenue < 0 || s.units < 0) negativeCount++;
  });
  data.orders.forEach((o) => {
    if (o.order_value < 0) negativeCount++;
  });
  data.discounts.forEach((d) => {
    if (d.discount_amount < 0) negativeCount++;
  });
  data.returns.forEach((r) => {
    if (r.refund_amount < 0 || r.restock_fee < 0) negativeCount++;
  });
  data.costs.forEach((c) => {
    if (c.cogs < 0 || c.shipping_cost < 0 || c.handling_fee < 0) negativeCount++;
  });

  if (negativeCount === 0) {
    checks.push({
      id: 'non_negative_values',
      name: 'Non-Negative Financials & Quantities',
      status: 'PASS',
      detail: 'Zero negative values found across revenues, discounts, units, costs, and fees.',
    });
  } else {
    checks.push({
      id: 'non_negative_values',
      name: 'Non-Negative Financials & Quantities',
      status: 'CHECK',
      detail: `Found ${negativeCount} instance(s) of negative monetary amounts or unit quantities.`,
    });
  }

  return checks;
}
