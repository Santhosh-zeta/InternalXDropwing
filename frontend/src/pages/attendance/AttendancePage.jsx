import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../api/supabase';
import { CheckCircle2, CalendarDays, Loader2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

function getWeekDays() {
    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        days.push(d);
    }
    return days;
}

export default function AttendancePage() {
    const { profile } = useAuth();
    const [records, setRecords] = useState([]);
    const [todayCheckedIn, setTodayCheckedIn] = useState(false);
    const [teamRecords, setTeamRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [checkingIn, setCheckingIn] = useState(false);

    const todayStr = new Date().toISOString().split('T')[0];
    const isManagerPlus = ['managing_director', 'admin', 'ceo', 'manager'].includes(profile?.role);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // My attendance last 30 days
                const { data: myData } = await supabase
                    .from('attendance')
                    .select('*')
                    .eq('user_id', profile.id)
                    .gte('date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0])
                    .order('date', { ascending: false });

                setRecords(myData || []);
                setTodayCheckedIn(!!(myData || []).find(r => r.date === todayStr));

                // Team attendance for managers+
                if (isManagerPlus) {
                    const { data: teamData } = await supabase
                        .from('attendance')
                        .select('*, user:user_roles(full_name, venture_id)')
                        .eq('date', todayStr)
                        .order('checked_in_at');
                    setTeamRecords(teamData || []);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        if (profile) fetchData();
    }, [profile, todayStr, isManagerPlus]);

    const checkIn = async () => {
        setCheckingIn(true);
        try {
            const { error } = await supabase
                .from('attendance')
                .insert({ user_id: profile.id, date: todayStr });
            if (error) throw error;
            setTodayCheckedIn(true);
            toast.success('✅ Checked in successfully!');
            setRecords(r => [{ user_id: profile.id, date: todayStr, checked_in_at: new Date().toISOString() }, ...r]);
        } catch (err) {
            if (err.code === '23505') {
                setTodayCheckedIn(true);
                toast('Already checked in today', { icon: 'ℹ️' });
            } else {
                toast.error('Check-in failed: ' + err.message);
            }
        } finally {
            setCheckingIn(false);
        }
    };

    const weekDays = getWeekDays();
    const recordDates = new Set(records.map(r => r.date));

    return (
        <div>
            <Toaster position="top-right" toastOptions={{ style: { background: 'var(--color-bg-card)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' } }} />
            <div className="page-header flex justify-between items-center">
                <div>
                    <div className="page-title">Attendance</div>
                    <div className="page-subtitle">Track your daily presence</div>
                </div>
                <button
                    id="checkin-btn"
                    className={`btn ${todayCheckedIn ? 'btn-ghost' : 'btn-primary'}`}
                    onClick={checkIn}
                    disabled={todayCheckedIn || checkingIn}
                    style={{ fontSize: '1rem', padding: '12px 28px' }}
                >
                    {checkingIn ? <Loader2 size={18} style={{ animation: 'spin 0.7s linear infinite' }} /> : <CheckCircle2 size={18} />}
                    {todayCheckedIn ? '✅ Checked In Today' : 'Check In Now'}
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner" /></div>
            ) : (
                <>
                    {/* This week overview */}
                    <div className="card mb-xl">
                        <div className="flex items-center gap-sm mb-lg">
                            <CalendarDays size={18} style={{ color: 'var(--color-primary)' }} />
                            <h4 style={{ margin: 0 }}>This Week</h4>
                        </div>
                        <div className="attendance-grid">
                            {weekDays.map(day => {
                                const ds = day.toISOString().split('T')[0];
                                const isToday = ds === todayStr;
                                const present = recordDates.has(ds);
                                const isFuture = ds > todayStr;
                                return (
                                    <div key={ds} className={`attendance-day ${isFuture ? 'future' : present ? 'present' : 'absent'} ${isToday ? 'today' : ''}`}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>
                                                {day.toLocaleDateString('en-IN', { weekday: 'short' })}
                                            </span>
                                            <span>{day.getDate()}</span>
                                            {!isFuture && <span style={{ fontSize: '0.9rem' }}>{present ? '✓' : '✗'}</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Team — manager+ only */}
                    {isManagerPlus && (
                        <div className="card mb-xl">
                            <h4 style={{ marginBottom: '16px' }}>Today's Team Attendance ({teamRecords.length} present)</h4>
                            {teamRecords.length === 0 ? (
                                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px' }}>No one has checked in yet today</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {teamRecords.map(r => (
                                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--color-bg)', borderRadius: '10px' }}>
                                            <div className="avatar-fallback avatar-sm" style={{ fontSize: '0.65rem' }}>
                                                {r.user?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{r.user?.full_name}</div>
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--color-success)' }}>
                                                {new Date(r.checked_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* My history */}
                    <div className="card">
                        <h4 style={{ marginBottom: '16px' }}>My Attendance History</h4>
                        {records.length === 0 ? (
                            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px' }}>No attendance records yet</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {records.slice(0, 15).map(r => (
                                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--color-bg)', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                                            {new Date(r.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                                            {r.date === todayStr && <span className="badge badge-active" style={{ marginLeft: '8px' }}>Today</span>}
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--color-success)' }}>
                                            Checked in at {new Date(r.checked_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
