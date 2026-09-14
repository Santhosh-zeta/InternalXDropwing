import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/constants/access_levels.dart';
import '../../../../core/theme/nebula_spacing.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/user_management_data_source.dart';
import '../../data/user_management_model.dart';
import '../../data/user_management_provider.dart';
import '../widgets/state_views.dart';
import 'user_detail_screen.dart';
import 'user_editor_screen.dart';

final _userSearchProvider = StateProvider.autoDispose<String>((ref) => '');

/// Admin surface for `/api/team-members` full CRUD.
///
/// This is distinct from the read-only `team` feature: `team` lets anyone see
/// their colleagues, this lets an Admin (Level 3) and above create, edit and
/// delete accounts. Lower level number = more access.
class UserManagementScreen extends ConsumerWidget {
  const UserManagementScreen({super.key});

  static bool canView(int accessLevel) =>
      AccessLevels.hasAtLeast(accessLevel, AccessLevels.admin);

  /// The route's own rule: L1/L2 may modify anyone; everyone else may only
  /// touch users strictly below their own level (`target.accessLevel >
  /// viewer.accessLevel`).
  static bool canModify(int viewerLevel, int targetLevel) {
    if (AccessLevels.hasAtLeast(viewerLevel, AccessLevels.managingDirector)) {
      return true;
    }
    return targetLevel > viewerLevel;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final accessLevel = ref.watch(authProvider).maybeWhen<int?>(
          authenticated: (user) => user.accessLevel,
          orElse: () => null,
        );

    if (accessLevel == null || !canView(accessLevel)) {
      return Scaffold(
        appBar: AppBar(title: const Text('User Management')),
        body: const RestrictedStateView(
          moduleName: 'User Management',
          requirement: 'Level 3 (Admin) or above',
        ),
      );
    }

    final usersAsync = ref.watch(managedUsersProvider);
    final query = ref.watch(_userSearchProvider).trim().toLowerCase();

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
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final created = await Navigator.of(context).push<bool>(
            MaterialPageRoute(builder: (_) => const UserEditorScreen()),
          );
          if (created == true) ref.invalidate(managedUsersProvider);
        },
        icon: const Icon(LucideIcons.userPlus, size: 20),
        label: const Text('Add user'),
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          Padding(
            padding: const EdgeInsets.fromLTRB(
                NebulaSpacing.md, NebulaSpacing.md, NebulaSpacing.md, NebulaSpacing.sm),
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
              loading: () => const ListSkeleton(itemHeight: 88),
              error: (error, _) => RefreshableMessage(
                child: ErrorStateView(
                  title: 'Could not load users',
                  error: error,
                  onRetry: () => ref.invalidate(managedUsersProvider),
                ),
              ),
              data: (users) {
                final filtered = users.where((u) {
                  if (query.isEmpty) return true;
                  return u.fullName.toLowerCase().contains(query) ||
                      u.email.toLowerCase().contains(query) ||
                      (u.department?.toLowerCase().contains(query) ?? false) ||
                      (u.designation?.toLowerCase().contains(query) ?? false) ||
                      (u.ventureName?.toLowerCase().contains(query) ?? false);
                }).toList();

                return RefreshIndicator(
                  onRefresh: () async =>
                      ref.refresh(managedUsersProvider.future),
                  child: filtered.isEmpty
                      ? RefreshableMessage(
                          child: EmptyStateView(
                            icon: LucideIcons.users,
                            title: users.isEmpty
                                ? 'No users yet'
                                : 'No matching users',
                            message: users.isEmpty
                                ? 'Users you create will appear here.'
                                : 'No user matches "$query".',
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.fromLTRB(NebulaSpacing.md,
                              NebulaSpacing.sm, NebulaSpacing.md, NebulaSpacing.xxl),
                          physics: const AlwaysScrollableScrollPhysics(),
                          itemCount: filtered.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: NebulaSpacing.sm),
                          itemBuilder: (context, index) => _UserRow(
                            user: filtered[index],
                            viewerLevel: accessLevel,
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

class _UserRow extends ConsumerWidget {
  final ManagedUser user;
  final int viewerLevel;

  const _UserRow({required this.user, required this.viewerLevel});

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
      await ref.read(userManagementDataSourceProvider).deleteUser(user.id);
      ref.invalidate(managedUsersProvider);
      messenger.showSnackBar(
        SnackBar(content: Text('${user.fullName} deleted')),
      );
    } catch (error) {
      messenger.showSnackBar(
        SnackBar(content: Text(readableError(error))),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    final canModify =
        UserManagementScreen.canModify(viewerLevel, user.accessLevel);

    return Semantics(
      button: true,
      label: '${user.fullName}, L${user.accessLevel} ${user.levelName}, '
          '${user.isActive ? 'active' : 'inactive'}',
      child: Material(
        color: cardSurface(context),
        borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
        child: InkWell(
          borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) =>
                  UserDetailScreen(userId: user.id, canEdit: canModify),
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
                    color: scheme.primary.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: Text(user.initials,
                      style: Theme.of(context)
                          .textTheme
                          .titleSmall
                          ?.copyWith(color: scheme.primary)),
                ),
                const SizedBox(width: NebulaSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(user.fullName,
                                style: Theme.of(context).textTheme.titleSmall,
                                overflow: TextOverflow.ellipsis),
                          ),
                          if (!user.isActive)
                            Padding(
                              padding:
                                  const EdgeInsets.only(left: NebulaSpacing.xs),
                              child: Icon(LucideIcons.circleOff,
                                  size: 14, color: scheme.error),
                            ),
                        ],
                      ),
                      Text(user.email,
                          style: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.copyWith(color: textSecondary(context)),
                          overflow: TextOverflow.ellipsis),
                      const SizedBox(height: 4),
                      Text(
                        'L${user.accessLevel} · ${user.levelName}'
                        '${user.ventureName != null ? ' · ${user.ventureName}' : ''}',
                        style: Theme.of(context)
                            .textTheme
                            .labelSmall
                            ?.copyWith(color: scheme.primary),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                if (canModify)
                  IconButton(
                    tooltip: 'Delete user',
                    icon: Icon(LucideIcons.trash2, size: 18, color: scheme.error),
                    onPressed: () => _confirmDelete(context, ref),
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
