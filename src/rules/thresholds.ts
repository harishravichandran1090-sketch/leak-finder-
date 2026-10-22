/**
 * LeakFinder AI Thresholds & Detection Rules
 * Central configuration file for all leak detection rules and severity thresholds.
 */

export const LEAK_THRESHOLDS = {
  // 1. Channel Discount Caps
  discountCaps: {
    Web: 0.15,       // 15% maximum approved discount on Web
    Store: 0.10,     // 10% maximum approved discount in physical stores
    Wholesale: 0.20, // 20% maximum approved discount for wholesale accounts
    Default: 0.15,   // Fallback cap if channel is unspecified
  },

  // 2. Below-Target Margin Cap
  targetGrossMargin: 0.20, // 20% target minimum margin on SKU revenue

  // 3. Shipping Overrun Threshold
  maxShippingRevenueRatio: 0.10, // 10% maximum shipping cost relative to order revenue

  // 4. Excessive Refund Rate Threshold
  excessiveRefundRatio: 0.25, // 25% refund threshold relative to order gross revenue

  // 5. Severity Classification (share of total leakage)
  severity: {
    highThreshold: 0.30,   // >= 30% of total leakage
    mediumThreshold: 0.10, // >= 10% of total leakage
    // < 10% is Low
  },

  // Simulator defaults
  simulator: {
    minCap: 0,
    maxCap: 30,
    defaultCap: 15,
  },
} as const;
