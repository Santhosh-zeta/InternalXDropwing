import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/constants/access_levels.dart';
import '../../../../core/theme/nebula_spacing.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/report_model.dart';
import '../../data/report_provider.dart';
import '../widgets/report_charts.dart';
import '../widgets/state_views.dart';

/// Project budgets are stored and displayed in rupees, matching the Budget
/// module and the web dashboard's Reports view.
final NumberFormat _rupee =
    NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);

/// Cross-venture analytics built on `GET /api/platform-metrics`.
///
/// Access: Level 5 (Manager) and above — the same set of roles the web
/// dashboard lists "Reports" for. Lower level number = more access. The budget
/// breakdown is additionally limited to Level 4 and above because the route
/// returns an empty `budgetDistribution` below that.
class ReportsScreen extends ConsumerWidget {
  const ReportsScreen({super.key});

  static bool canView(int accessLevel) =>
      AccessLevels.hasAtLeast(accessLevel, AccessLevels.manager);

  static bool canViewBudget(int accessLevel) =>
      AccessLevels.hasAtLeast(accessLevel, AccessLevels.cxo);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final accessLevel = ref.watch(authProvider).maybeWhen<int?>(
          authenticated: (user) => user.accessLevel,
          orElse: () => null,
        );

    if (accessLevel == null || !canView(accessLevel)) {
      return Scaffold(
        appBar: AppBar(title: const Text('Reports')),
        body: const RestrictedStateView(
          moduleName: 'Reports',
          requirement: 'Level 5 (Manager) or above',
        ),
      );
    }

    final showBudget = canViewBudget(accessLevel);
    final metricsAsync = ref.watch(platformMetricsProvider);

    final tabs = <Tab>[
      const Tab(text: 'Overview'),
      const Tab(text: 'Velocity'),
      const Tab(text: 'Team'),
      if (showBudget) const Tab(text: 'Ventures'),
    ];

    return DefaultTabController(
      length: tabs.length,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Reports'),
          actions: [
            IconButton(
              tooltip: 'Refresh reports',
              onPressed: () => ref.invalidate(platformMetricsProvider),
              icon: const Icon(LucideIcons.refreshCw, size: 20),
            ),
          ],
          bottom: TabBar(isScrollable: tabs.length > 3, tabs: tabs),
        ),
        body: Column(
          children: [
            const OfflineBanner(),
            Expanded(
              child: metricsAsync.when(
                loading: () => const _ReportsSkeleton(),
                error: (error, _) => RefreshableMessage(
                  child: ErrorStateView(
                    title: 'Could not load reports',
                    error: error,
                    onRetry: () => ref.invalidate(platformMetricsProvider),
                  ),
                ),
                data: (metrics) {
                  if (metrics.isEmpty) {
                    return RefreshIndicator(
                      onRefresh: () async =>
                          ref.refresh(platformMetricsProvider.future),
                      child: const RefreshableMessage(
                        child: EmptyStateView(
                          icon: LucideIcons.chartColumn,
                          title: 'Nothing to report yet',
                          message: 'Reports are built from completed tasks, '
                              'projects and active users. Once there is '
                              'activity on the platform it will show up here.',
                        ),
                      ),
                    );
                  }
                  return TabBarView(
                    children: [
                      _OverviewTab(metrics: metrics, showBudget: showBudget),
                      _VelocityTab(metrics: metrics),
                      _TeamTab(metrics: metrics),
                      if (showBudget) _VenturesTab(metrics: metrics),
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Pull-to-refresh wrapper shared by every tab.
class _RefreshableTab extends ConsumerWidget {
  final List<Widget> children;

  const _RefreshableTab({required this.children});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return RefreshIndicator(
      onRefresh: () async => ref.refresh(platformMetricsProvider.future),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(NebulaSpacing.md, NebulaSpacing.md,
            NebulaSpacing.md, NebulaSpacing.xl),
        children: children,
      ),
    );
  }
}

// ─── Overview ────────────────────────────────────────────────────────────────

class _OverviewTab extends StatelessWidget {
  final PlatformMetrics metrics;
  final bool showBudget;

  const _OverviewTab({required this.metrics, required this.showBudget});

  @override
  Widget build(BuildContext context) {
    final completed =
        metrics.taskVelocity.fold<int>(0, (sum, p) => sum + p.completed);
    final activeUsers =
        metrics.userDistribution.fold<int>(0, (sum, s) => sum + s.value);
    final totalBudget = metrics.budgetDistribution
        .fold<double>(0, (sum, s) => sum + s.totalBudget);

    return _RefreshableTab(
      children: [
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: NebulaSpacing.sm + 4,
          mainAxisSpacing: NebulaSpacing.sm + 4,
          childAspectRatio: 1.65,
          children: [
            _StatTile(
              icon: LucideIcons.circleCheckBig,
              label: 'Tasks completed (7 days)',
              value: '$completed',
            ),
            _StatTile(
              icon: LucideIcons.users,
              label: 'Active users',
              value: '$activeUsers',
            ),
            _StatTile(
              icon: LucideIcons.building2,
              label: 'Ventures represented',
              value: '${metrics.userDistribution.length}',
            ),
            if (showBudget && metrics.budgetDistribution.isNotEmpty)
              _StatTile(
                icon: LucideIcons.wallet,
                label: 'Project budget',
                value: _rupee.format(totalBudget),
              ),
          ],
        ),
        const SizedBox(height: NebulaSpacing.md),
        if (metrics.monthlyPerformance.isNotEmpty)
          ReportCard(
            title: 'Monthly performance',
            subtitle: 'Completed tasks and projects, last six months',
            child: GroupedColumnChart(
              categories:
                  metrics.monthlyPerformance.map((p) => p.name).toList(),
              seriesA: metrics.monthlyPerformance
                  .map((p) => p.tasks.toDouble())
                  .toList(),
              seriesB: metrics.monthlyPerformance
                  .map((p) => p.projects.toDouble())
                  .toList(),
              seriesALabel: 'Tasks',
              seriesBLabel: 'Projects',
              semanticsLabel: 'Monthly performance. ${metrics.monthlyPerformance.map((p) => '${p.name}: ${p.tasks} tasks, ${p.projects} projects').join('. ')}',
            ),
          ),
        if (metrics.recentActivity.isNotEmpty) ...[
          const SizedBox(height: NebulaSpacing.md),
          ReportCard(
            title: 'Recent activity',
            subtitle: 'Latest entries from the audit log',
            child: Column(
              children: [
                for (var i = 0; i < metrics.recentActivity.length; i++) ...[
                  if (i > 0) Divider(height: 1, color: hairline(context)),
                  _ActivityRow(entry: metrics.recentActivity[i]),
                ],
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _StatTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _StatTile({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Semantics(
      label: '$label: $value',
      child: ExcludeSemantics(
        child: Container(
          padding: const EdgeInsets.all(NebulaSpacing.md),
          decoration: BoxDecoration(
            color: cardSurface(context),
            borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
            border: Border.all(color: hairline(context)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(icon, size: 18, color: scheme.primary),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(value,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w800,
                        )),
              ),
              Text(
                label,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context)
                    .textTheme
                    .labelSmall
                    ?.copyWith(color: textSecondary(context)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ActivityRow extends StatelessWidget {
  final RecentActivityEntry entry;

  const _ActivityRow({required this.entry});

  String get _readableAction => entry.action
      .split('_')
      .where((part) => part.isNotEmpty)
      .map((part) => part[0].toUpperCase() + part.substring(1).toLowerCase())
      .join(' ');

  @override
  Widget build(BuildContext context) {
    final when = entry.createdAt == null
        ? null
        : DateTime.tryParse(entry.createdAt!);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: NebulaSpacing.sm + 2),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(_readableAction.isEmpty ? entry.action : _readableAction,
                    style: Theme.of(context).textTheme.bodySmall),
                if (entry.userName != null && entry.userName!.isNotEmpty)
                  Text(
                    entry.userName!,
                    style: Theme.of(context)
                        .textTheme
                        .labelSmall
                        ?.copyWith(color: textSecondary(context)),
                  ),
              ],
            ),
          ),
          if (when != null)
            Text(
              DateFormat('d MMM, HH:mm').format(when.toLocal()),
              style: Theme.of(context)
                  .textTheme
                  .labelSmall
                  ?.copyWith(color: textSecondary(context)),
            ),
        ],
      ),
    );
  }
}

// ─── Velocity ────────────────────────────────────────────────────────────────

class _VelocityTab extends StatelessWidget {
  final PlatformMetrics metrics;

  const _VelocityTab({required this.metrics});

  @override
  Widget build(BuildContext context) {
    if (metrics.taskVelocity.isEmpty) {
      return const _RefreshableTab(
        children: [
          SizedBox(height: NebulaSpacing.xxl),
          EmptyStateView(
            icon: LucideIcons.trendingUp,
            title: 'No completed tasks this week',
            message: 'Task velocity counts tasks moved to completed in the '
                'last seven days.',
          ),
        ],
      );
    }

    final total =
        metrics.taskVelocity.fold<int>(0, (sum, p) => sum + p.completed);

    return _RefreshableTab(
      children: [
        ReportCard(
          title: 'Task velocity',
          subtitle: '$total tasks completed in the last seven days',
          child: ColumnChart(
            data: metrics.taskVelocity
                .map((p) =>
                    ChartDatum(label: p.name, value: p.completed.toDouble()))
                .toList(),
            semanticsLabel:
                'Task velocity. ${metrics.taskVelocity.map((p) => '${p.name}: ${p.completed}').join(', ')}',
          ),
        ),
      ],
    );
  }
}

// ─── Team ────────────────────────────────────────────────────────────────────

class _TeamTab extends StatelessWidget {
  final PlatformMetrics metrics;

  const _TeamTab({required this.metrics});

  @override
  Widget build(BuildContext context) {
    if (metrics.userDistribution.isEmpty) {
      return const _RefreshableTab(
        children: [
          SizedBox(height: NebulaSpacing.xxl),
          EmptyStateView(
            icon: LucideIcons.users,
            title: 'No team distribution',
            message: 'Active users assigned to a venture will be broken down '
                'here.',
          ),
        ],
      );
    }

    final total =
        metrics.userDistribution.fold<int>(0, (sum, s) => sum + s.value);

    return _RefreshableTab(
      children: [
        ReportCard(
          title: 'Team distribution',
          subtitle: 'Active users by venture',
          child: DonutChart(
            data: metrics.userDistribution
                .map((s) => ChartDatum(
                      label: s.name,
                      value: s.value.toDouble(),
                      color: parseHexColor(s.color),
                    ))
                .toList(),
            centreValue: '$total',
            centreLabel: 'users',
            semanticsLabel:
                'Active users by venture. ${metrics.userDistribution.map((s) => '${s.name}: ${s.value}').join(', ')}',
          ),
        ),
      ],
    );
  }
}

// ─── Ventures (budget) ───────────────────────────────────────────────────────

class _VenturesTab extends StatelessWidget {
  final PlatformMetrics metrics;

  const _VenturesTab({required this.metrics});

  @override
  Widget build(BuildContext context) {
    if (metrics.budgetDistribution.isEmpty) {
      return const _RefreshableTab(
        children: [
          SizedBox(height: NebulaSpacing.xxl),
          EmptyStateView(
            icon: LucideIcons.wallet,
            title: 'No budget data',
            message: 'Project budgets per venture appear here once projects '
                'carry a budget.',
          ),
        ],
      );
    }

    final total = metrics.budgetDistribution
        .fold<double>(0, (sum, s) => sum + s.totalBudget);
    final scheme = Theme.of(context).colorScheme;

    return _RefreshableTab(
      children: [
        ReportCard(
          title: 'Budget by venture',
          subtitle: '${_rupee.format(total)} allocated across '
              '${metrics.budgetDistribution.length} venture'
              '${metrics.budgetDistribution.length == 1 ? '' : 's'}',
          child: Column(
            children: [
              for (final slice in metrics.budgetDistribution)
                ProportionBar(
                  label: slice.venture,
                  valueLabel: _rupee.format(slice.totalBudget),
                  fraction: total <= 0 ? 0 : slice.totalBudget / total,
                  color: parseHexColor(slice.color) ?? scheme.primary,
                ),
            ],
          ),
        ),
      ],
    );
  }
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

class _ReportsSkeleton extends StatelessWidget {
  const _ReportsSkeleton();

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Loading reports',
      liveRegion: true,
      child: ListView(
        padding: const EdgeInsets.all(NebulaSpacing.md),
        physics: const NeverScrollableScrollPhysics(),
        children: const [
          Row(
            children: [
              Expanded(child: ShimmerBox(height: 84, radius: NebulaSpacing.radiusMd)),
              SizedBox(width: NebulaSpacing.sm + 4),
              Expanded(child: ShimmerBox(height: 84, radius: NebulaSpacing.radiusMd)),
            ],
          ),
          SizedBox(height: NebulaSpacing.sm + 4),
          Row(
            children: [
              Expanded(child: ShimmerBox(height: 84, radius: NebulaSpacing.radiusMd)),
              SizedBox(width: NebulaSpacing.sm + 4),
              Expanded(child: ShimmerBox(height: 84, radius: NebulaSpacing.radiusMd)),
            ],
          ),
          SizedBox(height: NebulaSpacing.md),
          ShimmerBox(height: 260, radius: NebulaSpacing.radiusMd),
          SizedBox(height: NebulaSpacing.md),
          ShimmerBox(height: 180, radius: NebulaSpacing.radiusMd),
        ],
      ),
    );
  }
}
