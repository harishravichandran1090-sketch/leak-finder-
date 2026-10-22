/**
 * Deterministic Demo Data Generator
 * Generates 120 orders across four weeks using a seeded PRNG.
 * Planted patterns:
 * 1. Web orders discounted 22-30% on ~1/3 of orders
 * 2. SKU-LST-119 with margin below 20%
 * 3. SKU-SMB-220 with shipping around 39% of price
 * 4. SKU-PRO-402 with defective-batch refunds on ~1/3 of orders
 */

import { CostRow, DiscountRow, OrderRow, RawDatasets, ReturnRow, SalesRow } from '../types';

// Simple fast seeded PRNG (Mulberry32)
function createSeededRandom(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateDemoDatasets(): RawDatasets {
  const rand = createSeededRandom(42949);

  // Standard Catalog Costs
  const costs: CostRow[] = [
    { sku: 'SKU-LST-119', cogs: 3600, shipping_cost: 250, handling_fee: 150 }, // Low margin: cost 3750 on 4200 price (margin ~10.7%)
    { sku: 'SKU-SMB-220', cogs: 850, shipping_cost: 700, handling_fee: 60 },   // High shipping: 700 shipping on 1800 price (38.8%)
    { sku: 'SKU-PRO-402', cogs: 4800, shipping_cost: 320, handling_fee: 180 }, // Defective batch returns
    { sku: 'SKU-STD-001', cogs: 1200, shipping_cost: 140, handling_fee: 50 },  // Normal standard SKU
    { sku: 'SKU-ACC-050', cogs: 380, shipping_cost: 80, handling_fee: 30 },    // Accessories
    { sku: 'SKU-ENT-880', cogs: 11000, shipping_cost: 550, handling_fee: 300 }, // Enterprise gear
  ];

  const skuPrices: Record<string, number> = {
    'SKU-LST-119': 4200,
    'SKU-SMB-220': 1800,
    'SKU-PRO-402': 9500,
    'SKU-STD-001': 2800,
    'SKU-ACC-050': 950,
    'SKU-ENT-880': 24000,
  };

  const channels: Array<'Web' | 'Store' | 'Wholesale'> = ['Web', 'Store', 'Wholesale'];

  const sales: SalesRow[] = [];
  const orders: OrderRow[] = [];
  const discounts: DiscountRow[] = [];
  const returns: ReturnRow[] = [];

  const startDate = new Date('2026-09-21T09:00:00Z');
  let discountCounter = 1;
  let returnCounter = 1;

  for (let i = 1; i <= 120; i++) {
    const orderId = `ORD-${1000 + i}`;
    const custId = `CUST-${100 + (i % 45)}`;

    // Spread across 4 weeks (28 days)
    const dayOffset = Math.floor((i - 1) / 4.3);
    const orderDate = new Date(startDate.getTime() + dayOffset * 86400000);
    const dateStr = orderDate.toISOString().split('T')[0];

    // Distribute channels: 55% Web, 25% Store, 20% Wholesale
    const channelRoll = rand();
    const channel = channelRoll < 0.55 ? 'Web' : channelRoll < 0.80 ? 'Store' : 'Wholesale';

    // SKU selection: intentional distribution to guarantee planted patterns
    let sku = 'SKU-STD-001';
    if (i % 5 === 1) {
      sku = 'SKU-LST-119'; // Below target margin
    } else if (i % 5 === 2) {
      sku = 'SKU-SMB-220'; // High shipping overrun
    } else if (i % 5 === 3) {
      sku = 'SKU-PRO-402'; // Defective batch refunds
    } else if (i % 5 === 4) {
      sku = 'SKU-ACC-050';
    } else {
      sku = rand() > 0.5 ? 'SKU-STD-001' : 'SKU-ENT-880';
    }

    const units = sku === 'SKU-ACC-050' ? Math.floor(rand() * 3) + 1 : 1;
    const unitPrice = skuPrices[sku];
    const revenue = unitPrice * units;

    sales.push({
      order_id: orderId,
      date: dateStr,
      sku,
      revenue,
      units,
    });

    // Planted pattern 1: Web orders discounted 22-30% on about a third of Web orders
    let discountAmount = 0;
    if (channel === 'Web') {
      const isDiscounted = rand() < 0.38; // ~38% of web orders
      if (isDiscounted) {
        const discountRate = 0.22 + rand() * 0.08; // 22% to 30%
        discountAmount = Math.round(revenue * discountRate);
        const codes = ['FLASH25', 'VIPWEB30', 'SAVE25NOW', 'WELCOME22'];
        const code = codes[Math.floor(rand() * codes.length)];
        discounts.push({
          discount_id: `DSC-${discountCounter++}`,
          order_id: orderId,
          code,
          discount_amount: discountAmount,
        });
      } else if (rand() < 0.2) {
        // Normal minor web discount (5-10%)
        discountAmount = Math.round(revenue * 0.08);
        discounts.push({
          discount_id: `DSC-${discountCounter++}`,
          order_id: orderId,
          code: 'LOYALTY5',
          discount_amount: discountAmount,
        });
      }
    } else if (channel === 'Store' && rand() < 0.15) {
      discountAmount = Math.round(revenue * 0.05);
      discounts.push({
        discount_id: `DSC-${discountCounter++}`,
        order_id: orderId,
        code: 'STOREPROMO',
        discount_amount: discountAmount,
      });
    } else if (channel === 'Wholesale' && rand() < 0.25) {
      discountAmount = Math.round(revenue * 0.15); // under cap
      discounts.push({
        discount_id: `DSC-${discountCounter++}`,
        order_id: orderId,
        code: 'BULK15',
        discount_amount: discountAmount,
      });
    }

    // Planted pattern 4: SKU-PRO-402 with defective-batch refunds on ~1/3 of its orders
    let hasReturn = false;
    let refundAmount = 0;
    let restockFee = 0;

    if (sku === 'SKU-PRO-402' && rand() < 0.35) {
      hasReturn = true;
      refundAmount = revenue; // Full refund
      restockFee = 0; // Uncovered restock fee
      returns.push({
        return_id: `RET-${returnCounter++}`,
        order_id: orderId,
        reason: 'Defective batch (internal calibration fault)',
        refund_amount: refundAmount,
        restock_fee: restockFee,
      });
    } else if (rand() < 0.07) {
      // Occasional regular return
      hasReturn = true;
      refundAmount = Math.round(revenue * 0.85);
      restockFee = Math.round(revenue * 0.15);
      returns.push({
        return_id: `RET-${returnCounter++}`,
        order_id: orderId,
        reason: 'Customer changed mind',
        refund_amount: refundAmount,
        restock_fee: restockFee,
      });
    }

    orders.push({
      order_id: orderId,
      customer_id: custId,
      channel,
      order_value: revenue,
      status: hasReturn ? 'Returned' : 'Delivered',
    });
  }

  return { sales, orders, discounts, returns, costs };
}

/**
 * Convert datasets to CSV strings for download or testing
 */
export function convertDatasetToCSV(data: any[]): string {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((header) => {
        const val = row[header] ?? '';
        const strVal = String(val);
        if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
          return `"${strVal.replace(/"/g, '""')}"`;
        }
        return strVal;
      })
      .join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}
