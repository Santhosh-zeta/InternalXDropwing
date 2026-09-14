import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/network/network_info_provider.dart';
import '../../../../core/rbac/access_level.dart';
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
import 'role_detail_screen.dart';
import 'role_editor_screen.dart';

final _roleSearchProvider = StateProvider.autoDispose<String>((ref) => '');

/// Custom venture role management, `GET/POST/PUT/DELETE /api/role-management`.
///
/// A role here is a per-venture permission set (`venture_roles`), not one of
/// the nine fixed access levels — those live in the access-control module.
/// Viewing needs [Permission.viewRoles]; every mutation needs
/// [Permission.manageRoles], both of which are `accessLevel <= 4` checks
/// because a lower level number means more access.
class RolesScreen extends ConsumerWidget {
  const RolesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
      floatingActionButton: PermissionGate(
        permission: Permission.manageRoles,
        child: FloatingActionButton.extended(
          onPressed: () async {
            final created = await Navigator.of(context).push<bool>(
              MaterialPageRoute(builder: (_) => const RoleEditorScreen()),
            );
            if (created == true) ref.invalidate(ventureRolesProvider);
          },
          icon: const Icon(LucideIcons.plus, size: 20),
          label: const Text('New role'),
        ),
      ),
      body: const PermissionScope(
        permission: Permission.viewRoles,
        what: 'role management',
        child: _RolesBody(),
      ),
    );
  }
}

class _RolesBody extends ConsumerWidget {
  const _RolesBody();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rolesAsync = ref.watch(ventureRolesProvider);
    final query = ref.watch(_roleSearchProvider).trim().toLowerCase();
    final online = ref.watch(networkInfoProvider).maybeWhen(
          data: (value) => value,
          orElse: () => true,
        );

    return Column(
      children: [
        if (!online) const OfflineBanner(),
        Padding(
          padding: const EdgeInsets.fromLTRB(
            NebulaSpacing.md,
            NebulaSpacing.md,
            NebulaSpacing.md,
            NebulaSpacing.sm,
          ),
          child: TextField(
            onChanged: (value) =>
                ref.read(_roleSearchProvider.notifier).state = value,
            textInputAction: TextInputAction.search,
            decoration: InputDecoration(
              hintText: 'Search roles or ventures…',
              prefixIcon: const Icon(LucideIcons.search, size: 18),
              suffixIcon: query.isEmpty
                  ? null
                  : IconButton(
                      tooltip: 'Clear search',
                      icon: const Icon(LucideIcons.x, size: 18),
                      onPressed: () =>
                          ref.read(_roleSearchProvider.notifier).state = '',
                    ),
            ),
          ),
        ),
        Expanded(
          child: rolesAsync.when(
            loading: () => const Padding(
              padding: EdgeInsets.all(NebulaSpacing.md),
              child: ListSkeleton(),
            ),
            error: (error, _) => _Refreshable(
              onRefresh: () => ref.refresh(ventureRolesProvider.future),
              child: ErrorStateView(
                message: readableError(error),
                onRetry: () => ref.invalidate(ventureRolesProvider),
              ),
            ),
            data: (roles) {
              final filtered = roles.where((r) {
                if (query.isEmpty) return true;
                return r.roleName.toLowerCase().contains(query) ||
                    r.roleKey.toLowerCase().contains(query) ||
                    (r.ventureName?.toLowerCase().contains(query) ?? false);
              }).toList();

              if (filtered.isEmpty) {
                return _Refreshable(
                  onRefresh: () => ref.refresh(ventureRolesProvider.future),
                  child: EmptyStateView(
                    icon: LucideIcons.shieldCheck,
                    title: roles.isEmpty ? 'No custom roles' : 'No matches',
                    message: roles.isEmpty
                        ? 'A role defines a custom permission set for a '
                            'venture. Create one to get started.'
                        : 'No role matches "$query".',
                  ),
                );
              }

              return RefreshIndicator(
                onRefresh: () async => ref.refresh(ventureRolesProvider.future),
                child: _RoleList(roles: filtered, total: roles),
              );
            },
          ),
        ),
      ],
    );
  }
}

/// Roles grouped by the venture they belong to, group-wide roles first.
class _RoleList extends StatelessWidget {
  const _RoleList({required this.roles, required this.total});

  final List<VentureRole> roles;
  final List<VentureRole> total;

  @override
  Widget build(BuildContext context) {
    final groups = <String>{for (final r in roles) r.ventureName ?? ''}.toList()
      ..sort();
    final activeCount = total.where((r) => r.isActive).length;
    final assignedTotal =
        total.fold<int>(0, (sum, r) => sum + r.assignedUsersCount);

    var index = 0;
    final children = <Widget>[
      MetricRow([
        StatTile(value: total.length, label: 'Roles'),
        StatTile(value: activeCount, label: 'Active', tone: DTone.ok),
        StatTile(value: assignedTotal, label: 'Assignments'),
      ]),
    ];

    for (final group in groups) {
      final inGroup =
          roles.where((r) => (r.ventureName ?? '') == group).toList();
      children.add(
        GroupHeader(
          group.isEmpty ? 'All ventures' : group,
          count: inGroup.length,
        ),
      );
      for (final role in inGroup) {
        children.add(
          Padding(
            padding: const EdgeInsets.only(bottom: NebulaSpacing.sm),
            child: StaggerIn(index: index++, child: _RoleRow(role: role)),
          ),
        );
      }
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(
        NebulaSpacing.md,
        NebulaSpacing.sm,
        NebulaSpacing.md,
        NebulaSpacing.xxl,
      ),
      physics: const AlwaysScrollableScrollPhysics(),
      children: children,
    );
  }
}

class _RoleRow extends ConsumerWidget {
  const _RoleRow({required this.role});

  final VentureRole role;

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
              backgroundColor: dialogContext.dl.critical,
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
      messenger
          .showSnackBar(SnackBar(content: Text('${role.roleName} deleted')));
    } catch (error) {
      messenger.showSnackBar(SnackBar(content: Text(readableError(error))));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dl = context.dl;
    final roleColor = NebulaColors.parseHex(role.color);
    final grantedCount = role.permissions.values.where((v) => v).length;

    return Semantics(
      button: true,
      label: '${role.roleName}, base level ${role.baseLevel}, '
          '${role.assignedUsersCount} assigned',
      child: EntityRow(
        title: role.roleName,
        timeState: role.isActive ? TimeState.next : TimeState.past,
        spineColor: NebulaColors.parseHex(
          role.ventureColor,
          fallback: roleColor,
        ),
        leading: _RoleGlyph(icon: role.icon, color: roleColor),
        meta: [
          DTag(
            'L${role.baseLevel} · ${AccessLevel.nameOf(role.baseLevel)}',
            tone: DTone.accent,
          ),
          if (role.ventureName != null)
            DTag.venture(
              role.ventureName!,
              color: NebulaColors.parseHex(
                role.ventureColor,
                fallback: roleColor,
              ),
            ),
          if (!role.isActive) const DTag('Inactive', tone: DTone.critical),
          _Counted(value: role.assignedUsersCount, label: 'assigned'),
          _Counted(value: grantedCount, label: 'permissions'),
        ],
        trailing: PermissionGate(
          permission: Permission.manageRoles,
          fallback:
              Icon(LucideIcons.chevronRight, size: 18, color: dl.textTertiary),
          child: PopupMenuButton<String>(
            tooltip: 'Role actions',
            icon: Icon(LucideIcons.ellipsisVertical,
                size: 18, color: dl.textTertiary),
            onSelected: (value) {
              if (value == 'duplicate') _duplicate(context, ref);
              if (value == 'delete') _confirmDelete(context, ref);
            },
            itemBuilder: (context) => const [
              PopupMenuItem(value: 'duplicate', child: Text('Duplicate')),
              PopupMenuItem(value: 'delete', child: Text('Delete')),
            ],
          ),
        ),
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => RoleDetailScreen(roleId: role.id),
          ),
        ),
      ),
    );
  }
}

/// The role's own emoji on a tinted square — the one place a role's stored
/// colour is allowed to appear as a fill.
class _RoleGlyph extends StatelessWidget {
  const _RoleGlyph({required this.icon, required this.color});

  static const double _size = 38;

  final String icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: _size,
      height: _size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(_size * 0.3),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Text(icon, style: const TextStyle(fontSize: _size * 0.5)),
    );
  }
}

/// A figure plus its caption, kept together so the number stays mono.
class _Counted extends StatelessWidget {
  const _Counted({required this.value, required this.label});

  final int value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Mono('$value', size: 10, color: context.dl.textTertiary),
        const SizedBox(width: 3),
        Text(label),
      ],
    );
  }
}

/// Keeps pull-to-refresh alive behind a non-scrolling state view.
class _Refreshable extends StatelessWidget {
  const _Refreshable({required this.child, required this.onRefresh});

  final Widget child;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverFillRemaining(hasScrollBody: false, child: child),
        ],
      ),
    );
  }
}
