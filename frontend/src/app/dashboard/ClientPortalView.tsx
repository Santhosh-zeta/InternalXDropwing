'use client';
import { useEffect, useState, useCallback, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { User } from '@/lib/constants';
import api from '@/lib/api';
import {
  Printer, ArrowLeft, Briefcase, FileCheck,
  Receipt, FileText, CheckCircle2, CircleDashed, Clock,
  File, FileImage, FileSpreadsheet, Sparkles, Building2, AlertCircle,
} from 'lucide-react';
import {
  Badge, Button, Card, EmptyState,
  Skeleton, SkeletonCard, SkeletonText,
  cn, tint, type BadgeTone,
} from '@/components/ui';

interface Venture { id: number; name: string; slug: string; primary_color: string; description: string; logo_url: string; }
interface Project { id: number; title: string; description: string; status: string; progress: number; start_date: string; end_date: string; budget: number; manager_name: string; }
interface Deliverable { id: number; title: string; description: string; status: string; priority: string; due_date: string; created_at: string; assigned_by_name: string; }
interface Invoice { invoice_number: string; month: string; total_hours: number; total_amount: number; status: string; issue_date: string; }
interface Document { id: number; file_name: string; file_size: number; file_type: string; created_at: string; uploaded_by: string; category: string; }
interface PortalData { venture: Venture | null; projects: Project[]; deliverables: Deliverable[]; invoices: Invoice[]; documents: Document[]; }

/**
 * Status/priority previously mapped to raw hex literals, which stayed dark-mode
 * coloured under the light theme. They now map to Badge tones, which resolve to
 * the themed tokens.
 */
const PRIORITY_TONE: Record<string, BadgeTone> = {
  urgent: 'danger', high: 'warning', medium: 'info', low: 'success',
};
const STATUS_TONE: Record<string, BadgeTone> = {
  completed: 'success', 'in-progress': 'info', pending: 'warning',
  active: 'success', planning: 'brand', 'on-hold': 'neutral',
};

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const shortDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';

const longDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const isOverdue = (due?: string, status?: string) =>
  Boolean(due) && new Date(due as string) < new Date() && status !== 'completed';

const statusIcon = (status: string): ReactNode => {
  if (status === 'completed') return <CheckCircle2 size={11} aria-hidden="true" />;
  if (status === 'in-progress') return <CircleDashed size={11} aria-hidden="true" />;
  return <Clock size={11} aria-hidden="true" />;
};

const docIcon = (fileType?: string): ReactNode => {
  if (fileType?.includes('pdf')) return <FileText size={20} aria-hidden="true" />;
  if (fileType?.includes('image')) return <FileImage size={20} aria-hidden="true" />;
  if (fileType?.includes('spreadsheet') || fileType?.includes('excel')) return <FileSpreadsheet size={20} aria-hidden="true" />;
  return <File size={20} aria-hidden="true" />;
};

const TABS = [
  { id: 'overview', label: 'Projects', icon: <Briefcase size={15} aria-hidden="true" /> },
  { id: 'deliverables', label: 'Deliverables', icon: <FileCheck size={15} aria-hidden="true" /> },
  { id: 'invoices', label: 'Invoices', icon: <Receipt size={15} aria-hidden="true" /> },
  { id: 'documents', label: 'Documents', icon: <FileText size={15} aria-hidden="true" /> },
] as const;

type TabId = (typeof TABS)[number]['id'];

const TH = 'px-5 py-4 text-label font-bold uppercase tracking-[0.08em] text-[var(--color-text-secondary)] whitespace-nowrap';
const MICRO_LABEL = 'text-label font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]';

export default function ClientPortalView({ currentUser }: { currentUser: User }) {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('overview');
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [printing, setPrinting] = useState(false);
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/client-portal/overview');
      if (res.data.success) setData(res.data.data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  if (printInvoice) return (
    <div className="relative">
      <div className="no-print mb-4 flex flex-wrap gap-3">
        <Button
          variant="secondary"
          leadingIcon={<ArrowLeft size={16} aria-hidden="true" />}
          onClick={() => setPrintInvoice(null)}
        >
          Back
        </Button>
        <Button
          variant="primary"
          loading={printing}
          leadingIcon={<Printer size={16} aria-hidden="true" />}
          onClick={handlePrint}
          // Venture-branded: `vc` is a real colour from the venture record.
          style={{ background: vc, boxShadow: 'none' }}
        >
          Print / Save PDF
        </Button>
      </div>

      {/*
        The invoice sheet keeps fixed light colours on purpose: it is a printed
        document, so it must stay black-on-white on paper and in the PDF no
        matter which app theme the client is using.
      */}
      <div className="invoice-paper min-h-[700px] rounded-2xl bg-white p-6 font-sans text-black shadow-[0_20px_60px_rgba(0,0,0,0.15)] sm:p-10 md:p-12">
        <div className="mb-8 flex flex-wrap justify-between gap-5 border-b-4 pb-7" style={{ borderColor: vc }}>
          <div>
            <div className="text-4xl font-black tracking-tight text-gray-900">INVOICE</div>
            <div className="mt-2 text-sm font-bold text-gray-500">{printInvoice.invoice_number}</div>
            <div className="mt-1 text-sm font-medium text-gray-500">Period: {printInvoice.month}</div>
          </div>
          <div className="text-right">
            <div className="mb-2 flex items-center justify-end gap-2.5">
              <div aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500 text-white">
                <Sparkles size={18} />
              </div>
              <div className="text-2xl font-black text-gray-900">InternalX</div>
            </div>
            <div className="text-sm font-semibold text-gray-600">Dropwing Groups LLC</div>
          </div>
        </div>

        <div className="mb-10 flex flex-wrap justify-between gap-5">
          <div>
            <div className="mb-2 text-label font-bold uppercase tracking-widest text-gray-400">Bill To:</div>
            <div className="text-lg font-black text-gray-900">{v?.name || 'Client'}</div>
            <div className="mt-1 text-sm font-medium text-gray-600">{currentUser.fullName}</div>
          </div>
          <div className="text-right">
            <div className="mb-2 text-label font-bold uppercase tracking-widest text-gray-400">Issue Date</div>
            <div className="text-base font-bold text-gray-900">
              {printInvoice.issue_date ? new Date(printInvoice.issue_date).toLocaleDateString() : '—'}
            </div>
          </div>
        </div>

        <div className="-mx-6 mb-10 overflow-x-auto px-6 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[480px] border-collapse">
            <caption className="sr-only">
              Invoice {printInvoice.invoice_number} line items for {printInvoice.month}
            </caption>
            <thead>
              <tr className="border-b-2" style={{ borderColor: tint(vc, 25) }}>
                {['Description', 'Hours', 'Rate', 'Amount'].map(h => (
                  <th
                    key={h}
                    scope="col"
                    className={cn(
                      'py-3 text-xs font-bold uppercase tracking-wider text-gray-500',
                      h !== 'Description' ? 'text-right' : 'text-left',
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-5">
                  <div className="text-md font-bold text-gray-900">Professional Services — {printInvoice.month}</div>
                  <div className="mt-1 text-sm font-medium text-gray-500">Development, design &amp; consulting hours</div>
                </td>
                <td className="py-5 text-right text-sm font-bold text-gray-700">{printInvoice.total_hours}h</td>
                <td className="py-5 text-right text-sm font-bold text-gray-700">$50/hr</td>
                <td className="py-5 text-right text-base font-black text-gray-900">{fmt(printInvoice.total_amount)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <div className="w-full max-w-[280px] border-t-2 pt-4" style={{ borderColor: vc }}>
            <div className="flex items-center justify-between gap-4">
              <span className="text-lg font-black text-gray-900">Total Due</span>
              <span className="text-2xl font-black" style={{ color: vc }}>{fmt(printInvoice.total_amount)}</span>
            </div>
          </div>
        </div>

        <div className="mt-16 border-t border-gray-200 pt-6 text-center text-label font-bold uppercase tracking-wider text-gray-400">
          Payment due within 15 days. Thank you for your partnership!
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html:`@media print{body *{visibility:hidden}.invoice-paper,.invoice-paper *{visibility:visible}.no-print{display:none!important}.invoice-paper{position:fixed;left:0;top:0;width:100%;box-shadow:none!important;border-radius:0}}`}} />
    </div>
  );

  const panelProps = {
    role: 'tabpanel' as const,
    id: `client-portal-panel-${tab}`,
    'aria-labelledby': `client-portal-tab-${tab}`,
    tabIndex: 0,
    className: 'outline-none',
  };

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
      {tab === 'overview' && (
        <div {...panelProps}>
          {projects.length === 0 ? (
            <EmptyState
              icon={<Briefcase size={24} />}
              title="No active projects"
              description="Projects appear here as soon as your engagement team starts one. Your account manager can tell you what's queued up."
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {projects.map(p => (
                <Card
                  key={p.id}
                  className="shadow-sm transition-shadow hover:shadow-md"
                  style={{ borderColor: tint(vc, 25), borderLeftWidth: '4px', borderLeftColor: vc }}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h3 className="line-clamp-2 flex-1 text-lg font-bold leading-tight text-[var(--color-text-primary)]">
                      {p.title}
                    </h3>
                    <Badge tone={STATUS_TONE[p.status] ?? 'neutral'} className="shrink-0">
                      {p.status?.replace('-', ' ') || 'unknown'}
                    </Badge>
                  </div>
                  {p.description && (
                    <p className="mb-5 line-clamp-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                      {p.description}
                    </p>
                  )}
                  <div className="mb-4">
                    <div className="mb-1.5 flex justify-between">
                      <span className={MICRO_LABEL}>Progress</span>
                      <span className="text-sm font-black" style={{ color: vc }}>{p.progress || 0}%</span>
                    </div>
                    <div
                      className="h-1.5 overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
                      role="progressbar"
                      aria-valuenow={p.progress || 0}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${p.title} progress`}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${p.progress || 0}%`, background: vc }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2 border-t border-[var(--color-border)] pt-3 text-xs font-bold text-[var(--color-text-muted)]">
                    {p.end_date && (
                      <span
                        className={cn(
                          'flex items-center gap-1',
                          isOverdue(p.end_date, p.status) && 'text-[var(--color-rose)]',
                        )}
                      >
                        <Clock size={12} aria-hidden="true" />
                        <span className="sr-only">Due </span>
                        {shortDate(p.end_date)}
                        {isOverdue(p.end_date, p.status) && <span className="sr-only"> (overdue)</span>}
                      </span>
                    )}
                    {p.manager_name && <span>PM: {p.manager_name}</span>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Deliverables Tab */}
      {tab === 'deliverables' && (
        <div {...panelProps}>
          {deliverables.length === 0 ? (
            <EmptyState
              icon={<FileCheck size={24} />}
              title="No deliverables yet"
              description="Files, milestones and hand-offs assigned to your account will be listed here as your team completes them."
            />
          ) : (
            <>
              {/* Phone: one card per deliverable. A five-column table is not
                  usable at 375px, and clients are mostly on phones. */}
              <div className="grid gap-3 md:hidden">
                {deliverables.map(d => (
                  <Card key={d.id} padding="sm">
                    <p className="text-base font-bold text-[var(--color-text-primary)]">{d.title}</p>
                    {d.description && (
                      <p className="mt-1 line-clamp-2 text-xs font-medium text-[var(--color-text-muted)]">
                        {d.description}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge tone={PRIORITY_TONE[d.priority] ?? 'neutral'}>{d.priority || '—'}</Badge>
                      <Badge tone={STATUS_TONE[d.status] ?? 'neutral'}>
                        {statusIcon(d.status)}
                        {d.status?.replace('-', ' ') || 'unknown'}
                      </Badge>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-[var(--color-border)] pt-3">
                      <div>
                        <dt className={MICRO_LABEL}>Due date</dt>
                        <dd
                          className={cn(
                            'mt-1 text-sm font-bold',
                            isOverdue(d.due_date, d.status)
                              ? 'text-[var(--color-rose)]'
                              : 'text-[var(--color-text-secondary)]',
                          )}
                        >
                          {longDate(d.due_date)}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className={MICRO_LABEL}>Assigned by</dt>
                        <dd className="mt-1 truncate text-sm font-semibold text-[var(--color-text-secondary)]">
                          {d.assigned_by_name || '—'}
                        </dd>
                      </div>
                    </dl>
                  </Card>
                ))}
              </div>

              <Card padding="none" className="hidden overflow-hidden shadow-sm md:block" style={{ borderColor: tint(vc, 25) }}>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <caption className="sr-only">
                      Deliverables assigned to your account, {deliverables.length} in total
                    </caption>
                    <thead>
                      <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                        {['Deliverable', 'Priority', 'Status', 'Due Date', 'Assigned By'].map(h => (
                          <th key={h} scope="col" className={cn(TH, 'text-left')}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {deliverables.map(d => (
                        <tr key={d.id} className="border-b border-[var(--color-border)] transition-colors last:border-b-0 hover:bg-[var(--color-bg-card-hover)]">
                          <td className="px-5 py-4">
                            <div className="mb-1 text-base font-bold text-[var(--color-text-primary)]">{d.title}</div>
                            {d.description && (
                              <div className="line-clamp-1 text-xs font-medium text-[var(--color-text-muted)]">{d.description}</div>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <Badge tone={PRIORITY_TONE[d.priority] ?? 'neutral'}>{d.priority || '—'}</Badge>
                          </td>
                          <td className="px-5 py-4">
                            <Badge tone={STATUS_TONE[d.status] ?? 'neutral'}>
                              {statusIcon(d.status)}
                              {d.status?.replace('-', ' ') || 'unknown'}
                            </Badge>
                          </td>
                          <td
                            className={cn(
                              'px-5 py-4 text-sm font-bold whitespace-nowrap',
                              isOverdue(d.due_date, d.status)
                                ? 'text-[var(--color-rose)]'
                                : 'text-[var(--color-text-secondary)]',
                            )}
                          >
                            {longDate(d.due_date)}
                          </td>
                          <td className="px-5 py-4 text-sm font-semibold text-[var(--color-text-secondary)]">
                            {d.assigned_by_name}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Invoices Tab */}
      {tab === 'invoices' && (
        <div {...panelProps}>
          {invoices.length === 0 ? (
            <EmptyState
              icon={<Receipt size={24} />}
              title="No invoices yet"
              description="Invoices are raised once the month's timesheets are approved. Nothing is due from you right now."
            />
          ) : (
            <>
              <div className="grid gap-3 md:hidden">
                {invoices.map((inv, idx) => (
                  <Card key={idx} padding="sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-bold text-[var(--color-text-primary)]">{inv.invoice_number}</p>
                        <p className="mt-1 text-label font-medium text-[var(--color-text-muted)]">
                          Issued: {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString() : '—'}
                        </p>
                      </div>
                      <Badge dot tone="warning">PENDING</Badge>
                    </div>
                    <dl className="mt-3 grid grid-cols-3 gap-3 border-t border-[var(--color-border)] pt-3">
                      <div>
                        <dt className={MICRO_LABEL}>Period</dt>
                        <dd className="mt-1 text-sm font-semibold text-[var(--color-text-secondary)]">{inv.month}</dd>
                      </div>
                      <div>
                        <dt className={MICRO_LABEL}>Hours</dt>
                        <dd className="mt-1 text-sm font-semibold text-[var(--color-text-secondary)]">{inv.total_hours}h</dd>
                      </div>
                      <div>
                        <dt className={MICRO_LABEL}>Amount</dt>
                        <dd className="mt-1 text-md font-black text-[var(--color-text-primary)]">{fmt(inv.total_amount)}</dd>
                      </div>
                    </dl>
                    <Button
                      size="sm"
                      variant="secondary"
                      fullWidth
                      className="mt-4"
                      leadingIcon={<Printer size={14} aria-hidden="true" />}
                      onClick={() => setPrintInvoice(inv)}
                      aria-label={`Download invoice ${inv.invoice_number}`}
                      style={{ background: tint(vc, 10), color: vc, borderColor: tint(vc, 25) }}
                    >
                      Download
                    </Button>
                  </Card>
                ))}
              </div>

              <Card padding="none" className="hidden overflow-hidden shadow-sm md:block" style={{ borderColor: tint(vc, 25) }}>
                <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5 md:p-6">
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Your Invoices</h3>
                  <span className={cn('rounded-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-1', MICRO_LABEL)}>
                    {invoices.length} total
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <caption className="sr-only">Your invoices, {invoices.length} in total</caption>
                    <thead>
                      <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                        {['Invoice', 'Period', 'Hours', 'Amount', 'Status', 'Action'].map(h => (
                          <th key={h} scope="col" className={cn(TH, h === 'Action' ? 'text-right' : 'text-left')}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv, idx) => (
                        <tr key={idx} className="border-b border-[var(--color-border)] transition-colors last:border-b-0 hover:bg-[var(--color-bg-card-hover)]">
                          <td className="px-5 py-4">
                            <div className="text-base font-bold text-[var(--color-text-primary)]">{inv.invoice_number}</div>
                            <div className="mt-1 text-label font-medium text-[var(--color-text-muted)]">
                              Issued: {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString() : '—'}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm font-semibold text-[var(--color-text-secondary)]">{inv.month}</td>
                          <td className="px-5 py-4 text-sm font-semibold text-[var(--color-text-secondary)]">{inv.total_hours}h</td>
                          <td className="px-5 py-4 text-md font-black text-[var(--color-text-primary)]">{fmt(inv.total_amount)}</td>
                          <td className="px-5 py-4">
                            <Badge dot tone="warning">PENDING</Badge>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="ml-auto"
                              leadingIcon={<Printer size={14} aria-hidden="true" />}
                              onClick={() => setPrintInvoice(inv)}
                              aria-label={`Download invoice ${inv.invoice_number}`}
                              style={{ background: tint(vc, 10), color: vc, borderColor: tint(vc, 25) }}
                            >
                              Download
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Documents Tab */}
      {tab === 'documents' && (
        <div {...panelProps}>
          {documents.length === 0 ? (
            <EmptyState
              icon={<FileText size={24} />}
              title="No shared documents"
              description="Contracts, specs and reports your team shares with you will show up here."
            />
          ) : (
            <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {documents.map(doc => (
                <li key={doc.id}>
                  {/* Not a link or a button — this list is read-only, so the
                      previous `cursor-pointer` was promising a click that the
                      component never handled. */}
                  <Card padding="sm" className="flex h-full items-center gap-4" style={{ borderColor: tint(vc, 20) }}>
                    <div
                      aria-hidden="true"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
                      style={{ background: tint(vc, 10), color: vc, borderColor: tint(vc, 25) }}
                    >
                      {docIcon(doc.file_type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[var(--color-text-primary)]" title={doc.file_name}>
                        {doc.file_name}
                      </p>
                      <p className="mt-1 truncate text-label font-medium text-[var(--color-text-muted)]">
                        by {doc.uploaded_by} • {shortDate(doc.created_at)}
                      </p>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
