import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/theme/nebula_spacing.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/role_management_data_source.dart';
import '../../data/role_management_model.dart';
import '../../data/role_management_provider.dart';
import '../widgets/state_views.dart';
import 'role_detail_screen.dart';
import 'role_editor_screen.dart';

final _roleSearchProvider = StateProvider.autoDispose<String>((ref) => '');

/// Custom venture role management, `GET/POST/PUT/DELETE /api/role-management`.
///
/// Visible to Level 1 (Super Admin), Level 2 (Managing Director) and Level 4
/// (CXO) — the same set the web dashboard's nav lists "Role Management" for.
/// Mutating actions additionally require `accessLevel <= 4`, matching every
/// write route's own guard. Lower level number = more access.
class RolesScreen extends ConsumerWidget {
  const RolesScreen({super.key});

  static bool canView(int accessLevel) =>
      accessLevel == 1 || accessLevel == 2 || accessLevel == 4;

  static bool canManage(int accessLevel) => accessLevel <= 4;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final accessLevel = ref.watch(authProvider).maybeWhen<int?>(
          authenticated: (user) => user.accessLevel,
          orElse: () => null,
        );

    if (accessLevel == null || !canView(accessLevel)) {
      return Scaffold(
        appBar: AppBar(title: const Text('Role Management')),
        body: const RestrictedStateView(
          moduleName: 'Role Management',
          requirement: 'Level 1, Level 2, or Level 4 (CXO)',
        ),
      );
    }

    final manage = canManage(accessLevel);
    final rolesAsync = ref.watch(ventureRolesProvider);
    final query = ref.watch(_roleSearchProvider).trim().toLowerCase();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Role Management'),
        actions: [
          IconButton(
            tooltip: 'Refresh roles',
            icon: const Icon(LucideIcons.refreshCw, size: 20),
            onPressed: () => ref.invalidate(ventureRolesProvider),
          ),
        ],
      ),
      floatingActionButton: manage
          ? FloatingActionButton.extended(
              onPressed: () async {
                final created = await Navigator.of(context).push<bool>(
                  MaterialPageRoute(builder: (_) => const RoleEditorScreen()),
                );
                if (created == true) ref.invalidate(ventureRolesProvider);
              },
              icon: const Icon(LucideIcons.plus, size: 20),
              label: const Text('New role'),
            )
          : null,
      body: Column(
        children: [
          const OfflineBanner(),
          Padding(
            padding: const EdgeInsets.fromLTRB(
                NebulaSpacing.md, NebulaSpacing.md, NebulaSpacing.md, NebulaSpacing.sm),
            child: TextField(
              onChanged: (value) =>
                  ref.read(_roleSearchProvider.notifier).state = value,
              decoration: InputDecoration(
                hintText: 'Search roles or ventures…',
                prefixIcon: const Icon(LucideIcons.search, size: 18),
                suffixIcon: query.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(LucideIcons.x, size: 18),
                        onPressed: () =>
                            ref.read(_roleSearchProvider.notifier).state = '',
                      ),
              ),
            ),
          ),
          Expanded(
            child: rolesAsync.when(
              loading: () => const ListSkeleton(itemHeight: 92),
              error: (error, _) => RefreshableMessage(
                child: ErrorStateView(
                  title: 'Could not load roles',
                  error: error,
                  onRetry: () => ref.invalidate(ventureRolesProvider),
                ),
              ),
              data: (roles) {
                final filtered = roles.where((r) {
                  if (query.isEmpty) return true;
                  return r.roleName.toLowerCase().contains(query) ||
                      (r.ventureName?.toLowerCase().contains(query) ?? false);
                }).toList();

                return RefreshIndicator(
                  onRefresh: () async =>
                      ref.refresh(ventureRolesProvider.future),
                  child: filtered.isEmpty
                      ? RefreshableMessage(
                          child: EmptyStateView(
                            icon: LucideIcons.shieldCheck,
                            title:
                                roles.isEmpty ? 'No custom roles' : 'No matches',
                            message: roles.isEmpty
                                ? (manage
                                    ? 'Create a role to define a custom '
                                        'permission set for a venture.'
                                    : 'No custom roles have been created yet.')
                                : 'No role matches "$query".',
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.fromLTRB(NebulaSpacing.md,
                              NebulaSpacing.sm, NebulaSpacing.md, NebulaSpacing.xxl),
                          physics: const AlwaysScrollableScrollPhysics(),
                          itemCount: filtered.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: NebulaSpacing.sm),
                          itemBuilder: (context, index) => _RoleRow(
                            role: filtered[index],
                            canManage: manage,
                          ),
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

class _RoleRow extends ConsumerWidget {
  final VentureRole role;
  final bool canManage;

  const _RoleRow({required this.role, required this.canManage});

  Future<void> _duplicate(BuildContext context, WidgetRef ref) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref.read(roleManagementDataSourceProvider).duplicateRole(role.id);
      ref.invalidate(ventureRolesProvider);
      messenger.showSnackBar(const SnackBar(content: Text('Role duplicated')));
    } catch (error) {
      messenger.showSnackBar(SnackBar(content: Text(readableError(error))));
    }
  }

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Delete role?'),
        content: Text(
          '"${role.roleName}" will be deactivated and unassigned from '
          '${role.assignedUsersCount} user'
          '${role.assignedUsersCount == 1 ? '' : 's'}.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(dialogContext).colorScheme.error,
            ),
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;

    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref.read(roleManagementDataSourceProvider).deleteRole(role.id);
      ref.invalidate(ventureRolesProvider);
      messenger.showSnackBar(SnackBar(content: Text('${role.roleName} deleted')));
    } catch (error) {
      messenger.showSnackBar(SnackBar(content: Text(readableError(error))));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final roleColor = parseHexColor(role.color) ?? Theme.of(context).colorScheme.primary;

    return Semantics(
      button: true,
      label: '${role.roleName}, ${role.assignedUsersCount} assigned users',
      child: Material(
        color: cardSurface(context),
        borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
        child: InkWell(
          borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) =>
                  RoleDetailScreen(roleId: role.id, canManage: canManage),
            ),
          ),
          child: Container(
            padding: const EdgeInsets.all(NebulaSpacing.md),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
              border: Border.all(color: hairline(context)),
            ),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: roleColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(NebulaSpacing.radiusSm),
                  ),
                  child: Text(role.icon, style: const TextStyle(fontSize: 20)),
                ),
                const SizedBox(width: NebulaSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(role.roleName,
                          style: Theme.of(context).textTheme.titleSmall,
                          overflow: TextOverflow.ellipsis),
                      const SizedBox(height: 2),
                      Text(
                        role.ventureName ?? 'All ventures',
                        style: Theme.of(context)
                            .textTheme
                            .bodySmall
                            ?.copyWith(color: textSecondary(context)),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${role.assignedUsersCount} assigned',
                        style: Theme.of(context)
                            .textTheme
                            .labelSmall
                            ?.copyWith(color: roleColor),
                      ),
                    ],
                  ),
                ),
                if (canManage)
                  PopupMenuButton<String>(
                    icon: Icon(LucideIcons.ellipsisVertical,
                        size: 18, color: textSecondary(context)),
                    onSelected: (value) {
                      if (value == 'duplicate') _duplicate(context, ref);
                      if (value == 'delete') _confirmDelete(context, ref);
                    },
                    itemBuilder: (context) => const [
                      PopupMenuItem(value: 'duplicate', child: Text('Duplicate')),
                      PopupMenuItem(value: 'delete', child: Text('Delete')),
                    ],
                  )
                else
                  Icon(LucideIcons.chevronRight,
                      size: 18, color: textSecondary(context)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
