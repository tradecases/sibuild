import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { cn } from '../../lib/utils';

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const variants = {
  success: 'bg-success-50 border-success-200 text-success-800',
  error: 'bg-danger-50 border-danger-200 text-danger-800',
  warning: 'bg-warning-50 border-warning-200 text-warning-800',
  info: 'bg-primary-50 border-primary-200 text-primary-800',
};

const iconColors = {
  success: 'text-success-500',
  error: 'text-danger-500',
  warning: 'text-warning-500',
  info: 'text-primary-500',
};

export function ToastContainer() {
  const { toasts, removeToast } = useUiStore();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={cn(
              'flex items-start gap-3 px-4 py-3 rounded-xl border shadow-elevated pointer-events-auto',
              'animate-slide-up min-w-[300px] max-w-[400px]',
              variants[toast.type]
            )}
          >
            <Icon size={16} className={cn('flex-shrink-0 mt-0.5', iconColors[toast.type])} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.description && (
                <p className="text-xs mt-0.5 opacity-80">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity mt-0.5"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
