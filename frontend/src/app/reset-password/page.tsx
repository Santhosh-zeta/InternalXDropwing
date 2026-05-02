'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { resetPassword } from '@/lib/api';
import { Lock, Eye, EyeOff, Hexagon, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('Invalid or missing reset token.');
      return;
    }
    if (!password || !confirmPassword) {
      toast.error('Please fill in both fields.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      const data = await resetPassword(token, password);
      if (data.success) {
        setSuccess(true);
        toast.success('Password successfully reset.');
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to reset password. The link might be expired.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mx-auto mb-4">
          <Lock size={32} />
        </div>
        <h3 className="text-xl font-semibold tracking-tight">Password Reset Complete</h3>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Your password has been successfully updated. Redirecting to login...
        </p>
        <div className="pt-4">
          <Link href="/" className="text-sm font-medium hover:underline inline-flex items-center gap-2" style={{ color: 'var(--color-purple-glow)' }}>
            <ArrowRight size={16} /> Go to log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h3 className="text-2xl font-semibold tracking-tight mb-2" style={{ color: 'var(--color-text-primary)' }}>
          Set new password
        </h3>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Your new password must be different from previous used passwords.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>New Password</label>
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

        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Confirm Password</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none" style={{ color: 'var(--color-text-muted)' }}>
              <Lock size={18} className="transition-colors group-focus-within:text-[var(--color-purple-glow)]" />
            </div>
            <input
              type={showConfirmPass ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
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
              onClick={() => setShowConfirmPass(!showConfirmPass)}
              className="absolute inset-y-0 right-3 flex items-center transition-colors hover:text-[var(--color-text-primary)]"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !token}
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
              Resetting...
            </>
          ) : (
            <>
              Reset Password <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>

      {!success && (
        <div className="text-center mt-6">
          <Link href="/" className="text-sm font-medium hover:underline inline-flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
            <ArrowLeft size={16} /> Back to log in
          </Link>
        </div>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
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
          <Suspense fallback={<div className="text-center p-4">Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </motion.div>
      </div>
    </div>
  );
}
