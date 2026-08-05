export function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return '$0';

  if (Math.abs(num) >= 1_000_000_000) {
    return '$' + (num / 1_000_000_000).toFixed(1) + 'B';
  }

  if (Math.abs(num) >= 1_000_000) {
    return '$' + (num / 1_000_000).toFixed(1) + 'M';
  }

  if (Math.abs(num) >= 1_000) {
    return '$' + (num / 1_000).toFixed(1) + 'K';
  }

  return '$' + num.toFixed(0);
}

export function formatNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return '0';

  if (Math.abs(num) >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1) + 'B';
  }

  if (Math.abs(num) >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  }

  if (Math.abs(num) >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }

  return num.toFixed(0);
}
