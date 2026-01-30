/**
 * Formatting utilities for KPI dashboard
 */

/**
 * Format number as currency (USD)
 */
export function formatCurrency(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format number as percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format number with locale formatting
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format date string
 */
export function formatDate(
  dateString: string,
  format: 'short' | 'long' | 'chart' = 'short'
): string {
  const date = new Date(dateString + 'T00:00:00');
  
  switch (format) {
    case 'long':
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    case 'chart':
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    default:
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
  }
}

/**
 * Format trend value with sign
 */
export function formatTrend(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}
