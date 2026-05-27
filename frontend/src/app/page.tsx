'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { loginUser, verifyOtp, googleLogin } from '@/lib/api';
import { GoogleLogin } from '@react-oauth/google';
import { TEST_ACCOUNTS, VENTURES } from '@/lib/constants';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ChevronDown, 
  Briefcase,
  Hexagon,
  ArrowRight,
  KeyRound
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [selectedVenture, setSelectedVenture] = useState<string>('');
  


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const data = await loginUser(email, password);
      if (data.success) {
        if (data.data?.token) {
          localStorage.setItem('internalx_token', data.data.token);
          localStorage.setItem('internalx_user', JSON.stringify(data.data.user));
          toast.success(`Welcome back, ${data.data.user.fullName}`);
          router.push('/dashboard');
        } else {
          toast.success(data.message || 'OTP sent to your email.');
          setStep(2);
        }
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Authentication failed. Please verify your credentials.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      toast.error('Please enter the OTP.');
      return;
    }
    setLoading(true);
    try {
      const data = await verifyOtp(email, otp);
      if (data.success) {
        localStorage.setItem('internalx_token', data.data.token);
        localStorage.setItem('internalx_user', JSON.stringify(data.data.user));
        toast.success(`Welcome back, ${data.data.user.fullName}`);
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Invalid or expired OTP.';
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
      className="min-h-screen flex flex-col md:flex-row font-sans selection:bg-violet-500/30"
      style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
    >
      {/* Left Panel - Branding & Vision */}
      <div 
        className="hidden md:flex md:w-[45%] lg:w-[50%] p-12 flex-col justify-between relative overflow-hidden"
        style={{ 
          background: 'var(--color-bg-secondary)',
          borderRight: '1px solid var(--color-border)'
        }}
      >
        {/* Subtle decorative mesh / gradient */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(var(--color-text-primary) 1px, transparent 1px)`,
            backgroundSize: '32px 32px'
          }}
        />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 flex items-center gap-3"
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
            <p className="text-[10px] font-semibold tracking-widest uppercase mt-1" style={{ color: 'var(--color-text-muted)' }}>Dropwing Groups</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-10 max-w-md"
        >
          <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.1] mb-6">
            Enterprise intelligence, seamlessly unified.
          </h2>
          <p className="text-lg leading-relaxed mb-8" style={{ color: 'var(--color-text-secondary)' }}>
            Access all venture operations, financial analytics, and team collaboration modules from a single, secure command center.
          </p>

          <div className="flex flex-wrap gap-2">
            {VENTURES.map(v => (
              <div 
                key={v.slug} 
                className="px-3 py-1.5 rounded-full text-xs font-medium border"
                style={{ 
                  background: 'var(--color-bg-primary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)'
                }}
              >
                {v.name}
              </div>
            ))}
          </div>
        </motion.div>

        <div className="relative z-10 text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
          &copy; {new Date().getFullYear()} Dropwing Groups. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-[420px] relative z-10">
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8 md:hidden flex items-center gap-3"
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

          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.4 }}
            >
              <h3 className="text-2xl font-semibold tracking-tight mb-2" style={{ color: 'var(--color-text-primary)' }}>
                Sign in to your account
              </h3>
              <p className="text-sm mb-8" style={{ color: 'var(--color-text-secondary)' }}>
                Enter your credentials to access your workspace.
              </p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Email Address</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none transition-colors group-focus-within:text-violet-500" style={{ color: 'var(--color-text-muted)' }}>
                      <Mail size={18} className="transition-colors group-focus-within:text-[var(--color-purple-glow)]" />
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
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Password</label>
                    <Link href="/forgot-password" className="text-xs font-medium hover:underline transition-all" style={{ color: 'var(--color-text-muted)' }}>Forgot password?</Link>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none" style={{ color: 'var(--color-text-muted)' }}>
                      <Lock size={18} className="transition-colors group-focus-within:text-[var(--color-purple-glow)]" />
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
                  className="w-full py-2.5 mt-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-70 group"
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
                      Authenticating...
                    </>
                  ) : (
                    <>
                      Sign In <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

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
                  width="100%"
                />
              </div>

              <div className="text-center mt-6 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Don't have an account?{' '}
                <Link href="/register" className="font-medium hover:underline inline-flex items-center gap-1" style={{ color: 'var(--color-purple-glow)' }}>
                  Sign up <ArrowRight size={14} />
                </Link>
              </div>
            </motion.div>
          )}

          {/* 2FA Temporarily Disabled
          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
            >
              <h3 className="text-2xl font-semibold tracking-tight mb-2" style={{ color: 'var(--color-text-primary)' }}>
                Two-Factor Authentication
              </h3>
              <p className="text-sm mb-8" style={{ color: 'var(--color-text-secondary)' }}>
                We've sent a 6-digit code to <strong>{email}</strong>. Enter it below to verify your identity.
              </p>

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>6-Digit OTP</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none transition-colors group-focus-within:text-violet-500" style={{ color: 'var(--color-text-muted)' }}>
                      <KeyRound size={18} className="transition-colors group-focus-within:text-[var(--color-purple-glow)]" />
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="123456"
                      className="w-full rounded-lg py-2.5 pl-10 pr-4 text-center tracking-[0.5em] font-semibold text-lg outline-none transition-all focus:ring-2 focus:ring-offset-0"
                      style={{ 
                        background: 'var(--color-bg-primary)', 
                        border: '1px solid var(--color-border)', 
                        color: 'var(--color-text-primary)',
                        '--tw-ring-color': 'var(--color-purple-glow)'
                      } as React.CSSProperties}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full py-2.5 mt-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-70 group"
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
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify Code <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>

                <div className="text-center mt-4">
                  <button 
                    type="button"
                    onClick={() => { setStep(1); setOtp(''); }}
                    className="text-xs hover:underline"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    ← Back to login
                  </button>
                </div>
              </form>
            </motion.div>
          )}
          */}

          {step === 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-10 pt-8 border-t border-[var(--color-border)]"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-text-muted)]">Quick Access Logins</p>
                <div className="flex gap-1.5">
                  {['all', 'dropwing', 'fenixa', 'persynix', 'grovia'].map(v => (
                    <button 
                      key={v}
                      onClick={() => setSelectedVenture(v === 'all' ? '' : v)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        (v === 'all' && !selectedVenture) || selectedVenture === v 
                          ? 'scale-125 ring-2 ring-offset-2 ring-[var(--color-purple-glow)]' 
                          : 'opacity-40 hover:opacity-100'
                      }`}
                      style={{ 
                        background: v === 'all' ? 'var(--color-text-muted)' : VENTURES.find(ven => ven.slug === v)?.color,
                        '--tw-ring-offset-color': 'var(--color-bg-primary)'
                      } as React.CSSProperties}
                      title={v === 'all' ? 'All Roles' : VENTURES.find(ven => ven.slug === v)?.name}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {(selectedVenture ? TEST_ACCOUNTS.filter(a => a.ventureSlug === selectedVenture || a.ventureSlug === 'all') : TEST_ACCOUNTS.slice(0, 6)).map((acc, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setEmail(acc.email);
                      setPassword(acc.password);
                      toast.success(`Loaded credentials for ${acc.label}`);
                    }}
                    className="flex flex-col items-start p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-purple-glow)] hover:bg-[var(--color-bg-card)] transition-all group text-left"
                  >
                    <div className="flex items-center gap-2 mb-1.5 w-full">
                      <span className="text-base leading-none">{acc.icon}</span>
                      <span className="text-[11px] font-bold truncate text-[var(--color-text-primary)]">{acc.label}</span>
                    </div>
                    <div className="text-[9px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider truncate w-full">
                      {acc.ventureSlug === 'all' ? 'Global' : acc.ventureSlug} • L{acc.level}
                    </div>
                  </button>
                ))}
              </div>
              {!selectedVenture && (
                <p className="text-[10px] text-[var(--color-text-muted)] text-center mt-4 italic">
                  Showing top roles. Select a venture above for more.
                </p>
              )}
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}