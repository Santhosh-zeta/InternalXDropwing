import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';

export function ProtectedRoute({ allowedRoles }) {
    const { user, profile, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner" />
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Loading...</span>
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;

    if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}

export function PublicRoute() {
    const { user, loading } = useAuth();
    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
    if (user) return <Navigate to="/dashboard" replace />;
    return <Outlet />;
}
