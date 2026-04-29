import { useState, useEffect } from 'react';
import { User } from '@/lib/constants';
import toast from 'react-hot-toast';
import api from '@/lib/api';

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
  developer: string;
  project: string;
  task: string;
  hours: number;
  amount: number;
}

interface InvoiceDetails {
  id: string;
  invoice_number: string;
  month: string;
  venture_name: string;
  items: InvoiceItem[];
  total_hours: number;
  total_amount: number;
  billing_rate: number;
  issue_date: string;
  due_date: string;
}

export default function InvoicesView({ currentUser }: { currentUser: User }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await api.get('/invoices');
      if (res.data.success) {
        setInvoices(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const viewInvoice = async (id: string) => {
    try {
      setLoadingDetails(true);
      const res = await api.get(`/invoices/${id}`);
      if (res.data.success) {
        setSelectedInvoice(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load invoice details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (num: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);

  if (selectedInvoice) {
    return (
      <div className="fade-in print-container" style={{ position: 'relative' }}>
        {/* Actions - hidden when printing */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <button 
            onClick={() => setSelectedInvoice(null)}
            style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', cursor: 'pointer', fontWeight: 600 }}
          >
            ← Back to Invoices
          </button>
          <button 
            onClick={handlePrint}
            style={{ padding: '8px 16px', borderRadius: 8, background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <span>🖨️</span> Print / Save PDF
          </button>
        </div>

        {/* Invoice Paper */}
        <div 
          className="invoice-paper"
          style={{ 
            background: '#fff', color: '#000', padding: '40px 60px', 
            borderRadius: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            minHeight: '842px', // A4 height approx
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #f3f4f6', paddingBottom: 32, marginBottom: 32 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#111827', letterSpacing: -1 }}>INVOICE</div>
              <div style={{ fontSize: 14, color: '#6b7280', marginTop: 8 }}>{selectedInvoice.invoice_number}</div>
              <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Billing Period: {selectedInvoice.month}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20 }}>✦</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>InternalX</div>
              </div>
              <div style={{ fontSize: 13, color: '#4b5563' }}>Dropwing Groups LLC</div>
              <div style={{ fontSize: 13, color: '#4b5563' }}>123 Innovation Drive</div>
              <div style={{ fontSize: 13, color: '#4b5563' }}>Tech City, TX 75001</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Bill To:</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{selectedInvoice.venture_name}</div>
              {currentUser.accessLevel === 9 && (
                <div style={{ fontSize: 14, color: '#4b5563', marginTop: 4 }}>Attn: {currentUser.fullName}</div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 40 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Issue Date</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{selectedInvoice.issue_date}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Due Date</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{selectedInvoice.due_date}</div>
                </div>
              </div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 40 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '12px 0', fontSize: 13, color: '#6b7280', textTransform: 'uppercase' }}>Description</th>
                <th style={{ textAlign: 'center', padding: '12px 0', fontSize: 13, color: '#6b7280', textTransform: 'uppercase' }}>Date</th>
                <th style={{ textAlign: 'center', padding: '12px 0', fontSize: 13, color: '#6b7280', textTransform: 'uppercase' }}>Hours</th>
                <th style={{ textAlign: 'right', padding: '12px 0', fontSize: 13, color: '#6b7280', textTransform: 'uppercase' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {selectedInvoice.items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '16px 0', maxWidth: 300 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{item.task}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{item.project} • {item.developer}</div>
                  </td>
                  <td style={{ padding: '16px 0', textAlign: 'center', fontSize: 14, color: '#4b5563' }}>
                    {new Date(item.date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '16px 0', textAlign: 'center', fontSize: 14, color: '#4b5563' }}>
                    {item.hours}
                  </td>
                  <td style={{ padding: '16px 0', textAlign: 'right', fontSize: 14, fontWeight: 600, color: '#111827' }}>
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: 300 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: 14, color: '#6b7280' }}>Subtotal ({selectedInvoice.total_hours} hrs @ ${selectedInvoice.billing_rate}/hr)</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{formatCurrency(selectedInvoice.total_amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: '2px solid #e5e7eb' }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>Total Due</span>
                <span style={{ fontSize: 24, fontWeight: 900, color: '#10b981' }}>{formatCurrency(selectedInvoice.total_amount)}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 60, paddingTop: 32, borderTop: '1px solid #e5e7eb', fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
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
    <div className="fade-in">
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)' }}>
          Billing & Invoices
        </h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
          {currentUser.accessLevel === 9 ? 'View and download your monthly statements and deliverables.' : 'Manage generated invoices for client ventures.'}
        </p>
      </div>

      <div className="glass" style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>🧾</div>
            <p>No invoices generated yet.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '16px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Invoice</th>
                {currentUser.accessLevel !== 9 && <th style={{ padding: '16px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Client / Venture</th>}
                <th style={{ padding: '16px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Period</th>
                <th style={{ padding: '16px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Hours</th>
                <th style={{ padding: '16px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Amount</th>
                <th style={{ padding: '16px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '16px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.2s' }} className="hover-bg-tertiary">
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)' }}>{inv.invoice_number}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Issued: {inv.issue_date}</div>
                  </td>
                  {currentUser.accessLevel !== 9 && (
                    <td style={{ padding: '16px', fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 600 }}>
                      {inv.venture_name}
                    </td>
                  )}
                  <td style={{ padding: '16px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    {inv.month}
                  </td>
                  <td style={{ padding: '16px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    {inv.total_hours}h
                  </td>
                  <td style={{ padding: '16px', fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {formatCurrency(inv.total_amount)}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: 'rgba(245,158,11,0.15)', color: '#f59e0b'
                    }}>
                      {inv.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button
                      onClick={() => viewInvoice(inv.id)}
                      disabled={loadingDetails}
                      style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                    >
                      View & Print
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
