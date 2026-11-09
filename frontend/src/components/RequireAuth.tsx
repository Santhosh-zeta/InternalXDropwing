'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Loader2, WifiOff } from 'lucide-react';
import { getMe } from '@/lib/api';
import { Button } from '@/components/ui';
import { AuthUserContext } from '@/components/AuthUserContext';
import type { User } from '@/lib/constants';

type AuthState = 'checking' | 'authed' | 'unreachable';

/**
 * Client-side session gate for the dashboard, and the one place the current
 * user is fetched from the server.
 *
 * Context: `next.config.ts` sets `output: "export"`, and middleware does not
 * run in a static export — so `src/middleware.ts` never executed and
 * `/dashboard` had no guard at all. (It also only checked that the cookie
 * *looked* like a JWT, never verifying the signature, so it was not a
 * security control even in principle.)
 *
 * The real security boundary is the API: every route behind
 * `authenticate` rejects unsigned or expired tokens server-side. This
 * component exists so a signed-out user gets sent to /login instead of
 * rendering an empty shell that 401s on every request.
 *
 * The verified user this fetches is also the *only* copy of "who is signed
 * in" the dashboard uses — see `AuthUserContext`. It used to be read back
 * out of `localStorage`/a client-writable cookie instead, which meant
 * anyone with devtools open could edit their own `accessLevel` there and
 * have every view in the app render as if they were a Super Admin. The real
 * API was never fooled by this — every route re-checks the signed JWT — but
 * the UI would happily show admin-only screens to whoever asked, which is
 * exactly the kind of thing a client shouldn't be trusted to decide for
 * itself.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>('checking');
  const [user, setUser] = useState<User | null>(null);

  const [attempt, setAttempt] = useState(0);

  // A dead session goes to /login; anything else (network, 5xx) offers a retry
  // instead of signing the user out.
  const onFailure = useCallback((error: unknown) => {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 401 || status === 403) {
      // The axios 401 interceptor in lib/api.ts already redirects; `replace`
      // keeps a dead dashboard entry out of history in case it does not.
      window.location.replace('/login');
      return;
    }
    setState('unreachable');
  }, []);

  useEffect(() => {
    let cancelled = false;
    getMe().then(
      (res) => {
        if (cancelled) return;
        setUser(res.data);
        setState('authed');
      },
      (error: unknown) => {
        if (!cancelled) onFailure(error);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt, onFailure]);

  const retry = useCallback(() => {
    setState('checking');
    setAttempt((n) => n + 1);
  }, []);

  // Silent re-fetch for `refresh()`: never flips back to 'checking', so the
  // dashboard stays mounted while the user object updates.
  const refresh = useCallback(async () => {
    try {
      setUser((await getMe()).data);
    } catch (error) {
      onFailure(error);
    }
  }, [onFailure]);

  if (state === 'authed' && user) {
    return (
      <AuthUserContext.Provider value={{ user, refresh }}>
        {children}
      </AuthUserContext.Provider>
    );
  }

  if (state === 'unreachable') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)] p-6">
        <div className="w-full max-w-sm rounded-[var(--radius-panel)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-8 text-center">
          <div
            aria-hidden="true"
            className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-amber)]/20 bg-[var(--color-amber)]/10 text-[var(--color-amber)]"
          >
            <WifiOff size={22} />
          </div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
            Can&apos;t reach the server
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Your session could not be verified. You have not been signed out.
          </p>
          <Button variant="primary" className="mt-6" onClick={retry}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)]"
    >
      <Loader2
        size={26}
        aria-hidden="true"
        className="animate-spin text-[var(--color-purple-glow)]"
      />
      <span className="sr-only">Verifying your session…</span>
    </div>
  );
}
