'use client';

import type { User } from '@/lib/constants';
import { Printer, ArrowLeft, Sparkles } from 'lucide-react';
import { Button, cn, tint } from '@/components/ui';
import { Venture, Invoice, fmt } from './model';

export default function InvoicePrint({ invoice, venture, user, vc, printing, onBack, onPrint }: { invoice: Invoice; venture: Venture | null; user: User; vc: string; printing: boolean; onBack: () => void; onPrint: () => void }) {
  const v = venture;
  return (
    <div className="relative">
      <div className="no-print mb-4 flex flex-wrap gap-3">
        <Button
          variant="secondary"
          leadingIcon={<ArrowLeft size={16} aria-hidden="true" />}
          onClick={() => onBack()}
        >
          Back
        </Button>
        <Button
          variant="primary"
          loading={printing}
          leadingIcon={<Printer size={16} aria-hidden="true" />}
          onClick={onPrint}
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
            <div className="mt-2 text-sm font-bold text-gray-500">{invoice.invoice_number}</div>
            <div className="mt-1 text-sm font-medium text-gray-500">Period: {invoice.month}</div>
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
            <div className="mt-1 text-sm font-medium text-gray-600">{user.fullName}</div>
          </div>
          <div className="text-right">
            <div className="mb-2 text-label font-bold uppercase tracking-widest text-gray-400">Issue Date</div>
            <div className="text-base font-bold text-gray-900">
              {invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : '—'}
            </div>
          </div>
        </div>

        <div className="-mx-6 mb-10 overflow-x-auto px-6 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[480px] border-collapse">
            <caption className="sr-only">
              Invoice {invoice.invoice_number} line items for {invoice.month}
            </caption>
            <thead>
              <tr className="border-b-2" style={{ borderColor: tint(vc, 25) }}>
                {['Description', 'Hours', 'Amount'].map(h => (
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
                  <div className="text-md font-bold text-gray-900">Professional Services — {invoice.month}</div>
                  <div className="mt-1 text-sm font-medium text-gray-500">Approved hours on your projects</div>
                </td>
                <td className="py-5 text-right text-sm font-bold text-gray-700">{invoice.total_hours}h</td>
                <td className="py-5 text-right text-base font-black text-gray-900">{fmt(invoice.total_amount)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <div className="w-full max-w-[280px] border-t-2 pt-4" style={{ borderColor: vc }}>
            <div className="flex items-center justify-between gap-4">
              <span className="text-lg font-black text-gray-900">Total Due</span>
              <span className="text-2xl font-black" style={{ color: vc }}>{fmt(invoice.total_amount)}</span>
            </div>
          </div>
        </div>

        <div className="mt-16 border-t border-gray-200 pt-6 text-center text-label font-bold uppercase tracking-wider text-gray-400">
          Thank you for your partnership.
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html:`@media print{body *{visibility:hidden}.invoice-paper,.invoice-paper *{visibility:visible}.no-print{display:none!important}.invoice-paper{position:fixed;left:0;top:0;width:100%;box-shadow:none!important;border-radius:0}}`}} />
    </div>
  );
}
