import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
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
import '../../data/user_management_model.dart';
import '../../data/user_management_provider.dart';
import 'user_editor_screen.dart';

/// Read view of one user plus their recent task activity, from
/// `GET /api/team-members/:id`.
class UserDetailScreen extends ConsumerWidget {
  const UserDetailScreen({
    super.key,
    required this.userId,
    required this.canEdit,
  });

  final int userId;

  /// Whether the signed-in admin outranks this user. The route refuses edits
  /// to a peer or a senior, so the action is hidden rather than offered.
  final bool canEdit;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(managedUserDetailProvider(userId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('User'),
        actions: [
          if (canEdit)
            detailAsync.maybeWhen(
              data: (detail) => PermissionGate(
                permission: Permission.updateUser,
                child: IconButton(
                  tooltip: 'Edit user',
                  icon: const Icon(LucideIcons.pencil, size: 20),
                  onPressed: () async {
                    final saved = await Navigator.of(context).push<bool>(
                      MaterialPageRoute(
                        builder: (_) => UserEditorScreen(existing: detail.user),
                      ),
                    );
                    if (saved == true) {
                      ref.invalidate(managedUserDetailProvider(userId));
                    }
                  },
                ),
              ),
              orElse: () => const SizedBox.shrink(),
            ),
          IconButton(
            tooltip: 'Refresh user',
            icon: const Icon(LucideIcons.refreshCw, size: 20),
            onPressed: () => ref.invalidate(managedUserDetailProvider(userId)),
          ),
        ],
      ),
      body: PermissionScope(
        permission: Permission.viewUsers,
        what: 'user management',
        child: _UserDetailBody(userId: userId),
      ),
    );
  }
}

class _UserDetailBody extends ConsumerWidget {
  const _UserDetailBody({required this.userId});

  final int userId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(managedUserDetailProvider(userId));
    final online = ref.watch(networkInfoProvider).maybeWhen(
          data: (value) => value,
          orElse: () => true,
        );

    return Column(
      children: [
        if (!online) const OfflineBanner(),
        Expanded(
          child: detailAsync.when(
            loading: () => const Padding(
              padding: EdgeInsets.all(NebulaSpacing.md),
              child: ListSkeleton(count: 4),
            ),
            error: (error, _) => RefreshIndicator(
              onRefresh: () async =>
                  ref.refresh(managedUserDetailProvider(userId).future),
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: ErrorStateView(
                      message: readableError(error),
                      onRetry: () =>
                          ref.invalidate(managedUserDetailProvider(userId)),
                    ),
                  ),
                ],
              ),
            ),
            data: (detail) => RefreshIndicator(
              onRefresh: () async =>
                  ref.refresh(managedUserDetailProvider(userId).future),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(
                  NebulaSpacing.md,
                  NebulaSpacing.md,
                  NebulaSpacing.md,
                  NebulaSpacing.xl,
                ),
                children: [
                  StaggerIn(index: 0, child: _ProfileCard(user: detail.user)),
                  const SizedBox(height: NebulaSpacing.md),
                  StaggerIn(index: 1, child: _FactsCard(user: detail.user)),
                  const SizedBox(height: NebulaSpacing.md),
                  StaggerIn(
                    index: 2,
                    child: _ActivityCard(activity: detail.activity),
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

class _ProfileCard extends StatelessWidget {
  const _ProfileCard({required this.user});

  final ManagedUser user;

  @override
  Widget build(BuildContext context) {
    final ventureColor = user.ventureId == null
        ? null
        : NebulaColors.forVentureId(user.ventureId);

    return DCard(
      accent: ventureColor,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              DAvatar(user.fullName, size: 56, imageUrl: user.avatarUrl),
              const SizedBox(width: NebulaSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(user.fullName, style: context.text.titleMedium),
                    const SizedBox(height: 3),
                    Text(
                      user.email,
                      style: context.text.bodySmall,
                    ),
                    if (user.designation != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        user.designation!,
                        style: context.text.bodySmall
                            ?.copyWith(color: context.dl.textTertiary),
                      ),
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
              DTag('L${user.accessLevel} · ${user.levelName}',
                  tone: DTone.accent),
              DTag(
                user.isActive ? 'Active' : 'Deactivated',
                tone: user.isActive ? DTone.ok : DTone.critical,
              ),
              if (user.ventureName != null && ventureColor != null)
                DTag.venture(user.ventureName!, color: ventureColor),
            ],
          ),
        ],
      ),
    );
  }
}

class _FactsCard extends StatelessWidget {
  const _FactsCard({required this.user});

  final ManagedUser user;

  static String? _formatDate(String? raw) {
    if (raw == null) return null;
    final parsed = DateTime.tryParse(raw);
    if (parsed == null) return raw;
    return DateFormat('d MMM yyyy · HH:mm').format(parsed.toLocal());
  }

  @override
  Widget build(BuildContext context) {
    final lastLogin = _formatDate(user.lastLogin);
    final joined = _formatDate(user.createdAt);

    // Identifiers and instants are mono; prose stays proportional.
    final rows = <(String, Widget)>[
      ('User ID', Mono('#${user.id}')),
      if (user.employeeId != null) ('Employee ID', Mono(user.employeeId!)),
      if (user.ventureName != null)
        ('Venture', _Prose(user.ventureName!)),
      if (user.department != null) ('Department', _Prose(user.department!)),
      if (user.designation != null) ('Designation', _Prose(user.designation!)),
      if (user.phone != null) ('Phone', Mono(user.phone!)),
      (
        'Access level',
        _Prose('L${user.accessLevel} · ${AccessLevel.nameOf(user.accessLevel)}'),
      ),
      if (user.levelDescription != null)
        ('What that means', _Prose(user.levelDescription!)),
      if (lastLogin != null) ('Last login', Mono(lastLogin, size: 12)),
      if (joined != null) ('Joined', Mono(joined, size: 12)),
    ];

    return DCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionHeader('Details'),
          for (var i = 0; i < rows.length; i++) ...[
            if (i > 0)
              Divider(height: NebulaSpacing.md, color: context.dl.border),
            Semantics(
              label: rows[i].$1,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 116,
                    child: Text(
                      rows[i].$1,
                      style: context.text.bodySmall
                          ?.copyWith(color: context.dl.textTertiary),
                    ),
                  ),
                  Expanded(child: rows[i].$2),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Non-numeric fact value — kept proportional so figures stand out by contrast.
class _Prose extends StatelessWidget {
  const _Prose(this.text);

  final String text;

  @override
  Widget build(BuildContext context) =>
      Text(text, style: context.text.bodySmall);
}

class _ActivityCard extends StatelessWidget {
  const _ActivityCard({required this.activity});

  final List<UserActivityEntry> activity;

  static const _closed = {'completed', 'done', 'closed', 'archived'};

  static DTone _statusTone(String? status) {
    final value = status?.toLowerCase() ?? '';
    if (_closed.contains(value)) return DTone.ok;
    if (value == 'blocked' || value == 'cancelled') return DTone.critical;
    if (value == 'in_progress' || value == 'in progress') return DTone.accent;
    return DTone.neutral;
  }

  static String? _formatDate(String? raw) {
    if (raw == null) return null;
    final parsed = DateTime.tryParse(raw);
    if (parsed == null) return null;
    return DateFormat('d MMM yyyy').format(parsed.toLocal());
  }

  @override
  Widget build(BuildContext context) {
    return DCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(
            'Recent tasks',
            trailing: Mono('${activity.length}', size: 11),
          ),
          if (activity.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: NebulaSpacing.sm),
              child: Text(
                'No tasks assigned to or created by this user yet.',
                style: context.text.bodySmall
                    ?.copyWith(color: context.dl.textTertiary),
              ),
            )
          else
            for (var i = 0; i < activity.length; i++) ...[
              if (i > 0) const SizedBox(height: NebulaSpacing.sm),
              Builder(
                builder: (context) {
                  final entry = activity[i];
                  final closed =
                      _closed.contains(entry.status?.toLowerCase() ?? '');
                  final updated = _formatDate(entry.updatedAt);
                  return EntityRow(
                    title: entry.title,
                    timeState: closed ? TimeState.past : TimeState.next,
                    strikeThrough: closed,
                    meta: [
                      Mono('#${entry.id}',
                          size: 10, color: context.dl.textTertiary),
                      if (updated != null)
                        Mono(updated,
                            size: 10, color: context.dl.textTertiary),
                      if (entry.priority != null) Text(entry.priority!),
                    ],
                    trailing: entry.status == null
                        ? null
                        : DTag(
                            entry.status!.replaceAll('_', ' '),
                            tone: _statusTone(entry.status),
                          ),
                  );
                },
              ),
            ],
        ],
      ),
    );
  }
}
