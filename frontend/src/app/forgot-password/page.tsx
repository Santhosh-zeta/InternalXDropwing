'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { forgotPassword } from '@/lib/api';
import { Mail, Hexagon, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      const data = await forgotPassword(email);
      if (data.success) {
        setSuccess(true);
        toast.success('Password reset email sent (if account exists).');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to send reset email.';
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
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mx-auto mb-4">
                <Mail size={32} />
              </div>
              <h3 className="text-xl font-semibold tracking-tight">Check your email</h3>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                If an account exists for <strong>{email}</strong>, we have sent a password reset link.
              </p>
              <div className="pt-4">
                <Link href="/" className="text-sm font-medium hover:underline inline-flex items-center gap-2" style={{ color: 'var(--color-purple-glow)' }}>
                  <ArrowLeft size={16} /> Back to log in
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <h3 className="text-2xl font-semibold tracking-tight mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  Forgot password?
                </h3>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  No worries, we'll send you reset instructions.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
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
                      Sending...
                    </>
                  ) : (
                    <>
                      Reset Password <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>
              <div className="text-center mt-6">
                <Link href="/" className="text-sm font-medium hover:underline inline-flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
                  <ArrowLeft size={16} /> Back to log in
                </Link>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
