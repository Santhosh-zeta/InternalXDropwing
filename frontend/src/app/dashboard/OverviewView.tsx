'use client';

import type { User } from '@/lib/constants';
import { getAnalytics, getTasks, getUsers } from '@/lib/api';
import { unwrapList, useApi } from '@/lib/useApi';
import { AsyncState } from '@/components/ui';
import GlobalDashboard from './overview/GlobalDashboard';
import VentureDashboard from './overview/VentureDashboard';
import { DashboardSkeleton } from './overview/shared';

/**
 * Management overview (L1-L5): global for L1/L2, one venture for L3-L5. Every
 * endpoint scopes its rows to the caller server-side, so the figures here are
 * already limited to what this person may see. Staff land on "Today" instead.
 */
export default function OverviewView({ currentUser }: { currentUser: User }) {
  const { data, loading, error, refetch } = useApi('overview', async (signal) => {
    const [tasks, users, analytics] = await Promise.allSettled([unwrapList(getTasks(signal)), unwrapList(getUsers(signal)), getAnalytics(undefined, signal)]);
    // Say so when everything failed, rather than showing zeros that look like an empty workspace.
    if (tasks.status === 'rejected' && users.status === 'rejected' && analytics.status === 'rejected') throw tasks.reason;
    return {
      tasks: tasks.status === 'fulfilled' ? tasks.value : [],
      users: users.status === 'fulfilled' ? users.value : [],
      analytics: analytics.status === 'fulfilled' && analytics.value.success ? analytics.value.data : null,
    };
  });

  return (
    <AsyncState loading={loading} error={error} onRetry={refetch} what="the overview" skeleton={<DashboardSkeleton />}>
      {data &&
        (currentUser.accessLevel <= 2 ? (
          <GlobalDashboard {...data} />
        ) : (
          <VentureDashboard currentUser={currentUser} {...data} />
        ))}
    </AsyncState>
  );
}
