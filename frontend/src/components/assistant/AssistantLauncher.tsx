'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Sparkles, X } from 'lucide-react';
import { AssistantChat } from './AssistantChat';
import { useAssistant } from './useAssistant';
import { cn } from '@/components/ui';

interface Props {
  /** Hide the launcher (e.g. while the full Assistant view is on screen). */
  hidden?: boolean;
  /** Clients never get the assistant. */
  accessLevel: number;
  /** Opens the full-page Assistant view, when the menu has one. */
  onOpenFull?: () => void;
}

/**
 * Floating "Ask InternalX" button and side panel, available on every dashboard
 * page. It renders nothing unless the server says the assistant is configured
 * (or the user is an admin who needs the setup hint), so other users never see
 * a dead button.
 */
export default function AssistantLauncher({ hidden, accessLevel, onOpenFull }: Props) {
  const enabled = accessLevel < 9;
  const [open, setOpen] = useState(false);
  const chat = useAssistant({ loadList: false });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) {
      if (wasOpen.current) buttonRef.current?.focus();
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  const visible = enabled && !!chat.status && (chat.status.configured || !!chat.status.setupHint);
  if (!visible) return null;

  return (
    <>
      {!hidden && !open && (
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ask InternalX"
          aria-haspopup="dialog"
          className="fixed bottom-5 right-5 z-[90] flex h-12 items-center gap-2 rounded-full bg-[var(--color-purple-glow)] px-5 text-[13px] font-semibold text-white shadow-[var(--shadow-glow-brand)] transition-transform hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-purple-light)]"
        >
          <Sparkles size={16} aria-hidden="true" />
          <span className="hidden sm:inline">Ask InternalX</span>
        </button>
      )}

      {open && !hidden && (
        <aside
          role="dialog"
          aria-label="Ask InternalX"
          className={cn(
            'fixed inset-y-0 right-0 z-[95] flex w-full flex-col border-l border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-[var(--shadow-overlay)] sm:w-[440px]',
            'animate-slide-in-right',
          )}
        >
          <header className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <Sparkles size={16} className="text-[var(--color-purple-glow)]" aria-hidden="true" />
              <h2 className="truncate text-sm font-bold text-[var(--color-text-primary)]">Ask InternalX</h2>
            </div>
            <div className="flex items-center gap-1">
              {chat.messages.length > 0 && (
                <button
                  type="button"
                  onClick={chat.reset}
                  className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card-hover)] hover:text-[var(--color-text-primary)]"
                >
                  <Plus size={13} aria-hidden="true" /> New chat
                </button>
              )}
              {onOpenFull && (
                <button
                  type="button"
                  onClick={() => { close(); onOpenFull(); }}
                  className="h-8 rounded-lg px-2.5 text-[12px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card-hover)] hover:text-[var(--color-text-primary)]"
                >
                  Open full view
                </button>
              )}
              <button
                type="button"
                onClick={close}
                aria-label="Close assistant"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-card-hover)] hover:text-[var(--color-text-primary)]"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          </header>
          <AssistantChat
            compact
            status={chat.status}
            statusError={chat.statusError}
            messages={chat.messages}
            busy={chat.busy}
            onSend={chat.send}
            onStop={chat.stop}
          />
        </aside>
      )}
    </>
  );
}
