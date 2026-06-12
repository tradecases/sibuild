import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, pageSize, total, onChange, className }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  const from = Math.min((page - 1) * pageSize + 1, total);
  const to = Math.min(page * pageSize, total);

  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | null)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push(null);
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push(null);
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <p className="text-xs text-slate-500">
        Showing <span className="font-medium text-slate-700">{from}</span> to{' '}
        <span className="font-medium text-slate-700">{to}</span> of{' '}
        <span className="font-medium text-slate-700">{total}</span> results
      </p>
      <div className="flex items-center gap-1">
        <button
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={15} />
        </button>
        {getPageNumbers().map((p, i) =>
          p === null ? (
            <span key={`ellipsis-${i}`} className="px-1 text-slate-400 text-sm">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={cn(
                'h-7 w-7 rounded-lg text-xs font-medium transition-colors',
                page === p
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              {p}
            </button>
          )
        )}
        <button
          disabled={page === totalPages}
          onClick={() => onChange(page + 1)}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
