'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui';

/**
 * Route-level error boundary.
 *
 * The app previously had no error.tsx, no global-error.tsx and no
 * not-found.tsx, so any thrown render error blanked the entire dashboard
 * with no way back other than a manual reload.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaced in the browser console; swap for your telemetry sink when one exists.
    console.error('Unhandled render error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)] p-6">
      <div className="w-full max-w-md rounded-[var(--radius-panel)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-8 text-center">
        <div
          aria-hidden="true"
          className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-rose)]/20 bg-[var(--color-rose)]/10 text-[var(--color-rose)]"
        >
          <AlertTriangle size={22} />
        </div>

        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Something broke</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          This view failed to render. Retrying usually clears it; if it keeps happening, send the
          reference below to engineering.
        </p>

        {error.digest && (
          <p className="mt-4 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 font-mono text-xs text-[var(--color-text-muted)]">
            {error.digest}
          </p>
        )}

        <div className="mt-6 flex justify-center gap-3">
          <Button variant="primary" onClick={reset} leadingIcon={<RotateCcw size={15} />}>
            Try again
          </Button>
          <Button variant="ghost" onClick={() => window.location.assign('/dashboard')}>
            Back to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
