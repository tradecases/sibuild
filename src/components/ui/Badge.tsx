import React from 'react';
import { cn } from '../../lib/utils';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'accent' | 'slate';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
  size?: 'sm' | 'md';
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-600',
  primary: 'bg-primary-100 text-primary-700',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  danger: 'bg-danger-100 text-danger-700',
  accent: 'bg-accent-100 text-accent-700',
  slate: 'bg-slate-100 text-slate-500',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-slate-400',
  primary: 'bg-primary-600',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  accent: 'bg-accent-500',
  slate: 'bg-slate-400',
};

export function Badge({ variant = 'default', children, className, dot, size = 'md' }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-medium',
      size === 'sm' ? 'text-2xs px-2 py-0.5' : 'text-xs px-2.5 py-0.5',
      variantClasses[variant],
      className
    )}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColors[variant])} />}
      {children}
    </span>
  );
}

// Status badge helpers
export function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: BadgeVariant }> = {
    // Invoice
    draft: { label: 'Draft', variant: 'slate' },
    issued: { label: 'Issued', variant: 'primary' },
    partial: { label: 'Partial', variant: 'warning' },
    paid: { label: 'Paid', variant: 'success' },
    overdue: { label: 'Overdue', variant: 'danger' },
    cancelled: { label: 'Cancelled', variant: 'danger' },
    returned: { label: 'Returned', variant: 'danger' },
    // Quotation
    sent: { label: 'Sent', variant: 'primary' },
    accepted: { label: 'Accepted', variant: 'success' },
    rejected: { label: 'Rejected', variant: 'danger' },
    expired: { label: 'Expired', variant: 'warning' },
    converted: { label: 'Converted', variant: 'accent' },
    // Purchase
    received: { label: 'Received', variant: 'success' },
    // Delivery
    pending: { label: 'Pending', variant: 'warning' },
    assigned: { label: 'Assigned', variant: 'primary' },
    in_transit: { label: 'In Transit', variant: 'accent' },
    delivered: { label: 'Delivered', variant: 'success' },
    failed: { label: 'Failed', variant: 'danger' },
    // Project
    enquiry: { label: 'Enquiry', variant: 'slate' },
    active: { label: 'Active', variant: 'success' },
    on_hold: { label: 'On Hold', variant: 'warning' },
    completed: { label: 'Completed', variant: 'accent' },
    // Warranty claim
    open: { label: 'Open', variant: 'primary' },
    in_progress: { label: 'In Progress', variant: 'warning' },
    resolved: { label: 'Resolved', variant: 'success' },
    // Employee
    terminated: { label: 'Terminated', variant: 'danger' },
    suspended: { label: 'Suspended', variant: 'warning' },
    on_leave: { label: 'On Leave', variant: 'warning' },
  };

  const c = config[status] ?? { label: status, variant: 'default' as BadgeVariant };
  return <Badge variant={c.variant} dot>{c.label}</Badge>;
}
