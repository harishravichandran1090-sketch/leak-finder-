/**
 * Formatting utilities for Indian Rupee (INR) and metrics.
 * Strictly uses ₹ and lakh/crore/thousand notation. Never uses $ or £.
 */

export function formatINR(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) {
    return '₹0';
  }

  const isNegative = val < 0;
  const abs = Math.abs(val);

  let formatted = '';

  if (abs >= 10000000) {
    // 1 Crore = 100 Lakhs = 10,000,000
    const cr = abs / 10000000;
    formatted = `${cr.toFixed(2).replace(/\.00$/, '')}Cr`;
  } else if (abs >= 100000) {
    // 1 Lakh = 100,000
    const lakh = abs / 100000;
    formatted = `${lakh.toFixed(lakh >= 10 ? 1 : 2).replace(/\.00$/, '')}L`;
  } else if (abs >= 1000) {
    // Thousands (e.g. ₹82K)
    const k = abs / 1000;
    formatted = `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')}K`;
  } else {
    formatted = Math.round(abs).toLocaleString('en-IN');
  }

  return `${isNegative ? '-' : ''}₹${formatted}`;
}

/**
 * Format INR with exact plain numbers (e.g. for CSV export)
 */
export function formatINRAmountPlain(val: number | undefined | null): number {
  if (val === undefined || val === null || isNaN(val)) return 0;
  return Math.round(val * 100) / 100;
}

/**
 * Format percentage with 1 decimal place
 */
export function formatPercent(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '0.0%';
  return `${val.toFixed(1)}%`;
}

/**
 * Format standard readable dates
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
