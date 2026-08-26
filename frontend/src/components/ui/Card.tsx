import type { HTMLAttributes, ReactNode } from 'react';
import { cn, tint } from './cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds hover affordance. Only use on cards that are actually interactive. */
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const PADDING = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
} as const;

/**
 * The single card surface. Previously this exact treatment was written by
 * hand ~20 times across views, with two different radii, which is why the
 * dashboard drifted visually between modules.
 */
export function Card({
  interactive,
  padding = 'md',
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-card)]',
        PADDING[padding],
        interactive &&
          'transition-colors duration-150 hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg-card-hover)]',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-5 flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h3 className="truncate text-lg font-bold text-[var(--color-text-primary)]">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/**
 * Metric tile. This existed as two independent implementations
 * (OverviewView and ReportsView); this is the shared one.
 */
export function StatCard({
  label,
  value,
  icon,
  accent = 'var(--color-purple-glow)',
  delta,
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  /** Any CSS colour. Defaults to brand purple. */
  accent?: string;
  delta?: { value: string; direction: 'up' | 'down' | 'flat' };
  className?: string;
}) {
  const deltaColor =
    delta?.direction === 'up'
      ? 'var(--color-emerald)'
      : delta?.direction === 'down'
        ? 'var(--color-rose)'
        : 'var(--color-text-muted)';

  return (
    <Card className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <p className="text-label font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
          {label}
        </p>
        <p className="mt-2 truncate text-2xl font-bold text-[var(--color-text-primary)]">
          {value}
        </p>
        {delta && (
          <p className="mt-1.5 text-xs font-semibold" style={{ color: deltaColor }}>
            {delta.value}
          </p>
        )}
      </div>
      {icon && (
        <div
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-control)]"
          style={{
            backgroundColor: tint(accent, 10),
            color: accent,
            border: `1px solid ${tint(accent, 20)}`,
          }}
        >
          {icon}
        </div>
      )}
    </Card>
  );
}
