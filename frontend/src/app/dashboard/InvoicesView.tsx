'use client';

import { useState } from 'react';
import type { User } from '@/lib/constants';
import toast from 'react-hot-toast';
import { apiGet, errMsg } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import type { Envelope } from '@/lib/types';
import { ArrowLeft, Printer, Receipt, Sparkles } from 'lucide-react';
import {
  AsyncState,
  Badge,
  Button,
  Card,
  EmptyState,
  SkeletonTable,
  type BadgeTone,
} from '@/components/ui';

interface Invoice {
  id: string;
  invoice_number: string;
  venture_id: number;
  venture_name: string;
  month: string;
  total_hours: number;
  total_amount: number;
  status: string;
  issue_date: string;
}

interface InvoiceItem {
  id: number;
  date: string;
  developer?: string;
  project: string;
  task: string;
  hours: number;
  /** Absent for client viewers (hours-only). */
  amount?: number | null;
}

interface InvoiceDetails {
  id: string;
  invoice_number: string;
  month: string;
  venture_name: string;
  items: InvoiceItem[];
  total_hours: number;
  total_amount: number;
  billing_rate?: number | null;
  unrated_hours?: number;
  rate_missing?: boolean;
  issue_date: string;
  due_date: string;
}

/** Status → semantic token tone. Never hard-code the colour at the call site. */
const STATUS_TONE: Record<string, BadgeTone> = {
  paid: 'success',
  pending: 'warning',
  overdue: 'danger',
  cancelled: 'neutral',
};

const TH_CLASS =
  'px-4 py-4 text-label font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)] whitespace-nowrap';

export default function InvoicesView({ currentUser }: { currentUser: User }) {
  const list = useApi('invoices', async (signal) => (await apiGet<Envelope<Invoice[]>>('/invoices', signal)).data ?? [], { toastOnError: 'Failed to load invoices' });
  const invoices = list.data ?? [];
  const loading = list.loading;
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  // Which row is being fetched, so the spinner sits on the button that was
  // actually pressed rather than disabling the whole column silently.
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  const viewInvoice = async (id: string) => {
    try {
      setLoadingDetails(true);
      setLoadingId(id);
      const res = await apiGet<Envelope<InvoiceDetails>>(`/invoices/${id}`);
      if (res.success) {
        setSelectedInvoice(res.data);
      }
    } catch (err) {
      toast.error(errMsg(err, 'Failed to load invoice details'));
    } finally {
      setLoadingDetails(false);
      setLoadingId(null);
    }
  };

  const handlePrint = () => {
    // window.print() blocks the main thread, so the busy state is committed on
    // a later tick — otherwise the button never visibly changes.
    setPrinting(true);
    setTimeout(() => {
      try {
        window.print();
      } finally {
        setPrinting(false);
      }
    }, 50);
  };

  const formatCurrency = (num: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);

  if (selectedInvoice) {
    const hasAmounts = selectedInvoice.items.some((i) => i.amount !== undefined);
    return (
      <div className="print-container relative">
        {/* Actions - hidden when printing */}
        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="secondary"
            leadingIcon={<ArrowLeft size={16} aria-hidden="true" />}
            onClick={() => setSelectedInvoice(null)}
          >
            Back to Invoices
          </Button>
          <Button
            variant="primary"
            loading={printing}
            leadingIcon={<Printer size={16} aria-hidden="true" />}
            onClick={handlePrint}
          >
            Print / Save PDF
          </Button>
        </div>

        {/*
          Invoice Paper — deliberately fixed light colours.
          This block is a printed document, not app chrome: it must render
          black-on-white on paper and in the PDF regardless of the app theme,
          so it uses the fixed neutral palette rather than the theme tokens.
        */}
        <div
          className="invoice-paper min-h-[842px] rounded-2xl bg-white px-6 py-8 text-black shadow-[0_20px_40px_rgba(0,0,0,0.1)] sm:px-10 md:px-[60px] md:py-10"
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          <div className="mb-8 flex flex-wrap justify-between gap-6 border-b-2 border-gray-100 pb-8">
            <div>
              <div className="text-[28px] font-black tracking-[-1px] text-gray-900">INVOICE</div>
              <div className="mt-2 text-base text-gray-500">{selectedInvoice.invoice_number}</div>
              <div className="mt-1 text-base text-gray-500">Billing Period: {selectedInvoice.month}</div>
            </div>
            <div className="text-right">
              <div className="mb-3 flex items-center justify-end gap-3">
                <div
                  aria-hidden="true"
                  className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-violet-500 text-white"
                >
                  <Sparkles size={20} />
                </div>
                <div className="text-xl font-extrabold text-gray-900">InternalX</div>
              </div>
              <div className="text-sm text-gray-600">Dropwing Groups</div>
              <div className="text-sm text-gray-600">Dropwing Groups, India</div>
            </div>
          </div>

          <div className="mb-10 flex flex-wrap justify-between gap-6">
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-[1px] text-gray-400">Bill To:</div>
              <div className="text-lg font-bold text-gray-900">{selectedInvoice.venture_name}</div>
              {currentUser.accessLevel === 9 && (
                <div className="mt-1 text-base text-gray-600">Attn: {currentUser.fullName}</div>
              )}
            </div>
            <div className="text-right">
              <div className="flex justify-end gap-10">
                <div>
                  <div className="mb-1 text-xs font-bold uppercase tracking-[1px] text-gray-400">Issue Date</div>
                  <div className="text-base font-semibold text-gray-900">{selectedInvoice.issue_date}</div>
                </div>
                <div>
                  <div className="mb-1 text-xs font-bold uppercase tracking-[1px] text-gray-400">Due Date</div>
                  <div className="text-base font-semibold text-gray-900">{selectedInvoice.due_date}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="-mx-6 mb-10 overflow-x-auto px-6 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[520px] border-collapse">
              <caption className="sr-only">
                Line items for invoice {selectedInvoice.invoice_number}, billing period {selectedInvoice.month}
              </caption>
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th scope="col" className="py-3 text-left text-sm uppercase text-gray-500">Description</th>
                  <th scope="col" className="py-3 text-center text-sm uppercase text-gray-500">Date</th>
                  <th scope="col" className="py-3 text-center text-sm uppercase text-gray-500">Hours</th>
                  {hasAmounts && <th scope="col" className="py-3 text-right text-sm uppercase text-gray-500">Amount</th>}
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="max-w-[300px] py-4">
                      <div className="text-base font-semibold text-gray-900">{item.task}</div>
                      <div className="mt-1 text-xs text-gray-500">{[item.project, item.developer].filter(Boolean).join(' • ')}</div>
                    </td>
                    <td className="py-4 text-center text-base text-gray-600">
                      {new Date(item.date).toLocaleDateString()}
                    </td>
                    <td className="py-4 text-center text-base text-gray-600">
                      {item.hours}
                    </td>
                    {hasAmounts && (
                      <td className="py-4 text-right text-base font-semibold text-gray-900">
                        {item.amount == null ? '—' : formatCurrency(item.amount)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <div className="w-full max-w-[300px]">
              <div className="flex justify-between gap-4 border-b border-gray-100 py-3">
                <span className="text-base text-gray-500">Subtotal ({selectedInvoice.total_hours} hrs{selectedInvoice.billing_rate != null ? ` @ $${selectedInvoice.billing_rate}/hr` : ''}{selectedInvoice.rate_missing ? `, ${selectedInvoice.unrated_hours ?? 0} hrs have no rate set` : ''})</span>
                <span className="text-base font-semibold text-gray-900">{formatCurrency(selectedInvoice.total_amount)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b-2 border-gray-200 py-4">
                <span className="text-lg font-extrabold text-gray-900">Total Due</span>
                <span className="text-2xl font-black text-emerald-500">{formatCurrency(selectedInvoice.total_amount)}</span>
              </div>
            </div>
          </div>

          <div className="mt-16 border-t border-gray-200 pt-8 text-center text-xs text-gray-400">
            Payment is due within 15 days of the issue date. Please include the invoice number on your check or wire transfer.
            <br />
            Thank you for your business!
          </div>
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body * { visibility: hidden; }
            .print-container, .print-container * { visibility: visible; }
            .no-print { display: none !important; }
            .print-container { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
            .invoice-paper { box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
            body { background: white; }
          }
        `}} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-extrabold text-[var(--color-text-primary)]">
          Billing &amp; Invoices
        </h2>
        <p className="mt-1 text-base text-[var(--color-text-muted)]">
          {currentUser.accessLevel === 9 ? 'View and download your monthly statements and deliverables.' : 'Manage generated invoices for client ventures.'}
        </p>
      </div>

      <AsyncState loading={loading} error={list.error} onRetry={list.refetch} what="invoices" skeleton={<SkeletonTable rows={5} columns={currentUser.accessLevel === 9 ? 6 : 7} />}>
      {invoices.length === 0 ? (
        <EmptyState
          icon={<Receipt size={24} />}
          title="No invoices yet"
          description={
            currentUser.accessLevel === 9
              ? 'Statements appear here once your monthly timesheets have been approved and billed.'
              : 'Invoices are generated from approved timesheets. Approve a billing period to create the first one.'
          }
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <caption className="sr-only">
                Generated invoices, {invoices.length} in total
              </caption>
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                  <th scope="col" className={TH_CLASS}>Invoice</th>
                  {currentUser.accessLevel !== 9 && <th scope="col" className={TH_CLASS}>Client / Venture</th>}
                  <th scope="col" className={TH_CLASS}>Period</th>
                  <th scope="col" className={TH_CLASS}>Hours</th>
                  <th scope="col" className={TH_CLASS}>Amount</th>
                  <th scope="col" className={TH_CLASS}>Status</th>
                  <th scope="col" className={`${TH_CLASS} text-right`}>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr
                    key={inv.id}
                    className="border-b border-[var(--color-border)] transition-colors last:border-b-0 hover:bg-[var(--color-bg-card-hover)]"
                  >
                    <td className="px-4 py-4">
                      <div className="text-base font-bold text-[var(--color-text-primary)]">{inv.invoice_number}</div>
                      <div className="mt-0.5 text-label text-[var(--color-text-muted)]">Issued: {inv.issue_date}</div>
                    </td>
                    {currentUser.accessLevel !== 9 && (
                      <td className="px-4 py-4 text-sm font-semibold text-[var(--color-text-primary)]">
                        {inv.venture_name}
                      </td>
                    )}
                    <td className="px-4 py-4 text-sm text-[var(--color-text-secondary)]">
                      {inv.month}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-text-secondary)]">
                      {inv.total_hours}h
                    </td>
                    <td className="px-4 py-4 text-base font-bold text-[var(--color-text-primary)]">
                      {formatCurrency(inv.total_amount)}
                    </td>
                    <td className="px-4 py-4">
                      <Badge dot tone={STATUS_TONE[(inv.status || 'pending').toLowerCase()] ?? 'warning'}>
                        {(inv.status || 'pending').toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => viewInvoice(inv.id)}
                        disabled={loadingDetails}
                        loading={loadingId === inv.id}
                        aria-label={`View & Print invoice ${inv.invoice_number}`}
                      >
                        View &amp; Print
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      </AsyncState>
    </div>
  );
}
