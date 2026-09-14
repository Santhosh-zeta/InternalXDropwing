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
import '../../data/user_management_data_source.dart';
import '../../data/user_management_model.dart';
import '../../data/user_management_provider.dart';
import 'user_detail_screen.dart';
import 'user_editor_screen.dart';

final _userSearchProvider = StateProvider.autoDispose<String>((ref) => '');

/// Admin surface for `/api/team-members` full CRUD.
///
/// Distinct from the read-only `team` feature: `team` lets anyone see their
/// colleagues, this lets an administrator create, edit and delete accounts.
/// **Lower level number = more access**, so every comparison here is `<=`,
/// routed through [AccessLevel.satisfies].
class UserManagementScreen extends ConsumerWidget {
  const UserManagementScreen({super.key});

  /// The route's own extra rule, on top of [Permission.updateUser]: L1/L2 may
  /// modify anyone; everyone else may only touch users strictly *below* their
  /// own level (a larger level number).
  static bool canModify(int viewerLevel, int targetLevel) {
    if (AccessLevel.satisfies(viewerLevel, AccessLevel.managingDirector)) {
      return true;
    }
    return targetLevel > viewerLevel;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('User Management'),
        actions: [
          IconButton(
            tooltip: 'Refresh users',
            icon: const Icon(LucideIcons.refreshCw, size: 20),
            onPressed: () => ref.invalidate(managedUsersProvider),
          ),
        ],
      ),
      floatingActionButton: PermissionGate(
        permission: Permission.createUser,
        child: FloatingActionButton.extended(
          onPressed: () async {
            final created = await Navigator.of(context).push<bool>(
              MaterialPageRoute(builder: (_) => const UserEditorScreen()),
            );
            if (created == true) ref.invalidate(managedUsersProvider);
          },
          icon: const Icon(LucideIcons.userPlus, size: 20),
          label: const Text('Add user'),
        ),
      ),
      body: const PermissionScope(
        permission: Permission.viewUsers,
        what: 'user management',
        child: _UserManagementBody(),
      ),
    );
  }
}

class _UserManagementBody extends ConsumerWidget {
  const _UserManagementBody();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final usersAsync = ref.watch(managedUsersProvider);
    final query = ref.watch(_userSearchProvider).trim().toLowerCase();
    final viewerLevel = ref.watch(accessLevelProvider) ?? AccessLevel.lowest;
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
                ref.read(_userSearchProvider.notifier).state = value,
            textInputAction: TextInputAction.search,
            decoration: InputDecoration(
              hintText: 'Search name, email, department…',
              prefixIcon: const Icon(LucideIcons.search, size: 18),
              suffixIcon: query.isEmpty
                  ? null
                  : IconButton(
                      tooltip: 'Clear search',
                      icon: const Icon(LucideIcons.x, size: 18),
                      onPressed: () =>
                          ref.read(_userSearchProvider.notifier).state = '',
                    ),
            ),
          ),
        ),
        Expanded(
          child: usersAsync.when(
            loading: () => const Padding(
              padding: EdgeInsets.all(NebulaSpacing.md),
              child: ListSkeleton(),
            ),
            error: (error, _) => _Refreshable(
              onRefresh: () => ref.refresh(managedUsersProvider.future),
              child: ErrorStateView(
                message: readableError(error),
                onRetry: () => ref.invalidate(managedUsersProvider),
              ),
            ),
            data: (users) {
              final filtered = users.where((u) {
                if (query.isEmpty) return true;
                return u.fullName.toLowerCase().contains(query) ||
                    u.email.toLowerCase().contains(query) ||
                    (u.employeeId?.toLowerCase().contains(query) ?? false) ||
                    (u.department?.toLowerCase().contains(query) ?? false) ||
                    (u.designation?.toLowerCase().contains(query) ?? false) ||
                    (u.ventureName?.toLowerCase().contains(query) ?? false);
              }).toList();

              if (filtered.isEmpty) {
                return _Refreshable(
                  onRefresh: () => ref.refresh(managedUsersProvider.future),
                  child: EmptyStateView(
                    icon: LucideIcons.users,
                    title: users.isEmpty ? 'No users yet' : 'No matching users',
                    message: users.isEmpty
                        ? 'Users you create will appear here.'
                        : 'No user matches "$query".',
                  ),
                );
              }

              return RefreshIndicator(
                onRefresh: () async => ref.refresh(managedUsersProvider.future),
                child: _UserList(
                  users: filtered,
                  total: users,
                  viewerLevel: viewerLevel,
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

/// The list itself: a summary strip, then users grouped by access level with
/// the most privileged level first — the same ordering the platform uses.
class _UserList extends StatelessWidget {
  const _UserList({
    required this.users,
    required this.total,
    required this.viewerLevel,
  });

  final List<ManagedUser> users;
  final List<ManagedUser> total;
  final int viewerLevel;

  @override
  Widget build(BuildContext context) {
    final levels = users.map((u) => u.accessLevel).toSet().toList()..sort();
    final activeCount = total.where((u) => u.isActive).length;

    var index = 0;
    final children = <Widget>[
      MetricRow([
        StatTile(value: total.length, label: 'Accounts'),
        StatTile(value: activeCount, label: 'Active', tone: DTone.ok),
        StatTile(
          value: total.length - activeCount,
          label: 'Deactivated',
          tone: DTone.warn,
        ),
      ]),
    ];

    for (final level in levels) {
      final inLevel = users.where((u) => u.accessLevel == level).toList();
      children.add(
        GroupHeader(
          'L$level · ${AccessLevel.nameOf(level)}',
          count: inLevel.length,
        ),
      );
      for (final user in inLevel) {
        children.add(
          Padding(
            padding: const EdgeInsets.only(bottom: NebulaSpacing.sm),
            child: StaggerIn(
              index: index++,
              child: _UserRow(user: user, viewerLevel: viewerLevel),
            ),
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

class _UserRow extends ConsumerWidget {
  const _UserRow({required this.user, required this.viewerLevel});

  final ManagedUser user;
  final int viewerLevel;

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Delete user?'),
        content: Text(
          'This permanently deletes ${user.fullName}\'s account. This cannot '
          'be undone.',
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
      await ref.read(userManagementDataSourceProvider).deleteUser(user.id);
      ref.invalidate(managedUsersProvider);
      messenger.showSnackBar(
        SnackBar(content: Text('${user.fullName} deleted')),
      );
    } catch (error) {
      messenger.showSnackBar(SnackBar(content: Text(readableError(error))));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dl = context.dl;
    final outranks =
        UserManagementScreen.canModify(viewerLevel, user.accessLevel);

    return Semantics(
      button: true,
      label: '${user.fullName}, level ${user.accessLevel} ${user.levelName}, '
          '${user.isActive ? 'active' : 'deactivated'}',
      child: EntityRow(
        title: user.fullName,
        // A deactivated account recedes rather than shouting; the tag says
        // why, the luminance says how much it matters.
        timeState: user.isActive ? TimeState.next : TimeState.past,
        spineColor: user.ventureId == null
            ? null
            : NebulaColors.forVentureId(user.ventureId),
        leading: DAvatar(user.fullName, imageUrl: user.avatarUrl),
        meta: [
          DTag('L${user.accessLevel} · ${user.levelName}', tone: DTone.accent),
          if (user.ventureName != null)
            DTag.venture(
              user.ventureName!,
              color: NebulaColors.forVentureId(user.ventureId),
            ),
          if (!user.isActive) const DTag('Deactivated', tone: DTone.critical),
          if (user.employeeId != null)
            Mono(user.employeeId!, size: 10, color: dl.textTertiary),
          Text(user.email, overflow: TextOverflow.ellipsis),
        ],
        trailing: outranks
            ? PermissionGate(
                permission: Permission.deleteUser,
                fallback: Icon(
                  LucideIcons.chevronRight,
                  size: 18,
                  color: dl.textTertiary,
                ),
                child: IconButton(
                  tooltip: 'Delete user',
                  icon: Icon(LucideIcons.trash2, size: 18, color: dl.critical),
                  onPressed: () => _confirmDelete(context, ref),
                ),
              )
            : Icon(LucideIcons.chevronRight, size: 18, color: dl.textTertiary),
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) =>
                UserDetailScreen(userId: user.id, canEdit: outranks),
          ),
        ),
      ),
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
