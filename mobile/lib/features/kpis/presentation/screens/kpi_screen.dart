import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/constants/access_levels.dart';
import '../../../../features/auth/presentation/providers/auth_provider.dart';
import '../../data/kpi_model.dart';
import '../../data/kpi_provider.dart';
import '../../../../core/theme/theme_context.dart';

class KpiScreen extends ConsumerWidget {
  const KpiScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = authState.maybeWhen(
      authenticated: (u) => u,
      orElse: () => null,
    );
    final level = user?.accessLevel ?? AccessLevels.unknown;

    // CXO (4) and above only — remember lower number means more access.
    if (!AccessLevels.hasAtLeast(level, AccessLevels.cxo)) {
      return Scaffold(
        backgroundColor: context.scheme.surface,
        appBar: AppBar(
          title: Text('KPI Dashboard',
              style: TextStyle(fontWeight: FontWeight.w600, color: context.scheme.onSurface)),
          backgroundColor: context.scheme.surfaceContainerHighest,
          elevation: 0,
          centerTitle: false,
        ),
        body: const _RestrictedView(
          message: 'Restricted',
          subtitle: 'KPI data is available for L4 and above.',
        ),
      );
    }

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: context.scheme.surface,
        appBar: AppBar(
          title: Text('KPI Dashboard',
              style: TextStyle(fontWeight: FontWeight.w600, color: context.scheme.onSurface)),
          backgroundColor: context.scheme.surfaceContainerHighest,
          elevation: 0,
          centerTitle: false,
          bottom: TabBar(
            labelColor: context.scheme.primary,
            unselectedLabelColor: context.scheme.onSurfaceVariant,
            indicatorColor: context.scheme.primary,
            tabs: const [
              Tab(text: 'HR Overview'),
              Tab(text: 'Departments'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            _HROverviewTab(),
            _DepartmentsTab(),
          ],
        ),
      ),
    );
  }
}

// ── HR Overview Tab ───────────────────────────────────────────────────────────

class _HROverviewTab extends ConsumerWidget {
  const _HROverviewTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final hrAsync = ref.watch(hrKpiProvider);
    return hrAsync.when(
      loading: () =>
          Center(child: CircularProgressIndicator(color: context.scheme.primary)),
      error: (e, _) => _ErrorView(
        message: 'Failed to load HR KPIs',
        onRetry: () => ref.invalidate(hrKpiProvider),
      ),
      data: (data) => RefreshIndicator(
        onRefresh: () async => ref.invalidate(hrKpiProvider),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Stat cards row
            Row(
              children: [
                Expanded(
                  child: _StatCard(
                    label: 'Total Employees',
                    value: data.totalEmployees.toString(),
                    icon: LucideIcons.users,
                    color: context.scheme.primary,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatCard(
                    label: 'Active Projects',
                    value: data.activeProjects.toString(),
                    icon: LucideIcons.briefcase,
                    color: context.scheme.secondary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _StatCard(
              label: 'Avg Completion Rate',
              value: '${data.avgCompletionRate.toStringAsFixed(1)}%',
              icon: LucideIcons.trendingUp,
              color: context.dl.success,
              wide: true,
            ),
            const SizedBox(height: 20),
            // Venture breakdown
            if (data.ventureBreakdown.isNotEmpty) ...[
              Text(
                'Venture Breakdown',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: context.scheme.onSurface,
                ),
              ),
              const SizedBox(height: 12),
              ...data.ventureBreakdown.map((v) => _VentureRow(venture: v, total: data.totalEmployees)),
            ],
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final bool wide;

  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    this.wide = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: wide
          ? Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, color: color, size: 22),
                ),
                const SizedBox(width: 14),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(value,
                        style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: color)),
                    Text(label,
                        style: TextStyle(fontSize: 13, color: context.scheme.onSurfaceVariant)),
                  ],
                ),
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, color: color, size: 18),
                ),
                const SizedBox(height: 10),
                Text(value,
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: color)),
                const SizedBox(height: 2),
                Text(label,
                    style: TextStyle(fontSize: 12, color: context.scheme.onSurfaceVariant)),
              ],
            ),
    );
  }
}

class _VentureRow extends StatelessWidget {
  final VentureBreakdown venture;
  final int total;
  const _VentureRow({required this.venture, required this.total});

  @override
  Widget build(BuildContext context) {
    final fraction = total > 0 ? (venture.count / total).clamp(0.0, 1.0) : 0.0;
    final barColor = venture.color != null
        ? Color(int.tryParse(venture.color!.replaceFirst('#', '0xFF')) ?? 0xFF7C3AED)
        : context.scheme.primary;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: context.scheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(venture.name,
                    style: TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w600, color: context.scheme.onSurface)),
                Text('${venture.count}',
                    style: TextStyle(
                        fontSize: 13, fontWeight: FontWeight.bold, color: barColor)),
              ],
            ),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: fraction,
                backgroundColor: context.scheme.surface,
                valueColor: AlwaysStoppedAnimation<Color>(barColor),
                minHeight: 5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Departments Tab ───────────────────────────────────────────────────────────

class _DepartmentsTab extends ConsumerWidget {
  const _DepartmentsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final deptAsync = ref.watch(departmentKpiProvider);
    return deptAsync.when(
      loading: () =>
          Center(child: CircularProgressIndicator(color: context.scheme.primary)),
      error: (e, _) => _ErrorView(
        message: 'Failed to load department KPIs',
        onRetry: () => ref.invalidate(departmentKpiProvider),
      ),
      data: (departments) {
        if (departments.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(LucideIcons.building2, size: 64, color: Colors.white24),
                const SizedBox(height: 16),
                Text('No department data available',
                    style: TextStyle(color: context.scheme.onSurfaceVariant, fontSize: 16)),
              ],
            ),
          );
        }
        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(departmentKpiProvider),
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: departments.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (_, i) => _DeptCard(dept: departments[i]),
          ),
        );
      },
    );
  }
}

class _DeptCard extends StatelessWidget {
  final DeptKPIData dept;
  const _DeptCard({required this.dept});

  Color _completionColor(BuildContext context) {
    if (dept.taskCompletionRate >= 80) return context.dl.success;
    if (dept.taskCompletionRate >= 60) return context.dl.warning;
    return context.dl.critical;
  }

  @override
  Widget build(BuildContext context) {
    final color = _completionColor(context);
    final fraction = (dept.taskCompletionRate / 100).clamp(0.0, 1.0);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  dept.department,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: context.scheme.onSurface,
                  ),
                ),
              ),
              Row(
                children: [
                  Icon(LucideIcons.users, size: 13, color: context.scheme.onSurfaceVariant),
                  const SizedBox(width: 4),
                  Text('${dept.headcount}',
                      style: TextStyle(fontSize: 13, color: context.scheme.onSurfaceVariant)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Task Completion',
                  style: TextStyle(fontSize: 12, color: context.scheme.onSurfaceVariant)),
              Text(
                '${dept.taskCompletionRate.toStringAsFixed(1)}%',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: fraction,
              backgroundColor: context.scheme.surface,
              valueColor: AlwaysStoppedAnimation<Color>(color),
              minHeight: 6,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Icon(LucideIcons.clock, size: 12, color: context.scheme.onSurfaceVariant),
              const SizedBox(width: 4),
              Text(
                '${dept.avgHoursPerWeek.toStringAsFixed(1)} hrs/week avg',
                style: TextStyle(fontSize: 12, color: context.scheme.onSurfaceVariant),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Shared ────────────────────────────────────────────────────────────────────

class _RestrictedView extends StatelessWidget {
  final String message;
  final String subtitle;
  const _RestrictedView({required this.message, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        margin: const EdgeInsets.all(24),
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          color: context.scheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: context.dl.critical.withValues(alpha: 0.3)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(LucideIcons.lock, size: 56, color: context.dl.critical.withValues(alpha: 0.7)),
            const SizedBox(height: 16),
            Text(message,
                style: TextStyle(
                    fontSize: 20, fontWeight: FontWeight.w700, color: context.scheme.onSurface)),
            const SizedBox(height: 8),
            Text(subtitle,
                style: TextStyle(fontSize: 14, color: context.scheme.onSurfaceVariant),
                textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(LucideIcons.alertCircle, size: 48, color: context.dl.critical),
          const SizedBox(height: 12),
          Text(message,
              style: TextStyle(color: context.scheme.onSurface, fontSize: 16)),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: onRetry,
            icon: const Icon(LucideIcons.refreshCw),
            label: const Text('Retry'),
          ),
        ],
      ),
    );
  }
}
