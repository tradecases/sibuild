import React, { useRef, useEffect, useState } from 'react';
import { cn } from '../../lib/utils';

interface DropdownItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  divider?: boolean;
  disabled?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
}

export function Dropdown({ trigger, items, align = 'right', className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <div className={cn(
          'absolute top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-elevated py-1.5 min-w-[160px] animate-scale-in',
          align === 'right' ? 'right-0' : 'left-0'
        )}>
          {items.map((item, idx) => (
            <React.Fragment key={idx}>
              {item.divider && idx > 0 && <hr className="my-1 border-slate-100" />}
              <button
                disabled={item.disabled}
                onClick={() => { item.onClick(); setOpen(false); }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3.5 py-2 text-sm transition-colors',
                  item.variant === 'danger'
                    ? 'text-danger-600 hover:bg-danger-50'
                    : 'text-slate-700 hover:bg-slate-50',
                  item.disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {item.icon && <span className="flex-shrink-0 opacity-70">{item.icon}</span>}
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
