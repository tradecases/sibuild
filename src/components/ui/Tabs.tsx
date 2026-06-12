import React from 'react';
import { cn } from '../../lib/utils';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'line' | 'pill';
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, variant = 'line', className }: TabsProps) {
  if (variant === 'pill') {
    return (
      <div className={cn('flex items-center gap-1 bg-slate-100 rounded-lg p-1', className)}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150',
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                'ml-1 rounded-full px-1.5 py-0.5 text-2xs font-semibold',
                activeTab === tab.id ? 'bg-slate-100 text-slate-600' : 'bg-slate-200 text-slate-500'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex border-b border-slate-200 gap-1', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-150 -mb-px',
            activeTab === tab.id
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              'ml-1 rounded-full px-1.5 py-0.5 text-2xs font-semibold',
              activeTab === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-500'
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
