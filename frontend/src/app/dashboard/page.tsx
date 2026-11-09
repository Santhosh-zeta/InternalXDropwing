'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Menu, Search, X } from 'lucide-react';
import { logoutUser } from '@/lib/api';
import { useAuthUser } from '@/components/AuthUserContext';
import { SocketProvider } from '@/components/SocketProvider';
import ErrorBoundary from '@/components/ErrorBoundary';
import NotificationBell from './NotificationBell';
import SearchPalette from '@/components/search/SearchPalette';
import AssistantLauncher from '@/components/assistant/AssistantLauncher';
import SidebarBody, { LEVEL_COLORS } from './Sidebar';
import { itemLabel, menuFor, resolveView } from './menu';
import { useView } from './useView';

function Dashboard() {
  const router = useRouter();
  // Verified server-side by RequireAuth before this component ever renders.
  const { user } = useAuthUser();
  const { viewId, setView } = useView();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [today] = useState(() =>
    new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
  );
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  const items = menuFor(user);
  const current = resolveView(user, viewId);
  const label = itemLabel(current, user);
  const color = LEVEL_COLORS[user.accessLevel] ?? LEVEL_COLORS[7];
  const View = current.component;

  useEffect(() => {
    document.title = `${label} · InternalX`;
  }, [label]);

  // A URL pointing at a view the user may not open (`?view=audit` as an intern)
  // is replaced by their landing view instead of showing a dead page.
  useEffect(() => {
    if (viewId !== null && viewId !== current.id) router.replace(`/dashboard?view=${current.id}`, { scroll: false });
  }, [viewId, current.id, router]);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    hamburgerRef.current?.focus();
  }, []);

  // Drawer: Escape to close, focus trap, body scroll lock while open.
  useEffect(() => {
    if (!isDrawerOpen) return;
    drawerCloseRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsDrawerOpen(false);
        hamburgerRef.current?.focus();
        return;
      }
      if (e.key !== 'Tab') return;
      const node = drawerRef.current;
      if (!node) return;
      const focusable = Array.from(
        node.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      ).filter((el) => !el.hasAttribute('disabled'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const inside = active ? node.contains(active) : false;
      if (e.shiftKey && (!inside || active === first)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || active === last)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const mq = window.matchMedia('(min-width: 1024px)');
    const onResize = () => { if (mq.matches) setIsDrawerOpen(false); };
    mq.addEventListener('change', onResize);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      mq.removeEventListener('change', onResize);
      document.body.style.overflow = previousOverflow;
    };
  }, [isDrawerOpen]);

  const handleLogout = async () => {
    try {
      // Deletes the server-side session so the cookie stops working at once.
      await logoutUser();
    } catch {
      // Best effort: still return to sign-in even when offline.
    }
    toast.success('Signed out');
    router.push('/login');
  };

  const select = (id: string) => {
    setView(id);
    if (isDrawerOpen) setIsDrawerOpen(false);
  };

  const sidebar = (
    <SidebarBody user={user} items={items} activeId={current.id} onSelect={select} onLogout={handleLogout} />
  );

  return (
    <SocketProvider user={user}>
      <div className="flex min-h-screen bg-[var(--color-bg-primary)] font-sans text-[var(--color-text-primary)]">
        <SearchPalette menus={items.map((i) => ({ id: i.id, label: itemLabel(i, user) }))} onNavigate={select} />
        {user.accessLevel < 9 && <AssistantLauncher
          accessLevel={user.accessLevel}
          hidden={current.id === 'assistant'}
          onOpenFull={items.some((i) => i.id === 'assistant') ? () => select('assistant') : undefined}
        />}

        <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] lg:flex">
          {sidebar}
        </aside>

        {isDrawerOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={closeDrawer} aria-hidden="true" />
            <div
              ref={drawerRef}
              id="mobile-nav-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              className="absolute inset-y-0 left-0 flex w-[260px] max-w-[85vw] flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-2xl"
            >
              <button
                ref={drawerCloseRef}
                type="button"
                onClick={closeDrawer}
                aria-label="Close navigation menu"
                className="absolute right-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-card-hover)] hover:text-[var(--color-text-primary)]"
              >
                <X size={16} aria-hidden="true" />
              </button>
              <div className="flex flex-1 flex-col overflow-y-auto">{sidebar}</div>
            </div>
          </div>
        )}

        <main id="main" className="min-w-0 flex-1 p-4 sm:p-6 lg:p-10">
          <header className="mb-6 flex flex-col justify-between gap-4 border-b border-[var(--color-border)] pb-5 sm:mb-8 sm:pb-6 md:flex-row md:items-center md:gap-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                ref={hamburgerRef}
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                aria-label="Open navigation menu"
                aria-expanded={isDrawerOpen}
                aria-controls="mobile-nav-drawer"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-card-hover)] hover:text-[var(--color-text-primary)] lg:hidden"
              >
                <Menu size={18} aria-hidden="true" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-2xl lg:text-3xl">{label}</h1>
                <p className="mt-1 truncate text-xs font-medium text-[var(--color-text-muted)] sm:text-sm">{today}</p>
              </div>
            </div>

            <div className="flex w-full items-center gap-2 sm:gap-4 md:w-auto">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event('ix:open-search'))}
                aria-label="Search (Ctrl+K)"
                className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-left text-[13px] text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-text-muted)] md:w-64 md:flex-none lg:w-72"
              >
                <Search size={14} aria-hidden="true" className="shrink-0" />
                <span className="flex-1 truncate">Search…</span>
                <kbd className="hidden rounded border border-[var(--color-border)] px-1.5 text-[10px] sm:block">Ctrl K</kbd>
              </button>
              <NotificationBell color={color} onNavigate={setView} />
            </div>
          </header>

          <ErrorBoundary resetKey={current.id}>
            <View currentUser={user} />
          </ErrorBoundary>
        </main>
      </div>
    </SocketProvider>
  );
}

export default function DashboardPage() {
  // useSearchParams needs a Suspense boundary in a static export.
  return (
    <Suspense fallback={null}>
      <Dashboard />
    </Suspense>
  );
}
