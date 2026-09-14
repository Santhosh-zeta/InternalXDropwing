'use client';

import { createContext, useContext } from 'react';
import type { User } from '@/lib/constants';

interface AuthUserContextValue {
  /** The server-verified current user. Only ever set by `RequireAuth`, which
   *  guarantees this is non-null by the time it renders its children — see
   *  that component for why the source of truth is `/api/auth/me`, not
   *  anything cached client-side. */
  user: User;
  /** Re-fetch `/api/auth/me` and update `user` everywhere it's consumed.
   *  Call this after an edit that changes what the server would return
   *  (profile fields, avatar) instead of writing a local guess. */
  refresh: () => Promise<void>;
}

export const AuthUserContext = createContext<AuthUserContextValue | null>(null);

/** The verified current user and a way to refresh it. Must be used inside
 *  `RequireAuth` (i.e. anywhere under the `/dashboard` layout). */
export function useAuthUser(): AuthUserContextValue {
  const ctx = useContext(AuthUserContext);
  if (!ctx) {
    throw new Error('useAuthUser() must be used within RequireAuth (the /dashboard layout)');
  }
  return ctx;
}
