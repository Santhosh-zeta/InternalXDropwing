/**
 * Money is stored as a plain number (hours x hourly rate); the currency is a
 * deployment setting, not data. Set NEXT_PUBLIC_CURRENCY (ISO code, e.g. INR)
 * at build time; defaults to USD.
 */
const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || 'USD';

export const formatMoney = (value: unknown, maximumFractionDigits = 0): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY, maximumFractionDigits }).format(Number(value ?? 0));

/** Short axis label, e.g. 12.5K. */
export const formatCompact = (value: unknown): string =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value ?? 0));

/** Spoken summary of a chart series, e.g. "Mon 4, Tue 6, Wed 2". */
export function describeSeries<T extends object>(
  rows: T[],
  labelKey: keyof T,
  valueKey: keyof T,
  format?: (value: unknown) => string,
): string {
  return rows
    .map((row) => `${String(row[labelKey] ?? 'Unknown')} ${format ? format(row[valueKey]) : String(row[valueKey] ?? 0)}`)
    .join(', ');
}
