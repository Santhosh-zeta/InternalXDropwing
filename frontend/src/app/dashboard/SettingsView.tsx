'use client';

import { useId, useRef, useState } from 'react';
import { ShieldCheck, SlidersHorizontal, UserCircle } from 'lucide-react';
import type { User } from '@/lib/constants';
import ProfileTab from './settings/ProfileTab';
import SecurityTab from './settings/SecurityTab';
import PreferencesTab from './settings/PreferencesTab';

type TabId = 'profile' | 'security' | 'preferences';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Personal Info', icon: <UserCircle size={16} aria-hidden="true" /> },
  { id: 'security', label: 'Security', icon: <ShieldCheck size={16} aria-hidden="true" /> },
  { id: 'preferences', label: 'Preferences', icon: <SlidersHorizontal size={16} aria-hidden="true" /> },
];

export default function SettingsView({ currentUser }: { currentUser: User }) {
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const uid = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Arrow keys move between tabs, as expected of an ARIA tablist.
  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = TABS.length - 1;
    let next: number;
    if (e.key === 'ArrowRight') next = index === last ? 0 : index + 1;
    else if (e.key === 'ArrowLeft') next = index === 0 ? last : index - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    else return;
    e.preventDefault();
    setActiveTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6 pb-10">
      <div>
        <h2 className="text-2xl font-black text-[var(--color-text-primary)]">Account Settings</h2>
        <p className="mt-1 text-sm font-medium text-[var(--color-text-secondary)]">Manage your profile, password and notifications.</p>
      </div>

      <div role="tablist" aria-label="Settings sections" className="flex gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-1.5">
        {TABS.map((tab, i) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => { tabRefs.current[i] = el; }}
              type="button"
              role="tab"
              id={`${uid}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${uid}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onKeyDown={(e) => handleTabKeyDown(e, i)}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-5 py-2.5 text-[13px] font-bold transition-all ${
                selected
                  ? 'border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-purple-glow)] shadow-sm'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`${uid}-panel-${activeTab}`} aria-labelledby={`${uid}-tab-${activeTab}`}>
        {activeTab === 'profile' && <ProfileTab currentUser={currentUser} />}
        {activeTab === 'security' && <SecurityTab />}
        {activeTab === 'preferences' && <PreferencesTab />}
      </div>
    </div>
  );
}
