'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { forgotPassword } from '@/lib/api';
import { Mail, Hexagon, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button, Field, Input, tint } from '@/components/ui';

const FOCUS_RING = 'focus:ring-2 focus:ring-[color:var(--color-purple-glow)]';

function controlStyle(invalid: boolean): React.CSSProperties {
  return {
    background: 'var(--color-bg-primary)',
    paddingLeft: '2.5rem',
    borderColor: invalid ? 'var(--color-rose)' : undefined,
  };
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextEmailError = email.trim() ? '' : 'Email address is required.';
    setEmailError(nextEmailError);
    if (nextEmailError) {
      setFormError('Please enter your email address.');
      return;
    }
    setFormError('');
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
      setFormError(msg);
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
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{
                  background: tint('var(--color-emerald)', 20),
                  color: 'var(--color-emerald)'
                }}
              >
                <Mail size={32} />
              </div>
              <h3 className="text-xl font-semibold tracking-tight">Check your email</h3>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                If an account exists for <strong>{email}</strong>, we have sent a password reset link.
              </p>
              <div className="pt-4">
                <Link href="/" className="text-sm font-medium hover:underline inline-flex items-center gap-2" style={{ color: 'var(--color-purple-glow)' }}>
                  <ArrowLeft size={16} aria-hidden="true" /> Back to log in
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

              {formError && (
                <div aria-live="polite" role="status" className="mb-4">
                  <p
                    className="rounded-[var(--radius-control)] px-3 py-2 text-xs font-semibold"
                    style={{
                      background: tint('var(--color-rose)', 12),
                      border: `1px solid ${tint('var(--color-rose)', 32)}`,
                      color: 'var(--color-rose)',
                    }}
                  >
                    {formError}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Email Address" required error={emailError}>
                  {({ id, describedBy, invalid }) => (
                    <div className="relative group">
                      <div
                        aria-hidden="true"
                        className="absolute inset-y-0 left-3 flex items-center pointer-events-none"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        <Mail size={18} className="transition-colors group-focus-within:text-[var(--color-purple-glow)]" />
                      </div>
                      <Input
                        id={id}
                        aria-describedby={describedBy}
                        aria-invalid={invalid || undefined}
                        type="email"
                        name="email"
                        autoComplete="email"
                        value={email}
                        onChange={e => {
                          setEmail(e.target.value);
                          if (emailError) setEmailError('');
                        }}
                        placeholder="name@dropwing.com"
                        className={FOCUS_RING}
                        style={controlStyle(invalid)}
                      />
                    </div>
                  )}
                </Field>

                <Button
                  type="submit"
                  variant="ghost"
                  size="lg"
                  fullWidth
                  loading={loading}
                  trailingIcon={<ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />}
                  className="mt-2 group"
                  style={{
                    background: 'var(--color-text-primary)',
                    color: 'var(--color-bg-primary)'
                  }}
                >
                  {loading ? 'Sending...' : 'Reset Password'}
                </Button>
              </form>

              <div className="text-center mt-6">
                <Link href="/" className="text-sm font-medium hover:underline inline-flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
                  <ArrowLeft size={16} aria-hidden="true" /> Back to log in
                </Link>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
