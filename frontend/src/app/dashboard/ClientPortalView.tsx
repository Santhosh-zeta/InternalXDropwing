'use client';
import { useEffect, useState, useCallback } from 'react';
import { User } from '@/lib/constants';
import api from '@/lib/api';
import {
  Loader2, Printer, ArrowLeft, Briefcase, FileCheck,
  Receipt, FileText, CheckCircle2, CircleDashed, Clock,
  File, FileImage, FileSpreadsheet, Sparkles, Building2
} from 'lucide-react';

interface Venture { id: number; name: string; slug: string; primary_color: string; description: string; logo_url: string; }
interface Project { id: number; title: string; description: string; status: string; progress: number; start_date: string; end_date: string; budget: number; manager_name: string; }
interface Deliverable { id: number; title: string; description: string; status: string; priority: string; due_date: string; created_at: string; assigned_by_name: string; }
interface Invoice { invoice_number: string; month: string; total_hours: number; total_amount: number; status: string; issue_date: string; }
interface Document { id: number; file_name: string; file_size: number; file_type: string; created_at: string; uploaded_by: string; category: string; }
interface PortalData { venture: Venture | null; projects: Project[]; deliverables: Deliverable[]; invoices: Invoice[]; documents: Document[]; }

const PRIORITY_COLOR: Record<string, string> = { urgent: '#f43f5e', high: '#f59e0b', medium: '#06b6d4', low: '#10b981' };
const STATUS_COLOR: Record<string, string> = { completed: '#10b981', 'in-progress': '#06b6d4', pending: '#f59e0b', active: '#10b981', planning: '#a78bfa', 'on-hold': '#64748b' };
const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export default function ClientPortalView({ currentUser }: { currentUser: User }) {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'deliverables' | 'invoices' | 'documents'>('overview');
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/client-portal/overview');
      if (res.data.success) setData(res.data.data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const vc = data?.venture?.primary_color || '#8b5cf6';

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
      <Loader2 size={48} className="animate-spin" style={{ color: vc }} />
      <p className="text-[var(--color-text-muted)] text-sm font-medium">Loading your portal…</p>
    </div>
  );

  const v = data?.venture;
  const projects = data?.projects || [];
  const deliverables = data?.deliverables || [];
  const invoices = data?.invoices || [];
  const documents = data?.documents || [];

  if (printInvoice) return (
    <div className="relative">
      <div className="mb-4 flex gap-3 no-print">
        <button
          onClick={() => setPrintInvoice(null)}
          className="px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-card)] text-[var(--color-text-primary)] transition-colors font-bold text-[13px] flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <button
          onClick={() => window.print()}
          className="px-4 py-2.5 rounded-xl text-white font-bold text-[13px] flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity"
          style={{ background: `linear-gradient(135deg, ${vc}, #06b6d4)` }}
        >
          <Printer size={16} /> Print / Save PDF
        </button>
      </div>
      <div className="invoice-paper bg-white text-black rounded-2xl p-12 shadow-[0_20px_60px_rgba(0,0,0,0.15)] font-sans min-h-[700px]">
        <div className="flex justify-between pb-7 mb-8 border-b-4" style={{ borderColor: vc }}>
          <div>
            <div className="text-4xl font-black text-gray-900 tracking-tight">INVOICE</div>
            <div className="text-sm font-bold text-gray-500 mt-2">{printInvoice.invoice_number}</div>
            <div className="text-sm text-gray-500 mt-1 font-medium">Period: {printInvoice.month}</div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2.5 justify-end mb-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)' }}>
                <Sparkles size={18} />
              </div>
              <div className="text-2xl font-black text-gray-900">InternalX</div>
            </div>
            <div className="text-sm font-semibold text-gray-600">Dropwing Groups LLC</div>
          </div>
        </div>
        <div className="flex justify-between mb-10">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Bill To:</div>
            <div className="text-lg font-black text-gray-900">{v?.name || 'Client'}</div>
            <div className="text-sm font-medium text-gray-600 mt-1">{currentUser.fullName}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Issue Date</div>
            <div className="text-base font-bold text-gray-900">{printInvoice.issue_date ? new Date(printInvoice.issue_date).toLocaleDateString() : '—'}</div>
          </div>
        </div>
        <table className="w-full border-collapse mb-10">
          <thead>
            <tr className="border-b-2" style={{ borderColor: `${vc}40` }}>
              {['Description', 'Hours', 'Rate', 'Amount'].map(h => (
                <th key={h} className={`py-3 text-xs font-bold text-gray-500 uppercase tracking-wider ${h !== 'Description' ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-5">
                <div className="text-[15px] font-bold text-gray-900">Professional Services — {printInvoice.month}</div>
                <div className="text-sm font-medium text-gray-500 mt-1">Development, design &amp; consulting hours</div>
              </td>
              <td className="py-5 text-right text-sm font-bold text-gray-700">{printInvoice.total_hours}h</td>
              <td className="py-5 text-right text-sm font-bold text-gray-700">$50/hr</td>
              <td className="py-5 text-right text-base font-black text-gray-900">{fmt(printInvoice.total_amount)}</td>
            </tr>
          </tbody>
        </table>
        <div className="flex justify-end">
          <div className="w-[280px] border-t-2 pt-4" style={{ borderColor: vc }}>
            <div className="flex justify-between items-center">
              <span className="text-lg font-black text-gray-900">Total Due</span>
              <span className="text-2xl font-black" style={{ color: vc }}>{fmt(printInvoice.total_amount)}</span>
            </div>
          </div>
        </div>
        <div className="mt-16 pt-6 border-t border-gray-200 text-[11px] font-bold text-gray-400 text-center uppercase tracking-wider">
          Payment due within 15 days. Thank you for your partnership!
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html:`@media print{body *{visibility:hidden}.invoice-paper,.invoice-paper *{visibility:visible}.no-print{display:none!important}.invoice-paper{position:fixed;left:0;top:0;width:100%;box-shadow:none!important;border-radius:0}}`}} />
    </div>
  );

  const TABS = [
    { id: 'overview', label: 'Projects', icon: <Briefcase size={15} /> },
    { id: 'deliverables', label: 'Deliverables', icon: <FileCheck size={15} /> },
    { id: 'invoices', label: 'Invoices', icon: <Receipt size={15} /> },
    { id: 'documents', label: 'Documents', icon: <FileText size={15} /> },
  ] as const;

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Branded header */}
      <div
        className="rounded-3xl p-8 relative overflow-hidden border shadow-sm"
        style={{ background: `linear-gradient(135deg, ${vc}15, ${vc}05)`, borderColor: `${vc}30` }}
      >
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full blur-3xl pointer-events-none" style={{ background: `${vc}20` }} />
        <div className="flex items-center gap-4 mb-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${vc}, ${vc}90)` }}>
            <Building2 size={26} />
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: vc }}>Client Portal</div>
            <h2 className="text-2xl font-black text-[var(--color-text-primary)] m-0">{v?.name || currentUser.venture?.name || 'Your Portal'}</h2>
          </div>
        </div>
        <p className="text-sm font-medium text-[var(--color-text-secondary)] max-w-2xl leading-relaxed relative z-10 mb-6">
          Welcome, <strong style={{ color: vc }}>{currentUser.fullName}</strong>. Here's your real-time project status, deliverables, and billing overview.
          {v?.description && ` — ${v.description}`}
        </p>
        <div className="flex gap-4 flex-wrap relative z-10 pt-5 border-t" style={{ borderColor: `${vc}20` }}>
          {[
            { label: 'Projects', val: projects.length, c: vc },
            { label: 'Deliverables', val: deliverables.length, c: '#06b6d4' },
            { label: 'Invoices', val: invoices.length, c: '#10b981' },
            { label: 'Documents', val: documents.length, c: '#f59e0b' },
          ].map(s => (
            <div key={s.label} className="text-center bg-[var(--color-bg-card)] px-6 py-3 rounded-2xl border shadow-sm" style={{ borderColor: `${s.c}20` }}>
              <div className="text-2xl font-black mb-0.5" style={{ color: s.c }}>{s.val}</div>
              <div className="text-[10px] font-bold text-[var(--color-text-muted)] tracking-widest uppercase">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-[var(--color-bg-secondary)] p-1 rounded-xl border border-[var(--color-border)] self-start">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-[13px] font-bold flex items-center gap-2 transition-all border ${
              tab === t.id
                ? 'bg-[var(--color-bg-card)] shadow-sm border-[var(--color-border)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] border-transparent'
            }`}
            style={tab === t.id ? { color: vc } : {}}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Projects Tab */}
      {tab === 'overview' && (
        projects.length === 0 ? (
          <div className="bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl p-16 text-center">
            <Briefcase size={48} className="mx-auto mb-4 text-[var(--color-text-muted)] opacity-50" />
            <p className="text-[var(--color-text-secondary)] font-medium">No active projects found for your account.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map(p => (
              <div
                key={p.id}
                className="bg-[var(--color-bg-card)] rounded-2xl p-6 border shadow-sm hover:shadow-md transition-all group"
                style={{ borderColor: `${vc}25`, borderLeftWidth: '4px', borderLeftColor: vc }}
              >
                <div className="flex justify-between items-start mb-3 gap-3">
                  <div className="font-bold text-base text-[var(--color-text-primary)] group-hover:text-[var(--color-purple-glow)] transition-colors line-clamp-2 leading-tight flex-1">{p.title}</div>
                  <span
                    className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 border"
                    style={{ background: `${STATUS_COLOR[p.status] || '#64748b'}15`, color: STATUS_COLOR[p.status] || '#64748b', borderColor: `${STATUS_COLOR[p.status] || '#64748b'}30` }}
                  >
                    {p.status?.replace('-', ' ')}
                  </span>
                </div>
                {p.description && <p className="text-[13px] text-[var(--color-text-secondary)] mb-5 line-clamp-2 leading-relaxed">{p.description}</p>}
                <div className="mb-4">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Progress</span>
                    <span className="text-[13px] font-black" style={{ color: vc }}>{p.progress || 0}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p.progress || 0}%`, background: `linear-gradient(90deg, ${vc}, ${vc}80)` }} />
                  </div>
                </div>
                <div className="flex justify-between text-[11px] font-bold text-[var(--color-text-muted)] pt-3 border-t border-[var(--color-border)]">
                  {p.end_date && (
                    <span className={`flex items-center gap-1 ${new Date(p.end_date) < new Date() && p.status !== 'completed' ? 'text-rose-500' : ''}`}>
                      <Clock size={12} /> {new Date(p.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                  )}
                  {p.manager_name && <span>PM: {p.manager_name}</span>}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Deliverables Tab */}
      {tab === 'deliverables' && (
        deliverables.length === 0 ? (
          <div className="bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl p-16 text-center">
            <FileCheck size={48} className="mx-auto mb-4 text-[var(--color-text-muted)] opacity-50" />
            <p className="text-[var(--color-text-secondary)] font-medium">No deliverables assigned to you yet.</p>
          </div>
        ) : (
          <div className="bg-[var(--color-bg-card)] rounded-2xl overflow-hidden border shadow-sm" style={{ borderColor: `${vc}25` }}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
                    {['Deliverable', 'Priority', 'Status', 'Due Date', 'Assigned By'].map(h => (
                      <th key={h} className="p-4 px-5 text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deliverables.map(d => (
                    <tr key={d.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition-colors">
                      <td className="p-4 px-5">
                        <div className="font-bold text-[14px] text-[var(--color-text-primary)] mb-1">{d.title}</div>
                        {d.description && <div className="text-[12px] font-medium text-[var(--color-text-muted)] line-clamp-1">{d.description}</div>}
                      </td>
                      <td className="p-4 px-5">
                        <span
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border"
                          style={{ background: `${PRIORITY_COLOR[d.priority] || '#64748b'}15`, color: PRIORITY_COLOR[d.priority] || '#64748b', borderColor: `${PRIORITY_COLOR[d.priority] || '#64748b'}30` }}
                        >
                          {d.priority}
                        </span>
                      </td>
                      <td className="p-4 px-5">
                        <span
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center w-max gap-1.5 border"
                          style={{ background: `${STATUS_COLOR[d.status] || '#64748b'}15`, color: STATUS_COLOR[d.status] || '#64748b', borderColor: `${STATUS_COLOR[d.status] || '#64748b'}30` }}
                        >
                          {d.status === 'completed' ? <CheckCircle2 size={11} /> : d.status === 'in-progress' ? <CircleDashed size={11} /> : <Clock size={11} />}
                          {d.status?.replace('-', ' ')}
                        </span>
                      </td>
                      <td className={`p-4 px-5 text-[13px] font-bold ${d.due_date && new Date(d.due_date) < new Date() && d.status !== 'completed' ? 'text-rose-500' : 'text-[var(--color-text-secondary)]'}`}>
                        {d.due_date ? new Date(d.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="p-4 px-5 text-[13px] font-semibold text-[var(--color-text-secondary)]">{d.assigned_by_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Invoices Tab */}
      {tab === 'invoices' && (
        invoices.length === 0 ? (
          <div className="bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl p-16 text-center">
            <Receipt size={48} className="mx-auto mb-4 text-[var(--color-text-muted)] opacity-50" />
            <p className="text-[var(--color-text-secondary)] font-medium">No invoices generated yet. Timesheets must be approved first.</p>
          </div>
        ) : (
          <div className="bg-[var(--color-bg-card)] rounded-2xl overflow-hidden border shadow-sm" style={{ borderColor: `${vc}25` }}>
            <div className="p-5 md:p-6 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex justify-between items-center">
              <div className="font-bold text-base text-[var(--color-text-primary)]">Your Invoices</div>
              <div className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider px-3 py-1 border border-[var(--color-border)] rounded-full bg-[var(--color-bg-primary)]">
                {invoices.length} total
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
                    {['Invoice', 'Period', 'Hours', 'Amount', 'Status', 'Action'].map(h => (
                      <th key={h} className={`p-4 px-5 text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider ${h === 'Action' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, idx) => (
                    <tr key={idx} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition-colors">
                      <td className="p-4 px-5">
                        <div className="font-bold text-[14px] text-[var(--color-text-primary)]">{inv.invoice_number}</div>
                        <div className="text-[11px] font-medium text-[var(--color-text-muted)] mt-1">Issued: {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString() : '—'}</div>
                      </td>
                      <td className="p-4 px-5 text-[13px] font-semibold text-[var(--color-text-secondary)]">{inv.month}</td>
                      <td className="p-4 px-5 text-[13px] font-semibold text-[var(--color-text-secondary)]">{inv.total_hours}h</td>
                      <td className="p-4 px-5 text-[15px] font-black text-[var(--color-text-primary)]">{fmt(inv.total_amount)}</td>
                      <td className="p-4 px-5">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">PENDING</span>
                      </td>
                      <td className="p-4 px-5 text-right">
                        <button
                          onClick={() => setPrintInvoice(inv)}
                          className="px-4 py-2 rounded-xl text-[12px] font-bold transition-all border flex items-center gap-2 ml-auto hover:opacity-90"
                          style={{ background: `${vc}15`, color: vc, borderColor: `${vc}30` }}
                        >
                          <Printer size={14} /> Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Documents Tab */}
      {tab === 'documents' && (
        documents.length === 0 ? (
          <div className="bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl p-16 text-center">
            <FileText size={48} className="mx-auto mb-4 text-[var(--color-text-muted)] opacity-50" />
            <p className="text-[var(--color-text-secondary)] font-medium">No shared documents yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {documents.map(doc => (
              <div
                key={doc.id}
                className="bg-[var(--color-bg-card)] rounded-2xl p-4 flex items-center gap-4 border shadow-sm hover:border-[var(--color-text-muted)] transition-colors cursor-pointer"
                style={{ borderColor: `${vc}20` }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border"
                  style={{ background: `${vc}15`, color: vc, borderColor: `${vc}30` }}
                >
                  {doc.file_type?.includes('pdf') ? <FileText size={20} /> : doc.file_type?.includes('image') ? <FileImage size={20} /> : doc.file_type?.includes('spreadsheet') || doc.file_type?.includes('excel') ? <FileSpreadsheet size={20} /> : <File size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[13px] text-[var(--color-text-primary)] truncate">{doc.file_name}</div>
                  <div className="text-[11px] font-medium text-[var(--color-text-muted)] mt-1 truncate">
                    by {doc.uploaded_by} • {new Date(doc.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
