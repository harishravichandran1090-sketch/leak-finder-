/**
 * CSV Parser and Schema Detection Utility.
 * Identifies datasets strictly by their column definitions, not file names.
 */

import { DatasetKey } from '../types';

export const DATASET_SCHEMAS: Record<DatasetKey, { label: string; requiredColumns: string[] }> = {
  sales: {
    label: 'Sales',
    requiredColumns: ['order_id', 'date', 'sku', 'revenue', 'units'],
  },
  orders: {
    label: 'Orders',
    requiredColumns: ['order_id', 'customer_id', 'channel', 'order_value', 'status'],
  },
  discounts: {
    label: 'Discounts',
    requiredColumns: ['discount_id', 'order_id', 'code', 'discount_amount'],
  },
  returns: {
    label: 'Returns',
    requiredColumns: ['return_id', 'order_id', 'reason', 'refund_amount', 'restock_fee'],
  },
  costs: {
    label: 'Costs',
    requiredColumns: ['sku', 'cogs', 'shipping_cost', 'handling_fee'],
  },
};

/**
 * Robust CSV line tokenizer that respects quoted fields with commas and newlines
 */
export function parseCSVText(text: string): { headers: string[]; rows: Record<string, any>[] } {
  const lines: string[] = [];
  let currentLine = '';
  let insideQuote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (insideQuote && text[i + 1] === '"') {
        currentLine += '"';
        i++; // skip escaped quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if ((char === '\n' || char === '\r') && !insideQuote) {
      if (char === '\r' && text[i + 1] === '\n') {
        i++;
      }
      if (currentLine.trim().length > 0) {
        lines.push(currentLine);
      }
      currentLine = '';
    } else {
      currentLine += char;
    }
  }

  if (currentLine.trim().length > 0) {
    lines.push(currentLine);
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const parseLine = (line: string): string[] => {
    const cells: string[] = [];
    let cell = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuote && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (c === ',' && !inQuote) {
        cells.push(cell.trim());
        cell = '';
      } else {
        cell += c;
      }
    }
    cells.push(cell.trim());
    return cells;
  };

  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map((h) => h.toLowerCase().trim().replace(/^["']|["']$/g, ''));

  const rows: Record<string, any>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;
    const rowObj: Record<string, any> = {};
    headers.forEach((h, idx) => {
      let val: any = values[idx] ?? '';
      // convert numbers if appropriate
      if (val !== '' && !isNaN(Number(val)) && !h.includes('id') && !h.includes('sku') && !h.includes('code') && !h.includes('date')) {
        val = Number(val);
      }
      rowObj[h] = val;
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}

/**
 * Match parsed CSV headers against target dataset schemas
 */
export function identifyDataset(headers: string[]): {
  datasetKey: DatasetKey | null;
  missingColumns?: string[];
  matchedDatasetCandidate?: DatasetKey;
} {
  const normalizedHeaders = new Set(headers.map((h) => h.toLowerCase().trim()));

  // 1. Exact match check (all required columns present)
  for (const [key, schema] of Object.entries(DATASET_SCHEMAS) as [DatasetKey, { label: string; requiredColumns: string[] }][]) {
    const hasAll = schema.requiredColumns.every((col) => normalizedHeaders.has(col));
    if (hasAll) {
      return { datasetKey: key };
    }
  }

  // 2. Partial match check (if some columns match, pinpoint missing ones)
  let bestCandidate: DatasetKey | null = null;
  let maxMatches = 0;
  let candidateMissing: string[] = [];

  for (const [key, schema] of Object.entries(DATASET_SCHEMAS) as [DatasetKey, { label: string; requiredColumns: string[] }][]) {
    const matched = schema.requiredColumns.filter((col) => normalizedHeaders.has(col));
    if (matched.length > maxMatches && matched.length >= 2) {
      maxMatches = matched.length;
      bestCandidate = key;
      candidateMissing = schema.requiredColumns.filter((col) => !normalizedHeaders.has(col));
    }
  }

  if (bestCandidate && candidateMissing.length > 0) {
    return {
      datasetKey: null,
      matchedDatasetCandidate: bestCandidate,
      missingColumns: candidateMissing,
    };
  }

  return { datasetKey: null };
}
