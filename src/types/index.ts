/**
 * Core type definitions for LeakFinder AI
 */

export interface SalesRow {
  order_id: string;
  date: string;
  sku: string;
  revenue: number;
  units: number;
}

export interface OrderRow {
  order_id: string;
  customer_id: string;
  channel: 'Web' | 'Store' | 'Wholesale' | string;
  order_value: number;
  status: string;
}

export interface DiscountRow {
  discount_id: string;
  order_id: string;
  code: string;
  discount_amount: number;
}

export interface ReturnRow {
  return_id: string;
  order_id: string;
  reason: string;
  refund_amount: number;
  restock_fee: number;
}

export interface CostRow {
  sku: string;
  cogs: number;
  shipping_cost: number;
  handling_fee: number;
}

export type DatasetKey = 'sales' | 'orders' | 'discounts' | 'returns' | 'costs';

export interface RawDatasets {
  sales: SalesRow[];
  orders: OrderRow[];
  discounts: DiscountRow[];
  returns: ReturnRow[];
  costs: CostRow[];
}

export interface JoinedOrder {
  order_id: string;
  date: string;
  customer_id: string;
  channel: string;
  sku: string;
  units: number;
  gross: number;
  discount: number;
  refund: number;
  restocking_fee: number;
  shipping: number;
  product_cost: number;
  profit: number;
  primary_leak_id?: string;
  primary_leak_amount?: number;
}

export type LeakCategory = 'Discount' | 'Pricing' | 'Returns' | 'Refunds' | 'Delivery';
export type LeakSeverity = 'High' | 'Medium' | 'Low';

export interface AffectedOrderRecord {
  order_id: string;
  date: string;
  channel: string;
  sku: string;
  gross: number;
  discount: number;
  refund: number;
  shipping: number;
  profit: number;
  loss: number;
  note: string;
}

export interface AIExplanation {
  rootCause: string;
  confidence: 'High' | 'Medium' | 'Low';
  reasoning: string;
  recommendedAction: string;
  modelName: string;
  isRuleBased: boolean;
  warning?: string;
}

export interface Leak {
  id: string;
  title: string;
  category: LeakCategory;
  summary: string;
  affected_orders_count: number;
  total_loss: number;
  severity: LeakSeverity;
  evidence: {
    orders: AffectedOrderRecord[];
    stats: Record<string, string | number>;
  };
  explanation?: AIExplanation;
}

export interface WeeklyTrend {
  week: string; // e.g. "Week 1", "Week 2"
  grossRevenue: number;
  leakage: number;
  profit: number;
}

export interface AnalysisResults {
  grossRevenue: number;
  estimatedProfit: number;
  potentialLeakage: number;
  discountRate: number; // percentage, e.g. 18.4
  categoryTotals: Record<LeakCategory, number>;
  leaks: Leak[];
  weeklyTrends: WeeklyTrend[];
  joinedOrders: JoinedOrder[];
  analyzedAt: string;
}

export interface QualityCheckResult {
  id: string;
  name: string;
  status: 'PASS' | 'CHECK';
  detail: string;
}

export interface ActionItem {
  id: string;
  rank: number;
  leakId: string;
  action: string;
  leakTitle: string;
  category: LeakCategory;
  estimatedRecoverable: number;
  status: 'Open' | 'Done';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
  isRuleBased?: boolean;
  modelName?: string;
}

export interface FileAttachmentStatus {
  file: File;
  name: string;
  size: number;
  detectedDataset: DatasetKey | null;
  rowCount: number;
  status: 'Ready' | 'Missing columns' | 'Not recognised' | 'Parsing';
  missingColumns?: string[];
  error?: string;
  parsedData?: any[];
}
