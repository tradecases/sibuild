import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'accent' | 'default';
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

const colorMap = {
  primary: { icon: 'bg-primary-100 text-primary-600', border: 'border-primary-100' },
  success: { icon: 'bg-success-100 text-success-600', border: 'border-success-100' },
  warning: { icon: 'bg-warning-100 text-warning-600', border: 'border-warning-100' },
  danger: { icon: 'bg-danger-100 text-danger-600', border: 'border-danger-100' },
  accent: { icon: 'bg-accent-100 text-accent-600', border: 'border-accent-100' },
  default: { icon: 'bg-slate-100 text-slate-600', border: 'border-slate-100' },
};

export function StatCard({
  title, value, subtitle, icon, trend, trendLabel, color = 'default', loading, className, onClick,
}: StatCardProps) {
  const colors = colorMap[color];

  if (loading) {
    return (
      <div className={cn('bg-white rounded-xl border border-slate-200 shadow-card p-5', className)}>
        <div className="flex items-start justify-between mb-4">
          <div className="h-3 w-28 shimmer rounded" />
          <div className="h-10 w-10 shimmer rounded-lg" />
        </div>
        <div className="h-8 w-24 shimmer rounded mb-2" />
        <div className="h-3 w-20 shimmer rounded" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-200 shadow-card p-5',
        'hover:shadow-card-hover hover:border-slate-300 transition-all duration-150',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
        {icon && (
          <div className={cn('p-2.5 rounded-xl', colors.icon)}>
            {icon}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900 leading-none mb-2">{value}</p>
      <div className="flex items-center gap-2">
        {trend !== undefined && (
          <span className={cn(
            'inline-flex items-center gap-0.5 text-xs font-semibold',
            trend > 0 ? 'text-success-600' : trend < 0 ? 'text-danger-600' : 'text-slate-500'
          )}>
            {trend > 0 ? <TrendingUp size={12} /> : trend < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
            {Math.abs(trend)}%
          </span>
        )}
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        {trendLabel && !subtitle && <p className="text-xs text-slate-400">{trendLabel}</p>}
      </div>
    </div>
  );
}
