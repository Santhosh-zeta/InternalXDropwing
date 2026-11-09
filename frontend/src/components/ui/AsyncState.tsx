import type { ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { SkeletonTable } from './Skeleton';

interface AsyncStateProps {
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  /** What is being loaded, for the screen-reader status and the error text. */
  what?: string;
  /** Placeholder shown while loading. Defaults to a table skeleton. */
  skeleton?: ReactNode;
  children: ReactNode;
}

/**
 * One consistent loading / error wrapper for data views. Renders `children`
 * only when there is neither a pending first load nor an error, so views
 * handle just their own empty state.
 */
export function AsyncState({
  loading,
  error,
  onRetry,
  what = 'data',
  skeleton,
  children,
}: AsyncStateProps) {
  if (loading) {
    return (
      <div role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading {what}…</span>
        {skeleton ?? <SkeletonTable rows={5} columns={4} />}
      </div>
    );
  }
  if (error) {
    return (
      <EmptyState
        tone="error"
        icon={<AlertTriangle size={22} />}
        title={`Could not load ${what}`}
        description={error}
        action={
          onRetry && (
            <Button
              variant="secondary"
              leadingIcon={<RotateCcw size={14} aria-hidden="true" />}
              onClick={onRetry}
            >
              Try again
            </Button>
          )
        }
      />
    );
  }
  return <>{children}</>;
}
