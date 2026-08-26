'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from './cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-purple-glow)] text-white border border-transparent hover:bg-[var(--color-purple-dark)] shadow-[var(--shadow-glow-brand)]',
  secondary:
    'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg-card-hover)]',
  ghost:
    'bg-transparent text-[var(--color-text-secondary)] border border-transparent hover:bg-[var(--color-bg-card-hover)] hover:text-[var(--color-text-primary)]',
  danger:
    'bg-[var(--color-rose)] text-white border border-transparent hover:brightness-110',
  subtle:
    'bg-[var(--color-purple-glow)]/10 text-[var(--color-purple-glow)] border border-[var(--color-purple-glow)]/20 hover:bg-[var(--color-purple-glow)]/20',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-base gap-2',
  lg: 'h-12 px-6 text-md gap-2.5',
};

const ICON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

const SPINNER_SIZE: Record<ButtonSize, number> = { sm: 13, md: 15, lg: 17 };

interface BaseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and blocks interaction. Width is preserved to avoid layout shift. */
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
  children?: ReactNode;
}

/**
 * `iconOnly` buttons have no text, so an `aria-label` is required at the
 * type level. The app previously shipped 123 hand-styled buttons and zero
 * accessible names on icon-only controls.
 */
export type ButtonProps = BaseProps &
  ({ iconOnly: true; 'aria-label': string } | { iconOnly?: false });

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    leadingIcon,
    trailingIcon,
    fullWidth,
    iconOnly,
    className,
    children,
    disabled,
    type,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      // Buttons inside a <form> default to type="submit"; that has caused
      // accidental submits often enough to be worth defaulting explicitly.
      type={type ?? 'button'}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-[var(--radius-control)] font-semibold',
        'transition-colors duration-150',
        'disabled:cursor-not-allowed disabled:opacity-50',
        iconOnly ? ICON_SIZES[size] : SIZES[size],
        VARIANTS[variant],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 size={SPINNER_SIZE[size]} className="animate-spin" aria-hidden="true" />
      ) : (
        leadingIcon
      )}
      {/* An icon-only button's children ARE its icon, so they must render.
          They are suppressed only while loading, when the spinner above
          replaces them. Passing the icon via `leadingIcon` works equally. */}
      {!(iconOnly && loading) && children}
      {!loading && trailingIcon}
    </button>
  );
});
