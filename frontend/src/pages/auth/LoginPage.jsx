import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(email, password);
            toast.success('Welcome back!');
            navigate('/dashboard');
        } catch (err) {
            toast.error(err.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <Toaster position="top-right" toastOptions={{ style: { background: 'var(--color-bg-card)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' } }} />
            <div className="login-card">
                <div className="login-logo">
                    <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>⬡</div>
                    <h1>Dropwing Groups</h1>
                    <p>Internal Team Portal — Sign in to your account</p>
                </div>

                <form onSubmit={handleSubmit} id="login-form">
                    <div className="form-group">
                        <label className="form-label" htmlFor="email">Email Address</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                            <input
                                id="email"
                                type="email"
                                className="form-input"
                                placeholder="you@dropwinggroups.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={{ paddingLeft: '40px' }}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="password">Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                            <input
                                id="password"
                                type={showPwd ? 'text' : 'password'}
                                className="form-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                style={{ paddingLeft: '40px', paddingRight: '40px' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPwd(!showPwd)}
                                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                            >
                                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <button id="login-submit" type="submit" className="btn btn-primary w-full" disabled={loading} style={{ justifyContent: 'center', marginTop: '8px' }}>
                        {loading ? <><Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> Signing in...</> : 'Sign In'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Contact your administrator to get access.
                </p>
            </div>
        </div>
    );
}
