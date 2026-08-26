import type { ReactNode } from 'react';
import RequireAuth from '@/components/RequireAuth';

/**
 * Wraps every /dashboard route in a session check.
 *
 * Added as a layout rather than folded into page.tsx so the guard applies
 * automatically to any future nested dashboard route.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
