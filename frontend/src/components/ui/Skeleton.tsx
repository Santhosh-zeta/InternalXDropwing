import type { CSSProperties } from 'react';
import { cn } from './cn';

interface SkeletonProps {
  className?: string;
  /** Any valid CSS width, e.g. "100%", "8rem", 240. */
  width?: string | number;
  height?: string | number;
  /** Renders a fully round placeholder, for avatars. */
  circle?: boolean;
  style?: CSSProperties;
}

/**
 * Shimmering placeholder. `.skeleton` is defined in globals.css and
 * collapses to a static block under `prefers-reduced-motion`.
 *
 * Skeletons should mirror the shape of the content they stand in for —
 * that is what stops the layout jumping when data lands.
 */
export function Skeleton({ className, width, height, circle, style }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('skeleton', circle && 'rounded-full', className)}
      style={{ width, height, ...style }}
    />
  );
}

/** Multi-line text placeholder. The last line is shortened, as real text wraps. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={12} width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  );
}

/** Placeholder matching the standard Card footprint. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Skeleton circle width={40} height={40} />
        <div className="flex-1">
          <Skeleton height={12} width="45%" />
          <Skeleton height={10} width="25%" className="mt-2" />
        </div>
      </div>
      <SkeletonText lines={2} className="mt-5" />
    </div>
  );
}

/**
 * Placeholder for a data table. Announces busy state to assistive tech,
 * which a bare spinner never did.
 */
export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)]"
    >
      <span className="sr-only">Loading data…</span>
      <div
        className="grid gap-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-5 py-3.5"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} height={10} width="55%" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div
          key={r}
          className="grid gap-4 border-b border-[var(--color-border)] px-5 py-4 last:border-b-0"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton key={c} height={12} width={c === 0 ? '80%' : '65%'} />
          ))}
        </div>
      ))}
    </div>
  );
}
