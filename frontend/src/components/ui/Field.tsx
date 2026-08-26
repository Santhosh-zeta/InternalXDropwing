'use client';

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from './cn';

const CONTROL_BASE = cn(
  'w-full rounded-[var(--radius-control)] border border-[var(--color-border)]',
  'bg-[var(--color-bg-secondary)] px-4 text-md font-medium',
  'text-[var(--color-text-primary)] outline-none transition-colors',
  'placeholder:text-[var(--color-text-muted)] placeholder:font-normal',
  'focus:border-[var(--color-purple-glow)]',
  'disabled:cursor-not-allowed disabled:opacity-50',
);

const LABEL_CLASS = cn(
  'block text-label font-bold uppercase',
  'tracking-[0.08em] text-[var(--color-text-muted)]',
);

interface FieldProps {
  label: string;
  /** Provide when the control needs explanation. Wired via aria-describedby. */
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  /** Receives the ids to attach to the control. */
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}

/**
 * Label + control wrapper.
 *
 * No `<label>` in this app had an `htmlFor`, so no label was
 * programmatically associated with its input — clicking a label did
 * nothing and screen readers announced the inputs unnamed. This wires
 * `htmlFor`/`id`, plus `aria-describedby` and `aria-invalid` for errors.
 */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
        {required && (
          <span className="ml-1 text-[var(--color-rose)]" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>

      {children({ id, describedBy, invalid: Boolean(error) })}

      {hint && !error && (
        <p id={hintId} className="text-xs text-[var(--color-text-muted)]">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-semibold text-[var(--color-rose)]">
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(CONTROL_BASE, 'h-11', className)} {...rest} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 4, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(CONTROL_BASE, 'resize-y py-3 leading-relaxed', className)}
      {...rest}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select ref={ref} className={cn(CONTROL_BASE, 'h-11 cursor-pointer', className)} {...rest}>
        {children}
      </select>
    );
  },
);

/**
 * Convenience wrapper for the common label+input case.
 *
 *   <TextField label="Project name" value={v} onChange={...} required />
 */
export function TextField({
  label,
  hint,
  error,
  required,
  className,
  ...inputProps
}: Omit<FieldProps, 'children'> & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      {({ id, describedBy, invalid }) => (
        <Input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          required={required}
          {...inputProps}
        />
      )}
    </Field>
  );
}
