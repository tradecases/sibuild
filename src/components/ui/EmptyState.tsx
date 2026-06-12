import React from 'react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({ icon, title, description, action, className, size = 'md' }: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      size === 'sm' ? 'py-8 px-4' : size === 'lg' ? 'py-24 px-8' : 'py-16 px-6',
      className
    )}>
      {icon && (
        <div className="mb-4 p-4 bg-slate-100 rounded-2xl text-slate-400">
          {icon}
        </div>
      )}
      <h3 className={cn(
        'font-semibold text-slate-700',
        size === 'sm' ? 'text-sm' : 'text-base'
      )}>
        {title}
      </h3>
      {description && (
        <p className={cn(
          'mt-1.5 text-slate-500 max-w-sm',
          size === 'sm' ? 'text-xs' : 'text-sm'
        )}>
          {description}
        </p>
      )}
      {action && (
        <div className="mt-5">
          <Button onClick={action.onClick} leftIcon={action.icon} size={size === 'sm' ? 'sm' : 'md'}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
