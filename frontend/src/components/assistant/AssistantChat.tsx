'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { AlertCircle, ArrowUp, Check, Loader2, Sparkles, Square } from 'lucide-react';
import { EmptyState, cn } from '@/components/ui';
import type { AssistantStatus } from '@/lib/api';
import type { ChatMessage, ToolChip } from './useAssistant';
import { RichText } from './RichText';

function Chip({ chip }: { chip: ToolChip }) {
  const running = chip.state === 'running';
  const failed = chip.state === 'error';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium',
        failed
          ? 'border-[var(--color-rose)]/30 text-[var(--color-rose)]'
          : 'border-[var(--color-border)] text-[var(--color-text-secondary)]',
      )}
    >
      {running ? <Loader2 size={11} className="animate-spin" aria-hidden="true" />
        : failed ? <AlertCircle size={11} aria-hidden="true" />
        : <Check size={11} className="text-[var(--color-emerald)]" aria-hidden="true" />}
      {running ? 'Looking up' : failed ? 'Could not look up' : 'Looked up'} {chip.label}
    </span>
  );
}

function Bubble({ m }: { m: ChatMessage }) {
  if (m.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-[var(--color-purple-glow)] px-4 py-2.5 text-[13px] leading-relaxed text-white">
          {m.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <Sparkles size={14} className="text-[var(--color-purple-glow)]" aria-hidden="true" />
      </span>
      <div className="min-w-0 max-w-[90%] flex-1 space-y-2">
        {m.tools.length > 0 && (
          <div className="flex flex-wrap gap-1.5">{m.tools.map((t) => <Chip key={t.id} chip={t} />)}</div>
        )}
        {m.text ? (
          <div className="rounded-2xl rounded-tl-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 text-[var(--color-text-primary)]">
            <RichText text={m.text} />
          </div>
        ) : m.streaming && !m.error ? (
          <div className="inline-flex items-center gap-2 px-1 py-1.5 text-[12px] text-[var(--color-text-muted)]">
            <span className="flex gap-1" aria-hidden="true">
              {[0, 150, 300].map((d) => (
                <span key={d} className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-text-muted)]" style={{ animationDelay: `${d}ms` }} />
              ))}
            </span>
            Thinking
          </div>
        ) : null}
        {m.notice && <p className="px-1 text-[12px] text-[var(--color-amber)]">{m.notice}</p>}
        {m.error && (
          <p role="alert" className="flex items-start gap-1.5 px-1 text-[12px] text-[var(--color-rose)]">
            <AlertCircle size={13} className="mt-0.5 shrink-0" aria-hidden="true" /> {m.error}
          </p>
        )}
      </div>
    </div>
  );
}

interface Props {
  status: AssistantStatus | null;
  statusError: boolean;
  messages: ChatMessage[];
  busy: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  /** Extra controls rendered beside the send button (e.g. "Notes to tasks"). */
  toolbar?: React.ReactNode;
  compact?: boolean;
}

/** Message list + composer. Handles the not-configured state itself. */
export function AssistantChat({ status, statusError, messages, busy, onSend, onStop, toolbar, compact }: Props) {
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Follow the stream unless the reader scrolled up.
  useEffect(() => {
    if (stickRef.current) endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  useEffect(() => { inputRef.current?.focus(); }, [status?.configured]);

  if (statusError) {
    return <EmptyState icon={<AlertCircle size={20} />} tone="error" title="Assistant unavailable" description="Could not reach the assistant. Try again in a moment." />;
  }
  if (!status) {
    return <div className="flex flex-1 items-center justify-center py-16 text-[var(--color-text-muted)]"><Loader2 className="animate-spin" size={18} aria-label="Loading" /></div>;
  }
  if (!status.configured) {
    return (
      <EmptyState
        icon={<Sparkles size={20} />}
        title="Ask InternalX is not set up yet"
        description={status.setupHint || 'Your administrator has not enabled the assistant on this server.'}
      />
    );
  }

  const submit = () => {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft('');
    stickRef.current = true;
    onSend(text);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollerRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        className={cn('min-h-0 flex-1 space-y-5 overflow-y-auto', compact ? 'p-4' : 'p-5')}
      >
        {messages.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center py-8 text-center">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
              <Sparkles size={22} className="text-[var(--color-purple-glow)]" aria-hidden="true" />
            </span>
            <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Ask InternalX</h3>
            <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
              Ask about your tasks, projects, deadlines and hours. I can only read what you already have access to.
            </p>
            <div className="mt-5 flex w-full flex-col gap-2">
              {status.suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSend(s)}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-2.5 text-left text-[13px] text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg-card-hover)]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => <Bubble key={m.key} m={m} />)
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
        <div className="flex items-end gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-2 focus-within:border-[var(--color-purple-glow)]">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            maxLength={4000}
            aria-label="Message Ask InternalX"
            placeholder="Ask about your work…"
            className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[13px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
          {busy ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop generating"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card-hover)]"
            >
              <Square size={13} fill="currentColor" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!draft.trim()}
              aria-label="Send message"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-purple-glow)] text-white transition-opacity disabled:opacity-40"
            >
              <ArrowUp size={16} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[11px] text-[var(--color-text-muted)]">
          <span>Enter to send · Shift+Enter for a new line · Answers can be wrong, check what matters.</span>
          {toolbar}
        </div>
      </div>
    </div>
  );
}
