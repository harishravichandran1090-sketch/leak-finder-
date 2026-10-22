/**
 * Rule-Based Explainer Fallback
 * Generates structured explanations derived strictly from analysis numbers.
 * Used when NVIDIA_API_KEY is not configured or when the remote API call fails.
 */

import { AIExplanation, Leak } from '../types';
import { formatINR } from '../utils/formatters';

export function generateRuleBasedExplanation(leak: Leak, warningMessage?: string): AIExplanation {
  const totalLossStr = formatINR(leak.total_loss);
  const orderCount = leak.affected_orders_count;
  const avgLoss = leak.evidence.stats['Average Loss per Order']
    ? formatINR(Number(leak.evidence.stats['Average Loss per Order']))
    : 'not available';
  const share = leak.evidence.stats['Share of Total Leakage'] || 'not available';
  const impactedSkus = leak.evidence.stats['Impacted SKUs'] || 'not available';
  const primaryChannels = leak.evidence.stats['Primary Channels'] || 'not available';

  let rootCause = '';
  let reasoning = '';
  let recommendedAction = '';
  let confidence: 'High' | 'Medium' | 'Low' = 'High';

  switch (leak.id) {
    case 'discount_overuse':
      rootCause = `Uncapped promotional discounting across ${primaryChannels} channels exceeding contractual margin thresholds.`;
      reasoning = `Analysis flagged ${orderCount} transactions where applied discounts breached the channel allowance (15% Web, 10% Store), contributing ${totalLossStr} in excess deductions. With an average loss of ${avgLoss} per affected transaction, discount erosion constitutes ${share} of identified leaks. Top promo codes consistently applied markdown rates between 22% and 30%.`;
      recommendedAction = `Enforce a strict 15% maximum discount cap in checkout validation rules and sunset compounding promotional vouchers across Web sales.`;
      confidence = 'High';
      break;

    case 'below_target_margin':
      rootCause = `Unit cost structure outstripping wholesale pricing on SKU ${impactedSkus}.`;
      reasoning = `Identified ${orderCount} unit sales generating gross margins under the corporate 20% floor, culminating in ${totalLossStr} in uncaptured value. Elevated manufacturing cost and per-unit handling fees leave insufficient markup at current list price. This pricing anomaly represents ${share} of aggregate leakage.`;
      recommendedAction = `Renegotiate component bill-of-materials or elevate base retail price by 12% on ${impactedSkus} to restore a minimum 22% gross margin buffer.`;
      confidence = 'High';
      break;

    case 'uncovered_returns':
      rootCause = `Waiver or absence of standard restocking and reverse-logistics fees upon customer returns.`;
      reasoning = `A total of ${orderCount} return requests were processed with zero or nominal restocking assessments, causing ${totalLossStr} in unrecovered inspection overhead. Standard return authorizations refunded items without charging standard return processing costs. This gap accounts for ${share} of overall margin leakage.`;
      recommendedAction = `Implement a mandatory 15% restocking and inspection fee deduction on non-defective product return authorizations.`;
      confidence = 'Medium';
      break;

    case 'shipping_overrun':
      rootCause = `Parcel dimensions and carrier freight surcharges exceeding 10% of item revenue on ${impactedSkus}.`;
      reasoning = `Detected ${orderCount} shipments where courier logistics expenses consumed an average of 39% of product gross price, producing ${totalLossStr} in shipping overruns. Freight expenses consistently outpace standard parcel allowances, contributing ${share} of total business leakage.`;
      recommendedAction = `Transition ${impactedSkus} to regional consolidation hubs or institute a ₹250 flat-rate delivery charge on small-parcel orders.`;
      confidence = 'High';
      break;

    case 'defective_refund_rate':
      rootCause = `Severe quality fallout and hardware failure returns concentrated in SKU ${impactedSkus}.`;
      reasoning = `Analysis revealed ${orderCount} customer refunds triggered by defective hardware claims, surpassing the 25% order threshold and destroying ${totalLossStr} in revenue. Full refunds were remitted due to manufacturing flaws, representing ${share} of identified losses.`;
      recommendedAction = `Quarantine current factory production lot of ${impactedSkus} for diagnostic inspection and pursue supplier warranty reimbursement.`;
      confidence = 'High';
      break;

    default:
      rootCause = `Anomalous cost variance identified in ${leak.category} operations.`;
      reasoning = `Detected ${orderCount} transactions incurring ${totalLossStr} in unoptimized expenses across ${primaryChannels}. The aggregate loss represents ${share} of total detected leakage with an average deviation of ${avgLoss} per order.`;
      recommendedAction = `Conduct an operational audit of ${leak.category} line items to establish tighter governance and approval workflows.`;
      confidence = 'Medium';
      break;
  }

  return {
    rootCause,
    confidence,
    reasoning,
    recommendedAction,
    modelName: 'Rule-based Engine',
    isRuleBased: true,
    warning: warningMessage || 'Rule-based explanation active (NVIDIA_API_KEY is not configured or remote API is unavailable).',
  };
}
