import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { getCompanies, getUsers, getTasks, getTeams, getProjects, createCompany, updateCompany, extractData, updateUser } from '../../api';
import { Building2, Users, Target, CheckCircle2, AlertCircle, AlertTriangle, ArrowRight, LayoutDashboard, Search, Clock, Plus, MonitorPlay, Activity, Loader2, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

function UnauthorizedView() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--color-text-muted)' }}>
            <ShieldAlertIcon size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <div style={{ fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}>Access Denied</div>
            <p style={{ fontSize: '0.85rem' }}>This quadrant is strictly isolated for Executive Authority levels.</p>
        </div>
    );
}

const ShieldAlertIcon = (props) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;

function CreateVentureModal({ onClose, onAdded }) {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createCompany({ name, status: 'active' });
            toast.success("New operational venture established");
            onAdded();
            onClose();
        } catch(err) {
            toast.error(err.response?.data?.error || "Executive alignment failure");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" style={{ animation: 'fade-in 0.2s ease-out' }}>
            <div className="modal" style={{ borderTop: '4px solid var(--color-primary)' }}>
                <div className="modal-header">
                    <h3 style={{ fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Establish New Venture</h3>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
                    <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>Company / Venture Name</label>
                        <input className="form-input" value={name} onChange={e => setName(e.target.value)} required placeholder="Target venture matrix identifier" autoFocus />
                    </div>
                    <div className="modal-footer" style={{ marginTop: '32px' }}>
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Abort</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Initialize Venture'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ChangeCEOModal({ onClose, companyId, currentCeoId, rawUsers, onUpdated }) {
    const [loading, setLoading] = useState(false);
    
    // Natively extract all individuals mapping to this explicit venture who are NOT currently the CEO
    const candidates = rawUsers.filter(u => u.company_id === companyId && u.id !== currentCeoId && !['managing_director', 'admin'].includes(u.role));

    const initiateTransfer = async (candidateId) => {
        if (!confirm('Execute total executive transfer for this node?')) return;
        setLoading(true);
        try {
            if (currentCeoId) await updateUser(currentCeoId, { role: 'manager' });
            await updateUser(candidateId, { role: 'ceo', company_id: companyId });
            toast.success("Executive Leadership Context Unified");
            onUpdated();
            onClose();
        } catch(err) {
            toast.error("Executive mapping failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" style={{ animation: 'fade-in 0.2s ease-out' }}>
            <div className="modal" style={{ borderTop: '4px solid var(--color-warning)' }}>
                <div className="modal-header">
                    <h3 style={{ fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={18} color="var(--color-warning)"/> Transfer Executive Control
                    </h3>
                    <button className="btn btn-icon btn-ghost" onClick={onClose} disabled={loading}><X size={18} /></button>
                </div>
                
                <div style={{ marginTop: '20px' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                        Warning: Binding a new CEO immediately overrides previous leadership permissions. The previous Executive will be structurally demoted to a Manager asset.
                    </p>

                    <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>Available Internal Candidates:</h4>
                    {candidates.length === 0 ? (
                        <div style={{ background: 'var(--color-bg)', padding: '20px', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: '4px' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>No localized biological assets exist to execute transfer. Connect users first.</span>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                            {candidates.map(u => (
                                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-hover)', padding: '12px', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{u.full_name}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Role: {u.role}</div>
                                    </div>
                                    <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '6px 12px', border: '1px solid var(--color-warning)', color: 'var(--color-warning)' }} onClick={() => initiateTransfer(u.id)} disabled={loading}>
                                        Execute Transfer
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function CompaniesPage() {
    const { profile } = useAuth();
    const location = useLocation();
    
    const [companies, setCompanies] = useState([]);
    const [users, setUsers] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [teams, setTeams] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    const [activeCompanyId, setActiveCompanyId] = useState(null);
    const [activeTeamId, setActiveTeamId] = useState(null);
    const [filterStatus, setFilterStatus] = useState('active');
    const [sortBy, setSortBy] = useState('largest');

    // Action Trigger Modals
    const [showCreateVenture, setShowCreateVenture] = useState(false);
    const [showCEOModal, setShowCEOModal] = useState(false);

    // Visibility Mapping (MD / CEO / Manager)
    const isMD = ['managing_director', 'admin'].includes(profile.role);
    const isCEO = profile.role === 'ceo';
    const isManager = profile.role === 'manager';
    const hasAccess = isMD || isCEO || isManager;

    const loadEcosystem = async () => {
        if (!hasAccess) return setLoading(false);
        setLoading(true);
        try {
            const results = await Promise.allSettled([
                getCompanies(), getUsers(), getTasks(), getTeams(), getProjects()
            ]);
            if (results[0].status === 'fulfilled') setCompanies(extractData(results[0].value.data));
            if (results[1].status === 'fulfilled') setUsers(extractData(results[1].value.data));
            if (results[2].status === 'fulfilled') setTasks(extractData(results[2].value.data));
            if (results[3].status === 'fulfilled') setTeams(extractData(results[3].value.data));
            if (results[4].status === 'fulfilled') setProjects(extractData(results[4].value.data));
            
        } catch (err) {
            toast.error("System Matrix failure");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadEcosystem(); }, [profile]);

    // Handle incoming route state from TeamsPage (openTeamId)
    useEffect(() => {
        if (!loading && location.state?.openTeamId && teams.length > 0) {
            setActiveTeamId(location.state.openTeamId);
            // Clear state so back-navigation doesn't re-trigger
            window.history.replaceState({}, '');
        }
    }, [loading, teams, location.state]);

    // Implicit Routing for Manager
    useEffect(() => {
        if (isManager && !loading && teams.length > 0 && !activeTeamId) {
            const myTeam = teams.find(t => t.manager_id === profile.id);
            if (myTeam) setActiveTeamId(myTeam.id);
        }
    }, [isManager, loading, teams, activeTeamId, profile.id]);

    const handleHaltOperations = async (comp) => {
        const nextStatus = comp.status === 'inactive' ? 'active' : 'inactive';
        if (!confirm(`Are you absolutely certain you want to ${nextStatus === 'inactive' ? 'halt' : 'resume'} local execution boundaries for ${comp.name}?`)) return;
        
        try {
            await updateCompany(comp.id, { status: nextStatus });
            toast.success(`Network Operations ${nextStatus === 'inactive' ? 'Halted' : 'Resumed'}`);
            loadEcosystem();
        } catch (err) {
            toast.error("Execution blocked. Missing structural [status] parameter in internal tables.");
        }
    };

    if (!hasAccess && !loading) return <UnauthorizedView />;

    // --- Analytics Engine ---
    const systemMemory = useMemo(() => {
        const calculateCompanyHealth = (c) => {
            const cId = c.id;
            const cUsers = users.filter(u => u.company_id === cId);
            const cTeams = teams.filter(t => t.company_id === cId);
            const cProjects = projects.filter(p => p.company_id === cId);
            const cTasks = tasks.filter(t => t.assigned_company_id === cId || (t.team && t.team.company_id === cId));
            
            const activeTsk = cTasks.filter(t => t.status !== 'done');
            const pendingTsk = cTasks.filter(t => t.status === 'todo');
            const doneTsk = cTasks.filter(t => t.status === 'done');
            
            const now = new Date();
            const overdue = activeTsk.filter(t => t.due_date && new Date(t.due_date) < now);

            let health = c.status === 'inactive' ? '⚫ HALTED' : '🟢 Healthy';
            let healthColor = c.status === 'inactive' ? 'var(--color-text-muted)' : 'var(--color-success)';
            
            if (c.status !== 'inactive') {
                if (overdue.length > 0) { health = '🟡 Moderate'; healthColor = 'var(--color-warning)'; }
                if (overdue.length > (activeTsk.length * 0.3) && activeTsk.length > 2) { health = '🔴 Needs Attention'; healthColor = 'var(--color-danger)'; }
                if (!cUsers.length && !cTasks.length) { health = '⚪ Inactive Shell'; healthColor = 'var(--color-text-muted)'; }
            }

            const lastActs = [...cTasks, ...cUsers, ...cProjects].map(x => new Date(x.created_at || 0).getTime());
            const latest = Math.max(0, ...lastActs);
            
            let flags = [];
            const hasCEO = cUsers.some(u => u.role === 'ceo' || u.role === 'managing_director'); 
            if (!hasCEO && c.status !== 'inactive') flags.push({ type: 'danger', msg: 'No Executive Leadership' });
            if (overdue.length > 0 && c.status !== 'inactive') flags.push({ type: 'warning', msg: `${overdue.length} Delayed Operations` });
            if (latest && (now.getTime() - latest) > (1000 * 60 * 60 * 24 * 7) && c.status !== 'inactive') flags.push({ type: 'danger', msg: 'Stagnant (7+ Days)'});

            return { cUsers, cTeams, cProjects, cTasks, activeTsk, pendingTsk, doneTsk, overdue, health, healthColor, latest, flags, ceo: cUsers.find(u => u.role === 'ceo') || cUsers.find(u => u.role === 'managing_director') };
        };

        const map = {};
        let sysMembers = 0, sysProj = 0, sysTasks = 0;
        
        companies.forEach(c => {
            map[c.id] = calculateCompanyHealth(c);
            sysMembers += map[c.id].cUsers.length;
            sysProj += map[c.id].cProjects.length;
            sysTasks += map[c.id].activeTsk.length;
        });

        return { map, sysMembers, sysProj, sysTasks };
    }, [companies, users, tasks, teams, projects]);

    const displayCompanies = useMemo(() => {
        let sorted = [...companies];
        if (sortBy === 'largest') sorted.sort((a,b) => systemMemory.map[b.id].cUsers.length - systemMemory.map[a.id].cUsers.length);
        if (sortBy === 'delayed') sorted.sort((a,b) => systemMemory.map[b.id].overdue.length - systemMemory.map[a.id].overdue.length);
        if (sortBy === 'active') sorted.sort((a,b) => systemMemory.map[b.id].latest - systemMemory.map[a.id].latest);
        return sorted;
    }, [companies, systemMemory, sortBy]);

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <Loader2 size={32} style={{ animation: 'spin 1.5s linear infinite', color: 'var(--color-primary)' }} />
            <div style={{ marginTop: '16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold', color: 'var(--color-text-secondary)' }}>Synchronizing Global Ecosystem...</div>
        </div>
    );

    // ---- ALL MODALS LAYER ----
    const modals = (
        <>
            {showCreateVenture && <CreateVentureModal onClose={() => setShowCreateVenture(false)} onAdded={loadEcosystem} />}
            {showCEOModal && activeCompanyId && (
                <ChangeCEOModal 
                    onClose={() => setShowCEOModal(false)} 
                    companyId={activeCompanyId} 
                    currentCeoId={systemMemory.map[activeCompanyId].ceo?.id} 
                    rawUsers={users}
                    onUpdated={loadEcosystem} 
                />
            )}
        </>
    );

    // ---- DRILL-DOWN LEVEL 3 (TEAM LAYER MAP) ----
    if (activeTeamId) {
        const t = teams.find(x => x.id === activeTeamId);
        if (!t) return <div style={{ padding: '20px' }}>Invalid Team Vector <button onClick={()=>setActiveTeamId(null)}>Back</button></div>;
        
        const comp = companies.find(c => c.id === t.company_id) || {};
        const tLead = users.find(u => u.id === t.manager_id);
        const tMembers = t.team_members?.map(m => m.user).filter(Boolean) || [];

        // Exact Intersection Logic
        const teamTasks = tasks.filter(x => x.assigned_teams?.includes(t.id));
        const activeT = teamTasks.filter(x => x.status !== 'done');
        const pendingT = teamTasks.filter(x => x.status === 'todo');
        const doneT = teamTasks.filter(x => x.status === 'done');
        
        const now = new Date();
        const overdueT = activeT.filter(x => x.due_date && new Date(x.due_date) < now);

        let tHealth = '🟢 Healthy';
        let tHealthColor = 'var(--color-success)';
        if (overdueT.length > 0) { tHealth = '🟡 Moderate'; tHealthColor = 'var(--color-warning)'; }
        if (activeT.length > tMembers.length * 4 && tMembers.length > 0) { tHealth = '🟠 Overloaded'; tHealthColor = 'var(--color-warning)'; }
        if (overdueT.length > 2 || overdueT.length > (activeT.length * 0.4)) { tHealth = '🔴 Critical'; tHealthColor = 'var(--color-danger)'; }

        // Member Data Mapping
        const memberStats = tMembers.map(m => {
            const mTasks = teamTasks.filter(tsk => tsk.assigned_profiles?.includes(m.id));
            const mActive = mTasks.filter(tsk => tsk.status !== 'done');
            const mOverdue = mActive.filter(tsk => tsk.due_date && new Date(tsk.due_date) < now);
            
            let stat = '🟢 Active'; let col = 'var(--color-success)';
            if (mActive.length === 0) { stat = '⚪ Idle'; col = 'var(--color-text-muted)'; }
            else if (mOverdue.length > 0) { stat = '🟡 Delayed'; col = 'var(--color-warning)'; }
            else if (mActive.length > 4) { stat = '🔴 Overloaded'; col = 'var(--color-danger)'; }

            return { ...m, mActive, mOverdue, mTasks, stat, col };
        });

        // Associated Projects globally mapped to the venture 
        const teamProjects = projects.filter(p => p.company_id === t.company_id);

        const recentActs = [...teamTasks].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);

        let tAlerts = [];
        if (!t.manager_id) tAlerts.push({ c: 'danger', m: 'No Leadership Node Assigned' });
        if (overdueT.length > 0) tAlerts.push({ c: 'warning', m: `${overdueT.length} Overdue Execution Threads` });
        const idleMems = memberStats.filter(m => m.stat === '⚪ Idle');
        if (idleMems.length > 0) tAlerts.push({ c: 'warning', m: `${idleMems.length} Biological Assets Idle` });

        return (
            <div style={{ animation: 'fade-in 0.3s ease-out' }}>
                <Toaster />
                {isMD && (
                    <button className="btn btn-ghost" onClick={() => setActiveTeamId(null)} style={{ marginBottom: '24px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        ← Return to Venture Structure
                    </button>
                )}

                {/* 1. HEADER */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px', background: 'var(--color-bg-card)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <div style={{ width: '40px', height: '40px', background: 'var(--color-info)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                <Target size={20} />
                            </div>
                            <h2 style={{ fontSize: '1.8rem', margin: 0, letterSpacing: '-0.5px', color: 'var(--color-text-primary)' }}>{t.name}</h2>
                            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', background: tHealthColor, color: '#fff', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>{tHealth}</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', gap: '16px' }}>
                            <span>Venture: <strong style={{color:'var(--color-text-primary)'}}>{comp.name || 'UNBOUND'}</strong></span>
                            <span>Operation Lead: <strong style={{ color: tLead ? 'var(--color-info)' : 'var(--color-danger)' }}>{tLead?.full_name || 'UNASSIGNED'}</strong></span>
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {isMD && <button className="btn btn-ghost" style={{ fontSize: '0.75rem', border: '1px solid var(--color-border)' }}>Reassign Lead</button>}
                        {(isMD || isManager) && <button className="btn btn-primary" style={{ fontSize: '0.75rem' }}>Deploy Task</button>}
                    </div>
                </div>

                {/* 2. TEAM SNAPSHOT */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                    {[
                        { label: 'Deployed Members', val: tMembers.length, col: 'var(--color-text-primary)' },
                        { label: 'Active Pipeline', val: activeT.length, col: 'var(--color-text-primary)' },
                        { label: 'Pending Start', val: pendingT.length, col: 'var(--color-warning)' },
                        { label: 'Resolved (Done)', val: doneT.length, col: 'var(--color-success)' },
                        { label: 'Critically Overdue', val: overdueT.length, col: 'var(--color-danger)' },
                    ].map((m, i) => (
                        <div key={i} style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px', borderLeft: i === 4 && m.val > 0 ? '3px solid var(--color-danger)' : '1px solid transparent' }}>
                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>{m.label}</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: m.col }}>{m.val}</div>
                        </div>
                    ))}
                </div>

                {/* 2-COLUMN LAYER */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) minmax(350px, 1.2fr)', gap: '24px', alignItems: 'start' }}>
                    
                    {/* LEFT COLUMN: Members, Workload, Projects */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* 3 & 6. MEMBERS & WORKLOAD LAYER */}
                        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
                            <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Users size={16}/> Biological Capacity & Load
                            </h4>
                            {tMembers.length === 0 ? <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No biological assets bound.</span> : 
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {memberStats.map(m => (
                                        <div key={m.id} className="card" style={{ padding: '12px 16px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '4px' }}>{m.full_name}</div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.role}</div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'right' }}>
                                                <div>
                                                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-info)' }}>{m.mActive.length}</div>
                                                    <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)' }}>Tasks</div>
                                                </div>
                                                <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', background: `color-mix(in srgb, ${m.col} 20%, transparent)`, color: m.col, padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                                                    {m.stat}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            }
                        </div>

                        {/* 5. PROJECT ASSOCIATION */}
                        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
                            <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <LayoutDashboard size={16}/> Linked Internal Objectives
                            </h4>
                            {teamProjects.length === 0 ? <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No localized projects targeted.</span> : 
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {teamProjects.map(p => (
                                        <div key={p.id} className="card" style={{ padding: '12px 16px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.name}</div>
                                            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-primary)' }}>{p.status || 'Active'}</span>
                                        </div>
                                    ))}
                                </div>
                            }
                        </div>

                    </div>

                    {/* RIGHT COLUMN: Execution Tracer & Framework */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                        {/* 8. ALERTS */}
                        {tAlerts.length > 0 && (
                            <div style={{ background: 'rgba(248, 113, 113, 0.05)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <AlertTriangle size={16}/> Matrix Instability Vectors
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {tAlerts.map((f, i) => (
                                        <div key={i} style={{ fontSize: '0.8rem', fontWeight: 'bold', color: f.c === 'danger' ? 'var(--color-danger)' : 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            • {f.m}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 4. TASK FLOW (EXECUTION ENGINE) */}
                        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
                            <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Activity size={16}/> Localized Task Matrix
                            </h4>
                            {activeT.length === 0 ? <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No operations actively executing.</span> : 
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
                                    {activeT.map(tsk => {
                                        const isOvrd = tsk.due_date && new Date(tsk.due_date) < now;
                                        return (
                                            <div key={tsk.id} style={{ background: 'var(--color-bg)', borderLeft: `3px solid ${isOvrd ? 'var(--color-danger)' : 'var(--color-info)'}`, borderRadius: '4px', padding: '12px 16px', borderTop: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: isOvrd ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>{tsk.title}</div>
                                                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', background: tsk.status === 'todo' ? 'var(--color-warning)' : 'var(--color-info)', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                                        {tsk.status === 'todo' ? 'Pending' : 'Active'}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                                    <span>Assignees: {tsk.assigned_profiles?.length || 0}</span>
                                                    {tsk.due_date && <span>Due: {new Date(tsk.due_date).toLocaleDateString()}</span>}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            }
                        </div>

                        {/* 7. RECENT ACTIVITY */}
                        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
                            <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Clock size={16}/> Operational Echoes
                            </h4>
                            {recentActs.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
                                    {recentActs.map((ra, idx) => (
                                        <div key={ra.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-info)', marginTop: '4px', flexShrink: 0 }}/>
                                            <div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-primary)' }}>Execution Node Spawned: {ra.title}</div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>{new Date(ra.created_at).toLocaleString()}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No operations processed locally.</span>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        )
    }

    // ---- DRILL-DOWN LEVEL 2 (COMPANY ISOLATED) ----
    if (activeCompanyId) {
        const comp = companies.find(c => c.id === activeCompanyId);
        const mem = systemMemory.map[comp.id];

        const noLeadTeams = mem.cTeams.filter(t => !t.manager_id);
        const allAlerts = [...mem.flags];
        if (noLeadTeams.length > 0 && comp.status !== 'inactive') allAlerts.push({ type: 'warning', msg: `${noLeadTeams.length} Teams lack Leadership` });

        const criticalTasks = [...mem.overdue].sort((a,b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).slice(0, 3);
        const recentActivity = [...mem.cTasks, ...mem.cProjects, ...mem.cUsers]
            .sort((a,b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
            .slice(0, 5)
            .map(item => {
                let text = "Entity Executed";
                let time = new Date(item.created_at || 0).toLocaleString();
                if (item.title) text = `Task Deployed: ${item.title}`;
                if (item.role) text = `Biological Asset Joined: ${item.full_name} (${item.role})`;
                if (item.client_id) text = `Project Initialized: ${item.name}`;
                return { text, time, id: item.id || Math.random() };
            });

        return (
            <div style={{ animation: 'fade-in 0.3s ease-out' }}>
                <Toaster />
                {modals}
                <button className="btn btn-ghost" onClick={() => setActiveCompanyId(null)} style={{ marginBottom: '24px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    ← Return to Global Grid
                </button>
                
                {/* 1. HEADER */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px', background: 'var(--color-bg-card)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <div style={{ width: '40px', height: '40px', background: comp.status === 'inactive' ? 'var(--color-text-muted)' : 'var(--color-primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', opacity: comp.status === 'inactive' ? 0.3 : 1 }}>
                                <Building2 size={20} />
                            </div>
                            <h2 style={{ fontSize: '1.8rem', margin: 0, letterSpacing: '-0.5px', color: comp.status === 'inactive' ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}>{comp.name}</h2>
                            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', background: mem.healthColor, color: '#fff', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>{mem.health}</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                            CEO: <span style={{ color: mem.ceo ? 'var(--color-primary)' : 'var(--color-text-primary)', fontWeight: 'bold' }}>{mem.ceo?.full_name || 'UNASSIGNED'}</span>
                        </div>
                    </div>
                    {isMD && (
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button className="btn btn-ghost" style={{ fontSize: '0.75rem', border: '1px solid var(--color-border)' }} onClick={() => setShowCEOModal(true)}>Change Executive (CEO)</button>
                            <button className="btn btn-ghost" style={{ fontSize: '0.75rem', color: comp.status === 'inactive' ? 'var(--color-success)' : 'var(--color-danger)', border: `1px solid ${comp.status === 'inactive' ? 'var(--color-success)' : 'var(--color-danger)'}` }} onClick={() => handleHaltOperations(comp)}>
                                {comp.status === 'inactive' ? 'Resume Operations' : 'Halt Operations'}
                            </button>
                        </div>
                    )}
                </div>

                {/* 2. SYSTEM SNAPSHOT */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px', opacity: comp.status === 'inactive' ? 0.5 : 1, transition: 'all 0.3s' }}>
                    {[
                        { label: 'Total Biological Assets', val: mem.cUsers.length, icon: <Users size={16}/> },
                        { label: 'Networked Teams', val: mem.cTeams.length, icon: <Target size={16}/> },
                        { label: 'Active Projects', val: mem.cProjects.length, icon: <LayoutDashboard size={16}/> },
                        { label: 'Active Executing Tasks', val: mem.activeTsk.length, icon: <Activity size={16}/> },
                        { label: 'Critical Overdue Tasks', val: mem.overdue.length, icon: <AlertTriangle size={16} color="var(--color-danger)"/> },
                    ].map((m, i) => (
                        <div key={i} style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '20px', borderLeft: i === 4 && m.val > 0 && comp.status !== 'inactive' ? '3px solid var(--color-danger)' : '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
                                {m.icon} <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>{m.label}</span>
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>{m.val}</div>
                        </div>
                    ))}
                </div>
                
                {/* 2-COLUMN LAYOUT */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', alignItems: 'start', opacity: comp.status === 'inactive' ? 0.5 : 1, transition: 'all 0.3s' }}>
                    
                    {/* LEFT COLUMN: Teams, Projects */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* 3. TEAMS LAYER */}
                        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
                            <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Target size={16}/> Execution Structure (Teams)
                            </h4>
                            {mem.cTeams.length === 0 ? <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No initialized teams</span> : 
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                                    {mem.cTeams.map(t => {
                                        const tLead = users.find(u => u.id === t.manager_id);
                                        return (
                                            <div key={t.id} className="card" onClick={() => setActiveTeamId(t.id)} style={{ padding: '16px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', cursor: 'pointer', transition: 'all 0.2s', ':hover': { borderColor: 'var(--color-primary)' } }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{t.name}</span>
                                                    {!tLead && <AlertCircle size={14} color="var(--color-warning)" title="No Leadership Attached"/>}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                                                    Lead: <strong style={{ color: tLead ? 'var(--color-text-primary)' : 'var(--color-warning)' }}>{tLead?.full_name || 'UNASSIGNED'}</strong>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            }
                        </div>

                        {/* 4. PROJECTS LAYER */}
                        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
                            <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <LayoutDashboard size={16}/> Delivery Pipeline (Projects)
                            </h4>
                            {mem.cProjects.length === 0 ? <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No linked operational nodes</span> : 
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {mem.cProjects.map(p => (
                                        <div key={p.id} className="card" style={{ padding: '16px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px' }}>{p.name}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status: {p.status || 'Active'}</div>
                                            </div>
                                            <ArrowRight size={16} color="var(--color-text-muted)"/>
                                        </div>
                                    ))}
                                </div>
                            }
                        </div>

                    </div>

                    {/* RIGHT COLUMN: Task Snapshot, Activity, Alerts */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* 8. ALERTS PANEL */}
                        {allAlerts.length > 0 && (
                            <div style={{ background: 'rgba(248, 113, 113, 0.05)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <AlertTriangle size={16}/> Critical Control Alerts
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {allAlerts.map((f, i) => (
                                        <div key={i} style={{ fontSize: '0.8rem', fontWeight: 'bold', color: f.type === 'danger' ? 'var(--color-danger)' : 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            • {f.msg}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 5. TASK FLOW SNAPSHOT */}
                        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
                            <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Activity size={16}/> Execution Snapshot (Tasks)
                            </h4>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--color-border)' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-warning)' }}>{mem.pendingTsk.length}</div>
                                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)' }}>Pending</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-info)' }}>{mem.activeTsk.length - mem.pendingTsk.length}</div>
                                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)' }}>Active</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-success)' }}>{mem.doneTsk.length}</div>
                                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)' }}>Resolved</div>
                                </div>
                            </div>
                            
                            {criticalTasks.length > 0 && (
                                <div>
                                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-danger)', fontWeight: 'bold', marginBottom: '12px' }}>Top Critical Bottlenecks</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {criticalTasks.map(t => (
                                            <div key={t.id} style={{ fontSize: '0.8rem', background: 'var(--color-bg)', padding: '8px 12px', borderRadius: '4px', borderLeft: '2px solid var(--color-danger)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {t.title}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 6. RECENT ACTIVITY */}
                        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
                            <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Clock size={16}/> Timeline Layer (Live)
                            </h4>
                            {recentActivity.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
                                    {recentActivity.map((ra, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary)', marginTop: '4px', flexShrink: 0 }}/>
                                            <div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-primary)' }}>{ra.text}</div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>{ra.time}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No localized timeline echoes found.</span>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        );
    }

    // ---- GLOBAL OS CONTROL CENTER (GRID VIEW) ----
    return (
        <div style={{ animation: 'fade-in 0.3s ease-out' }}>
            <Toaster />
            {modals}
            
            {/* Global Header System Strip */}
            {isMD && (
                <div style={{ background: 'linear-gradient(90deg, var(--color-bg-card), rgba(108, 99, 255, 0.05))', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '24px', marginBottom: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
                    <div>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>Global Ecosystems</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1, color: 'var(--color-text-primary)' }}>{companies.length}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>Biological Assets</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1, color: 'var(--color-text-primary)' }}>{systemMemory.sysMembers}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>Operations Running</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1, color: 'var(--color-text-primary)' }}>{systemMemory.sysTasks}</div>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <select className="form-select" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', width: 'auto' }}>
                        <option value="largest">Sort: Highest Capacity</option>
                        <option value="active">Sort: Most Synchronized</option>
                        <option value="delayed">Sort: Critical Load</option>
                    </select>
                </div>

                {isMD && (
                    <button className="btn btn-primary" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', padding: '8px 16px' }} onClick={() => setShowCreateVenture(true)}>
                        <Plus size={14} /> Establish New Venture
                    </button>
                )}
            </div>

            {displayCompanies.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', background: 'var(--color-bg-card)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)' }}>
                    <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)', fontWeight: 'bold' }}>No venture nodes architected.</div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
                    {displayCompanies.map(c => {
                        const mem = systemMemory.map[c.id];
                        const latestStr = mem.latest ? new Date(mem.latest).toLocaleString('en-IN', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Never';

                        return (
                            <div key={c.id} className="card" style={{ transition: 'all 0.2s', padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderTop: `4px solid ${mem.healthColor}`, opacity: c.status === 'inactive' ? 0.6 : 1 }}>
                                
                                {/* Header / Identity */}
                                <div style={{ padding: '20px 20px 16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'var(--color-bg-card)', borderBottom: '1px solid var(--color-border)' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.3px', color: 'var(--color-text-primary)' }}>{c.name}</h3>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            Executive Lead: <span style={{ color: mem.ceo ? 'var(--color-primary)' : 'var(--color-danger)', fontWeight: 'bold' }}>{mem.ceo?.full_name || 'UNASSIGNED'}</span>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', background: mem.healthColor, color: '#fff', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                                        {mem.health.split(' ')[1]}
                                    </span>
                                </div>

                                {/* Operational Metrics Block */}
                                <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'var(--color-bg)' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Biological Capacity</div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {mem.cUsers.length === 0 ? '-' : mem.cUsers.length} <Users size={14} color="var(--color-text-muted)" />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Active Projects</div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {mem.cProjects.length} <LayoutDashboard size={14} color="var(--color-text-muted)" />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Execution State</div>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ color: 'var(--color-info)' }}>{mem.activeTsk.length} </span> Active / <span style={{ color: 'var(--color-warning)' }}>{mem.pendingTsk.length} </span> Pending
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Last Signal Pulse</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Clock size={12}/> {latestStr}
                                        </div>
                                    </div>
                                </div>

                                {/* Live Alerts Strip */}
                                {c.status !== 'inactive' && (
                                    mem.flags.length > 0 ? (
                                        <div style={{ background: 'var(--color-bg-card)', padding: '12px 20px', borderTop: '1px solid var(--color-border)' }}>
                                            {mem.flags.map((f, i) => (
                                                <div key={i} style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: `var(--color-${f.type})`, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: i !== mem.flags.length - 1 ? '6px' : 0, fontWeight: 'bold' }}>
                                                    {f.type === 'danger' ? <AlertTriangle size={12}/> : <AlertCircle size={12}/>} {f.msg}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ background: 'rgba(74, 222, 128, 0.05)', padding: '12px 20px', borderTop: '1px solid var(--color-border)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-success)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <CheckCircle2 size={12}/> Optimal Network Latency
                                        </div>
                                    )
                                )}

                                {/* Card Actions Footer */}
                                <div style={{ background: 'var(--color-bg-elevated)', padding: '12px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', gap: '12px' }}></div>
                                    <button 
                                        className="btn btn-primary" 
                                        style={{ margin: 0, padding: '6px 16px', fontSize: '0.7rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                        onClick={() => setActiveCompanyId(c.id)}
                                    >
                                        Drill Down <ArrowRight size={12}/>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
