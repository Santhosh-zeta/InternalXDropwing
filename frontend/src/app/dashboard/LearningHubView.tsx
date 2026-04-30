'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { User } from '@/lib/constants';

interface LearningHubViewProps {
  currentUser: User;
}

export default function LearningHubView({ currentUser }: LearningHubViewProps) {
  const isManager = currentUser.accessLevel <= 5;
  const isIntern = currentUser.accessLevel === 8;
  
  const [activeTab, setActiveTab] = useState(isManager ? 'progress' : 'checklist');
  const [loading, setLoading] = useState(true);

  // Data states
  const [checklists, setChecklists] = useState<any[]>([]);
  const [progressSummary, setProgressSummary] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);

  // Forms
  const [newChecklist, setNewChecklist] = useState({ title: '', description: '', category: 'General', due_days: '' });
  const [newResource, setNewResource] = useState({ title: '', description: '', url: '', category: 'General', resource_type: 'link' });
  const [newFeedback, setNewFeedback] = useState({ intern_id: '', note: '', rating: '', week_label: '' });

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  const fetchData = async (tab: string) => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('internalx_token')}` };
      
      if (tab === 'checklist' || tab === 'manage_checklists') {
        const res = await fetch('http://localhost:5000/api/learning/checklist', { headers });
        const data = await res.json();
        if (data.success) setChecklists(data.data);
      } else if (tab === 'progress') {
        const res = await fetch('http://localhost:5000/api/learning/progress', { headers });
        const data = await res.json();
        if (data.success) setProgressSummary(data.data);
      } else if (tab === 'resources') {
        const res = await fetch('http://localhost:5000/api/learning/resources', { headers });
        const data = await res.json();
        if (data.success) setResources(data.data);
      } else if (tab === 'feedback') {
        const res = await fetch('http://localhost:5000/api/learning/feedback', { headers });
        const data = await res.json();
        if (data.success) setFeedback(data.data);
      }
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const toggleInternProgress = async (id: number, currentCompleted: boolean) => {
    try {
      const res = await fetch(`http://localhost:5000/api/learning/progress/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('internalx_token')}`
        },
        body: JSON.stringify({ completed: !currentCompleted })
      });
      const data = await res.json();
      if (data.success) {
        setChecklists(prev => prev.map(c => c.id === id ? { ...c, completed: !currentCompleted } : c));
      }
    } catch (err) {
      toast.error('Failed to update progress');
    }
  };

  const createChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/learning/checklist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('internalx_token')}`
        },
        body: JSON.stringify(newChecklist)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Checklist item created');
        setNewChecklist({ title: '', description: '', category: 'General', due_days: '' });
        fetchData('manage_checklists');
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error('Failed to create item');
    }
  };

  const deleteChecklist = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:5000/api/learning/checklist/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('internalx_token')}` }
      });
      if ((await res.json()).success) {
        toast.success('Deleted item');
        fetchData('manage_checklists');
      }
    } catch (err) { toast.error('Failed to delete'); }
  };

  const createResource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/learning/resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('internalx_token')}`
        },
        body: JSON.stringify(newResource)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Resource added');
        setNewResource({ title: '', description: '', url: '', category: 'General', resource_type: 'link' });
        fetchData('resources');
      } else toast.error(data.message);
    } catch (err) { toast.error('Failed to add resource'); }
  };

  const deleteResource = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:5000/api/learning/resources/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('internalx_token')}` }
      });
      if ((await res.json()).success) {
        toast.success('Deleted resource');
        fetchData('resources');
      }
    } catch (err) { toast.error('Failed to delete'); }
  };

  const createFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/learning/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('internalx_token')}`
        },
        body: JSON.stringify(newFeedback)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Feedback added');
        setNewFeedback({ intern_id: '', note: '', rating: '', week_label: '' });
        fetchData('feedback');
      } else toast.error(data.message);
    } catch (err) { toast.error('Failed to add feedback'); }
  };

  const deleteFeedback = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:5000/api/learning/feedback/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('internalx_token')}` }
      });
      if ((await res.json()).success) {
        toast.success('Deleted feedback');
        fetchData('feedback');
      }
    } catch (err) { toast.error('Failed to delete'); }
  };

  const tabs = isManager 
    ? [
        { id: 'progress', label: '📊 Intern Progress' },
        { id: 'manage_checklists', label: '✅ Manage Checklists' },
        { id: 'resources', label: '📚 Resource Library' },
        { id: 'feedback', label: '💬 Feedback' },
      ]
    : [
        { id: 'checklist', label: '✅ My Checklist' },
        { id: 'resources', label: '📚 Resource Library' },
        { id: 'feedback', label: '💬 My Feedback' },
      ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid var(--color-border)', paddingBottom: 16, overflowX: 'auto' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '8px 20px', borderRadius: 20, whiteSpace: 'nowrap',
              background: activeTab === t.id ? 'var(--color-bg-tertiary)' : 'transparent',
              color: activeTab === t.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              fontWeight: activeTab === t.id ? 700 : 500,
              border: activeTab === t.id ? '1px solid var(--color-border)' : '1px solid transparent',
              cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading...</div>
        ) : (
          <>
            {/* INTERN CHECKLIST */}
            {activeTab === 'checklist' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="glass" style={{ padding: 24, borderRadius: 12 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--color-text-primary)' }}>Your Learning Checklist</h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Complete these items to progress in your internship.</p>
                </div>
                {checklists.map(c => (
                  <div key={c.id} className="glass" style={{ padding: 16, borderRadius: 12, display: 'flex', gap: 16, alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={!!c.completed}
                      onChange={() => toggleInternProgress(c.id, !!c.completed)}
                      style={{ width: 24, height: 24, cursor: 'pointer', accentColor: '#8b5cf6' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <strong style={{ fontSize: 16, color: c.completed ? 'var(--color-text-muted)' : 'var(--color-text-primary)', textDecoration: c.completed ? 'line-through' : 'none' }}>{c.title}</strong>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>{c.category}</span>
                      </div>
                      {c.description && <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>{c.description}</p>}
                    </div>
                  </div>
                ))}
                {checklists.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>No checklist items assigned.</div>}
              </div>
            )}

            {/* MANAGER INTERN PROGRESS */}
            {activeTab === 'progress' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="glass" style={{ padding: 24, borderRadius: 12 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--color-text-primary)' }}>Intern Progress Summary</h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Overview of how interns are tracking against their learning checklists.</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                  {progressSummary.map(p => (
                    <div key={p.id} className="glass" style={{ padding: 20, borderRadius: 12 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)', marginBottom: 4 }}>{p.full_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>{p.department} • {p.email}</div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Checklist Progress</span>
                        <span style={{ fontWeight: 700, color: p.completed_items === p.total_items && p.total_items > 0 ? '#10b981' : '#8b5cf6' }}>
                          {p.completed_items} / {p.total_items}
                        </span>
                      </div>
                      <div style={{ width: '100%', height: 6, background: 'var(--color-bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: p.completed_items === p.total_items && p.total_items > 0 ? '#10b981' : '#8b5cf6', width: `${p.total_items > 0 ? (p.completed_items / p.total_items) * 100 : 0}%` }} />
                      </div>
                      {p.last_activity && (
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 12, textAlign: 'right' }}>
                          Last active: {new Date(p.last_activity).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                  {progressSummary.length === 0 && <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>No interns found.</div>}
                </div>
              </div>
            )}

            {/* MANAGER CHECKLIST ITEMS */}
            {activeTab === 'manage_checklists' && (
              <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                <div className="glass" style={{ flex: 2, padding: 24, borderRadius: 12 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: 'var(--color-text-primary)' }}>Manage Checklists</h3>
                  {checklists.map(c => (
                    <div key={c.id} style={{ padding: 12, borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>{c.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{c.category} • {c.completions || 0}/{c.total_interns || 0} completed</div>
                      </div>
                      <button onClick={() => deleteChecklist(c.id)} style={{ padding: '6px 12px', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Delete</button>
                    </div>
                  ))}
                </div>
                <div className="glass" style={{ flex: 1, padding: 24, borderRadius: 12, position: 'sticky', top: 0 }}>
                  <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Add New Item</h4>
                  <form onSubmit={createChecklist} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <input placeholder="Title" required value={newChecklist.title} onChange={e => setNewChecklist({...newChecklist, title: e.target.value})} style={{ padding: 10, borderRadius: 8, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: '#fff' }} />
                    <textarea placeholder="Description" value={newChecklist.description} onChange={e => setNewChecklist({...newChecklist, description: e.target.value})} style={{ padding: 10, borderRadius: 8, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: '#fff', minHeight: 80 }} />
                    <input placeholder="Category (e.g. Onboarding, Tech)" value={newChecklist.category} onChange={e => setNewChecklist({...newChecklist, category: e.target.value})} style={{ padding: 10, borderRadius: 8, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: '#fff' }} />
                    <button type="submit" style={{ padding: 10, background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Add Item</button>
                  </form>
                </div>
              </div>
            )}

            {/* RESOURCES */}
            {activeTab === 'resources' && (
              <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {resources.map(r => (
                    <div key={r.id} className="glass" style={{ padding: 20, borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                          <span style={{ fontSize: 20 }}>{r.resource_type === 'video' ? '🎥' : r.resource_type === 'document' ? '📄' : '🔗'}</span>
                          <a href={r.url} target="_blank" rel="noreferrer" style={{ fontSize: 16, fontWeight: 700, color: '#8b5cf6', textDecoration: 'none' }}>{r.title}</a>
                        </div>
                        {r.description && <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 8 }}>{r.description}</p>}
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                          <span style={{ background: 'var(--color-bg-tertiary)', padding: '2px 8px', borderRadius: 12, marginRight: 8 }}>{r.category}</span>
                          Added by {r.added_by_name} • {new Date(r.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      {isManager && (
                        <button onClick={() => deleteResource(r.id)} style={{ padding: '6px 12px', background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Remove</button>
                      )}
                    </div>
                  ))}
                  {resources.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)', className: "glass", borderRadius: 12 }}>No resources available.</div>}
                </div>
                {isManager && (
                  <div className="glass" style={{ flex: 1, padding: 24, borderRadius: 12, position: 'sticky', top: 0 }}>
                    <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Add Resource</h4>
                    <form onSubmit={createResource} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <input placeholder="Title" required value={newResource.title} onChange={e => setNewResource({...newResource, title: e.target.value})} style={{ padding: 10, borderRadius: 8, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: '#fff' }} />
                      <input placeholder="URL" type="url" required value={newResource.url} onChange={e => setNewResource({...newResource, url: e.target.value})} style={{ padding: 10, borderRadius: 8, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: '#fff' }} />
                      <textarea placeholder="Description" value={newResource.description} onChange={e => setNewResource({...newResource, description: e.target.value})} style={{ padding: 10, borderRadius: 8, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: '#fff', minHeight: 60 }} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <select value={newResource.category} onChange={e => setNewResource({...newResource, category: e.target.value})} style={{ flex: 1, padding: 10, borderRadius: 8, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: '#fff' }}>
                          <option value="General">General</option>
                          <option value="Engineering">Engineering</option>
                          <option value="Design">Design</option>
                          <option value="Marketing">Marketing</option>
                        </select>
                        <select value={newResource.resource_type} onChange={e => setNewResource({...newResource, resource_type: e.target.value})} style={{ flex: 1, padding: 10, borderRadius: 8, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: '#fff' }}>
                          <option value="link">Link</option>
                          <option value="video">Video</option>
                          <option value="document">Document</option>
                        </select>
                      </div>
                      <button type="submit" style={{ padding: 10, background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Add Resource</button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* FEEDBACK */}
            {activeTab === 'feedback' && (
              <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {feedback.map(f => (
                    <div key={f.id} className="glass" style={{ padding: 20, borderRadius: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: 15 }}>{isManager ? `To: ${f.intern_name}` : `From: ${f.manager_name}`}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{new Date(f.created_at).toLocaleDateString()} {f.week_label ? `• ${f.week_label}` : ''}</div>
                        </div>
                        {f.rating && (
                          <div style={{ display: 'flex', gap: 2 }}>
                            {[1,2,3,4,5].map(star => (
                              <span key={star} style={{ color: star <= f.rating ? '#f59e0b' : 'var(--color-border)' }}>★</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ background: 'var(--color-bg-tertiary)', padding: 16, borderRadius: 8, fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                        {f.note}
                      </div>
                      {isManager && (
                        <button onClick={() => deleteFeedback(f.id)} style={{ marginTop: 12, padding: '4px 12px', background: 'transparent', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Delete Feedback</button>
                      )}
                    </div>
                  ))}
                  {feedback.length === 0 && <div className="glass" style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)', borderRadius: 12 }}>No feedback recorded yet.</div>}
                </div>
                {isManager && (
                  <div className="glass" style={{ flex: 1, padding: 24, borderRadius: 12, position: 'sticky', top: 0 }}>
                    <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Give Feedback</h4>
                    <form onSubmit={createFeedback} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <select required value={newFeedback.intern_id} onChange={e => setNewFeedback({...newFeedback, intern_id: e.target.value})} style={{ padding: 10, borderRadius: 8, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: '#fff' }}>
                        <option value="">Select Intern...</option>
                        {progressSummary.map(p => (
                          <option key={p.id} value={p.id}>{p.full_name}</option>
                        ))}
                      </select>
                      <input placeholder="Week Label (e.g. Week 1)" value={newFeedback.week_label} onChange={e => setNewFeedback({...newFeedback, week_label: e.target.value})} style={{ padding: 10, borderRadius: 8, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: '#fff' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Rating:</span>
                        <input type="number" min="1" max="5" placeholder="1-5" value={newFeedback.rating} onChange={e => setNewFeedback({...newFeedback, rating: e.target.value})} style={{ width: 80, padding: 8, borderRadius: 8, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: '#fff' }} />
                      </div>
                      <textarea placeholder="Feedback Note..." required value={newFeedback.note} onChange={e => setNewFeedback({...newFeedback, note: e.target.value})} style={{ padding: 10, borderRadius: 8, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: '#fff', minHeight: 100 }} />
                      <button type="submit" style={{ padding: 10, background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Submit Feedback</button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
