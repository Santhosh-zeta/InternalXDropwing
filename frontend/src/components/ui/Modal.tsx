'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from './cn';
import { Button } from './Button';

const subscribeNoop = () => () => {};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export type ModalSize = 'sm' | 'md' | 'lg';

const SIZES: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Rendered under the title. Also used as the dialog's description for AT. */
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  /** Slides in from the right edge instead of centering — for edit drawers. */
  variant?: 'center' | 'drawer';
  /** Set false for destructive flows where a stray click shouldn't dismiss. */
  closeOnBackdrop?: boolean;
  className?: string;
}

/**
 * Accessible dialog.
 *
 * The six hand-rolled modals this replaces had no `role="dialog"`, no
 * `aria-modal`, no Escape handling, no focus trap, no focus restoration and
 * no body scroll lock — keyboard users could tab straight out of them into
 * the page behind.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  variant = 'center',
  closeOnBackdrop = true,
  className,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

  const titleId = useId();
  const descriptionId = useId();

  // The app builds with `output: "export"`, so components prerender without
  // a DOM. Portals must wait for mount.

  useEffect(() => {
    if (!open || !mounted) return;

    // Depends on `mounted`: the portal renders only once mounted flips true,
    // so on first paint the panel does not exist yet. Without `mounted` in
    // the dep list a modal opened on initial mount would never install its
    // trap or scroll lock.
    const panel = panelRef.current;
    if (!panel) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    const visibleFocusables = (): HTMLElement[] =>
      Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement,
      );

    // Focus the first control, falling back to the panel itself so focus can
    // never remain on the element behind the overlay.
    (visibleFocusables()[0] ?? panel).focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const items = visibleFocusables();
      if (items.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    // Capture phase so the dialog wins over any page-level key handlers
    // (the dashboard binds a global Ctrl+K).
    document.addEventListener('keydown', onKeyDown, true);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus?.();
    };
  }, [open, mounted, onClose]);

  const onBackdropMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      // Only dismiss on a press that both starts and ends on the backdrop,
      // so a drag that began inside the panel doesn't close it.
      if (closeOnBackdrop && event.target === event.currentTarget) onClose();
    },
    [closeOnBackdrop, onClose],
  );

  if (!mounted || !open) return null;

  const isDrawer = variant === 'drawer';

  return createPortal(
    <div
      onMouseDown={onBackdropMouseDown}
      className={cn(
        'fixed inset-0 z-[100] flex bg-black/60 backdrop-blur-sm',
        isDrawer ? 'justify-end' : 'items-center justify-center p-4',
      )}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'flex flex-col bg-[var(--color-bg-primary)] shadow-[var(--shadow-overlay)] outline-none',
          isDrawer
            ? 'h-full w-full max-w-[600px] border-l border-[var(--color-border)] animate-slide-in-right'
            : cn(
                'w-full rounded-[var(--radius-panel)] border border-[var(--color-border)]',
                'max-h-[85vh] animate-fade-in-up',
                SIZES[size],
              ),
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-6 py-5">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="truncate text-xl font-bold text-[var(--color-text-primary)]"
            >
              {title}
            </h2>
            {description && (
              <p
                id={descriptionId}
                className="mt-1 text-xs text-[var(--color-text-muted)]"
              >
                {description}
              </p>
            )}
          </div>
          <Button
            iconOnly
            aria-label="Close dialog"
            variant="ghost"
            size="md"
            onClick={onClose}
            className="hover:bg-[var(--color-rose)]/10 hover:text-[var(--color-rose)]"
          >
            <X size={18} aria-hidden="true" />
          </Button>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto px-6 py-6">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
