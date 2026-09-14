import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/theme/nebula_spacing.dart';
import '../../data/role_management_data_source.dart';
import '../../data/role_management_model.dart';
import '../../data/role_management_provider.dart';
import '../widgets/state_views.dart';
import 'role_editor_screen.dart';

/// Full detail for one venture role: its permission set and assigned users,
/// from `GET /api/role-management/:id`.
class RoleDetailScreen extends ConsumerWidget {
  final int roleId;
  final bool canManage;

  const RoleDetailScreen(
      {super.key, required this.roleId, required this.canManage});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final roleAsync = ref.watch(ventureRoleDetailProvider(roleId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Role'),
        actions: [
          if (canManage)
            roleAsync.maybeWhen(
              data: (role) => IconButton(
                tooltip: 'Edit role',
                icon: const Icon(LucideIcons.pencil, size: 20),
                onPressed: () async {
                  final saved = await Navigator.of(context).push<bool>(
                    MaterialPageRoute(
                      builder: (_) => RoleEditorScreen(existing: role),
                    ),
                  );
                  if (saved == true) {
                    ref.invalidate(ventureRoleDetailProvider(roleId));
                    ref.invalidate(ventureRolesProvider);
                  }
                },
              ),
              orElse: () => const SizedBox.shrink(),
            ),
          IconButton(
            tooltip: 'Refresh role',
            icon: const Icon(LucideIcons.refreshCw, size: 20),
            onPressed: () => ref.invalidate(ventureRoleDetailProvider(roleId)),
          ),
        ],
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(
            child: roleAsync.when(
              loading: () => const ListSkeleton(itemCount: 4, itemHeight: 88),
              error: (error, _) => RefreshableMessage(
                child: ErrorStateView(
                  title: 'Could not load this role',
                  error: error,
                  onRetry: () =>
                      ref.invalidate(ventureRoleDetailProvider(roleId)),
                ),
              ),
              data: (role) => RefreshIndicator(
                onRefresh: () async =>
                    ref.refresh(ventureRoleDetailProvider(roleId).future),
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(NebulaSpacing.md,
                      NebulaSpacing.md, NebulaSpacing.md, NebulaSpacing.xl),
                  children: [
                    _RoleHeader(role: role),
                    const SizedBox(height: NebulaSpacing.md),
                    _PermissionsCard(role: role),
                    const SizedBox(height: NebulaSpacing.md),
                    _AssignedUsersCard(
                        role: role, canManage: canManage, roleId: roleId),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RoleHeader extends StatelessWidget {
  final VentureRole role;

  const _RoleHeader({required this.role});

  @override
  Widget build(BuildContext context) {
    final roleColor =
        parseHexColor(role.color) ?? Theme.of(context).colorScheme.primary;
    return Container(
      padding: const EdgeInsets.all(NebulaSpacing.md),
      decoration: BoxDecoration(
        color: cardSurface(context),
        borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
        border: Border.all(color: hairline(context)),
      ),
      child: Row(
        children: [
          Container(
            width: 52,
            height: 52,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: roleColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(NebulaSpacing.radiusSm),
            ),
            child: Text(role.icon, style: const TextStyle(fontSize: 24)),
          ),
          const SizedBox(width: NebulaSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(role.roleName,
                    style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 2),
                Text(
                  role.ventureName ?? 'All ventures',
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: textSecondary(context)),
                ),
                if (role.description != null) ...[
                  const SizedBox(height: NebulaSpacing.xs),
                  Text(role.description!,
                      style: Theme.of(context).textTheme.bodySmall),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PermissionsCard extends StatelessWidget {
  final VentureRole role;

  const _PermissionsCard({required this.role});

  @override
  Widget build(BuildContext context) {
    final enabled = role.permissions.entries.where((e) => e.value).toList();

    return Container(
      padding: const EdgeInsets.all(NebulaSpacing.md),
      decoration: BoxDecoration(
        color: cardSurface(context),
        borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
        border: Border.all(color: hairline(context)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Permissions', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: NebulaSpacing.sm),
          if (enabled.isEmpty)
            Text(
              'No permissions have been granted to this role.',
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: textSecondary(context)),
            )
          else
            Wrap(
              spacing: NebulaSpacing.xs,
              runSpacing: NebulaSpacing.xs,
              children: [
                for (final entry in enabled)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: NebulaSpacing.sm, vertical: NebulaSpacing.xs),
                    decoration: BoxDecoration(
                      color: mutedSurface(context),
                      borderRadius: BorderRadius.circular(NebulaSpacing.radiusFull),
                    ),
                    child: Text(
                      entry.key.replaceAll('_', ' '),
                      style: Theme.of(context).textTheme.labelSmall,
                    ),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}

class _AssignedUsersCard extends ConsumerWidget {
  final VentureRole role;
  final bool canManage;
  final int roleId;

  const _AssignedUsersCard({
    required this.role,
    required this.canManage,
    required this.roleId,
  });

  Future<void> _unassign(
      BuildContext context, WidgetRef ref, RoleAssignedUser user) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Remove role?'),
        content: Text(
            'Remove "${role.roleName}" from ${user.fullName}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;

    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref
          .read(roleManagementDataSourceProvider)
          .unassignRole(userId: user.id, roleId: roleId);
      ref.invalidate(ventureRoleDetailProvider(roleId));
      messenger.showSnackBar(SnackBar(content: Text('Removed ${user.fullName}')));
    } catch (error) {
      messenger.showSnackBar(SnackBar(content: Text(readableError(error))));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      padding: const EdgeInsets.all(NebulaSpacing.md),
      decoration: BoxDecoration(
        color: cardSurface(context),
        borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
        border: Border.all(color: hairline(context)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text('Assigned users (${role.assignedUsers.length})',
                    style: Theme.of(context).textTheme.titleSmall),
              ),
              if (canManage)
                TextButton.icon(
                  onPressed: () => showModalBottomSheet<void>(
                    context: context,
                    isScrollControlled: true,
                    builder: (_) => _AssignUserSheet(role: role, roleId: roleId),
                  ),
                  icon: const Icon(LucideIcons.userPlus, size: 16),
                  label: const Text('Assign'),
                ),
            ],
          ),
          if (role.assignedUsers.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: NebulaSpacing.md),
              child: Text(
                'No one is assigned to this role yet.',
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: textSecondary(context)),
              ),
            )
          else
            for (var i = 0; i < role.assignedUsers.length; i++) ...[
              if (i > 0) Divider(height: 1, color: hairline(context)),
              Padding(
                padding:
                    const EdgeInsets.symmetric(vertical: NebulaSpacing.sm + 2),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(role.assignedUsers[i].fullName,
                              style: Theme.of(context).textTheme.bodyMedium),
                          Text(
                            role.assignedUsers[i].email,
                            style: Theme.of(context)
                                .textTheme
                                .labelSmall
                                ?.copyWith(color: textSecondary(context)),
                          ),
                        ],
                      ),
                    ),
                    if (canManage)
                      IconButton(
                        tooltip: 'Remove from role',
                        icon: Icon(LucideIcons.x,
                            size: 16,
                            color: Theme.of(context).colorScheme.error),
                        onPressed: () =>
                            _unassign(context, ref, role.assignedUsers[i]),
                      ),
                  ],
                ),
              ),
            ],
        ],
      ),
    );
  }
}

class _AssignUserSheet extends ConsumerWidget {
  final VentureRole role;
  final int roleId;

  const _AssignUserSheet({required this.role, required this.roleId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final membersAsync = ref.watch(assignableTeamMembersProvider);
    final assignedIds = role.assignedUsers.map((u) => u.id).toSet();

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          left: NebulaSpacing.md,
          right: NebulaSpacing.md,
          top: NebulaSpacing.md,
          bottom: MediaQuery.of(context).viewInsets.bottom + NebulaSpacing.md,
        ),
        child: SizedBox(
          height: MediaQuery.of(context).size.height * 0.6,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Assign "${role.roleName}"',
                  style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: NebulaSpacing.sm),
              Expanded(
                child: membersAsync.when(
                  loading: () => const ListSkeleton(itemCount: 5, itemHeight: 56),
                  error: (error, _) => ErrorStateView(
                    title: 'Could not load team members',
                    error: error,
                    onRetry: () => ref.invalidate(assignableTeamMembersProvider),
                  ),
                  data: (members) {
                    final available =
                        members.where((m) => !assignedIds.contains(m.id)).toList();
                    if (available.isEmpty) {
                      return const EmptyStateView(
                        icon: LucideIcons.userCheck,
                        title: 'Everyone is assigned',
                        message: 'Every eligible team member already has this '
                            'role.',
                      );
                    }
                    return ListView.separated(
                      itemCount: available.length,
                      separatorBuilder: (_, __) =>
                          Divider(height: 1, color: hairline(context)),
                      itemBuilder: (context, index) {
                        final member = available[index];
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(member.fullName),
                          subtitle: Text(
                              '${member.levelName}'
                              '${member.ventureName != null ? ' · ${member.ventureName}' : ''}'),
                          trailing: IconButton(
                            icon: const Icon(LucideIcons.plus, size: 18),
                            onPressed: () async {
                              final messenger = ScaffoldMessenger.of(context);
                              final navigator = Navigator.of(context);
                              try {
                                await ref
                                    .read(roleManagementDataSourceProvider)
                                    .assignRole(
                                        userId: member.id, roleId: roleId);
                                ref.invalidate(ventureRoleDetailProvider(roleId));
                                ref.invalidate(assignableTeamMembersProvider);
                                navigator.pop();
                                messenger.showSnackBar(SnackBar(
                                    content:
                                        Text('Assigned to ${member.fullName}')));
                              } catch (error) {
                                messenger.showSnackBar(
                                    SnackBar(content: Text(readableError(error))));
                              }
                            },
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
