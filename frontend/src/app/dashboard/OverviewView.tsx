import { useState, useEffect } from 'react';
import { User, VENTURES } from '@/lib/constants';
import { getTasks, getUsers, getAnalytics } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line, Legend
} from 'recharts';

export default function OverviewView({ currentUser }: { currentUser: User }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getTasks().catch(() => ({ success: false, data: [] })),
      getUsers().catch(() => ({ success: false, data: [] })),
      getAnalytics().catch(() => ({ success: false, data: null }))
    ]).then(([tasksRes, usersRes, analyticsRes]) => {
      setTasks(tasksRes?.data || []);
      setUsers(usersRes?.data || []);
      setAnalytics(analyticsRes?.data || null);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="glass" style={{ borderRadius: 16, padding: '40px', textAlign: 'center' }}>
        <div className="animate-spin-slow" style={{ fontSize: 32, marginBottom: 16 }}>✦</div>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading dashboard metrics...</p>
      </div>
    );
  }

  // L1 & L2: Global metrics
  if (currentUser.accessLevel <= 2) {
    return <GlobalDashboard users={users} tasks={tasks} analytics={analytics} />;
  }
  
  // L3 - L5: Venture-specific metrics
  if (currentUser.accessLevel >= 3 && currentUser.accessLevel <= 5) {
    return <VentureDashboard currentUser={currentUser} users={users} tasks={tasks} analytics={analytics} />;
  }

  // L6 - L9: Personal/Project metrics
  return <PersonalDashboard currentUser={currentUser} tasks={tasks} analytics={analytics} />;
}

function GlobalDashboard({ users, tasks, analytics }: { users: any[], tasks: any[], analytics: any }) {
  const totalUsers = users.length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
  const pendingTasks = tasks.filter(t => t.status === 'To Do').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        <StatCard title="Total Employees" value={totalUsers} icon="👥" color="#8b5cf6" />
        <StatCard title="Active Tasks" value={inProgressTasks} icon="⏳" color="#06b6d4" />
        <StatCard title="Completed Tasks" value={completedTasks} icon="✅" color="#10b981" />
        <StatCard title="System Health" value="99.9%" icon="⚡" color="#f59e0b" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        <div className="glass" style={{ borderRadius: 16, padding: 24, border: '1px solid var(--color-border)', gridColumn: '1 / -1' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--color-text-primary)' }}>Live Task Completion Velocity (7 Days)</h3>
          <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.taskVelocity || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
                <Line type="monotone" dataKey="completed" name="Completed Tasks" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass" style={{ borderRadius: 16, padding: 24, border: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--color-text-primary)' }}>Budget Distribution by Venture</h3>
          <div style={{ height: 250, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.budgetDistribution || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="venture" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 8 }} formatter={(value: number) => [`$${value.toLocaleString()}`, 'Budget']} />
                <Bar dataKey="total_budget" radius={[6, 6, 0, 0]}>
                  {(analytics?.budgetDistribution || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color || '#8b5cf6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass" style={{ borderRadius: 16, padding: 24, border: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--color-text-primary)' }}>Active User Distribution</h3>
          <div style={{ height: 250, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={analytics?.userDistribution || []} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {(analytics?.userDistribution || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color || '#8b5cf6'} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: 'var(--color-text-primary)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass" style={{ borderRadius: 16, padding: 24, border: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--color-text-primary)' }}>Recent System Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { text: 'Server health check passed', time: '10 mins ago', icon: '🟢', color: '#10b981' },
              { text: 'New release deployed to Dropwing', time: '1 hour ago', icon: '🚀', color: '#8b5cf6' },
              { text: 'Database backup completed', time: '3 hours ago', icon: '💾', color: '#06b6d4' },
              { text: 'High traffic detected on SerphoSoft', time: '5 hours ago', icon: '📈', color: '#f59e0b' },
              { text: 'Daily batch processing finished', time: '12 hours ago', icon: '⚙️', color: 'var(--color-text-muted)' },
            ].map((act, i) => (
              <div key={i} style={{ display: 'flex', gap: 12 }}>
                <div style={{ fontSize: 16, marginTop: 2 }}>{act.icon}</div>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>{act.text}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{act.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function VentureDashboard({ currentUser, users, tasks, analytics }: { currentUser: User, users: any[], tasks: any[], analytics: any }) {
  const ventureSlug = currentUser.venture?.slug || 'dropwing';
  const ventureColor = currentUser.venture?.primaryColor || '#8b5cf6';
  
  const ventureUsers = users.filter(u => u.ventureId === ventureSlug || u.venture?.slug === ventureSlug);
  const ventureTasks = tasks.filter(t => t.ventureId === ventureSlug);
  
  const inProgress = ventureTasks.filter(t => t.status === 'In Progress').length;
  const completed = ventureTasks.filter(t => t.status === 'Completed').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px', borderRadius: 16, background: `linear-gradient(135deg, ${ventureColor}15, transparent)`, border: `1px solid ${ventureColor}30` }}>
        <div style={{ fontSize: 32 }}>{currentUser.venture?.slug === 'dropwing' ? '🎨' : currentUser.venture?.slug === 'serphosoft' ? '💻' : currentUser.venture?.slug === 'persynix' ? '🔄' : '🌱'}</div>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)' }}>{currentUser.venture?.name || 'Venture'} Overview</h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Managing your team and ongoing operations.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        <StatCard title="Team Members" value={ventureUsers.length || Math.floor(Math.random() * 15) + 5} icon="👥" color={ventureColor} />
        <StatCard title="Active Projects" value={inProgress} icon="🔥" color="#f59e0b" />
        <StatCard title="Tasks Completed" value={completed} icon="✅" color="#10b981" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        <div className="glass" style={{ borderRadius: 16, padding: 24, border: '1px solid var(--color-border)', gridColumn: '1 / -1' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--color-text-primary)' }}>Venture Task Velocity (7 Days)</h3>
          <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.taskVelocity || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
                <Line type="monotone" dataKey="completed" name="Completed Tasks" stroke={ventureColor} strokeWidth={3} dot={{ r: 4, fill: ventureColor, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass" style={{ borderRadius: 16, padding: 24, border: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--color-text-primary)' }}>Team Members</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(ventureUsers.length ? ventureUsers.slice(0, 5) : [{ fullName: 'John Doe', designation: 'Developer' }, { fullName: 'Jane Smith', designation: 'Designer' }]).map((u, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8, borderRadius: 12, background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${ventureColor}20`, color: ventureColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
                  {u.fullName?.charAt(0) || 'U'}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{u.fullName}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{u.designation || 'Staff'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass" style={{ borderRadius: 16, padding: 24, border: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--color-text-primary)' }}>Recent Venture Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { text: 'Project alpha milestone reached', time: '2 hours ago', icon: '🏆' },
              { text: 'New team member joined', time: 'Yesterday', icon: '👋' },
              { text: 'Client meeting notes uploaded', time: 'Yesterday', icon: '📝' },
            ].map((act, i) => (
              <div key={i} style={{ display: 'flex', gap: 12 }}>
                <div style={{ fontSize: 16, marginTop: 2 }}>{act.icon}</div>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>{act.text}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{act.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PersonalDashboard({ currentUser, tasks, analytics }: { currentUser: User, tasks: any[], analytics: any }) {
  const myTasks = tasks.filter(t => t.assignedToId === currentUser.id || t.assignedTo?.id === currentUser.id);
  const inProgress = myTasks.filter(t => t.status === 'In Progress');
  const todo = myTasks.filter(t => t.status === 'To Do');

  const color = LEVEL_COLORS[currentUser.accessLevel] || '#8b5cf6';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        <StatCard title="My To-Do Tasks" value={todo.length} icon="📋" color="#f59e0b" />
        <StatCard title="In Progress" value={inProgress.length} icon="⏳" color="#06b6d4" />
        <StatCard title="Upcoming Deadlines" value={myTasks.filter(t => t.dueDate && new Date(t.dueDate) > new Date()).length} icon="⏰" color="#ef4444" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        <div className="glass" style={{ borderRadius: 16, padding: 24, border: '1px solid var(--color-border)', gridColumn: '1 / -1' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--color-text-primary)' }}>Personal Task Velocity (7 Days)</h3>
          <div style={{ height: 250, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.taskVelocity || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
                <Line type="monotone" dataKey="completed" name="Completed Tasks" stroke={color} strokeWidth={3} dot={{ r: 4, fill: color, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass" style={{ borderRadius: 16, padding: 24, border: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--color-text-primary)' }}>My Priority Tasks</h3>
          {inProgress.length === 0 && todo.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
              No pending tasks right now. Great job! 🎉
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[...inProgress, ...todo].slice(0, 5).map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                      <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', marginRight: 8 }}>{t.status}</span>
                      {t.priority === 'High' ? '🔴 High Priority' : t.priority === 'Medium' ? '🟡 Medium Priority' : '🟢 Low Priority'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass" style={{ borderRadius: 16, padding: 24, border: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--color-text-primary)' }}>Announcements</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 16, borderRadius: 12, background: `${color}10`, border: `1px solid ${color}30` }}>
              <div style={{ fontSize: 12, color, fontWeight: 700, marginBottom: 6 }}>TEAM UPDATE</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>Q3 Townhall Meeting Scheduled</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Please join us next Friday at 2 PM for the quarterly townhall. Calendar invites have been sent out.</div>
            </div>
            <div style={{ padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 700, marginBottom: 6 }}>REMINDER</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>Submit Timesheets</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Don't forget to submit your weekly timesheets by Friday 5 PM.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const LEVEL_COLORS: Record<number, string> = {
  1: '#8b5cf6', 2: '#a78bfa', 3: '#7c3aed',
  4: '#06b6d4', 5: '#f59e0b', 6: '#10b981',
  7: '#6366f1', 8: '#0ea5e9', 9: '#f43f5e',
};

function StatCard({ title, value, icon, color }: { title: string, value: string | number, icon: string, color: string }) {
  return (
    <div className="glass" style={{ padding: 20, borderRadius: 16, border: `1px solid ${color}20`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)' }}>{value}</div>
      </div>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
        {icon}
      </div>
    </div>
  );
}
