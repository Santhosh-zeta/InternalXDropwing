import { useEffect, useState, useCallback } from 'react';
import { getTimeline } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    Activity, Loader2, RefreshCw, Filter, Clock,
    CheckCircle2, AlertTriangle, Users2, Briefcase,
    Building2, User, Zap, ChevronDown
} from 'lucide-react';

// ─── Config ──────────────────────────────────────────────────────────
const TYPE_CONFIG = {
    task:    { label: 'Task',    icon: <Zap size={13} />,       color: 'var(--info)',    bg: 'rgba(59,130,246,0.1)'  },
    project: { label: 'Project', icon: <Briefcase size={13} />, color: 'var(--accent-primary)', bg: 'rgba(99,102,241,0.1)' },
    team:    { label: 'Team',    icon: <Users2 size={13} />,    color: 'var(--success)', bg: 'rgba(34,197,94,0.1)'   },
    user:    { label: 'User',    icon: <User size={13} />,      color: 'var(--warning)', bg: 'rgba(245,158,11,0.1)'  },
    system:  { label: 'System',  icon: <Activity size={13} />,  color: 'var(--text-muted)', bg: 'var(--surface-subtle)' },
};

const PRIORITY_CONFIG = {
    critical:  { color: 'var(--danger)',  label: '🔴', dotColor: '#EF4444' },
    important: { color: 'var(--warning)', label: '🟡', dotColor: '#F59E0B' },
    normal:    { color: 'var(--text-muted)', label: '',   dotColor: 'var(--accent-primary)' },
};

const TIME_OPTIONS = [
    { value: '1h',  label: 'Last 1 hour' },
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d',  label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: 'all', label: 'All time' },
];

const TYPE_OPTIONS = ['all','task','project','team','user','system'];

// ─── Helpers ─────────────────────────────────────────────────────────
const timeAgo = (d) => {
    const diff = Date.now() - new Date(d).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    if (days === 1) return 'yesterday';
    return `${days}d ago`;
};

const dateGroup = (d) => {
    const date = new Date(d);
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
};

const Avatar = ({ name, size = 32 }) => (
    <div style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, var(--accent-primary), #8B5CF6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: `${size * 0.32}px`, fontWeight: 800, color: '#fff',
    }}>
        {name?.split(' ').map(n => n[0]).slice(0, 2).join('') || '?'}
    </div>
);

// ─── Timeline Event Item ─────────────────────────────────────────────
function EventItem({ event, isFirst, isLast }) {
    const typeCfg = TYPE_CONFIG[event.type] || TYPE_CONFIG.system;
    const prtCfg = PRIORITY_CONFIG[event.priority] || PRIORITY_CONFIG.normal;
    const actorName = event.actor?.full_name || 'System';

    return (
        <div style={{ display: 'flex', gap: '16px', position: 'relative', paddingBottom: isLast ? 0 : '20px' }}>
            {/* Timeline spine */}
            {!isLast && (
                <div style={{
                    position: 'absolute', left: '15px', top: '34px', bottom: 0,
                    width: '1px', background: 'var(--border-default)'
                }} />
            )}

            {/* Dot + Avatar stack */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                    background: typeCfg.bg, border: `2px solid ${prtCfg.dotColor}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: typeCfg.color, zIndex: 1
                }}>
                    {typeCfg.icon}
                </div>
            </div>

            {/* Content */}
            <div style={{
                flex: 1, background: 'var(--surface-elevated)', border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)', padding: '12px 16px',
                borderLeft: event.priority === 'critical' ? '3px solid var(--danger)'
                    : event.priority === 'important' ? '3px solid var(--warning)' : '1px solid var(--border-default)',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                        {/* Actor name + action (human-readable sentence) */}
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                            <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{actorName}</span>
                            {' '}
                            <span style={{ color: 'var(--text-secondary)' }}>{event.action}</span>
                        </div>

                        {/* Meta row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                            {/* Type badge */}
                            <span style={{
                                fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                                color: typeCfg.color, background: typeCfg.bg, padding: '2px 7px', borderRadius: '99px'
                            }}>
                                {typeCfg.label}
                            </span>
                            {/* Priority */}
                            {event.priority === 'critical' && (
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <AlertTriangle size={10} /> Critical
                                </span>
                            )}
                            {/* Company if present */}
                            {event.metadata?.company_name && (
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <Building2 size={10} /> {event.metadata.company_name}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Timestamp */}
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0, marginTop: '3px' }}>
                        {timeAgo(event.created_at)}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Activity Page ──────────────────────────────────────────────
export default function ActivityPage() {
    const { profile } = useAuth();
    const navigate = useNavigate();

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [typeFilter, setTypeFilter] = useState('all');
    const [timeFilter, setTimeFilter] = useState('7d');
    const [autoRefresh, setAutoRefresh] = useState(false);

    const isMD = ['managing_director', 'admin'].includes(profile.role);

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const { data } = await getTimeline({
                type: typeFilter !== 'all' ? typeFilter : undefined,
                time: timeFilter !== 'all' ? timeFilter : undefined,
                limit: 100,
            });
            setEvents(data || []);
        } catch {
            // silent fail on refresh
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [typeFilter, timeFilter]);

    useEffect(() => { load(); }, [load]);

    // Auto-refresh every 30s
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => load(true), 30000);
        return () => clearInterval(interval);
    }, [autoRefresh, load]);

    // Group events by date
    const grouped = events.reduce((acc, ev) => {
        const group = dateGroup(ev.created_at);
        if (!acc[group]) acc[group] = [];
        acc[group].push(ev);
        return acc;
    }, {});

    // Summary counts
    const critical = events.filter(e => e.priority === 'critical').length;
    const important = events.filter(e => e.priority === 'important').length;
    const taskCount = events.filter(e => e.type === 'task').length;
    const teamCount = events.filter(e => e.type === 'team').length;

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
            <Loader2 size={28} style={{ animation: 'spin 1.2s linear infinite', color: 'var(--accent-primary)' }} />
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-muted)', fontWeight: 600 }}>Loading Activity...</div>
        </div>
    );

    return (
        <div style={{ animation: 'fade-in 0.25s ease-out', maxWidth: '860px' }}>

            {/* ── HEADER ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <div className="page-title">System Activity</div>
                    <div className="page-subtitle">Live operational events across Dropwing OS</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                        <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)}
                            style={{ accentColor: 'var(--accent-primary)' }} />
                        Auto-refresh
                    </label>
                    <button className="btn btn-ghost" onClick={() => load(true)} disabled={refreshing}
                        style={{ fontSize: '0.75rem', padding: '8px 12px' }}>
                        <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* ── SUMMARY STRIP ── */}
            {events.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                    {[
                        { label: 'Total Events', val: events.length, color: 'var(--accent-primary)' },
                        { label: 'Critical', val: critical, color: critical > 0 ? 'var(--danger)' : 'var(--text-muted)' },
                        { label: 'Important', val: important, color: important > 0 ? 'var(--warning)' : 'var(--text-muted)' },
                        { label: 'Task Events', val: taskCount, color: 'var(--info)' },
                        { label: 'Team Events', val: teamCount, color: 'var(--success)' },
                    ].map((s, i) => (
                        <div key={i} style={{
                            background: 'var(--surface-elevated)', border: '1px solid var(--border-default)',
                            borderRadius: 'var(--radius-md)', padding: '14px 16px',
                            borderLeft: `3px solid ${s.color}`
                        }}>
                            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
                            <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginTop: '5px', fontWeight: 600 }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── FILTER BAR ── */}
            <div style={{
                display: 'flex', gap: '10px', marginBottom: '28px', flexWrap: 'wrap', alignItems: 'center',
                background: 'var(--surface-elevated)', border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)', padding: '12px 16px'
            }}>
                <Filter size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                
                {/* Event type */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {TYPE_OPTIONS.map(t => (
                        <button key={t} onClick={() => setTypeFilter(t)} style={{
                            padding: '5px 12px', borderRadius: '99px', border: '1px solid', cursor: 'pointer',
                            fontSize: '0.7rem', fontWeight: 600, transition: 'all 0.15s', textTransform: t === 'all' ? 'none' : 'capitalize',
                            borderColor: typeFilter === t ? 'var(--accent-primary)' : 'var(--border-default)',
                            background: typeFilter === t ? 'color-mix(in srgb, var(--accent-primary) 12%, transparent)' : 'transparent',
                            color: typeFilter === t ? 'var(--accent-primary)' : 'var(--text-muted)',
                        }}>
                            {t === 'all' ? 'All Types' : (TYPE_CONFIG[t]?.label || t)}
                        </button>
                    ))}
                </div>

                <div style={{ marginLeft: 'auto' }}>
                    <select className="form-select" value={timeFilter} onChange={e => setTimeFilter(e.target.value)}
                        style={{ fontSize: '0.75rem', width: 'auto', padding: '6px 12px' }}>
                        {TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            </div>

            {/* ── PRIORITY LEGEND ── */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {Object.entries(PRIORITY_CONFIG).filter(([k]) => k !== 'normal').map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: v.dotColor }} />
                        <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{k}</span>
                    </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)' }} />
                    <span style={{ fontWeight: 600 }}>Normal</span>
                </div>
            </div>

            {/* ── TIMELINE FEED ── */}
            {events.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: '14px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Activity size={30} style={{ color: 'var(--accent-primary)', opacity: 0.7 }} />
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>No activity yet</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '320px', lineHeight: 1.6 }}>
                        Events will appear here as tasks are deployed, teams are created, and operations run across the system.
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {Object.entries(grouped).map(([group, groupEvents]) => (
                        <div key={group} style={{ marginBottom: '32px' }}>
                            {/* Day group header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{
                                    fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px',
                                    color: 'var(--text-muted)', background: 'var(--surface-subtle)',
                                    padding: '4px 12px', borderRadius: '99px'
                                }}>
                                    {group}
                                </div>
                                <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                    {groupEvents.length} event{groupEvents.length !== 1 ? 's' : ''}
                                </div>
                            </div>

                            {/* Events */}
                            <div>
                                {groupEvents.map((event, idx) => (
                                    <EventItem
                                        key={event.id} event={event}
                                        isFirst={idx === 0}
                                        isLast={idx === groupEvents.length - 1}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
