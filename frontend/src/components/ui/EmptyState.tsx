import type { ReactNode } from 'react';
import { cn, tint } from './cn';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  /** One sentence on why this is empty and what to do next. */
  description?: string;
  action?: ReactNode;
  className?: string;
  /** Use when the emptiness is a failure rather than a fresh start. */
  tone?: 'neutral' | 'error';
}

/**
 * The standard empty slot.
 *
 * This treatment was previously copy-pasted as a bare class string 15
 * times, and 9 of 20 views with tables had no empty state at all — a new
 * tenant saw headers over blank space with no guidance.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  tone = 'neutral',
}: EmptyStateProps) {
  const accent = tone === 'error' ? 'var(--color-rose)' : 'var(--color-purple-glow)';

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-[var(--radius-card)]',
        'border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)]',
        'px-6 py-14 text-center',
        className,
      )}
    >
      {icon && (
        <div
          aria-hidden="true"
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--radius-control)]"
          style={{
            backgroundColor: tint(accent, 10),
            color: accent,
            border: `1px solid ${tint(accent, 20)}`,
          }}
        >
          {icon}
        </div>
      )}
      <p className="text-md font-bold text-[var(--color-text-primary)]">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-[var(--color-text-muted)]">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
