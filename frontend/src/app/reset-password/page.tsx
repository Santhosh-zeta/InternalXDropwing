'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { resetPassword } from '@/lib/api';
import { Lock, Eye, EyeOff, Hexagon, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button, Field, Input, tint } from '@/components/ui';

const FOCUS_RING = 'focus:ring-2 focus:ring-[color:var(--color-purple-glow)]';

function controlStyle(invalid: boolean, hasTrailing = false): React.CSSProperties {
  return {
    background: 'var(--color-bg-primary)',
    paddingLeft: '2.5rem',
    paddingRight: hasTrailing ? '2.75rem' : undefined,
    borderColor: invalid ? 'var(--color-rose)' : undefined,
  };
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const isInvite = searchParams.get('invite') === '1';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setFormError('Invalid or missing reset token.');
      toast.error('Invalid or missing reset token.');
      return;
    }
    const nextPasswordError = !password
      ? 'New password is required.'
      : password.length < 8
      ? 'Password must be at least 8 characters.'
      : '';
    const nextConfirmError = !confirmPassword
      ? 'Please confirm your password.'
      : password !== confirmPassword
      ? 'Passwords do not match.'
      : '';
    setPasswordError(nextPasswordError);
    setConfirmPasswordError(nextConfirmError);
    if (nextPasswordError || nextConfirmError) {
      setFormError('Please fix the errors above.');
      return;
    }
    setFormError('');
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
      setFormError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{
            background: tint('var(--color-emerald)', 20),
            color: 'var(--color-emerald)'
          }}
        >
          <Lock size={32} />
        </div>
        <h3 className="text-xl font-semibold tracking-tight">Password Reset Complete</h3>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Your password has been successfully updated. Redirecting to login...
        </p>
        <div className="pt-4">
          <Link href="/" className="text-sm font-medium hover:underline inline-flex items-center gap-2" style={{ color: 'var(--color-purple-glow)' }}>
            <ArrowRight size={16} aria-hidden="true" /> Go to log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h3 className="text-2xl font-semibold tracking-tight mb-2" style={{ color: 'var(--color-text-primary)' }}>
          {isInvite ? 'Welcome! Choose your password' : 'Set new password'}
        </h3>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {isInvite ? 'This activates your account. After this you sign in with your email, password and a one-time code.' : 'Your new password must be different from previously used passwords.'}
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
        <Field label="New Password" required error={passwordError}>
          {({ id, describedBy, invalid }) => (
            <div className="relative group">
              <div
                aria-hidden="true"
                className="absolute inset-y-0 left-3 flex items-center pointer-events-none"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <Lock size={18} className="transition-colors group-focus-within:text-[var(--color-purple-glow)]" />
              </div>
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                type={showPass ? 'text' : 'password'}
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="••••••••"
                className={FOCUS_RING}
                style={controlStyle(invalid, true)}
              />
              <Button
                iconOnly
                size="sm"
                variant="ghost"
                aria-label={showPass ? 'Hide password' : 'Show password'}
                aria-pressed={showPass}
                onClick={() => setShowPass(!showPass)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2"
              >
                {showPass ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </Button>
            </div>
          )}
        </Field>

        <Field label="Confirm Password" required error={confirmPasswordError}>
          {({ id, describedBy, invalid }) => (
            <div className="relative group">
              <div
                aria-hidden="true"
                className="absolute inset-y-0 left-3 flex items-center pointer-events-none"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <Lock size={18} className="transition-colors group-focus-within:text-[var(--color-purple-glow)]" />
              </div>
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                type={showConfirmPass ? 'text' : 'password'}
                name="confirm-password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={e => {
                  setConfirmPassword(e.target.value);
                  if (confirmPasswordError) setConfirmPasswordError('');
                }}
                placeholder="••••••••"
                className={FOCUS_RING}
                style={controlStyle(invalid, true)}
              />
              <Button
                iconOnly
                size="sm"
                variant="ghost"
                aria-label={showConfirmPass ? 'Hide password' : 'Show password'}
                aria-pressed={showConfirmPass}
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2"
              >
                {showConfirmPass ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </Button>
            </div>
          )}
        </Field>

        <Button
          type="submit"
          variant="ghost"
          size="lg"
          fullWidth
          loading={loading}
          disabled={!token}
          trailingIcon={<ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />}
          className="mt-2 group"
          style={{
            background: 'var(--color-text-primary)',
            color: 'var(--color-bg-primary)'
          }}
        >
          {loading ? 'Saving...' : isInvite ? 'Activate account' : 'Reset Password'}
        </Button>
      </form>

      <div className="text-center mt-6">
        <Link href="/" className="text-sm font-medium hover:underline inline-flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
          <ArrowLeft size={16} aria-hidden="true" /> Back to log in
        </Link>
      </div>
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
