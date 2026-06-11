'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { register, googleLogin } from '@/lib/api';
import { GoogleLogin } from '@react-oauth/google';
import Cookies from 'js-cookie';
import { Mail, Lock, User, Hexagon, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RegisterPage() {
  const router = useRouter();
  const hasGoogleClientId = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      toast.error('Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    
    setLoading(true);
    try {
      const data = await register(fullName, email, password);
      if (data.success) {
        toast.success(data.message || 'Registration successful!');
        setTimeout(() => {
          router.push('/');
        }, 1500);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to register. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (response: any) => {
    setLoading(true);
    try {
      const data = await googleLogin(response.credential);
      if (data.success) {
        localStorage.setItem('internalx_token', data.data.token);
        localStorage.setItem('internalx_user', JSON.stringify(data.data.user));
        Cookies.set('internalx_token', data.data.token, { expires: 7 });
        Cookies.set('internalx_user', JSON.stringify(data.data.user), { expires: 7 });
        toast.success(`Welcome back, ${data.data.user.fullName}`);
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Google authentication failed.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center font-sans selection:bg-violet-500/30 p-6"
      style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
    >
      <div className="w-full max-w-[420px] relative z-10">
        
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 flex items-center justify-center gap-3"
        >
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ 
              background: 'var(--color-bg-card)', 
              border: '1px solid var(--color-border)',
              color: 'var(--color-purple-glow)'
            }}
          >
            <Hexagon size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight leading-none" style={{ color: 'var(--color-text-primary)' }}>InternalX</h1>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="p-8 rounded-2xl"
          style={{ 
            background: 'var(--color-bg-secondary)', 
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="mb-6 text-center">
            <h3 className="text-2xl font-semibold tracking-tight mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Create an account
            </h3>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Enter your details to get started.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Full Name</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none transition-colors group-focus-within:text-[var(--color-purple-glow)]" style={{ color: 'var(--color-text-muted)' }}>
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-lg py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-offset-0"
                  style={{ 
                    background: 'var(--color-bg-primary)', 
                    border: '1px solid var(--color-border)', 
                    color: 'var(--color-text-primary)',
                    '--tw-ring-color': 'var(--color-purple-glow)'
                  } as React.CSSProperties}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none transition-colors group-focus-within:text-[var(--color-purple-glow)]" style={{ color: 'var(--color-text-muted)' }}>
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@dropwing.com"
                  className="w-full rounded-lg py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-offset-0"
                  style={{ 
                    background: 'var(--color-bg-primary)', 
                    border: '1px solid var(--color-border)', 
                    color: 'var(--color-text-primary)',
                    '--tw-ring-color': 'var(--color-purple-glow)'
                  } as React.CSSProperties}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none transition-colors group-focus-within:text-[var(--color-purple-glow)]" style={{ color: 'var(--color-text-muted)' }}>
                  <Lock size={18} />
                </div>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg py-2.5 pl-10 pr-10 text-sm outline-none transition-all focus:ring-2 focus:ring-offset-0"
                  style={{ 
                    background: 'var(--color-bg-primary)', 
                    border: '1px solid var(--color-border)', 
                    color: 'var(--color-text-primary)',
                    '--tw-ring-color': 'var(--color-purple-glow)'
                  } as React.CSSProperties}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute inset-y-0 right-3 flex items-center transition-colors hover:text-[var(--color-text-primary)]"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 mt-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-70 group"
              style={{ 
                background: 'var(--color-text-primary)', 
                color: 'var(--color-bg-primary)'
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </>
              ) : (
                <>
                  Sign Up <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {hasGoogleClientId && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--color-border)]"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[var(--color-bg-secondary)] px-2 text-[var(--color-text-muted)]">Or continue with</span>
                </div>
              </div>

              <div className="flex justify-center w-full">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => toast.error('Google login failed')}
                  theme="filled_black"
                  shape="pill"
                  width="350"
                />
              </div>
            </>
          )}
          
          <div className="text-center mt-6 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Already have an account?{' '}
            <Link href="/" className="font-medium hover:underline inline-flex items-center gap-1" style={{ color: 'var(--color-purple-glow)' }}>
              Log in <ArrowRight size={14} />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
