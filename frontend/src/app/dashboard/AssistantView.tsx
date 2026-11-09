'use client';

import { MessageSquarePlus, Sparkles, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState, cn, useConfirm } from '@/components/ui';
import { AssistantChat } from '@/components/assistant/AssistantChat';
import { useAssistant } from '@/components/assistant/useAssistant';
import type { User } from '@/lib/constants';

/** Full-page "Ask InternalX": conversation history on the left, the chat on the right. */
export default function AssistantView({ currentUser }: { currentUser: User }) {
  const chat = useAssistant();
  const confirm = useConfirm();
  void currentUser;

  const onDelete = async (id: number, title: string) => {
    const ok = await confirm({
      title: 'Delete this conversation?',
      description: `"${title}" will be removed for good.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (ok) await chat.remove(id);
  };

  if (chat.status && !chat.status.configured) {
    return (
      <EmptyState
        icon={<Sparkles size={20} />}
        title="Ask InternalX is not set up yet"
        description={chat.status.setupHint || 'Your administrator has not enabled the assistant on this server.'}
      />
    );
  }

  return (
    <div className="grid h-[calc(100vh-14rem)] min-h-[480px] gap-4 lg:grid-cols-[260px_1fr]">
      <Card padding="none" className="flex min-h-0 flex-col overflow-hidden max-lg:hidden">
        <div className="border-b border-[var(--color-border)] p-3">
          <Button variant="subtle" size="sm" fullWidth onClick={chat.reset} leadingIcon={<MessageSquarePlus size={14} aria-hidden="true" />}>
            New conversation
          </Button>
        </div>
        <nav aria-label="Conversations" className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
          {chat.conversations.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12px] text-[var(--color-text-muted)]">Your conversations appear here. Only you can see them.</p>
          ) : (
            <ul className="space-y-0.5">
              {chat.conversations.map((c) => (
                <li key={c.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => chat.open(c.id)}
                    aria-current={c.id === chat.conversationId ? 'true' : undefined}
                    className={cn(
                      'w-full truncate rounded-lg px-3 py-2 pr-9 text-left text-[13px] transition-colors',
                      c.id === chat.conversationId
                        ? 'bg-[var(--color-purple-glow)]/15 text-[var(--color-text-primary)]'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card-hover)] hover:text-[var(--color-text-primary)]',
                    )}
                  >
                    {c.title}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(c.id, c.title)}
                    aria-label={`Delete conversation ${c.title}`}
                    className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[var(--color-text-muted)] opacity-0 hover:bg-[var(--color-rose)]/10 hover:text-[var(--color-rose)] focus:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 size={13} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>
      </Card>

      <Card padding="none" className="flex min-h-0 flex-col overflow-hidden">
        <AssistantChat
          status={chat.status}
          statusError={chat.statusError}
          messages={chat.messages}
          busy={chat.busy}
          onSend={chat.send}
          onStop={chat.stop}
        />
      </Card>
    </div>
  );
}
