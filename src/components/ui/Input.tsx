import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  prefix?: string;
  suffix?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  prefix,
  suffix,
  className,
  id,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-slate-600 mb-1.5">
          {label}
          {props.required && <span className="text-danger-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <div className="absolute left-0 inset-y-0 flex items-center pl-3 pointer-events-none">
            <span className="text-slate-500 text-sm">{prefix}</span>
          </div>
        )}
        {leftIcon && !prefix && (
          <div className="absolute left-3 inset-y-0 flex items-center pointer-events-none text-slate-400">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            'disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed',
            'transition-colors duration-150',
            error ? 'border-danger-500 focus:ring-danger-500 focus:border-danger-500' : 'border-slate-200',
            leftIcon || prefix ? 'pl-9' : '',
            rightIcon || suffix ? 'pr-9' : '',
            prefix ? 'pl-8' : '',
            className
          )}
          {...props}
        />
        {rightIcon && !suffix && (
          <div className="absolute right-3 inset-y-0 flex items-center pointer-events-none text-slate-400">
            {rightIcon}
          </div>
        )}
        {suffix && (
          <div className="absolute right-0 inset-y-0 flex items-center pr-3 pointer-events-none">
            <span className="text-slate-500 text-sm">{suffix}</span>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
});

Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  hint,
  className,
  id,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-slate-600 mb-1.5">
          {label}
          {props.required && <span className="text-danger-500 ml-0.5">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        className={cn(
          'w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 resize-none',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
          'disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed',
          'transition-colors duration-150',
          error ? 'border-danger-500 focus:ring-danger-500' : 'border-slate-200',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
});

Textarea.displayName = 'Textarea';
