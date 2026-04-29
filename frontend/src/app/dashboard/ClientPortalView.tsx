'use client';
import { useEffect, useState, useCallback } from 'react';
import { User } from '@/lib/constants';
import api from '@/lib/api';

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

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/client-portal/overview');
      if (res.data.success) setData(res.data.data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const vc = data?.venture?.primary_color || '#f43f5e';

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 48, height: 48, border: `3px solid ${vc}30`, borderTop: `3px solid ${vc}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Loading your portal…</p>
    </div>
  );

  const v = data?.venture;
  const projects = data?.projects || [];
  const deliverables = data?.deliverables || [];
  const invoices = data?.invoices || [];
  const documents = data?.documents || [];

  if (printInvoice) return (
    <div style={{ position: 'relative' }}>
      <div style={{ marginBottom: 16, display: 'flex', gap: 12 }} className="no-print">
        <button onClick={() => setPrintInvoice(null)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', cursor: 'pointer', fontWeight: 600 }}>← Back</button>
        <button onClick={() => window.print()} style={{ padding: '8px 16px', borderRadius: 8, background: `linear-gradient(135deg, ${vc}, #06b6d4)`, border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>🖨️ Print / Save PDF</button>
      </div>
      <div className="invoice-paper" style={{ background: '#fff', color: '#000', padding: '48px 60px', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', fontFamily: 'system-ui, sans-serif', minHeight: 700 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `3px solid ${vc}`, paddingBottom: 28, marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#111', letterSpacing: -1 }}>INVOICE</div>
            <div style={{ fontSize: 14, color: '#6b7280', marginTop: 6 }}>{printInvoice.invoice_number}</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Period: {printInvoice.month}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end', marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: `linear-gradient(135deg, #8b5cf6, #06b6d4)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>✦</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#111' }}>InternalX</div>
            </div>
            <div style={{ fontSize: 13, color: '#4b5563' }}>Dropwing Groups LLC</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Bill To:</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>{v?.name || 'Client'}</div>
            <div style={{ fontSize: 13, color: '#4b5563', marginTop: 2 }}>{currentUser.fullName}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Issue Date</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{printInvoice.issue_date ? new Date(printInvoice.issue_date).toLocaleDateString() : '—'}</div>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 40 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${vc}40` }}>
              {['Description', 'Hours', 'Rate', 'Amount'].map(h => (
                <th key={h} style={{ padding: '12px 0', fontSize: 12, color: '#6b7280', textTransform: 'uppercase', textAlign: h === 'Amount' || h === 'Rate' || h === 'Hours' ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '18px 0' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>Professional Services — {printInvoice.month}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>Development, design & consulting hours</div>
              </td>
              <td style={{ padding: '18px 0', textAlign: 'right', fontSize: 14 }}>{printInvoice.total_hours}h</td>
              <td style={{ padding: '18px 0', textAlign: 'right', fontSize: 14 }}>$50/hr</td>
              <td style={{ padding: '18px 0', textAlign: 'right', fontSize: 14, fontWeight: 700 }}>{fmt(printInvoice.total_amount)}</td>
            </tr>
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 280 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderTop: `2px solid ${vc}` }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#111' }}>Total Due</span>
              <span style={{ fontSize: 24, fontWeight: 900, color: vc }}>{fmt(printInvoice.total_amount)}</span>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid #e5e7eb', fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
          Payment due within 15 days. Thank you for your partnership!
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html:`@media print{body *{visibility:hidden}.invoice-paper,.invoice-paper *{visibility:visible}.no-print{display:none!important}.invoice-paper{position:fixed;left:0;top:0;width:100%;box-shadow:none!important}}`}} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Branded header */}
      <div style={{ borderRadius: 20, padding: '28px 32px', background: `linear-gradient(135deg, ${vc}20, ${vc}08)`, border: `1px solid ${vc}35`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -30, top: -30, width: 200, height: 200, borderRadius: '50%', background: `${vc}08` }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
          <div style={{ width: 50, height: 50, borderRadius: 14, background: `linear-gradient(135deg, ${vc}, ${vc}80)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🤝</div>
          <div>
            <div style={{ fontSize: 11, color: vc, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 }}>Client Portal</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>{v?.name || currentUser.venture?.name || 'Your Portal'}</h2>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', maxWidth: 600 }}>
          Welcome, <strong style={{ color: vc }}>{currentUser.fullName}</strong>. Here's your real-time project status, deliverables, and billing overview.
          {v?.description && ` — ${v.description}`}
        </p>
        <div style={{ marginTop: 16, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[{ label: 'Projects', val: projects.length, c: vc }, { label: 'Deliverables', val: deliverables.length, c: '#06b6d4' }, { label: 'Invoices', val: invoices.length, c: '#10b981' }, { label: 'Documents', val: documents.length, c: '#f59e0b' }].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.c }}>{s.val}</div>
              <div style={{ fontSize: 10, color: 'var(--color-text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[{ id: 'overview', label: 'Projects', icon: '📁' }, { id: 'deliverables', label: 'Deliverables', icon: '✅' }, { id: 'invoices', label: 'Invoices', icon: '🧾' }, { id: 'documents', label: 'Documents', icon: '📄' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)} style={{ padding: '8px 16px', borderRadius: 10, border: tab === t.id ? `1px solid ${vc}40` : '1px solid transparent', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.2s', background: tab === t.id ? `${vc}20` : 'rgba(255,255,255,0.04)', color: tab === t.id ? vc : 'var(--color-text-muted)' }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* Projects */}
      {tab === 'overview' && (
        projects.length === 0 ? (
          <div className="glass" style={{ borderRadius: 16, padding: 60, textAlign: 'center', border: '1px dashed var(--color-border)' }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>📁</div>
            <p style={{ color: 'var(--color-text-muted)' }}>No active projects found for your account.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {projects.map(p => (
              <div key={p.id} className="glass" style={{ borderRadius: 16, padding: '20px 22px', border: `1px solid ${vc}20` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)', flex: 1, marginRight: 10 }}>{p.title}</div>
                  <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: `${STATUS_COLOR[p.status] || '#64748b'}20`, color: STATUS_COLOR[p.status] || '#64748b', flexShrink: 0 }}>{p.status?.toUpperCase()}</span>
                </div>
                {p.description && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 14, lineHeight: 1.5 }}>{p.description.slice(0, 100)}{p.description.length > 100 ? '…' : ''}</p>}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Progress</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: vc }}>{p.progress || 0}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div style={{ width: `${p.progress || 0}%`, height: '100%', background: `linear-gradient(90deg, ${vc}, ${vc}80)`, borderRadius: 4, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {p.end_date && <span>Due: {new Date(p.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>}
                  {p.manager_name && <span>PM: {p.manager_name}</span>}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Deliverables */}
      {tab === 'deliverables' && (
        deliverables.length === 0 ? (
          <div className="glass" style={{ borderRadius: 16, padding: 60, textAlign: 'center', border: '1px dashed var(--color-border)' }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>✅</div>
            <p style={{ color: 'var(--color-text-muted)' }}>No deliverables assigned to you yet.</p>
          </div>
        ) : (
          <div className="glass" style={{ borderRadius: 20, overflow: 'hidden', border: `1px solid ${vc}20` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-secondary)' }}>
                  {['Deliverable', 'Priority', 'Status', 'Due Date', 'Assigned By'].map(h => (
                    <th key={h} style={{ padding: '14px 18px', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deliverables.map(d => (
                  <tr key={d.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '16px 18px' }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)' }}>{d.title}</div>
                      {d.description && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3 }}>{d.description.slice(0, 80)}…</div>}
                    </td>
                    <td style={{ padding: '16px 18px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: `${PRIORITY_COLOR[d.priority] || '#64748b'}20`, color: PRIORITY_COLOR[d.priority] || '#64748b' }}>{d.priority?.toUpperCase()}</span>
                    </td>
                    <td style={{ padding: '16px 18px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: `${STATUS_COLOR[d.status] || '#64748b'}20`, color: STATUS_COLOR[d.status] || '#64748b' }}>{d.status?.replace('-', ' ').toUpperCase()}</span>
                    </td>
                    <td style={{ padding: '16px 18px', fontSize: 13, color: d.due_date && new Date(d.due_date) < new Date() ? '#f43f5e' : 'var(--color-text-secondary)' }}>
                      {d.due_date ? new Date(d.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '16px 18px', fontSize: 13, color: 'var(--color-text-secondary)' }}>{d.assigned_by_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Invoices */}
      {tab === 'invoices' && (
        invoices.length === 0 ? (
          <div className="glass" style={{ borderRadius: 16, padding: 60, textAlign: 'center', border: '1px dashed var(--color-border)' }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>🧾</div>
            <p style={{ color: 'var(--color-text-muted)' }}>No invoices generated yet. Timesheets must be approved first.</p>
          </div>
        ) : (
          <div className="glass" style={{ borderRadius: 20, overflow: 'hidden', border: `1px solid ${vc}20` }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)' }}>Your Invoices</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-secondary)' }}>
                  {['Invoice', 'Period', 'Hours', 'Amount', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ padding: '14px 18px', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, textAlign: h === 'Action' ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, idx) => (
                  <tr key={idx} style={{ borderTop: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '16px 18px' }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)' }}>{inv.invoice_number}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Issued: {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString() : '—'}</div>
                    </td>
                    <td style={{ padding: '16px 18px', fontSize: 13, color: 'var(--color-text-secondary)' }}>{inv.month}</td>
                    <td style={{ padding: '16px 18px', fontSize: 13, color: 'var(--color-text-secondary)' }}>{inv.total_hours}h</td>
                    <td style={{ padding: '16px 18px', fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>{fmt(inv.total_amount)}</td>
                    <td style={{ padding: '16px 18px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>PENDING</span>
                    </td>
                    <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                      <button onClick={() => setPrintInvoice(inv)} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${vc}40`, background: `${vc}15`, color: vc, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>🖨️ Download</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Documents */}
      {tab === 'documents' && (
        documents.length === 0 ? (
          <div className="glass" style={{ borderRadius: 16, padding: 60, textAlign: 'center', border: '1px dashed var(--color-border)' }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>📄</div>
            <p style={{ color: 'var(--color-text-muted)' }}>No shared documents yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {documents.map(doc => (
              <div key={doc.id} className="glass" style={{ borderRadius: 14, padding: '16px 18px', border: `1px solid ${vc}15`, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${vc}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  {doc.file_type?.includes('pdf') ? '📕' : doc.file_type?.includes('image') ? '🖼️' : doc.file_type?.includes('spreadsheet') || doc.file_type?.includes('excel') ? '📊' : '📄'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.file_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>by {doc.uploaded_by} • {new Date(doc.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
