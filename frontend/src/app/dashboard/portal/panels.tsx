'use client';

import { Printer, Briefcase, FileCheck, Receipt, FileText, Clock } from 'lucide-react';
import { Badge, Button, Card, EmptyState, cn, tint } from '@/components/ui';
import { Project, Deliverable, Invoice, Document, PRIORITY_TONE, STATUS_TONE, fmt, shortDate, longDate, isOverdue, statusIcon, docIcon, TH, MICRO_LABEL } from './model';

const panelProps = (tab: string) => ({
  role: 'tabpanel' as const,
  id: `client-portal-panel-${tab}`,
  'aria-labelledby': `client-portal-tab-${tab}`,
  tabIndex: 0,
  className: 'outline-none',
});

export function OverviewPanel({ projects, vc }: { projects: Project[]; vc: string }) {
  return (
    <div {...panelProps('overview')}>
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
  );
}

export function DeliverablesPanel({ deliverables, vc }: { deliverables: Deliverable[]; vc: string }) {
  return (
    <div {...panelProps('deliverables')}>
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
  );
}

export function InvoicesPanel({ invoices, vc, onOpen }: { invoices: Invoice[]; vc: string; onOpen: (inv: Invoice) => void }) {
  return (
    <div {...panelProps('invoices')}>
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
                  onClick={() => onOpen(inv)}
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
                          onClick={() => onOpen(inv)}
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
  );
}

export function DocumentsPanel({ documents, vc }: { documents: Document[]; vc: string }) {
  return (
    <div {...panelProps('documents')}>
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
  );
}

