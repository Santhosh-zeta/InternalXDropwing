'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` styles the confirm button as destructive. */
  tone?: 'default' | 'danger';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface PendingConfirm {
  options: ConfirmOptions;
  resolve: (confirmed: boolean) => void;
}

/**
 * Provides `useConfirm()`. Mount once, near the root.
 *
 * Replaces the seven native `window.confirm()` calls used for destructive
 * actions (delete task/project/user/role/document/checklist/level). Native
 * confirm is unstyled, ignores the app theme, cannot be made to match the
 * brand, and blocks the main thread while open.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (options) => new Promise<boolean>((resolve) => setPending({ options, resolve })),
    [],
  );

  // Resolved outside the state updater — React re-invokes updaters under
  // StrictMode, and settling a promise there would fire twice.
  const settle = (confirmed: boolean) => {
    pending?.resolve(confirmed);
    setPending(null);
  };

  const options = pending?.options;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={pending !== null}
        onClose={() => settle(false)}
        title={options?.title ?? ''}
        description={options?.description}
        size="sm"
        closeOnBackdrop={false}
        footer={
          <>
            <Button variant="ghost" onClick={() => settle(false)}>
              {options?.cancelLabel ?? 'Cancel'}
            </Button>
            <Button
              variant={options?.tone === 'danger' ? 'danger' : 'primary'}
              onClick={() => settle(true)}
            >
              {options?.confirmLabel ?? 'Confirm'}
            </Button>
          </>
        }
      >
        <p className="text-base leading-relaxed text-[var(--color-text-secondary)]">
          {options?.description ?? 'This action cannot be undone.'}
        </p>
      </Modal>
    </ConfirmContext.Provider>
  );
}

/**
 * Promise-based confirmation, a near drop-in for `window.confirm`:
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: 'Delete project?', tone: 'danger' }))) return;
 */
export function useConfirm(): ConfirmFn {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a <ConfirmProvider>.');
  }
  return context;
}
