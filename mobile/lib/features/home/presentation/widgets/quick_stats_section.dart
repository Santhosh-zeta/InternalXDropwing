import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/access_levels.dart';
import '../../../approvals/presentation/providers/approval_provider.dart';
import '../../../learning_hub/presentation/providers/learning_provider.dart';
import '../../../projects/presentation/providers/projects_provider.dart';
import '../../../team/presentation/providers/team_provider.dart';
import '../../data/models/home_models.dart';
import 'kpi_card_widget.dart';

/// The KPI grid at the top of Home.
///
/// Every figure is read from a real endpoint — `/platform-metrics`,
/// `/projects`, `/tasks`, `/timesheets`, `/team-members` and `/learning`.
/// Cards whose figure is still in flight render a skeleton and cards whose
/// source failed render a dash, so the grid never shows an invented number.
class QuickStatsSection extends ConsumerWidget {
  final HomeData data;
  final int accessLevel;

  const QuickStatsSection({
    super.key,
    required this.data,
    required this.accessLevel,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cards = _cardsFor(ref);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Quick Stats',
          style: Theme.of(context)
              .textTheme
              .titleMedium
              ?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.1,
          children: cards,
        ),
      ],
    );
  }

  /// Build the tier of cards this user should see.
  ///
  /// Remember that a lower access level means more access, so Admin (3) and
  /// above get the org-wide view and Manager (5) and above the venture view.
  List<Widget> _cardsFor(WidgetRef ref) {
    if (AccessLevels.hasAtLeast(accessLevel, AccessLevels.admin)) {
      return _executiveCards(ref);
    }
    if (AccessLevels.hasAtLeast(accessLevel, AccessLevels.manager)) {
      return _managerCards(ref);
    }
    return _individualCards(ref);
  }

  /// Super Admin, Managing Director and Admin — the whole organisation.
  List<Widget> _executiveCards(WidgetRef ref) {
    return [
      _AsyncKpiCard(
        title: 'Active Ventures',
        icon: 'activity',
        color: '#8b5cf6',
        // `/platform-metrics` returns one userDistribution row per venture the
        // caller may see.
        value: AsyncData(data.analytics.userDistribution.length.toString()),
      ),
      _AsyncKpiCard(
        title: 'Active Projects',
        icon: 'folder',
        color: '#06b6d4',
        value: _activeProjectCount(ref),
      ),
      _AsyncKpiCard(
        title: 'Open Tasks',
        icon: 'check-circle',
        color: '#10b981',
        value: AsyncData(_openTaskCount().toString()),
      ),
      _AsyncKpiCard(
        title: 'Pending Approvals',
        icon: 'clock',
        color: '#f59e0b',
        value: _pendingApprovalCount(ref),
      ),
    ];
  }

  /// CXO and Manager — their own venture.
  List<Widget> _managerCards(WidgetRef ref) {
    return [
      _AsyncKpiCard(
        title: 'My Team',
        icon: 'users',
        color: '#8b5cf6',
        value: ref
            .watch(teamMembersProvider)
            .whenData((members) => members.length.toString()),
      ),
      _AsyncKpiCard(
        title: 'Active Projects',
        icon: 'folder',
        color: '#06b6d4',
        value: _activeProjectCount(ref),
      ),
      _AsyncKpiCard(
        title: 'Tasks Due Today',
        icon: 'clock',
        color: '#f59e0b',
        value: AsyncData(_dueTodayTaskCount().toString()),
      ),
      _AsyncKpiCard(
        title: 'Pending Approvals',
        icon: 'activity',
        color: '#10b981',
        value: _pendingApprovalCount(ref),
      ),
    ];
  }

  /// Executive Staff and below — their own workload.
  List<Widget> _individualCards(WidgetRef ref) {
    final progress = ref.watch(learningProgressStatsProvider);
    final checklist = ref.watch(learningChecklistProvider);

    return [
      _AsyncKpiCard(
        title: 'Assigned Tasks',
        icon: 'check-circle',
        color: '#8b5cf6',
        value: AsyncData(data.tasks.length.toString()),
      ),
      _AsyncKpiCard(
        title: 'Learning Progress',
        icon: 'activity',
        color: '#06b6d4',
        value: checklist.whenData(
          (_) => '${(progress.percentage * 100).round()}%',
        ),
      ),
      _AsyncKpiCard(
        title: 'Checklists',
        icon: 'clock',
        color: '#f59e0b',
        value: checklist
            .whenData((_) => '${progress.completed}/${progress.total}'),
      ),
    ];
  }

  /// Projects that are active and not archived, from `GET /api/projects`.
  AsyncValue<String> _activeProjectCount(WidgetRef ref) {
    return ref.watch(projectListProvider).whenData(
          (projects) => projects
              .where((p) => p.isActive && !p.isArchived)
              .length
              .toString(),
        );
  }

  /// Timesheets awaiting a decision, from `GET /api/timesheets`.
  AsyncValue<String> _pendingApprovalCount(WidgetRef ref) {
    return ref
        .watch(approvalsProvider)
        .whenData((approvals) => approvals.length.toString());
  }

  /// Tasks from `GET /api/tasks` that are not finished yet.
  int _openTaskCount() =>
      data.tasks.where((t) => t.status != 'completed').length;

  /// Unfinished tasks whose due date is today.
  int _dueTodayTaskCount() {
    final now = DateTime.now();
    return data.tasks.where((t) {
      if (t.status == 'completed') return false;
      final due = DateTime.tryParse(t.dueDate ?? '');
      if (due == null) return false;
      return due.year == now.year && due.month == now.month && due.day == now.day;
    }).length;
  }
}

/// A [KPICardWidget] that knows how to wait for its number.
class _AsyncKpiCard extends StatelessWidget {
  final String title;
  final String icon;
  final String color;
  final AsyncValue<String> value;

  const _AsyncKpiCard({
    required this.title,
    required this.icon,
    required this.color,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return value.when(
      data: (v) => KPICardWidget(
        kpi: KPICard(title: title, value: v, icon: icon, color: color),
      ),
      loading: () => _KpiCardSkeleton(title: title),
      // A figure we could not fetch is shown as a dash rather than a guess.
      error: (_, __) => KPICardWidget(
        kpi: KPICard(title: title, value: '—', icon: icon, color: color),
      ),
    );
  }
}

/// Placeholder with the same footprint as a [KPICardWidget], shown while the
/// figure is loading.
class _KpiCardSkeleton extends StatelessWidget {
  final String title;

  const _KpiCardSkeleton({required this.title});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final shimmer = theme.dividerColor.withValues(alpha: 0.15);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.dividerColor.withValues(alpha: 0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  title.toUpperCase(),
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.labelSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.2,
                    color: theme.textTheme.bodySmall?.color,
                  ),
                ),
              ),
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: shimmer,
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            width: 56,
            height: 28,
            decoration: BoxDecoration(
              color: shimmer,
              borderRadius: BorderRadius.circular(6),
            ),
          ),
        ],
      ),
    );
  }
}
