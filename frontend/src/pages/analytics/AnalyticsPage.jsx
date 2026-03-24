import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../api/supabase';
import { getTasks, getTeams, getUsers, extractData } from '../../api';
import { useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';

const COLORS = ['#6C63FF', '#FF6584', '#4ADE80', '#FACC15', '#38BDF8', '#A855F7'];
const STATUS_COLORS = { todo: '#94A3B8', in_progress: '#38BDF8', done: '#4ADE80' };

export default function AnalyticsPage() {
    const { profile } = useAuth();
    const [data, setData] = useState({
        tasksByStatus: [],
        tasksByTeam: [],
        teamSizes: [],
        usersbyRole: [],
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            try {
                const [tasksRes, teamsRes, usersRes] = await Promise.all([
                    getTasks().catch(() => ({ data: [] })),
                    getTeams().catch(() => ({ data: [] })),
                    getUsers().catch(() => ({ data: [] })),
                ]);

                const tasks = extractData(tasksRes.data);
                const teams = extractData(teamsRes.data);
                const users = extractData(usersRes.data);

                // Tasks by status
                const statusCount = { todo: 0, in_progress: 0, done: 0 };
                tasks.forEach(t => { if (statusCount[t.status] !== undefined) statusCount[t.status]++; });
                const tasksByStatus = Object.entries(statusCount).map(([name, value]) => ({
                    name: name.replace('_', ' '), value, color: STATUS_COLORS[name]
                }));

                // Tasks per team
                const tasksByTeam = teams.slice(0, 8).map(team => ({
                    name: team.name?.slice(0, 12) || 'No Team',
                    tasks: tasks.filter(t => t.team_id === team.id).length,
                    done: tasks.filter(t => t.team_id === team.id && t.status === 'done').length,
                }));

                // Team sizes
                const teamSizes = teams.slice(0, 6).map(team => ({
                    name: team.name?.slice(0, 12) || 'Team',
                    members: team.team_members?.length || 0,
                }));

                // Users by role
                const roleCount = {};
                users.forEach(u => { roleCount[u.role] = (roleCount[u.role] || 0) + 1; });
                const usersbyRole = Object.entries(roleCount).map(([name, value]) => ({
                    name: name.replace('_', ' '), value
                }));

                setData({ tasksByStatus, tasksByTeam, teamSizes, usersbyRole });
            } finally { setLoading(false); }
        };
        fetch();
    }, []);

    const tooltipStyle = {
        backgroundColor: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        color: 'var(--color-text-primary)',
    };

    return (
        <div>
            <div className="page-header">
                <div className="page-title">Analytics</div>
                <div className="page-subtitle">Performance insights across your organization</div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><div className="spinner" /></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Row 1 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        {/* Task Status Breakdown */}
                        <div className="chart-card">
                            <h4>Task Status Breakdown</h4>
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie data={data.tasksByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name} (${value})`}>
                                        {data.tasksByStatus.map((d, i) => <Cell key={i} fill={d.color || COLORS[i]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={tooltipStyle} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Users by Role */}
                        <div className="chart-card">
                            <h4>Team Composition</h4>
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie data={data.usersbyRole} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name} (${value})`}>
                                        {data.usersbyRole.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={tooltipStyle} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Row 2: Tasks per team */}
                    {data.tasksByTeam.length > 0 && (
                        <div className="chart-card">
                            <h4>Tasks per Team (Total vs Completed)</h4>
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={data.tasksByTeam} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
                                    <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Legend />
                                    <Bar dataKey="tasks" fill="#6C63FF" name="Total Tasks" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="done" fill="#4ADE80" name="Completed" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Row 3: Team sizes */}
                    {data.teamSizes.length > 0 && (
                        <div className="chart-card">
                            <h4>Team Headcount</h4>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={data.teamSizes} margin={{ top: 5, right: 20, bottom: 5, left: 0 }} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                                    <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} width={80} />
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Bar dataKey="members" fill="#FF6584" name="Members" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
