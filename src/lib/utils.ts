export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatCurrency(amount: number, currency?: string, symbol?: string): string {
  const curr = currency || 'BDT';
  const sym = symbol || '৳';
  return `${sym}${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString('en-AE');
}

export function formatDate(date: string | Date | null | undefined, format: 'short' | 'long' | 'time' = 'short'): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';

  if (format === 'long') {
    return d.toLocaleDateString('en-AE', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  if (format === 'time') {
    return d.toLocaleString('en-AE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-AE', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) return formatDate(date);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return `${text.substring(0, length)}...`;
}

export function generateCode(prefix: string, num: number, pad = 4): string {
  return `${prefix}-${String(num).padStart(pad, '0')}`;
}

export function calcLineTotal(qty: number, price: number, discPct = 0, taxRate = 0): {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
} {
  const subtotal = qty * price;
  const discount = subtotal * (discPct / 100);
  const afterDiscount = subtotal - discount;
  const tax = afterDiscount * (taxRate / 100);
  return {
    subtotal,
    discount,
    tax,
    total: afterDiscount + tax,
  };
}

export function calcDocTotals(items: Array<{ quantity: number; unit_price: number; discount_percentage: number; tax_rate: number }>) {
  let subtotal = 0;
  let discountAmount = 0;
  let taxAmount = 0;

  for (const item of items) {
    const line = calcLineTotal(item.quantity, item.unit_price, item.discount_percentage, item.tax_rate);
    subtotal += line.subtotal;
    discountAmount += line.discount;
    taxAmount += line.tax;
  }

  return {
    subtotal,
    discount_amount: discountAmount,
    tax_amount: taxAmount,
    total_amount: subtotal - discountAmount + taxAmount,
  };
}

export function downloadCSV(data: Record<string, unknown>[], filename: string): void {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export function classifyStockLevel(qty: number, reorderLevel: number): 'critical' | 'low' | 'normal' | 'good' {
  if (qty <= 0) return 'critical';
  if (qty <= reorderLevel) return 'low';
  if (qty <= reorderLevel * 1.5) return 'normal';
  return 'good';
}
