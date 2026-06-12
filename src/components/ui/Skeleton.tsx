import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: boolean;
}

export function Skeleton({ className, width, height, rounded }: SkeletonProps) {
  return (
    <div
      className={cn('shimmer', rounded ? 'rounded-full' : 'rounded', className)}
      style={{ width, height: height || '1rem' }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between mb-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-24 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex gap-8">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3" style={{ width: `${80 + Math.random() * 40}px` }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-8 px-4 py-3.5 border-b border-slate-100 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4" style={{ width: `${60 + Math.random() * 80}px` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200">
          <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
