import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning';
type Size = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 focus-visible:ring-primary-500 shadow-sm',
  secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 focus-visible:ring-slate-400 shadow-sm',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400',
  danger: 'bg-danger-500 text-white hover:bg-danger-600 active:bg-danger-700 focus-visible:ring-danger-400 shadow-sm',
  success: 'bg-success-500 text-white hover:bg-success-600 active:bg-success-700 focus-visible:ring-success-400 shadow-sm',
  warning: 'bg-warning-500 text-white hover:bg-warning-600 active:bg-warning-700 focus-visible:ring-warning-400 shadow-sm',
};

const sizeClasses: Record<Size, string> = {
  sm: 'text-xs px-3 py-1.5 h-7 rounded-md',
  md: 'text-sm px-4 py-2 h-9 rounded-lg',
  lg: 'text-sm px-5 py-2.5 h-10 rounded-lg',
  icon: 'h-9 w-9 rounded-lg',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed select-none',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});

Button.displayName = 'Button';
