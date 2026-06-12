import React from 'react';
import { cn } from '../../lib/utils';
import { getInitials } from '../../lib/utils';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizeMap: Record<AvatarSize, string> = {
  xs: 'h-6 w-6 text-2xs',
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-10 w-10 text-sm',
  xl: 'h-12 w-12 text-base',
};

const colorVariants = [
  'bg-primary-100 text-primary-700',
  'bg-accent-100 text-accent-700',
  'bg-success-100 text-success-700',
  'bg-warning-100 text-warning-700',
  'bg-danger-100 text-danger-700',
];

function getColorVariant(name: string): string {
  const index = name.charCodeAt(0) % colorVariants.length;
  return colorVariants[index];
}

interface AvatarProps {
  name?: string;
  src?: string | null;
  size?: AvatarSize;
  className?: string;
}

export function Avatar({ name = '?', src, size = 'md', className }: AvatarProps) {
  const initials = getInitials(name);
  const colorClass = getColorVariant(name);

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover flex-shrink-0', sizeMap[size], className)}
      />
    );
  }

  return (
    <div className={cn(
      'rounded-full flex items-center justify-center flex-shrink-0 font-semibold',
      sizeMap[size],
      colorClass,
      className
    )}>
      {initials}
    </div>
  );
}
