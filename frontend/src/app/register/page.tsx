'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { register, getAuthConfig } from '@/lib/api';
import { Mail, Lock, User, Hexagon, ArrowRight, Eye, EyeOff } from 'lucide-react';
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

function FormAlert({ message }: { message: string }) {
  return (
    <div aria-live="polite" role="status" className={message ? 'mb-4' : undefined}>
      {message ? (
        <p
          className="rounded-[var(--radius-control)] px-3 py-2 text-xs font-semibold"
          style={{
            background: tint('var(--color-rose)', 12),
            border: `1px solid ${tint('var(--color-rose)', 32)}`,
            color: 'var(--color-rose)',
          }}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();

  // null = still asking the server. Registration is invite-only unless the server enables it.
  const [selfRegistration, setSelfRegistration] = useState<boolean | null>(null);
  useEffect(() => {
    getAuthConfig().then((c) => setSelfRegistration(c.selfRegistration)).catch(() => setSelfRegistration(false));
  }, []);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextNameError = fullName.trim() ? '' : 'Full name is required.';
    const nextEmailError = email.trim() ? '' : 'Email address is required.';
    const nextPasswordError = !password
      ? 'Password is required.'
      : password.length < 8
      ? 'Password must be at least 8 characters.'
      : '';
    setNameError(nextNameError);
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextNameError || nextEmailError || nextPasswordError) {
      setFormError('Please fix the errors above.');
      return;
    }
    setFormError('');
    setLoading(true);
    try {
      const data = await register(fullName, email, password);
      if (data.success) {
        toast.success(data.message || 'Request received.');
        setTimeout(() => {
          router.push('/');
        }, 1500);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to register. Please try again.';
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
          <div className="mb-6 text-center">
            <h3 className="text-2xl font-semibold tracking-tight mb-2" style={{ color: 'var(--color-text-primary)' }}>
              {selfRegistration === false ? 'Access is by invitation' : 'Request an account'}
            </h3>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {selfRegistration === false
                ? 'InternalX accounts are created by your administrator. Check your email for an invitation link, or ask your administrator to invite you.'
                : 'An administrator must approve your account before you can sign in.'}
            </p>
          </div>

          {selfRegistration !== true ? (
            <div className="text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <Link href="/" className="font-medium hover:underline inline-flex items-center gap-1" style={{ color: 'var(--color-purple-glow)' }}>
                Back to log in <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          ) : (
          <>

          <FormAlert message={formError} />

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Full Name" required error={nameError}>
              {({ id, describedBy, invalid }) => (
                <div className="relative group">
                  <div
                    aria-hidden="true"
                    className="absolute inset-y-0 left-3 flex items-center pointer-events-none"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <User size={18} className="transition-colors group-focus-within:text-[var(--color-purple-glow)]" />
                  </div>
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    aria-invalid={invalid || undefined}
                    type="text"
                    name="name"
                    autoComplete="name"
                    value={fullName}
                    onChange={e => {
                      setFullName(e.target.value);
                      if (nameError) setNameError('');
                    }}
                    placeholder="John Doe"
                    className={FOCUS_RING}
                    style={controlStyle(invalid)}
                  />
                </div>
              )}
            </Field>

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

            <Field label="Password" required error={passwordError}>
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
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>

          <div className="text-center mt-6 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Already have an account?{' '}
            <Link href="/" className="font-medium hover:underline inline-flex items-center gap-1" style={{ color: 'var(--color-purple-glow)' }}>
              Log in <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
