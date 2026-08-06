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

export function formatFullCurrency(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return '$0';

  const sign = num < 0 ? '-' : '';
  return sign + '$' + Math.abs(num).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatRelativeTime(date: string | Date): string {
  const then = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.max(0, Math.floor((Date.now() - then.getTime()) / 1000));

  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return then.toLocaleDateString();
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
