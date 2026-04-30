import { User } from '@/lib/constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';

interface StrategyViewProps {
  currentUser: User;
}

const OKRS = [
  { 
    id: 1, 
    venture: 'SerphoSoft', 
    objective: 'Accelerate Enterprise AI Adoption', 
    progress: 68, 
    color: 'var(--serphosoft-color)',
    keyResults: [
      { text: 'Deploy v2.0 AI Engine', done: true },
      { text: 'Onboard 15 new Fortune 500 clients', done: false },
      { text: 'Achieve 99.99% uptime', done: true }
    ]
  },
  { 
    id: 2, 
    venture: 'Dropwing Design', 
    objective: 'Establish Global Brand Presence', 
    progress: 45, 
    color: 'var(--dropwing-color)',
    keyResults: [
      { text: 'Open London Studio', done: false },
      { text: 'Win 3 Major Design Awards', done: false },
      { text: 'Increase retainer revenue by 30%', done: true }
    ]
  },
  { 
    id: 3, 
    venture: 'PerSyniX', 
    objective: 'Optimize Supply Chain Analytics', 
    progress: 85, 
    color: 'var(--persynix-color)',
    keyResults: [
      { text: 'Launch Predictive Model Beta', done: true },
      { text: 'Reduce client churn to <5%', done: true },
      { text: 'Integrate with top 5 ERP systems', done: false }
    ]
  },
];

const GROWTH_DATA = [
  { quarter: 'Q1', target: 400, actual: 420 },
  { quarter: 'Q2', target: 500, actual: 480 },
  { quarter: 'Q3', target: 650, actual: 680 },
  { quarter: 'Q4', target: 800, actual: null },
];

export default function StrategyView({ currentUser }: StrategyViewProps) {
  if (currentUser.accessLevel > 2) {
    return (
      <div className="glass" style={{ padding: 40, borderRadius: 16, textAlign: 'center' }}>
        <h3 style={{ color: 'var(--color-rose)' }}>Access Denied</h3>
        <p style={{ color: 'var(--color-text-muted)' }}>This view is restricted to Managing Directors (L2) and Super Admins.</p>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)' }}>Corporate Strategy & OKRs</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>High-level objectives, key results, and growth targets across all Dropwing ventures.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* OKRs Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            🎯 Active Objectives (OKRs)
          </h3>
          
          {OKRS.map(okr => (
            <div key={okr.id} className="glass" style={{ padding: 20, borderRadius: 16, borderLeft: `4px solid ${okr.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: okr.color, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{okr.venture}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>{okr.objective}</div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: okr.color }}>{okr.progress}%</div>
              </div>
              
              {/* Progress Bar */}
              <div style={{ width: '100%', height: 8, background: 'var(--color-bg-primary)', borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ width: `${okr.progress}%`, height: '100%', background: okr.color, borderRadius: 4 }} />
              </div>

              {/* Key Results */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {okr.keyResults.map((kr, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ color: kr.done ? 'var(--color-emerald)' : 'var(--color-text-muted)', fontSize: 14, marginTop: 2 }}>
                      {kr.done ? '✓' : '○'}
                    </div>
                    <div style={{ fontSize: 13, color: kr.done ? 'var(--color-text-secondary)' : 'var(--color-text-primary)', textDecoration: kr.done ? 'line-through' : 'none' }}>
                      {kr.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Charts & Metrics Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Revenue Growth Chart */}
          <div className="glass" style={{ padding: 24, borderRadius: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 20 }}>Projected vs Actual Revenue Growth ($M)</h3>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={GROWTH_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="quarter" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                  <Tooltip 
                    contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8 }}
                    itemStyle={{ color: 'var(--color-text-primary)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="target" name="Target" stroke="var(--color-text-muted)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  <Line type="monotone" dataKey="actual" name="Actual" stroke="var(--color-emerald)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Strategic Risks */}
          <div className="glass" style={{ padding: 24, borderRadius: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 16 }}>High-Level Risks & Mitigations</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: 12, borderRadius: 10, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-rose)' }}>Talent Retention (Engineering)</span>
                  <span style={{ fontSize: 11, color: 'var(--color-rose)', fontWeight: 700 }}>HIGH</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Mitigation: Revamping ESOP structure by Q3; initiating bi-annual market salary adjustments.</p>
              </div>
              <div style={{ padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-amber)' }}>Competitor AI Disruption</span>
                  <span style={{ fontSize: 11, color: 'var(--color-amber)', fontWeight: 700 }}>MEDIUM</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Mitigation: Accelerating SerphoSoft v2.0 R&D; forming strategic partnership with OpenAI.</p>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
