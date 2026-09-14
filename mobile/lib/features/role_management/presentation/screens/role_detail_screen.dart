import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/network/network_info_provider.dart';
import '../../../../core/constants/access_levels.dart';
import '../../../../core/rbac/permissions.dart';
import '../../../../core/rbac/rbac_widgets.dart';
import '../../../../core/theme/nebula_colors.dart';
import '../../../../core/theme/nebula_spacing.dart';
import '../../../../core/theme/theme_context.dart';
import '../../../../core/widgets/data_display.dart';
import '../../../../core/widgets/motion.dart';
import '../../../../core/widgets/primitives.dart';
import '../../../../core/widgets/state_views.dart';
import '../../data/role_management_data_source.dart';
import '../../data/role_management_model.dart';
import '../../data/role_management_provider.dart';
import 'role_editor_screen.dart';

/// Full detail for one venture role: its permission set and assigned users,
/// from `GET /api/role-management/:id`.
class RoleDetailScreen extends ConsumerWidget {
  const RoleDetailScreen({super.key, required this.roleId});

  final int roleId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final roleAsync = ref.watch(ventureRoleDetailProvider(roleId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Role'),
        actions: [
          roleAsync.maybeWhen(
            data: (role) => PermissionGate(
              permission: Permission.manageRoles,
              child: IconButton(
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
      body: PermissionScope(
        permission: Permission.viewRoles,
        what: 'role management',
        child: _RoleDetailBody(roleId: roleId),
      ),
    );
  }
}

class _RoleDetailBody extends ConsumerWidget {
  const _RoleDetailBody({required this.roleId});

  final int roleId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final roleAsync = ref.watch(ventureRoleDetailProvider(roleId));
    final online = ref.watch(networkInfoProvider).maybeWhen(
          data: (value) => value,
          orElse: () => true,
        );

    return Column(
      children: [
        if (!online) const OfflineBanner(),
        Expanded(
          child: roleAsync.when(
            loading: () => const Padding(
              padding: EdgeInsets.all(NebulaSpacing.md),
              child: ListSkeleton(count: 4),
            ),
            error: (error, _) => RefreshIndicator(
              onRefresh: () async =>
                  ref.refresh(ventureRoleDetailProvider(roleId).future),
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: ErrorStateView(
                      message: readableError(error),
                      onRetry: () =>
                          ref.invalidate(ventureRoleDetailProvider(roleId)),
                    ),
                  ),
                ],
              ),
            ),
            data: (role) => RefreshIndicator(
              onRefresh: () async =>
                  ref.refresh(ventureRoleDetailProvider(roleId).future),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(
                  NebulaSpacing.md,
                  NebulaSpacing.md,
                  NebulaSpacing.md,
                  NebulaSpacing.xl,
                ),
                children: [
                  StaggerIn(index: 0, child: _RoleHeader(role: role)),
                  const SizedBox(height: NebulaSpacing.md),
                  StaggerIn(index: 1, child: _PermissionsCard(role: role)),
                  const SizedBox(height: NebulaSpacing.md),
                  StaggerIn(
                    index: 2,
                    child: _AssignedUsersCard(role: role, roleId: roleId),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _RoleHeader extends StatelessWidget {
  const _RoleHeader({required this.role});

  final VentureRole role;

  @override
  Widget build(BuildContext context) {
    final roleColor = NebulaColors.parseHex(role.color);
    final ventureColor =
        NebulaColors.parseHex(role.ventureColor, fallback: roleColor);

    return DCard(
      accent: ventureColor,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _RoleGlyph(icon: role.icon, color: roleColor, size: 52),
              const SizedBox(width: NebulaSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(role.roleName, style: context.text.titleMedium),
                    const SizedBox(height: 3),
                    Mono(role.roleKey,
                        size: 11, color: context.dl.textTertiary),
                    if (role.description != null) ...[
                      const SizedBox(height: NebulaSpacing.xs),
                      Text(role.description!, style: context.text.bodySmall),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: NebulaSpacing.sm + 4),
          Wrap(
            spacing: NebulaSpacing.sm,
            runSpacing: NebulaSpacing.xs,
            children: [
              DTag(
                'L${role.baseLevel} · ${AccessLevels.nameOf(role.baseLevel)}',
                tone: DTone.accent,
              ),
              DTag.venture(
                role.ventureName ?? 'All ventures',
                color: ventureColor,
              ),
              DTag(
                role.isActive ? 'Active' : 'Inactive',
                tone: role.isActive ? DTone.ok : DTone.critical,
              ),
            ],
          ),
          if (role.createdByName != null) ...[
            const SizedBox(height: NebulaSpacing.sm),
            Text(
              'Created by ${role.createdByName}',
              style:
                  context.text.bodySmall?.copyWith(color: context.dl.textTertiary),
            ),
          ],
        ],
      ),
    );
  }
}

class _PermissionsCard extends StatelessWidget {
  const _PermissionsCard({required this.role});

  final VentureRole role;

  @override
  Widget build(BuildContext context) {
    final granted = role.permissions.entries.where((e) => e.value).toList()
      ..sort((a, b) => a.key.compareTo(b.key));

    return DCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(
            'Permissions granted',
            trailing: Mono(
              '${granted.length}/${role.permissions.length}',
              size: 11,
              color: context.dl.textTertiary,
            ),
          ),
          if (granted.isEmpty)
            Text(
              'No permissions have been granted to this role.',
              style: context.text.bodySmall
                  ?.copyWith(color: context.dl.textTertiary),
            )
          else
            Wrap(
              spacing: NebulaSpacing.xs + 2,
              runSpacing: NebulaSpacing.xs + 2,
              children: [
                for (final entry in granted)
                  DTag(entry.key.replaceAll('_', ' '), tone: DTone.ok),
              ],
            ),
        ],
      ),
    );
  }
}

class _AssignedUsersCard extends ConsumerWidget {
  const _AssignedUsersCard({required this.role, required this.roleId});

  final VentureRole role;
  final int roleId;

  Future<void> _unassign(
    BuildContext context,
    WidgetRef ref,
    RoleAssignedUser user,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Remove role?'),
        content: Text('Remove "${role.roleName}" from ${user.fullName}?'),
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
      ref.invalidate(assignableTeamMembersProvider);
      messenger
          .showSnackBar(SnackBar(content: Text('Removed ${user.fullName}')));
    } catch (error) {
      messenger.showSnackBar(SnackBar(content: Text(readableError(error))));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final users = role.assignedUsers;

    return DCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(
            'Assigned users',
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Mono('${users.length}',
                    size: 11, color: context.dl.textTertiary),
                PermissionGate(
                  permission: Permission.manageRoles,
                  child: TextButton.icon(
                    onPressed: () => showModalBottomSheet<void>(
                      context: context,
                      isScrollControlled: true,
                      builder: (_) =>
                          _AssignUserSheet(role: role, roleId: roleId),
                    ),
                    icon: const Icon(LucideIcons.userPlus, size: 16),
                    label: const Text('Assign'),
                  ),
                ),
              ],
            ),
          ),
          if (users.isEmpty)
            Text(
              'No one is assigned to this role yet.',
              style: context.text.bodySmall
                  ?.copyWith(color: context.dl.textTertiary),
            )
          else
            for (var i = 0; i < users.length; i++) ...[
              if (i > 0) const SizedBox(height: NebulaSpacing.sm),
              EntityRow(
                title: users[i].fullName,
                leading: DAvatar(users[i].fullName, size: 32),
                meta: [
                  DTag('L${users[i].accessLevel} · ${users[i].levelName}'),
                  if (users[i].ventureName != null)
                    Text(users[i].ventureName!),
                  Text(users[i].email, overflow: TextOverflow.ellipsis),
                ],
                trailing: PermissionGate(
                  permission: Permission.manageRoles,
                  child: IconButton(
                    tooltip: 'Remove from role',
                    icon: Icon(LucideIcons.x,
                        size: 16, color: context.dl.critical),
                    onPressed: () => _unassign(context, ref, users[i]),
                  ),
                ),
              ),
            ],
        ],
      ),
    );
  }
}

class _AssignUserSheet extends ConsumerWidget {
  const _AssignUserSheet({required this.role, required this.roleId});

  final VentureRole role;
  final int roleId;

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
                  style: context.text.titleMedium),
              const SizedBox(height: NebulaSpacing.sm),
              Expanded(
                child: membersAsync.when(
                  loading: () => const ListSkeleton(),
                  error: (error, _) => ErrorStateView(
                    message: readableError(error),
                    onRetry: () => ref.invalidate(assignableTeamMembersProvider),
                  ),
                  data: (members) {
                    final available = members
                        .where((m) => !assignedIds.contains(m.id))
                        .toList();
                    if (available.isEmpty) {
                      return const EmptyStateView(
                        icon: LucideIcons.userCheck,
                        title: 'Everyone is assigned',
                        message:
                            'Every eligible team member already has this role.',
                      );
                    }
                    return ListView.separated(
                      itemCount: available.length,
                      separatorBuilder: (_, __) =>
                          const SizedBox(height: NebulaSpacing.sm),
                      itemBuilder: (context, index) {
                        final member = available[index];
                        return EntityRow(
                          title: member.fullName,
                          leading: DAvatar(member.fullName, size: 32),
                          spineColor: member.ventureColor == null
                              ? null
                              : NebulaColors.parseHex(member.ventureColor),
                          meta: [
                            DTag(
                                'L${member.accessLevel} · ${member.levelName}'),
                            if (member.ventureName != null)
                              Text(member.ventureName!),
                            if (member.assignedRoleNames.isNotEmpty)
                              Text(member.assignedRoleNames.join(', ')),
                          ],
                          trailing: IconButton(
                            tooltip: 'Assign this role',
                            icon: const Icon(LucideIcons.plus, size: 18),
                            onPressed: () async {
                              final messenger = ScaffoldMessenger.of(context);
                              final navigator = Navigator.of(context);
                              try {
                                await ref
                                    .read(roleManagementDataSourceProvider)
                                    .assignRole(
                                      userId: member.id,
                                      roleId: roleId,
                                    );
                                ref.invalidate(
                                    ventureRoleDetailProvider(roleId));
                                ref.invalidate(assignableTeamMembersProvider);
                                navigator.pop();
                                messenger.showSnackBar(
                                  SnackBar(
                                    content:
                                        Text('Assigned to ${member.fullName}'),
                                  ),
                                );
                              } catch (error) {
                                messenger.showSnackBar(
                                  SnackBar(
                                      content: Text(readableError(error))),
                                );
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

/// The role's own emoji on a tinted square.
class _RoleGlyph extends StatelessWidget {
  const _RoleGlyph({required this.icon, required this.color, this.size = 38});

  final String icon;
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(size * 0.3),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Text(icon, style: TextStyle(fontSize: size * 0.5)),
    );
  }
}
