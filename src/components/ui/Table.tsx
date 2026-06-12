import React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  stickyHeader?: boolean;
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded shimmer" style={{ width: `${60 + Math.random() * 30}%` }} />
        </td>
      ))}
    </tr>
  );
}

export function Table<T extends Record<string, unknown>>({
  columns, data, keyField = 'id', sortColumn, sortDirection,
  onSort, onRowClick, loading, emptyMessage = 'No records found', className, stickyHeader,
}: TableProps<T>) {
  return (
    <div className={cn('overflow-auto rounded-xl border border-slate-200', className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap',
                  col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left',
                  col.sortable && 'cursor-pointer select-none hover:text-slate-700',
                  stickyHeader && 'sticky top-0 bg-slate-50 z-10',
                  col.width && `w-[${col.width}]`
                )}
                onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
              >
                <div className={cn('flex items-center gap-1', col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : '')}>
                  {col.label}
                  {col.sortable && (
                    <span className="text-slate-400">
                      {sortColumn === col.key ? (
                        sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                      ) : (
                        <ChevronsUpDown size={12} />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={columns.length} />)
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-16 text-center text-sm text-slate-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={String(row[keyField] ?? idx)}
                className={cn(
                  'hover:bg-slate-50/70 transition-colors duration-100',
                  onRowClick && 'cursor-pointer'
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-sm text-slate-700',
                      col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                    )}
                  >
                    {col.render
                      ? col.render(row[col.key], row, idx)
                      : (row[col.key] != null ? String(row[col.key]) : '-')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
