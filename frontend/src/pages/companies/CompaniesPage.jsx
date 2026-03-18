import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getVentures } from '../../api';
import { Building2, Users, Globe } from 'lucide-react';

const COMPANY_COLORS = {
    'Webforge': 'var(--company-webforge)',
    'PerSyniX': 'var(--company-persynix)',
    'Persynix': 'var(--company-persynix)',
    'Design Studio': 'var(--company-design)',
    'Dropwing Design Studio': 'var(--company-design)',
    'Grovia': 'var(--company-grovia)',
    'Dropwing Groups': 'var(--color-primary)',
};

const CEO_MAP = {
    'Webforge': 'Ashwin Kumaran K U',
    'PerSyniX': 'Daksha Boredekar',
    'Persynix': 'Daksha Boredekar',
    'Design Studio': 'Johan J Anil',
    'Dropwing Design Studio': 'Johan J Anil',
    'Grovia': 'Yazhini',
};

export default function CompaniesPage() {
    const { profile } = useAuth();
    const [ventures, setVentures] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getVentures()
            .then(({ data }) => setVentures(data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    // Find the parent company (Dropwing Groups)
    const parent = ventures.find(v => v.name === 'Dropwing Groups');
    const subsidiaries = ventures.filter(v => v.name !== 'Dropwing Groups');

    return (
        <div>
            <div className="page-header">
                <div className="page-title">Ventures</div>
                <div className="page-subtitle">Dropwing Groups & its subsidiaries</div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner" /></div>
            ) : (
                <>
                    {/* Parent Company Card */}
                    {parent && (
                        <div className="card mb-xl" style={{
                            background: 'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(255,101,132,0.08))',
                            borderColor: 'rgba(108,99,255,0.25)',
                            borderWidth: '1px',
                        }}>
                            <div className="flex items-center gap-md">
                                <div style={{ fontSize: '2.8rem', lineHeight: 1 }}>⬡</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                        <h2 style={{ margin: 0 }}>Dropwing Groups</h2>
                                        <span className="badge badge-md">Parent Company</span>
                                    </div>
                                    <p style={{ marginTop: '6px', fontSize: '0.9rem' }}>
                                        Managing Director: <strong>Santhosh V</strong>
                                    </p>
                                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Globe size={14} /> dropwinggroups.com
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Subsidiaries Grid */}
                    <div style={{ marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                            Subsidiaries ({subsidiaries.length})
                        </h3>
                    </div>

                    <div className="grid-2">
                        {subsidiaries.map((v) => {
                            const color = COMPANY_COLORS[v.name] || 'var(--color-primary)';
                            const ceo = CEO_MAP[v.name];
                            return (
                                <div key={v.id} className="card" style={{ borderLeft: `3px solid ${color}`, transition: 'all 0.2s ease' }}>
                                    <div className="flex items-center gap-md" style={{ marginBottom: '16px' }}>
                                        <div style={{
                                            width: '50px', height: '50px', borderRadius: '14px',
                                            background: `${color}22`, display: 'flex',
                                            alignItems: 'center', justifyContent: 'center', color,
                                        }}>
                                            <Building2 size={24} />
                                        </div>
                                        <div>
                                            <h3 style={{ marginBottom: '2px', fontSize: '1.1rem' }}>{v.name}</h3>
                                            {ceo && (
                                                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                                                    CEO: <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>{ceo}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <div style={{ flex: 1, padding: '12px', background: 'var(--color-bg)', borderRadius: '10px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color }}>—</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Members</div>
                                        </div>
                                        <div style={{ flex: 1, padding: '12px', background: 'var(--color-bg)', borderRadius: '10px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-success)' }}>Active</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '12px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                        ID: {v.id.slice(0, 8)}...
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
