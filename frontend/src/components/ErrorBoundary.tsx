'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button, EmptyState } from '@/components/ui';

interface Props {
  children: ReactNode;
  /** Changing this value clears a previous error (e.g. the active view id). */
  resetKey?: string;
}

interface State {
  error: Error | null;
}

/**
 * Keeps a crash in one view from taking the whole dashboard (sidebar, session,
 * navigation) down with it. Shows a friendly state with a retry; navigating to
 * another view resets it via `resetKey`.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('View crashed:', error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <EmptyState
        tone="error"
        icon={<AlertTriangle size={22} />}
        title="This page ran into a problem"
        description="Nothing you entered has been lost on the server. Try again, or pick another page from the menu."
        action={
          <Button
            variant="secondary"
            leadingIcon={<RotateCcw size={14} aria-hidden="true" />}
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </Button>
        }
      />
    );
  }
}
