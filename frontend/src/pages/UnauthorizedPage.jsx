import { Link } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';

export default function UnauthorizedPage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '16px', padding: '40px', textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-xl)', background: 'rgba(248,113,113,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-danger)' }}>
                <ShieldOff size={40} />
            </div>
            <h1 style={{ fontSize: '2rem' }}>Access Denied</h1>
            <p style={{ maxWidth: '400px' }}>You don't have permission to view this page. Please contact your administrator.</p>
            <Link to="/dashboard" className="btn btn-primary">← Back to Dashboard</Link>
        </div>
    );
}
