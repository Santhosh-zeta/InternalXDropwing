'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  deleteAssistantConversation, getAssistantConversation, getAssistantConversations, getAssistantStatus,
  streamAssistantChat, type AssistantConversation, type AssistantEvent, type AssistantStatus,
} from '@/lib/api';

export interface ToolChip { id: string; label: string; state: 'running' | 'done' | 'error' }
export interface ChatMessage {
  key: string;
  role: 'user' | 'assistant';
  text: string;
  tools: ToolChip[];
  notice?: string;
  error?: string;
  streaming?: boolean;
}

/** Labels for tools already stored in a conversation (live turns carry their own label). */
const TOOL_LABELS: Record<string, string> = {
  my_tasks: 'your tasks', list_projects: 'projects', project_summary: 'a project summary',
  overdue_tasks: 'overdue tasks', upcoming_deadlines: 'upcoming deadlines', timesheet_summary: 'timesheet hours',
  search: 'a search', announcements: 'announcements', team_workload: 'team workload',
  finance_summary: 'finance figures', project_finance: 'project finance',
};

let seq = 0;
const nextKey = () => `m${Date.now()}-${seq++}`;

/**
 * State for one assistant chat surface (the full view or the side panel):
 * status, conversation list, the open conversation and the streaming turn.
 */
export function useAssistant({ loadList = true }: { loadList?: boolean } = {}) {
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [conversations, setConversations] = useState<AssistantConversation[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const refreshList = useCallback(async () => {
    try { setConversations(await getAssistantConversations()); } catch { /* list is a convenience */ }
  }, []);

  useEffect(() => {
    let alive = true;
    getAssistantStatus()
      .then((s) => { if (alive) setStatus(s); })
      .catch(() => { if (alive) setStatusError(true); });
    if (loadList) refreshList();
    return () => { alive = false; abortRef.current?.abort(); };
  }, [loadList, refreshList]);

  const open = useCallback(async (id: number) => {
    abortRef.current?.abort();
    setBusy(false);
    try {
      const conv = await getAssistantConversation(id);
      setConversationId(conv.id);
      setMessages(conv.messages.map((m) => ({
        key: `s${m.id}`,
        role: m.role,
        text: m.text,
        tools: m.tools.map((name, i) => ({ id: `${m.id}-${i}`, label: TOOL_LABELS[name] || name, state: 'done' as const })),
      })));
    } catch {
      setMessages([{ key: nextKey(), role: 'assistant', text: '', tools: [], error: 'Could not open that conversation.' }]);
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setBusy(false);
    setConversationId(null);
    setMessages([]);
  }, []);

  const remove = useCallback(async (id: number) => {
    await deleteAssistantConversation(id);
    if (id === conversationId) reset();
    await refreshList();
  }, [conversationId, reset, refreshList]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const send = useCallback(async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    const controller = new AbortController();
    abortRef.current = controller;
    const assistantKey = nextKey();
    setBusy(true);
    setMessages((m) => [
      ...m,
      { key: nextKey(), role: 'user', text: message, tools: [] },
      { key: assistantKey, role: 'assistant', text: '', tools: [], streaming: true },
    ]);
    const patch = (fn: (m: ChatMessage) => ChatMessage) =>
      setMessages((all) => all.map((m) => (m.key === assistantKey ? fn(m) : m)));

    const onEvent = (e: AssistantEvent) => {
      switch (e.type) {
        case 'conversation': setConversationId(e.id); break;
        case 'text': patch((m) => ({ ...m, text: m.text + e.delta })); break;
        case 'tool':
          patch((m) => {
            const exists = m.tools.some((t) => t.id === e.id);
            const chip: ToolChip = { id: e.id, label: e.label, state: e.state };
            return { ...m, tools: exists ? m.tools.map((t) => (t.id === e.id ? chip : t)) : [...m.tools, chip] };
          });
          break;
        case 'notice': patch((m) => ({ ...m, notice: e.message })); break;
        case 'error': patch((m) => ({ ...m, error: e.message })); break;
        default: break;
      }
    };

    try {
      await streamAssistantChat({ message, conversationId }, onEvent, controller.signal);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        patch((m) => ({ ...m, error: (err as Error).message || 'The assistant is unavailable right now.' }));
      }
    } finally {
      patch((m) => ({ ...m, streaming: false, tools: m.tools.map((t) => (t.state === 'running' ? { ...t, state: 'error' as const } : t)) }));
      setBusy(false);
      if (loadList) refreshList();
    }
  }, [busy, conversationId, loadList, refreshList]);

  return { status, statusError, conversations, conversationId, messages, busy, send, stop, open, reset, remove };
}
