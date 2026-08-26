import type { ReactNode } from 'react';
import { cn, tint } from './cn';

export type BadgeTone = 'brand' | 'info' | 'success' | 'warning' | 'danger' | 'neutral';

const TONE_COLORS: Record<BadgeTone, string> = {
  brand: 'var(--color-purple-glow)',
  info: 'var(--color-cyan)',
  success: 'var(--color-emerald)',
  warning: 'var(--color-amber)',
  danger: 'var(--color-rose)',
  neutral: 'var(--color-text-secondary)',
};

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  /** Overrides `tone`, for venture/level colours resolved at runtime. */
  color?: string;
  className?: string;
  /** Adds a filled dot — useful for status where colour alone shouldn't carry meaning. */
  dot?: boolean;
}

/**
 * Status pill. Takes an explicit `color` escape hatch because venture and
 * access-level colours are data-driven, but defaults to the token palette
 * so status colours adapt correctly to the light theme.
 */
export function Badge({ children, tone = 'neutral', color, className, dot }: BadgeProps) {
  const accent = color ?? TONE_COLORS[tone];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1',
        'text-label font-bold uppercase tracking-[0.08em] whitespace-nowrap',
        className,
      )}
      style={{
        backgroundColor: tint(accent, 10),
        color: accent,
        border: `1px solid ${tint(accent, 20)}`,
      }}
    >
      {dot && (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: accent }}
        />
      )}
      {children}
    </span>
  );
}
