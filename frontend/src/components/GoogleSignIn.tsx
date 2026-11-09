'use client';

import { GoogleLogin, GoogleOAuthProvider, type CredentialResponse } from '@react-oauth/google';
import toast from 'react-hot-toast';

/**
 * Google button with its "or continue with" divider. Render it only when the
 * server reports `googleLogin` in /api/auth/config; the public client id comes
 * from that same response (runtime config, nothing baked into the build).
 */
export default function GoogleSignIn({ clientId, onCredential }: { clientId: string; onCredential: (credential: string) => void }) {
  const onSuccess = (r: CredentialResponse) => {
    if (r.credential) onCredential(r.credential);
  };
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <div className="relative my-6">
        <div aria-hidden="true" className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--color-border)]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[var(--color-bg-primary)] px-2 text-[var(--color-text-muted)]">Or continue with</span>
        </div>
      </div>
      <div className="flex w-full justify-center">
        <GoogleLogin onSuccess={onSuccess} onError={() => toast.error('Google login failed')} theme="filled_black" shape="pill" width="350" />
      </div>
    </GoogleOAuthProvider>
  );
}
