'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckSquare, CornerDownLeft, FileText, FolderKanban, Loader2, Megaphone,
  MessageSquare, Search, User as UserIcon, LayoutDashboard,
} from 'lucide-react';
import { searchAll, type SearchHit, type SearchHitType } from '@/lib/api';
import { cn } from '@/components/ui';

interface Props {
  /** Menu labels the current user can open (same list the sidebar renders). */
  menus: string[];
  /** Switch the dashboard to the menu at this index. */
  onNavigate: (index: number) => void;
}

interface Item {
  key: string;
  group: string;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  index: number; // menu index to open; -1 = nothing to open
}

const TYPE_META: Record<SearchHitType, { label: string; icon: React.ElementType; menus: string[] }> = {
  project: { label: 'Projects', icon: FolderKanban, menus: ['Projects', 'My Projects', 'Project Status', 'Deliverables'] },
  task: { label: 'Tasks', icon: CheckSquare, menus: ['Tasks', 'My Tasks'] },
  document: { label: 'Documents', icon: FileText, menus: ['Documents'] },
  announcement: { label: 'Announcements', icon: Megaphone, menus: [] },
  user: { label: 'People', icon: UserIcon, menus: ['User Management', 'Team Members', 'Team Management'] },
  message: { label: 'Chat', icon: MessageSquare, menus: ['Team Chat', 'Messages'] },
};
const GROUP_ORDER: SearchHitType[] = ['project', 'task', 'document', 'user', 'announcement', 'message'];

const menuIndex = (menus: string[], candidates: string[]) => {
  for (const c of candidates) {
    const i = menus.indexOf(c);
    if (i !== -1) return i;
  }
  return -1;
};

/**
 * Ctrl/Cmd+K command palette: jump to a module, or search tasks, projects,
 * documents, people, announcements and chat the signed-in user may already see
 * (GET /api/search applies the data scope in SQL; nothing is filtered here).
 *
 * ARIA combobox pattern: focus stays in the input, ArrowUp/Down moves the
 * active option, Enter opens it, Escape closes.
 */
export default function SearchPalette({ menus, onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // Latest settled server answer, tagged with the query it belongs to.
  const [result, setResult] = useState<{ q: string; hits: SearchHit[]; failed: boolean }>({ q: '', hits: [], failed: false });
  const [activeRaw, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActive(0);
    setResult({ q: '', hits: [], failed: false });
  }, []);

  // Global shortcut. Capture phase + stopPropagation so it wins over the
  // dashboard's older inline-search handler.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        e.stopPropagation();
        setOpen((o) => {
          if (!o) restoreRef.current = document.activeElement as HTMLElement | null;
          return !o;
        });
      }
    };
    const onOpen = () => { restoreRef.current = document.activeElement as HTMLElement | null; setOpen(true); };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('ix:open-search', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('ix:open-search', onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      restoreRef.current?.focus?.();
    };
  }, [open]);

  const q = query.trim();
  const searching = q.length >= 2;

  // Debounced server search; a stale answer is ignored via `cancelled`.
  useEffect(() => {
    if (!open || q.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const found = await searchAll(q);
        if (!cancelled) setResult({ q, hits: found, failed: false });
      } catch {
        if (!cancelled) setResult({ q, hits: [], failed: true });
      }
    }, 180);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [q, open]);

  const settled = searching && result.q === q;
  const loading = searching && !settled;
  const failed = settled && result.failed;
  const hits = useMemo(() => (settled ? result.hits : []), [settled, result.hits]);

  const items = useMemo<Item[]>(() => {
    const needle = q.toLowerCase();
    const out: Item[] = [];
    menus.forEach((m, i) => {
      if (!needle || m.toLowerCase().includes(needle)) {
        out.push({ key: `menu-${m}`, group: 'Go to', title: m, icon: LayoutDashboard, index: i });
      }
    });
    const trimmedMenus = needle ? out : out.slice(0, 6);
    const result: Item[] = [...trimmedMenus];
    for (const type of GROUP_ORDER) {
      const meta = TYPE_META[type];
      for (const h of hits.filter((x) => x.type === type)) {
        result.push({
          key: `${type}-${h.id}`,
          group: meta.label,
          title: h.title,
          subtitle: h.subtitle,
          icon: meta.icon,
          index: type === 'announcement' ? 0 : menuIndex(menus, meta.menus),
        });
      }
    }
    return result;
  }, [menus, hits, q]);

  const active = Math.min(activeRaw, Math.max(items.length - 1, 0));
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (item: Item | undefined) => {
    if (!item) return;
    if (item.index >= 0) onNavigate(item.index);
    close();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(items.length ? (active + 1) % items.length : 0); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(items.length ? (active - 1 + items.length) % items.length : 0); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(items[active]); }
    else if (e.key === 'Tab') { e.preventDefault(); } // single-control dialog: keep focus in the input
  };

  if (!open || typeof document === 'undefined') return null;

  const optionId = (i: number) => `${listId}-opt-${i}`;
  let lastGroup = '';

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search and navigate"
        onKeyDown={onKeyDown}
        className="w-full max-w-xl overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-[var(--shadow-overlay)] animate-fade-in-up"
      >
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4">
          <Search size={16} className="shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={items.length ? optionId(active) : undefined}
            aria-autocomplete="list"
            aria-label="Search tasks, projects, documents, people and chat"
            placeholder="Search or jump to…"
            autoComplete="off"
            spellCheck={false}
            className="h-14 w-full bg-transparent text-[15px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
          />
          {loading && <Loader2 size={16} className="shrink-0 animate-spin text-[var(--color-text-muted)]" aria-label="Searching" />}
          <kbd className="hidden shrink-0 rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)] sm:block">Esc</kbd>
        </div>

        <div ref={listRef} id={listId} role="listbox" aria-label="Results" className="max-h-[50vh] overflow-y-auto p-2">
          {items.map((item, i) => {
            const header = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            const selected = i === active;
            return (
              <div key={item.key}>
                {header && (
                  <div className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]" aria-hidden="true">
                    {header}
                  </div>
                )}
                <div
                  id={optionId(i)}
                  role="option"
                  aria-selected={selected}
                  onMouseMove={() => setActive(i)}
                  onClick={() => choose(item)}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2',
                    selected ? 'bg-[var(--color-purple-glow)]/15' : 'hover:bg-[var(--color-bg-card-hover)]',
                  )}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                    <item.icon size={14} className="text-[var(--color-text-muted)]" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-[var(--color-text-primary)]">{item.title}</span>
                    {item.subtitle && <span className="block truncate text-[11px] text-[var(--color-text-muted)]">{item.subtitle}</span>}
                  </span>
                  {selected && <CornerDownLeft size={13} className="shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />}
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="px-4 py-8 text-center text-[13px] text-[var(--color-text-muted)]" role="status">
              {failed ? 'Search is unavailable right now.' : loading ? 'Searching…' : searching ? `Nothing found for “${q}”.` : 'Type at least 2 characters.'}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2 text-[11px] text-[var(--color-text-muted)]">
          <span>↑↓ to move · Enter to open</span>
          <span>Only shows what you have access to</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
