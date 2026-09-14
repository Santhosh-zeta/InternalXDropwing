import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/constants/access_levels.dart';
import '../../../../features/auth/presentation/providers/auth_provider.dart';
import '../../data/strategy_model.dart';
import '../../data/strategy_provider.dart';
import '../../../../core/theme/theme_context.dart';

class StrategyScreen extends ConsumerWidget {
  const StrategyScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = authState.maybeWhen(
      authenticated: (u) => u,
      orElse: () => null,
    );
    final level = user?.accessLevel ?? AccessLevels.unknown;

    // Strategy is for CXO (4) and above; Manager (5) and below are restricted.
    if (!AccessLevels.hasAtLeast(level, AccessLevels.cxo)) {
      return Scaffold(
        backgroundColor: context.scheme.surface,
        appBar: _buildAppBar(context, ),
        body: const _AccessRestrictedView(
          icon: LucideIcons.lock,
          message: 'Access Restricted',
          subtitle: 'Strategy content is available for L1–L4 members.',
        ),
      );
    }

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: context.scheme.surface,
        appBar: _buildAppBar(context, 
          bottom: TabBar(
            labelColor: context.scheme.primary,
            unselectedLabelColor: context.scheme.onSurfaceVariant,
            indicatorColor: context.scheme.primary,
            tabs: const [
              Tab(text: 'OKRs'),
              Tab(text: 'Risks'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            _OKRsTab(),
            _RisksTab(),
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(BuildContext context, {PreferredSizeWidget? bottom}) {
    return AppBar(
      title: Text(
        'Strategy',
        style: TextStyle(fontWeight: FontWeight.w600, color: context.scheme.onSurface),
      ),
      backgroundColor: context.scheme.surfaceContainerHighest,
      elevation: 0,
      centerTitle: false,
      bottom: bottom,
    );
  }
}

// ── OKRs Tab ─────────────────────────────────────────────────────────────────

class _OKRsTab extends ConsumerWidget {
  const _OKRsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strategyAsync = ref.watch(strategyProvider);
    return strategyAsync.when(
      loading: () =>
          Center(child: CircularProgressIndicator(color: context.scheme.primary)),
      error: (e, _) => _ErrorView(
        message: 'Failed to load OKRs',
        onRetry: () => ref.invalidate(strategyProvider),
      ),
      data: (data) {
        if (data.okrs.isEmpty) {
          return const _EmptyState(
            icon: LucideIcons.compass,
            message: 'No OKRs defined yet',
          );
        }
        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(strategyProvider),
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: data.okrs.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (_, i) => _OKRCard(okr: data.okrs[i]),
          ),
        );
      },
    );
  }
}

class _OKRCard extends StatelessWidget {
  final OKRModel okr;
  const _OKRCard({required this.okr});

  Color _statusColor(BuildContext context) {
    switch (okr.status) {
      case 'completed':
        return context.scheme.secondary;
      case 'paused':
        return context.dl.warning;
      default:
        return context.dl.success;
    }
  }

  @override
  Widget build(BuildContext context) {
    final progressVal = (okr.progress / 100).clamp(0.0, 1.0);
    return Container(
      decoration: BoxDecoration(
        color: context.scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
        border: Border(left: BorderSide(color: context.scheme.primary, width: 3)),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  okr.title,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: context.scheme.onSurface,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              _StatusChip(status: okr.status, color: _statusColor(context)),
            ],
          ),
          if (okr.description != null && okr.description!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              okr.description!,
              style: TextStyle(fontSize: 13, color: context.scheme.onSurfaceVariant),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          const SizedBox(height: 12),
          // Quarter / Owner row
          Row(
            children: [
              if (okr.quarter != null) ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: context.scheme.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${okr.quarter}${okr.year != null ? ' ${okr.year}' : ''}',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: context.scheme.primary,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
              ],
              if (okr.ownerName != null) ...[
                Icon(LucideIcons.user, size: 12, color: context.scheme.onSurfaceVariant),
                const SizedBox(width: 4),
                Text(
                  okr.ownerName!,
                  style: TextStyle(fontSize: 12, color: context.scheme.onSurfaceVariant),
                ),
              ],
            ],
          ),
          const SizedBox(height: 12),
          // Progress bar
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Progress', style: TextStyle(fontSize: 12, color: context.scheme.onSurfaceVariant)),
              Text(
                '${okr.progress}%',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: context.scheme.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progressVal,
              backgroundColor: context.scheme.surface,
              valueColor: AlwaysStoppedAnimation<Color>(context.scheme.primary),
              minHeight: 6,
            ),
          ),
          // Key Results
          if (okr.keyResults.isNotEmpty) ...[
            const SizedBox(height: 14),
            Divider(color: context.scheme.surface, height: 1),
            const SizedBox(height: 10),
            Text(
              'Key Results',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: context.scheme.onSurfaceVariant, letterSpacing: 0.5),
            ),
            const SizedBox(height: 8),
            ...okr.keyResults.map((kr) => _KeyResultRow(kr: kr)),
          ],
        ],
      ),
    );
  }
}

class _KeyResultRow extends StatelessWidget {
  final KeyResultModel kr;
  const _KeyResultRow({required this.kr});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  kr.title,
                  style: TextStyle(fontSize: 12, color: context.scheme.onSurface),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Text(
                '${kr.currentValue.toStringAsFixed(0)}/${kr.targetValue.toStringAsFixed(0)}${kr.unit != null ? ' ${kr.unit}' : ''}',
                style: TextStyle(fontSize: 11, color: context.scheme.onSurfaceVariant),
              ),
            ],
          ),
          const SizedBox(height: 4),
          ClipRRect(
            borderRadius: BorderRadius.circular(3),
            child: LinearProgressIndicator(
              value: kr.progress,
              backgroundColor: context.scheme.surface,
              valueColor: AlwaysStoppedAnimation<Color>(
                context.scheme.primary.withValues(alpha: 0.7),
              ),
              minHeight: 3,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Risks Tab ─────────────────────────────────────────────────────────────────

class _RisksTab extends ConsumerWidget {
  const _RisksTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strategyAsync = ref.watch(strategyProvider);
    return strategyAsync.when(
      loading: () =>
          Center(child: CircularProgressIndicator(color: context.scheme.primary)),
      error: (e, _) => _ErrorView(
        message: 'Failed to load risks',
        onRetry: () => ref.invalidate(strategyProvider),
      ),
      data: (data) {
        if (data.risks.isEmpty) {
          return const _EmptyState(
            icon: LucideIcons.shield,
            message: 'No risks logged',
          );
        }
        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(strategyProvider),
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: data.risks.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (_, i) => _RiskCard(risk: data.risks[i]),
          ),
        );
      },
    );
  }
}

class _RiskCard extends StatelessWidget {
  final StrategicRiskModel risk;
  const _RiskCard({required this.risk});

  Color _severityColor(BuildContext context) {
    switch (risk.severity) {
      case 'critical':
        return context.dl.critical;
      case 'high':
        // 'high' sits between warning and critical; blend rather than
        // introduce a fifth hue the palette does not define.
        return Color.lerp(context.dl.warning, context.dl.critical, 0.5)!;
      case 'medium':
        return context.dl.warning;
      default:
        return context.dl.success;
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _severityColor(context);
    return Container(
      decoration: BoxDecoration(
        color: context.scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
        border: Border(left: BorderSide(color: color, width: 4)),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  risk.title,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: context.scheme.onSurface,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  risk.severity.toUpperCase(),
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: color),
                ),
              ),
            ],
          ),
          if (risk.description != null && risk.description!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              risk.description!,
              style: TextStyle(fontSize: 13, color: context.scheme.onSurfaceVariant),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          if (risk.mitigation != null && risk.mitigation!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: context.scheme.surface,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(LucideIcons.shieldCheck, size: 14, color: context.dl.success),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Mitigation',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: context.dl.success,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          risk.mitigation!,
                          style: TextStyle(fontSize: 12, color: context.scheme.onSurfaceVariant),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 8),
          Text(
            'Status: ${risk.status}',
            style: TextStyle(fontSize: 11, color: context.scheme.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}

// ── Shared Widgets ────────────────────────────────────────────────────────────

class _StatusChip extends StatelessWidget {
  final String status;
  final Color color;
  const _StatusChip({required this.status, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: color),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String message;
  const _EmptyState({required this.icon, required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 64, color: context.scheme.onSurfaceVariant.withValues(alpha: 0.4)),
          const SizedBox(height: 16),
          Text(message, style: TextStyle(color: context.scheme.onSurfaceVariant, fontSize: 16)),
        ],
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
          Text(message, style: TextStyle(color: context.scheme.onSurface, fontSize: 16)),
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

class _AccessRestrictedView extends StatelessWidget {
  final IconData icon;
  final String message;
  final String subtitle;
  const _AccessRestrictedView({
    required this.icon,
    required this.message,
    required this.subtitle,
  });

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
            Icon(icon, size: 56, color: context.dl.critical.withValues(alpha: 0.7)),
            const SizedBox(height: 16),
            Text(
              message,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: context.scheme.onSurface,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              style: TextStyle(fontSize: 14, color: context.scheme.onSurfaceVariant),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
