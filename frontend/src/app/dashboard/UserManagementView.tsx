'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Briefcase, Building2, Download, Edit2, Mail, Search, UserPlus } from 'lucide-react';
import { getPendingUsers, getUsers, getVentures } from '@/lib/api';
import { unwrapList, useApi } from '@/lib/useApi';
import type { TeamMember } from '@/lib/types';
import type { User } from '@/lib/constants';
import { AsyncState, Badge, Button, EmptyState, Select, SkeletonTable } from '@/components/ui';
import AddUserModal from './users/AddUserModal';
import UserDrawer from './users/UserDrawer';
import PendingApprovals from './users/PendingApprovals';
import { LEVELS } from './users/constants';

const TH = 'px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]';

/**
 * People directory. Everyone L1-L5 sees the people they are scoped to; only
 * L1-L3 can add or change members (see users/constants.ts for the exact rule).
 */
export default function UserManagementView({ currentUser }: { currentUser: User }) {
  const members = useApi('users', (s) => unwrapList(getUsers(s)), { toastOnError: 'auto' });
  const canAdd = currentUser.accessLevel <= 3;
  const ventures = useApi(canAdd ? 'ventures' : null, (s) => unwrapList(getVentures(s)));
  // Self-registered accounts waiting for approval: L1/L2 only (the server returns nothing to anyone else).
  const pending = useApi(currentUser.accessLevel <= 2 ? 'users-pending' : null, (s) => unwrapList(getPendingUsers(s)));

  const [search, setSearch] = useState('');
  const [ventureFilter, setVentureFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [open, setOpen] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  const all = members.data ?? [];
  const needle = search.trim().toLowerCase();
  const visible = all.filter(
    (u) =>
      (!needle || u.full_name.toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle) || (u.employee_id ?? '').toLowerCase().includes(needle)) &&
      (ventureFilter === 'all' || String(u.venture_id) === ventureFilter) &&
      (levelFilter === 'all' || String(u.access_level) === levelFilter),
  );
  const selected = all.find((u) => u.id === open) ?? null;
  const hasFilters = search !== '' || ventureFilter !== 'all' || levelFilter !== 'all';

  const exportPDF = async (rows: TeamMember[]) => {
    try {
      // Loaded on demand: the PDF libraries are large and rarely needed.
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('InternalX - Team members', 14, 22);
      autoTable(doc, {
        head: [['Name', 'Email', 'Role', 'Department', 'Level']],
        body: rows.map((u) => [u.full_name, u.email, u.designation || '-', u.department || '-', `L${u.access_level} ${u.level_name ?? ''}`]),
        startY: 30,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [139, 92, 246] },
      });
      doc.save('InternalX_Team_Members.pdf');
    } catch {
      toast.error('Could not create the PDF');
    }
  };

  const addButton = (label: string) => (
    <Button variant="primary" leadingIcon={<UserPlus size={16} strokeWidth={2.5} aria-hidden="true" />} onClick={() => setAdding(true)}>{label}</Button>
  );

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex flex-col gap-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{canAdd ? 'User management' : 'Team'}</h2>
            <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
              {canAdd ? 'Add people and manage their access, department and role.' : 'People in your venture, their roles and access levels.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" leadingIcon={<Download size={16} strokeWidth={2.5} aria-hidden="true" />} onClick={() => exportPDF(visible)} disabled={visible.length === 0}>
              Export PDF
            </Button>
            {canAdd && addButton('Add member')}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="search"
              aria-label="Search members by name, email or ID"
              placeholder="Search by name, email or ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-2.5 pl-10 pr-4 text-[13px] text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-purple-glow)]"
            />
          </div>
          {currentUser.accessLevel <= 2 && (ventures.data ?? []).length > 0 && (
            <Select aria-label="Filter members by venture" value={ventureFilter} onChange={(e) => setVentureFilter(e.target.value)} className="h-auto w-auto min-w-40 py-2.5">
              <option value="all">All ventures</option>
              {(ventures.data ?? []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          )}
          <Select aria-label="Filter members by access level" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="h-auto w-auto min-w-36 py-2.5">
            <option value="all">All levels</option>
            {LEVELS.map((l) => <option key={l.level} value={l.level}>L{l.level} {l.name}</option>)}
          </Select>
        </div>
      </div>

      <PendingApprovals
        pending={pending.data ?? []}
        actor={currentUser}
        ventures={ventures.data ?? []}
        onChanged={() => { pending.refetch(); members.refetch(); }}
      />

      <AsyncState loading={members.loading} error={members.error} onRetry={members.refetch} what="people" skeleton={<SkeletonTable rows={6} columns={4} />}>
        {all.length === 0 ? (
          <EmptyState
            icon={<UserPlus size={22} aria-hidden="true" />}
            title="No team members yet"
            description={canAdd ? 'Add the first member to give them access to tasks, projects and their venture.' : 'People you work with will be listed here.'}
            action={canAdd ? addButton('Add the first member') : undefined}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<Search size={22} aria-hidden="true" />}
            title="No members found"
            description="No one matches the current search or filters."
            action={hasFilters ? <Button variant="secondary" onClick={() => { setSearch(''); setVentureFilter('all'); setLevelFilter('all'); }}>Clear filters</Button> : undefined}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">Team members, their roles and access levels</caption>
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                    <th scope="col" className={TH}>Member</th>
                    <th scope="col" className={TH}>Role &amp; department</th>
                    <th scope="col" className={TH}>Access</th>
                    <th scope="col" className={`${TH} text-right`}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((u) => {
                    const color = u.primary_color || '#8b5cf6';
                    return (
                      <tr key={u.id} className="border-b border-[var(--color-border)] transition-colors last:border-0 hover:bg-[var(--color-bg-secondary)]">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold" style={{ background: `${color}15`, color, borderColor: `${color}30` }}>
                              {u.full_name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
                                <button type="button" onClick={() => setOpen(u.id)} className="text-left transition-colors hover:text-[var(--color-purple-glow)]">{u.full_name}</button>
                                {!u.is_active && <Badge tone="danger">Inactive</Badge>}
                              </div>
                              <div className="mt-1 flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]"><Mail size={12} aria-hidden="true" /> {u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-text-primary)]"><Briefcase size={14} aria-hidden="true" className="text-[var(--color-text-muted)]" /> {u.designation || 'No role'}</div>
                          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]"><Building2 size={14} aria-hidden="true" /> {u.department || 'No department'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-start gap-1.5">
                            <Badge color={color}>L{u.access_level} · {u.level_name}</Badge>
                            {u.venture_name && <span className="text-xs font-medium text-[var(--color-text-secondary)]">{u.venture_name}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button iconOnly aria-label={`View ${u.full_name}`} variant="ghost" size="sm" onClick={() => setOpen(u.id)}>
                            <Edit2 size={14} aria-hidden="true" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </AsyncState>

      {selected && (
        <UserDrawer
          key={selected.id}
          member={selected}
          actor={currentUser}
          ventures={ventures.data ?? []}
          onClose={() => setOpen(null)}
          onChanged={() => { setOpen(null); members.refetch(); }}
        />
      )}
      {adding && (
        <AddUserModal actor={currentUser} ventures={ventures.data ?? []} onClose={() => setAdding(false)} onCreated={() => { setAdding(false); members.refetch(); }} />
      )}
    </div>
  );
}
