'use client';

import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { errMsg, isAborted } from './api';
import type { Envelope } from './types';

export interface ApiState<T> {
  /** Latest data. Kept while a refetch is running so lists do not flash empty. */
  data: T | undefined;
  /** User-facing message when the last request failed. */
  error: string | null;
  /** True until the first response (or failure) for the current key arrives. */
  loading: boolean;
  /** True while any request, including a background refetch, is in flight. */
  fetching: boolean;
  refetch: () => void;
  /** Update the cached data locally (optimistic updates after a mutation). */
  setData: (updater: (prev: T | undefined) => T | undefined) => void;
}

interface Settled<T> {
  tag: string;
  data?: T;
  error?: string;
}

/**
 * Fetch on mount and whenever `key` changes. The in-flight request is aborted
 * on unmount, on key change and on refetch, so a slow response can never
 * overwrite a newer one. Pass `key = null` to stay idle.
 *
 * `fetcher` receives the AbortSignal and may close over anything; it does not
 * need to be memoised (it is read through an effect event). Use `unwrapList`
 * for the usual `{ success, data }` envelope.
 */
export function useApi<T>(
  key: string | null,
  fetcher: (signal: AbortSignal) => Promise<T>,
  options: { toastOnError?: string } = {},
): ApiState<T> {
  const [nonce, setNonce] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const run = useEffectEvent(fetcher);
  const toastMessage = options.toastOnError;
  const announce = useEffectEvent((message: string) => {
    if (toastMessage) toast.error(toastMessage === 'auto' ? message : toastMessage);
  });

  const tag = key === null ? null : `${key}#${nonce}`;

  useEffect(() => {
    if (tag === null) return;
    const controller = new AbortController();
    run(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setSettled({ tag, data });
      },
      (err: unknown) => {
        if (controller.signal.aborted || isAborted(err)) return;
        const message = errMsg(err, 'Could not load data');
        announce(message);
        setSettled((prev) => ({ tag, data: prev?.data, error: message }));
      },
    );
    return () => controller.abort();
  }, [tag]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback(
    (updater: (prev: T | undefined) => T | undefined) =>
      setSettled((prev) => (prev ? { ...prev, data: updater(prev.data) } : prev)),
    [],
  );

  const current = settled !== null && settled.tag === tag;
  return {
    data: settled?.data,
    error: current ? (settled.error ?? null) : null,
    loading: tag !== null && !current && settled?.data === undefined,
    fetching: tag !== null && !current,
    refetch,
    setData,
  };
}

/** Unwrap `{ success, data }` and fail loudly when the server says no. */
export async function unwrapList<T>(request: Promise<Envelope<T[]>>): Promise<T[]> {
  const res = await request;
  if (!res.success) throw new Error(res.message || 'Request failed');
  return res.data ?? [];
}
