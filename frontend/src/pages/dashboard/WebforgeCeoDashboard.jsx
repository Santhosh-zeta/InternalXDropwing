import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users, Briefcase, Mail, CheckCircle, Clock, XCircle, UserPlus, FileText } from 'lucide-react';
import api from '../../api/client';
import toast from 'react-hot-toast';

export default function WebforgeCeoDashboard() {
    const { profile } = useAuth();
    const [leads, setLeads] = useState([]);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [newTaskName, setNewTaskName] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [selectedTeam, setSelectedTeam] = useState('');

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [leadsRes, teamsRes] = await Promise.all([
                api.get('/api/marketing'),
                api.get('/api/teams')
            ]);
            setLeads(leadsRes.data);
            setTeams(teamsRes.data);
        } catch (err) {
            console.error('Failed to fetch CEO dashboard data', err);
            toast.error('Could not load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handleApproveLead = async (id, status) => {
        try {
            await api.put(`/api/marketing/${id}/status`, { status });
            toast.success(`Lead ${status.replace('_', ' ')}!`);
            fetchDashboardData();
        } catch (error) {
            toast.error('Failed to update lead');
        }
    };

    const handleAssignTask = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/tasks', {
                title: newTaskName,
                description: newTaskDesc,
                team_id: selectedTeam,
                status: 'pending',
                company_id: profile.company_id
            });
            toast.success('Task assigned to team successfully!');
            setIsAssignModalOpen(false);
            setNewTaskName('');
            setNewTaskDesc('');
            setSelectedTeam('');
        } catch (err) {
            toast.error('Failed to assign task');
        }
    };

    const renderStatusBadge = (status) => {
        switch (status) {
            case 'pending_approval': return <span className="badge warning"><Clock className="w-3 h-3 mr-1" /> Pending</span>;
            case 'approved': return <span className="badge success"><CheckCircle className="w-3 h-3 mr-1" /> Approved</span>;
            case 'rejected': return <span className="badge danger"><XCircle className="w-3 h-3 mr-1" /> Rejected</span>;
            case 'in_progress': return <span className="badge info"><Briefcase className="w-3 h-3 mr-1" /> In Progress</span>;
            case 'won': return <span className="badge success">🏆 Won</span>;
            case 'lost': return <span className="badge danger">❌ Lost</span>;
            default: return <span className="badge">{status}</span>;
        }
    };

    if (loading) return <div className="p-8 text-center text-[var(--color-text-secondary)]">Loading Webforge Desk...</div>;

    const webforgeTeams = teams.filter(t => t.company_id === profile.company_id);

    return (
        <div className="space-y-6">
            {/* Header */}
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Webforge Operations Desk</h1>
                <p className="text-[var(--color-text-secondary)] mt-1">Welcome back, {profile?.full_name} (CEO)</p>
            </header>

            {/* Reporting Structure Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20">
                    <div className="flex items-center space-x-4">
                        <div className="bg-blue-500/20 p-3 rounded-xl border border-blue-500/30">
                            <Briefcase className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-[var(--color-text-secondary)]">Direct Report Manager</p>
                            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">Roshan</h3>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center space-x-4">
                        <div className="bg-[var(--color-bg-tertiary)] p-3 rounded-xl">
                            <Users className="w-6 h-6 text-[var(--color-brand)]" />
                        </div>
                        <div>
                            <p className="text-sm text-[var(--color-text-secondary)]">Teams Under Management</p>
                            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">{webforgeTeams.length} Active Teams</h3>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center space-x-4">
                        <div className="bg-green-500/10 p-3 rounded-xl border border-green-500/20">
                            <Mail className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-[var(--color-text-secondary)]">Marketing Leads Pending</p>
                            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
                                {leads.filter(l => l.status === 'pending_approval').length} Approvals
                            </h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-end mb-6">
                <button
                    onClick={() => setIsAssignModalOpen(true)}
                    className="btn btn-primary flex items-center space-x-2"
                >
                    <UserPlus className="w-4 h-4" />
                    <span>Assign Task to Team</span>
                </button>
            </div>

            {/* Marketing & Approvals Pipeline */}
            <div className="card">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-[var(--color-brand)]" />
                            Marketing Approvals & Pipeline
                        </h2>
                        <p className="text-sm text-[var(--color-text-secondary)]">Review incoming client leads and approve marketing initiatives.</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Client Name</th>
                                <th>Project Type</th>
                                <th>Est. Value</th>
                                <th>Assigned Rep</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leads.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-8 text-[var(--color-text-secondary)]">
                                        No marketing leads currently in pipeline.
                                    </td>
                                </tr>
                            ) : leads.map(lead => (
                                <tr key={lead.id} className="hover:bg-[var(--color-bg-secondary)] transition-colors">
                                    <td className="font-medium text-[var(--color-text-primary)]">{lead.client_name}</td>
                                    <td>{lead.project_type}</td>
                                    <td className="font-mono text-[var(--color-brand)]">${parseFloat(lead.estimated_value).toLocaleString()}</td>
                                    <td>{lead.assigned?.full_name || 'Unassigned'}</td>
                                    <td>{new Date(lead.created_at).toLocaleDateString()}</td>
                                    <td>{renderStatusBadge(lead.status)}</td>
                                    <td>
                                        {lead.status === 'pending_approval' && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleApproveLead(lead.id, 'approved')}
                                                    className="btn border border-green-500/30! bg-green-500/10! text-green-400! hover:bg-green-500/20! py-1 px-3 text-sm"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleApproveLead(lead.id, 'rejected')}
                                                    className="btn border border-red-500/30! bg-red-500/10! text-red-400! hover:bg-red-500/20! py-1 px-3 text-sm"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        )}
                                        {lead.status === 'approved' && (
                                            <button
                                                onClick={() => handleApproveLead(lead.id, 'in_progress')}
                                                className="btn btn-secondary py-1 px-3 text-sm"
                                            >
                                                Start Work
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Current Teams Snapshot */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {webforgeTeams.map(team => (
                    <div key={team.id} className="card border border-[var(--color-border)] hover:border-[var(--color-brand)] transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Users className="w-5 h-5 text-[var(--color-text-secondary)]" />
                                {team.name}
                            </h3>
                            <span className="badge info">{team.department}</span>
                        </div>
                        <p className="text-sm text-[var(--color-text-secondary)] mb-4">{team.description}</p>
                        <div className="flex justify-between items-center text-sm pt-4 border-t border-[var(--color-border)]">
                            <span className="text-[var(--color-text-secondary)]">Lead: <span className="text-[var(--color-text-primary)] font-medium">{team.leader?.full_name || 'None'}</span></span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Assign Task Modal */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
                        <div className="p-6 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-secondary)]">
                            <h2 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                                <FileText className="w-5 h-5 text-[var(--color-brand)]" />
                                Assign Team Task
                            </h2>
                            <button onClick={() => setIsAssignModalOpen(false)} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleAssignTask} className="p-6 space-y-4">
                            <div className="form-group">
                                <label className="form-label">Task Title</label>
                                <input
                                    type="text"
                                    required
                                    className="form-input"
                                    placeholder="E.g., Prepare Q3 Marketing Strategy"
                                    value={newTaskName}
                                    onChange={e => setNewTaskName(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Assign to Team</label>
                                <select
                                    required
                                    className="form-input"
                                    value={selectedTeam}
                                    onChange={e => setSelectedTeam(e.target.value)}
                                >
                                    <option value="">Select a team...</option>
                                    {webforgeTeams.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} (Lead: {t.leader?.full_name || 'Unassigned'})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Task Instructions / Description</label>
                                <textarea
                                    required
                                    className="form-input min-h-[100px]"
                                    placeholder="Provide detailed instructions for the team..."
                                    value={newTaskDesc}
                                    onChange={e => setNewTaskDesc(e.target.value)}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
                                <button type="button" onClick={() => setIsAssignModalOpen(false)} className="btn btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Assign Task
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
