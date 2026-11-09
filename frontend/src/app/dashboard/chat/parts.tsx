import type { ReactNode } from 'react';
import { tint } from '@/components/ui';


export const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,var(--color-purple-glow),var(--color-purple-dark))',
  'linear-gradient(135deg,var(--color-cyan),color-mix(in srgb,var(--color-cyan) 70%,black))',
  'linear-gradient(135deg,var(--color-emerald),color-mix(in srgb,var(--color-emerald) 70%,black))',
  'linear-gradient(135deg,var(--color-amber),color-mix(in srgb,var(--color-amber) 70%,black))',
  'linear-gradient(135deg,var(--color-rose),color-mix(in srgb,var(--color-rose) 70%,black))',
  'linear-gradient(135deg,var(--color-purple-light),var(--color-purple-glow))',
];

export function getGradient(name: string) {
  const code = name ? name.charCodeAt(0) % AVATAR_GRADIENTS.length : 0;
  return AVATAR_GRADIENTS[code];
}

/**
 * Initial-tile avatar.
 *
 * The person's name is always rendered as text next to this tile, so by
 * default the tile is decorative and hidden from assistive tech — otherwise
 * every name would be announced twice. Pass `decorative={false}` where the
 * tile stands alone and must carry the name itself.
 */
export function Avatar({ name, size = 32, decorative = true }: { name: string; size?: number; decorative?: boolean }) {
  return (
    <div
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : name}
      className="rounded-xl flex items-center justify-center font-black text-white shrink-0 shadow-sm"
      style={{ width: size, height: size, background: getGradient(name || '?'), fontSize: size * 0.38 }}>
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

export function formatTime(dt: string) {
  return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDateLabel(dt: string) {
  const d = new Date(dt);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export function SidebarBtn({ active, color, onClick, icon, label, isRecent }: { active: boolean; color: string; onClick: () => void; icon: ReactNode; label: string; isRecent?: boolean; }) {
  return (
    <button type="button" onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-left transition-all mb-0.5 border ${active ? 'border shadow-sm font-bold' : 'border-transparent hover:bg-[var(--color-bg-primary)] font-medium'}`}
      style={active ? { background: tint(color, 8), borderColor: tint(color, 21), color } : { color: isRecent ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
    >
      <span aria-hidden="true" style={active ? { color } : { color: 'var(--color-text-muted)' }}>{icon}</span>
      <span className={`text-[13px] truncate ${isRecent && !active ? 'font-bold' : ''}`}>{label}</span>
      {active && <span aria-hidden="true" className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />}
      {isRecent && !active && (
        <>
          <span className="sr-only">, new messages</span>
          <span aria-hidden="true" className="ml-auto w-2 h-2 rounded-full bg-[var(--color-purple-glow)] shrink-0" />
        </>
      )}
    </button>
  );
}
