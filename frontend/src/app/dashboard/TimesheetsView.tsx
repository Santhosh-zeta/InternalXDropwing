import { useState, useEffect } from 'react';
import { User } from '@/lib/constants';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface Timesheet {
  id: number;
  user_id: number;
  user_name: string;
  project_name: string | null;
  task_title: string | null;
  venture_name: string | null;
  venture_color: string | null;
  hours: string;
  activity_date: string;
  notes: string;
  status: 'pending' | 'approved' | 'rejected';
  hourly_rate: number;
  total_cost: number;
  created_at: string;
}

interface Financials {
  byVenture: { name: string; hours: number; cost: number }[];
  global: { totalHours: number; totalCost: number };
}

export default function TimesheetsView({ currentUser }: { currentUser: User }) {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [financials, setFinancials] = useState<Financials | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [hours, setHours] = useState('');
  const [activityDate, setActivityDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTimesheets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/timesheets');
      if (response.data.success) {
        setTimesheets(response.data.data);
      }
      
      if (currentUser.accessLevel <= 5) {
        const finRes = await api.get('/timesheets/financials');
        if (finRes.data.success) {
          setFinancials(finRes.data.data);
        }
      }
    } catch (err) {
      toast.error('Failed to load timesheets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimesheets();
  }, []);

  const handleLogHours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hours || parseFloat(hours) <= 0) return toast.error('Enter valid hours');
    
    try {
      setSubmitting(true);
      const response = await api.post('/timesheets', {
        hours: parseFloat(hours),
        activityDate,
        notes
      });
      if (response.data.success) {
        toast.success('Hours logged successfully');
        setHours('');
        setNotes('');
        fetchTimesheets();
      } else {
        toast.error(response.data.message || 'Failed to log hours');
      }
    } catch (err) {
      toast.error('Error logging hours');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: number, status: 'approved' | 'rejected') => {
    try {
      const response = await api.patch(`/timesheets/${id}/approve`, { status });
      if (response.data.success) {
        toast.success(`Timesheet ${status}`);
        fetchTimesheets();
      } else {
        toast.error(response.data.message || 'Update failed');
      }
    } catch (err) {
      toast.error('Error updating status');
    }
  };

  const isExecutive = currentUser.accessLevel <= 5;
  const formatCurrency = (num: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)' }}>
          {isExecutive ? 'Timesheets & Approvals' : 'My Timesheets'}
        </h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
          {isExecutive ? 'Review team hours, approve logs, and track labor costs.' : 'Log your daily hours and track your billable time.'}
        </p>
      </div>

      {isExecutive && financials && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 32 }}>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10" style={{ padding: 24, borderRadius: 16, border: '1px solid rgba(16,185,129,0.3)', background: 'linear-gradient(135deg, rgba(16,185,129,0.05) 0%, rgba(16,185,129,0.15) 100%)' }}>
            <div style={{ fontSize: 12, color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Total Billable Hours</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--color-text-primary)' }}>{financials.global.totalHours.toFixed(1)}h</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10" style={{ padding: 24, borderRadius: 16, border: '1px solid rgba(139,92,246,0.3)', background: 'linear-gradient(135deg, rgba(139,92,246,0.05) 0%, rgba(139,92,246,0.15) 100%)' }}>
            <div style={{ fontSize: 12, color: '#8b5cf6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Total Labor Cost</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--color-text-primary)' }}>{formatCurrency(financials.global.totalCost)}</div>
          </div>
          {financials.byVenture.map(v => (
            <div key={v.name} className="bg-white/5 backdrop-blur-sm border border-white/10" style={{ padding: 24, borderRadius: 16, border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{v.name}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)' }}>{formatCurrency(v.cost)}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>{v.hours.toFixed(1)} hours</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 24, flexDirection: isExecutive ? 'column' : 'row', alignItems: 'flex-start' }}>
        
        {/* Log Hours Form (Left side for staff) */}
        {!isExecutive && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10" style={{ padding: 24, borderRadius: 16, border: '1px solid var(--color-border)', width: 320, flexShrink: 0, position: 'sticky', top: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 20 }}>Log Activity</h3>
            <form onSubmit={handleLogHours} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 600 }}>Date</label>
                <input
                  type="date"
                  value={activityDate}
                  onChange={e => setActivityDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 600 }}>Hours</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={hours}
                  onChange={e => setHours(e.target.value)}
                  placeholder="e.g. 4.5"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 600 }}>Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="What did you work on?"
                  rows={3}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', resize: 'none' }}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff',
                  fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1
                }}
              >
                {submitting ? 'Logging...' : 'Submit Timesheet'}
              </button>
            </form>
          </div>
        )}

        {/* Timesheets List */}
        <div style={{ flex: 1, width: '100%' }}>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10" style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {isExecutive ? 'Recent Timesheets' : 'Your History'}
              </h3>
            </div>
            
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <div className="flex items-center justify-center gap-2 text-gray-400">
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin" />
                  <span>Loading records...</span>
                </div>
              </div>
            ) : timesheets.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>⏱️</div>
                <p>No timesheets found.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '16px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Date</th>
                    {isExecutive && <th style={{ padding: '16px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Employee</th>}
                    <th style={{ padding: '16px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Work Done</th>
                    <th style={{ padding: '16px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Hours</th>
                    {isExecutive && <th style={{ padding: '16px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Est. Cost</th>}
                    <th style={{ padding: '16px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Status</th>
                    {isExecutive && <th style={{ padding: '16px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {timesheets.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.2s' }} className="hover:bg-white/5">
                      <td style={{ padding: '16px', fontSize: 13, color: 'var(--color-text-primary)' }}>
                        {new Date(t.activity_date).toLocaleDateString()}
                      </td>
                      {isExecutive && (
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>{t.user_name}</div>
                          <div style={{ fontSize: 11, color: t.venture_color || 'var(--color-text-muted)' }}>{t.venture_name || 'Global'}</div>
                        </td>
                      )}
                      <td style={{ padding: '16px', maxWidth: 200 }}>
                        <div style={{ fontSize: 13, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.notes}</div>
                        {(t.project_name || t.task_title) && (
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                            {t.project_name} {t.task_title && `› ${t.task_title}`}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '16px', fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {t.hours}h
                      </td>
                      {isExecutive && (
                        <td style={{ padding: '16px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                          {formatCurrency(t.total_cost)} <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>({formatCurrency(t.hourly_rate)}/h)</span>
                        </td>
                      )}
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: t.status === 'approved' ? 'rgba(16,185,129,0.15)' : t.status === 'rejected' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                          color: t.status === 'approved' ? '#10b981' : t.status === 'rejected' ? '#ef4444' : '#f59e0b'
                        }}>
                          {t.status.toUpperCase()}
                        </span>
                      </td>
                      {isExecutive && (
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          {t.status === 'pending' && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                              <button
                                onClick={() => handleStatusUpdate(t.id, 'approved')}
                                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.1)', color: '#10b981', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(t.id, 'rejected')}
                                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
