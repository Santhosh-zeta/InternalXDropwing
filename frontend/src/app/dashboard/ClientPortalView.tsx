'use client';
import { useState, useRef, type KeyboardEvent } from 'react';
import { User } from '@/lib/constants';
import { apiGet } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import type { Envelope } from '@/lib/types';
import { Building2, AlertCircle } from 'lucide-react';
import { Button, Card, EmptyState, Skeleton, SkeletonCard, SkeletonText, cn, tint } from '@/components/ui';
import { Invoice, MICRO_LABEL, PortalData, TABS, TabId } from './portal/model';
import InvoicePrint from './portal/InvoicePrint';
import { OverviewPanel, DeliverablesPanel, InvoicesPanel, DocumentsPanel } from './portal/panels';

export default function ClientPortalView({ currentUser }: { currentUser: User }) {
  const portal = useApi('client-portal', async (signal) => {
    const res = await apiGet<Envelope<PortalData>>('/client-portal/overview', signal);
    if (!res.success) throw new Error(res.message || 'Could not load the portal');
    return res.data;
  });
  const { data, loading, refetch: fetchData } = portal;
  const [tab, setTab] = useState<TabId>('overview');
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [printing, setPrinting] = useState(false);
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});

  const vc = data?.venture?.primary_color || 'var(--color-purple-glow)';

  const handlePrint = () => {
    // window.print() blocks the main thread, so the busy state has to be
    // committed on a later tick or the button never repaints.
    setPrinting(true);
    setTimeout(() => {
      try { window.print(); } finally { setPrinting(false); }
    }, 50);
  };

  const onTabKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const current = TABS.findIndex(t => t.id === tab);
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (current + 1) % TABS.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (current - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const id = TABS[next].id;
    setTab(id);
    tabRefs.current[id]?.focus();
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 pb-10" role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading your portal…</span>
        <Card className="p-5 sm:p-8">
          <div className="flex items-center gap-4">
            <Skeleton width={56} height={56} />
            <div className="min-w-0 flex-1">
              <Skeleton height={10} width="30%" />
              <Skeleton height={20} width="55%" className="mt-2" />
            </div>
          </div>
          <SkeletonText lines={2} className="mt-6" />
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map(i => <Skeleton key={i} height={64} />)}
          </div>
        </Card>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  // Previously a failed fetch rendered the full branded shell with zeroes in
  // every counter, which reads as "you have no work" rather than "this failed".
  if (!data) {
    return (
      <EmptyState
        tone="error"
        icon={<AlertCircle size={24} />}
        title="We couldn't load your portal"
        description="Your projects, deliverables and invoices are temporarily unavailable. Check your connection and try again."
        action={<Button variant="primary" onClick={fetchData}>Try again</Button>}
      />
    );
  }

  const v = data.venture;
  const projects = data.projects || [];
  const deliverables = data.deliverables || [];
  const invoices = data.invoices || [];
  const documents = data.documents || [];

  if (printInvoice) return <InvoicePrint invoice={printInvoice} venture={v} user={currentUser} vc={vc} printing={printing} onBack={() => setPrintInvoice(null)} onPrint={handlePrint} />;

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Branded header */}
      <div
        className="relative overflow-hidden rounded-2xl border p-5 shadow-sm sm:p-8"
        style={{
          background: `linear-gradient(135deg, ${tint(vc, 10)}, ${tint(vc, 3)})`,
          borderColor: tint(vc, 20),
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full blur-3xl"
          style={{ background: tint(vc, 14) }}
        />
        <div className="relative z-10 mb-4 flex items-center gap-4">
          <div
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg sm:h-14 sm:w-14"
            style={{ background: vc }}
          >
            <Building2 size={24} />
          </div>
          <div className="min-w-0">
            <div className={cn('mb-1', MICRO_LABEL)} style={{ color: vc }}>Client Portal</div>
            <h2 className="m-0 truncate text-xl font-black text-[var(--color-text-primary)] sm:text-2xl">
              {v?.name || currentUser.venture?.name || 'Your Portal'}
            </h2>
          </div>
        </div>
        <p className="relative z-10 mb-6 max-w-2xl text-base font-medium leading-relaxed text-[var(--color-text-secondary)]">
          Welcome, <strong style={{ color: vc }}>{currentUser.fullName}</strong>. Here&apos;s your real-time project status, deliverables, and billing overview.
          {v?.description && ` — ${v.description}`}
        </p>
        <div
          className="relative z-10 grid grid-cols-2 gap-3 border-t pt-5 sm:flex sm:flex-wrap sm:gap-4"
          style={{ borderColor: tint(vc, 20) }}
        >
          {[
            { label: 'Projects', val: projects.length, c: vc },
            { label: 'Deliverables', val: deliverables.length, c: 'var(--color-cyan)' },
            { label: 'Invoices', val: invoices.length, c: 'var(--color-emerald)' },
            { label: 'Documents', val: documents.length, c: 'var(--color-amber)' },
          ].map(s => (
            <div
              key={s.label}
              className="rounded-2xl border bg-[var(--color-bg-card)] px-4 py-3 text-center shadow-sm sm:px-6"
              style={{ borderColor: tint(s.c, 20) }}
            >
              <div className="mb-0.5 text-2xl font-black" style={{ color: s.c }}>{s.val}</div>
              <div className={MICRO_LABEL}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Client portal sections"
        onKeyDown={onTabKeyDown}
        className="flex w-full flex-wrap gap-1.5 self-start rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-1 sm:w-auto sm:gap-2"
      >
        {TABS.map(t => {
          const selected = tab === t.id;
          return (
            <button
              key={t.id}
              ref={el => { tabRefs.current[t.id] = el; }}
              type="button"
              role="tab"
              id={`client-portal-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`client-portal-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition-colors sm:flex-none sm:px-4',
                selected
                  ? 'border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-sm'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
              )}
              style={selected ? { color: vc } : undefined}
            >
              {t.icon} {t.label}
            </button>
          );
        })}
      </div>

      {/* Projects Tab */}
      {tab === 'overview' && <OverviewPanel projects={projects} vc={vc} />}

      {/* Deliverables Tab */}
      {tab === 'deliverables' && <DeliverablesPanel deliverables={deliverables} vc={vc} />}

      {/* Invoices Tab */}
      {tab === 'invoices' && <InvoicesPanel invoices={invoices} vc={vc} onOpen={setPrintInvoice} />}

      {/* Documents Tab */}
      {tab === 'documents' && <DocumentsPanel documents={documents} vc={vc} />}
    </div>
  );
}
