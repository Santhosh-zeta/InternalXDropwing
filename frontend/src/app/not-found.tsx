import { Compass } from 'lucide-react';

/**
 * 404 page. Uses a plain anchor rather than next/link so it stays correct
 * under `output: "export"` without depending on router APIs.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)] p-6">
      <div className="w-full max-w-md rounded-[var(--radius-panel)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-8 text-center">
        <div
          aria-hidden="true"
          className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-purple-glow)]/20 bg-[var(--color-purple-glow)]/10 text-[var(--color-purple-glow)]"
        >
          <Compass size={22} />
        </div>

        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Page not found</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          That route does not exist, or your access level does not reach it.
        </p>

        <a
          href="/dashboard"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-purple-glow)] px-4 text-base font-semibold text-white transition-colors hover:bg-[var(--color-purple-dark)]"
        >
          Back to dashboard
        </a>
      </div>
    </div>
  );
}
