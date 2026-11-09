'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { loginUser, verifyOtp, googleLogin, getAuthConfig } from '@/lib/api';
import GoogleSignIn from '@/components/GoogleSignIn';
import { VENTURES } from '@/lib/constants';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Hexagon,
  ArrowRight,
  KeyRound
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button, Field, Input, tint } from '@/components/ui';

/** Keeps the original violet focus ring; `Input` alone only shifts its border. */
const FOCUS_RING = 'focus:ring-2 focus:ring-[color:var(--color-purple-glow)]';

/**
 * Inline styles rather than utility classes: `Input` already ships `px-4` and
 * `bg-[var(--color-bg-secondary)]`, and `cn` does not resolve Tailwind
 * conflicts, so an overriding class would win or lose by stylesheet order.
 */
function controlStyle(invalid: boolean, hasTrailing = false): React.CSSProperties {
  return {
    background: 'var(--color-bg-primary)',
    paddingLeft: '2.5rem',
    paddingRight: hasTrailing ? '2.75rem' : undefined,
    borderColor: invalid ? 'var(--color-rose)' : undefined,
  };
}

/**
 * Form-level errors previously existed only as toasts, which vanish and which
 * screen readers routinely miss. This is a persistent polite live region.
 */
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

const RESEND_COOLDOWN_SECONDS = 30;

export default function LoginPage() {
  const router = useRouter();
  // What this server offers (Google sign-in, self-registration). Nothing extra is shown until it answers.
  const [authConfig, setAuthConfig] = useState({ googleLogin: false, selfRegistration: false });
  useEffect(() => {
    getAuthConfig().then(setAuthConfig).catch(() => { /* keep password sign-in only */ });
  }, []);
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [formError, setFormError] = useState('');
  const [resending, setResending] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn(resendIn - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextEmailError = email.trim() ? '' : 'Email address is required.';
    const nextPasswordError = password ? '' : 'Password is required.';
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextEmailError || nextPasswordError) {
      setFormError('Please enter your email and password.');
      toast.error('Please enter your email and password.');
      return;
    }
    setFormError('');
    setLoading(true);
    try {
      const data = await loginUser(email, password);
      if (data.success) {
        if (data.data?.token) {
          // Nothing to store: the backend already set the session as an
          // httpOnly cookie in this same response (see auth.controller.js),
          // which is the only copy of it that ever needs to exist client-side.
          toast.success(`Welcome back, ${data.data?.user.fullName}`);
          router.push('/dashboard');
        } else {
          toast.success(data.message || 'OTP sent to your email.');
          setResendIn(RESEND_COOLDOWN_SECONDS);
          setStep(2);
        }
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Authentication failed. Please verify your credentials.';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      setOtpError('Enter the 6-digit code from your email.');
      setFormError('Please enter the OTP.');
      toast.error('Please enter the OTP.');
      return;
    }
    setOtpError('');
    setFormError('');
    setLoading(true);
    try {
      const data = await verifyOtp(email, otp);
      if (data.success) {
        toast.success(`Welcome back, ${data.data?.user.fullName}`);
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Invalid or expired OTP.';
      setOtpError(msg);
      setFormError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  /** Re-issues the code through the same call that sent it in step 1. */
  const handleResendOtp = async () => {
    if (resending || resendIn > 0) return;
    setResending(true);
    setOtpError('');
    setFormError('');
    try {
      const data = await loginUser(email, password);
      if (data.success) {
        setOtp('');
        setResendIn(RESEND_COOLDOWN_SECONDS);
        toast.success(data.message || 'A new code is on its way to your email.');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not resend the code. Please try again.';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  const handleGoogleSuccess = async (credential: string) => {
    setLoading(true);
    try {
      const data = await googleLogin(credential);
      if (data.success) {
        toast.success(`Welcome back, ${data.data?.user.fullName}`);
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Google authentication failed.';
      setFormError(msg);
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
          aria-hidden="true"
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
            aria-hidden="true"
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

          <ul className="flex flex-wrap gap-2 list-none">
            {VENTURES.map(v => (
              <li
                key={v.slug}
                className="px-3 py-1.5 rounded-full text-xs font-medium border"
                style={{
                  background: 'var(--color-bg-primary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)'
                }}
              >
                {v.name}
              </li>
            ))}
          </ul>
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
              aria-hidden="true"
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
              <h2 className="text-2xl font-semibold tracking-tight mb-2" style={{ color: 'var(--color-text-primary)' }}>
                Sign in to your account
              </h2>
              <p className="text-sm mb-8" style={{ color: 'var(--color-text-secondary)' }}>
                Enter your credentials to access your workspace.
              </p>

              <FormAlert message={formError} />

              <form onSubmit={handleLogin} className="space-y-4">
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

                <div className="relative">
                  <Link
                    href="/forgot-password"
                    className="absolute right-0 top-0 text-xs font-medium leading-4 hover:underline transition-all"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Forgot password?
                  </Link>
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
                          autoComplete="current-password"
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
                </div>

                <Button
                  type="submit"
                  variant="ghost"
                  size="lg"
                  fullWidth
                  loading={loading}
                  trailingIcon={<ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />}
                  className="mt-4 group"
                  style={{
                    background: 'var(--color-text-primary)',
                    color: 'var(--color-bg-primary)'
                  }}
                >
                  {loading ? 'Authenticating...' : 'Sign In'}
                </Button>
              </form>

              {authConfig.googleLogin && <GoogleSignIn onCredential={handleGoogleSuccess} />}

              {authConfig.selfRegistration ? (
                <div className="text-center mt-6 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Don&apos;t have an account?{' '}
                  <Link href="/register" className="font-medium hover:underline inline-flex items-center gap-1" style={{ color: 'var(--color-purple-glow)' }}>
                    Request access <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              ) : (
                <p className="text-center mt-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Accounts are by invitation. Ask your administrator.
                </p>
              )}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
            >
              <h2 className="text-2xl font-semibold tracking-tight mb-2" style={{ color: 'var(--color-text-primary)' }}>
                Two-Factor Authentication
              </h2>
              <p className="text-sm mb-8" style={{ color: 'var(--color-text-secondary)' }}>
                We&apos;ve sent a 6-digit code to <strong>{email}</strong>. Enter it below to verify your identity.
              </p>

              <FormAlert message={formError} />

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <Field
                  label="6-Digit OTP"
                  required
                  hint="Six digits, numbers only."
                  error={otpError}
                >
                  {({ id, describedBy, invalid }) => (
                    <div className="relative group">
                      <div
                        aria-hidden="true"
                        className="absolute inset-y-0 left-3 flex items-center pointer-events-none"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        <KeyRound size={18} className="transition-colors group-focus-within:text-[var(--color-purple-glow)]" />
                      </div>
                      <Input
                        id={id}
                        aria-describedby={describedBy}
                        aria-invalid={invalid || undefined}
                        type="text"
                        name="otp"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={otp}
                        onChange={e => {
                          setOtp(e.target.value.replace(/[^0-9]/g, ''));
                          if (otpError) setOtpError('');
                        }}
                        placeholder="123456"
                        className={FOCUS_RING}
                        style={{
                          ...controlStyle(invalid),
                          textAlign: 'center',
                          letterSpacing: '0.5em',
                          fontSize: '1rem',
                          fontWeight: 600,
                        }}
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
                  disabled={otp.length !== 6}
                  trailingIcon={<ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />}
                  className="mt-4 group"
                  style={{
                    background: 'var(--color-text-primary)',
                    color: 'var(--color-bg-primary)'
                  }}
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                </Button>

                <div className="flex flex-col items-center gap-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={resending}
                    disabled={resendIn > 0}
                    onClick={handleResendOtp}
                  >
                    {resending
                      ? 'Sending a new code...'
                      : resendIn > 0
                        ? `Resend code in ${resendIn}s`
                        : 'Resend code'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStep(1);
                      setOtp('');
                      setOtpError('');
                      setFormError('');
                    }}
                    leadingIcon={<ArrowRight size={14} aria-hidden="true" className="rotate-180" />}
                  >
                    Back to login
                  </Button>
                </div>
              </form>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}
