import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/constants/access_levels.dart';
import '../../../../core/theme/nebula_colors.dart';
import '../../../../features/auth/presentation/providers/auth_provider.dart';
import '../../data/audit_model.dart';
import '../../data/audit_provider.dart';

class AuditScreen extends ConsumerWidget {
  const AuditScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = authState.maybeWhen(
      authenticated: (u) => u,
      orElse: () => null,
    );
    final level = user?.accessLevel ?? AccessLevels.unknown;

    // Super Admin only.
    if (level != AccessLevels.superAdmin) {
      return Scaffold(
        backgroundColor: NebulaColors.background,
        appBar: AppBar(
          title: const Text('Audit Logs',
              style: TextStyle(fontWeight: FontWeight.w600, color: NebulaColors.textPrimary)),
          backgroundColor: NebulaColors.surfaceCard,
          elevation: 0,
          centerTitle: false,
        ),
        body: Center(
          child: Container(
            margin: const EdgeInsets.all(24),
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: NebulaColors.surfaceCard,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: NebulaColors.critical.withValues(alpha: 0.3)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(LucideIcons.shieldOff, size: 56, color: NebulaColors.critical.withValues(alpha: 0.7)),
                const SizedBox(height: 16),
                const Text(
                  'Super Admin Access Only',
                  style: TextStyle(
                      fontSize: 20, fontWeight: FontWeight.w700, color: NebulaColors.textPrimary),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Audit logs are restricted to Super Administrators only.',
                  style: TextStyle(fontSize: 14, color: NebulaColors.textSecondary),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      );
    }

    return const _AuditLogsContent();
  }
}

class _AuditLogsContent extends ConsumerWidget {
  const _AuditLogsContent();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filteredAsync = ref.watch(filteredAuditLogsProvider);
    final search = ref.watch(auditSearchProvider);
    final actionFilter = ref.watch(auditActionFilterProvider);

    return Scaffold(
      backgroundColor: NebulaColors.background,
      appBar: AppBar(
        title: const Text('Audit Logs',
            style: TextStyle(fontWeight: FontWeight.w600, color: NebulaColors.textPrimary)),
        backgroundColor: NebulaColors.surfaceCard,
        elevation: 0,
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, color: NebulaColors.primary),
            onPressed: () => ref.invalidate(auditLogsProvider),
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: Column(
        children: [
          // Search bar
          Container(
            color: NebulaColors.surfaceCard,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: TextField(
              style: const TextStyle(color: NebulaColors.textPrimary, fontSize: 14),
              decoration: InputDecoration(
                hintText: 'Search by user or action…',
                hintStyle: const TextStyle(color: NebulaColors.textSecondary, fontSize: 14),
                prefixIcon: const Icon(LucideIcons.search, color: NebulaColors.textSecondary, size: 18),
                suffixIcon: search.isNotEmpty
                    ? IconButton(
                        icon: const Icon(LucideIcons.x, color: NebulaColors.textSecondary, size: 16),
                        onPressed: () =>
                            ref.read(auditSearchProvider.notifier).state = '',
                      )
                    : null,
                filled: true,
                fillColor: NebulaColors.surface,
                contentPadding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
              onChanged: (v) => ref.read(auditSearchProvider.notifier).state = v,
            ),
          ),
          // Filter chips
          Container(
            color: NebulaColors.surfaceCard,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _ActionChip(
                    label: 'All',
                    isSelected: actionFilter == null,
                    color: NebulaColors.primary,
                    onTap: () => ref.read(auditActionFilterProvider.notifier).state = null,
                  ),
                  const SizedBox(width: 8),
                  _ActionChip(
                    label: 'CREATE',
                    isSelected: actionFilter == 'CREATE',
                    color: NebulaColors.success,
                    onTap: () => ref.read(auditActionFilterProvider.notifier).state = 'CREATE',
                  ),
                  const SizedBox(width: 8),
                  _ActionChip(
                    label: 'UPDATE',
                    isSelected: actionFilter == 'UPDATE',
                    color: NebulaColors.warning,
                    onTap: () => ref.read(auditActionFilterProvider.notifier).state = 'UPDATE',
                  ),
                  const SizedBox(width: 8),
                  _ActionChip(
                    label: 'DELETE',
                    isSelected: actionFilter == 'DELETE',
                    color: NebulaColors.critical,
                    onTap: () => ref.read(auditActionFilterProvider.notifier).state = 'DELETE',
                  ),
                  const SizedBox(width: 8),
                  _ActionChip(
                    label: 'LOGIN',
                    isSelected: actionFilter == 'LOGIN',
                    color: NebulaColors.highlight,
                    onTap: () => ref.read(auditActionFilterProvider.notifier).state = 'LOGIN',
                  ),
                  const SizedBox(width: 8),
                  _ActionChip(
                    label: 'LOGOUT',
                    isSelected: actionFilter == 'LOGOUT',
                    color: const Color(0xFF8B5CF6),
                    onTap: () => ref.read(auditActionFilterProvider.notifier).state = 'LOGOUT',
                  ),
                ],
              ),
            ),
          ),
          // Logs list
          Expanded(
            child: filteredAsync.when(
              loading: () =>
                  const Center(child: CircularProgressIndicator(color: NebulaColors.primary)),
              error: (e, _) => Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(LucideIcons.alertCircle, size: 48, color: NebulaColors.critical),
                    const SizedBox(height: 12),
                    const Text('Failed to load audit logs',
                        style: TextStyle(color: NebulaColors.textPrimary, fontSize: 16)),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: () => ref.invalidate(auditLogsProvider),
                      icon: const Icon(LucideIcons.refreshCw),
                      label: const Text('Retry'),
                    ),
                  ],
                ),
              ),
              data: (logs) {
                if (logs.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(LucideIcons.clipboardList,
                            size: 64, color: NebulaColors.textSecondary.withValues(alpha: 0.4)),
                        const SizedBox(height: 16),
                        const Text('No logs found',
                            style: TextStyle(color: NebulaColors.textSecondary, fontSize: 16)),
                      ],
                    ),
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(auditLogsProvider),
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: logs.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) => _AuditLogTile(log: logs[i]),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _AuditLogTile extends StatefulWidget {
  final AuditLog log;
  const _AuditLogTile({required this.log});

  @override
  State<_AuditLogTile> createState() => _AuditLogTileState();
}

class _AuditLogTileState extends State<_AuditLogTile> {
  bool _expanded = false;

  Color get _actionColor {
    switch (widget.log.action) {
      case 'CREATE':
        return NebulaColors.success;
      case 'DELETE':
        return NebulaColors.critical;
      case 'UPDATE':
        return NebulaColors.warning;
      case 'LOGIN':
        return NebulaColors.highlight;
      case 'LOGOUT':
        return const Color(0xFF8B5CF6);
      default:
        return NebulaColors.textSecondary;
    }
  }

  String _timeAgo(String createdAt) {
    try {
      final dt = DateTime.parse(createdAt).toLocal();
      final diff = DateTime.now().difference(dt);
      if (diff.inSeconds < 60) return '${diff.inSeconds}s ago';
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      return '${diff.inDays}d ago';
    } catch (_) {
      return createdAt;
    }
  }

  @override
  Widget build(BuildContext context) {
    final log = widget.log;
    final color = _actionColor;

    return GestureDetector(
      onTap: () => setState(() => _expanded = !_expanded),
      child: Container(
        decoration: BoxDecoration(
          color: NebulaColors.surfaceCard,
          borderRadius: BorderRadius.circular(12),
          border: Border(left: BorderSide(color: color, width: 3)),
        ),
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                // Action badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    log.action,
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: color),
                  ),
                ),
                const SizedBox(width: 8),
                if (log.entityType != null) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(
                      color: NebulaColors.surface,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      log.entityType!,
                      style: const TextStyle(fontSize: 10, color: NebulaColors.textSecondary),
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
                const Spacer(),
                Text(
                  _timeAgo(log.createdAt),
                  style: const TextStyle(fontSize: 11, color: NebulaColors.textSecondary),
                ),
                const SizedBox(width: 6),
                Icon(
                  _expanded ? LucideIcons.chevronUp : LucideIcons.chevronDown,
                  size: 14,
                  color: NebulaColors.textSecondary,
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (log.userName != null)
              Row(
                children: [
                  const Icon(LucideIcons.user, size: 12, color: NebulaColors.textSecondary),
                  const SizedBox(width: 4),
                  Text(
                    log.userName!,
                    style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: NebulaColors.textPrimary),
                  ),
                ],
              ),
            if (_expanded) ...[
              const SizedBox(height: 10),
              const Divider(color: NebulaColors.surface, height: 1),
              const SizedBox(height: 10),
              if (log.entityId != null)
                _DetailRow(label: 'Entity ID', value: '#${log.entityId}'),
              if (log.details != null && log.details!.isNotEmpty)
                _DetailRow(label: 'Details', value: log.details!),
              _DetailRow(label: 'Timestamp', value: log.createdAt),
            ],
          ],
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  const _DetailRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(label,
                style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: NebulaColors.textSecondary)),
          ),
          Expanded(
            child: Text(value,
                style: const TextStyle(fontSize: 12, color: NebulaColors.textPrimary)),
          ),
        ],
      ),
    );
  }
}

class _ActionChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final Color color;
  final VoidCallback onTap;

  const _ActionChip({
    required this.label,
    required this.isSelected,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? color.withValues(alpha: 0.2) : NebulaColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? color : Colors.transparent,
            width: 1.5,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.normal,
            color: isSelected ? color : NebulaColors.textSecondary,
          ),
        ),
      ),
    );
  }
}
