'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * The active dashboard view lives in the URL (`/dashboard?view=tasks`), so a
 * refresh keeps you where you were and Back / Forward move between views.
 * Any component under the dashboard can call `setView('tasks')` to navigate.
 *
 * Must be rendered inside a Suspense boundary (static export requirement for
 * `useSearchParams`); `dashboard/page.tsx` provides it.
 */
export function useView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const viewId = params.get('view');

  const setView = useCallback(
    (id: string) => router.push(`${pathname}?view=${encodeURIComponent(id)}`, { scroll: false }),
    [router, pathname],
  );

  return { viewId, setView };
}
