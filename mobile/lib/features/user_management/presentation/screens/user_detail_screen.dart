import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/theme/nebula_spacing.dart';
import '../../data/user_management_model.dart';
import '../../data/user_management_provider.dart';
import '../widgets/state_views.dart';
import 'user_editor_screen.dart';

/// Read view of one user plus their recent task activity, from
/// `GET /api/team-members/:id`.
class UserDetailScreen extends ConsumerWidget {
  final int userId;

  /// Whether the signed-in admin outranks this user; drives the edit action.
  final bool canEdit;

  const UserDetailScreen({
    super.key,
    required this.userId,
    required this.canEdit,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(managedUserDetailProvider(userId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('User'),
        actions: [
          if (canEdit)
            detailAsync.maybeWhen(
              data: (detail) => IconButton(
                tooltip: 'Edit user',
                icon: const Icon(LucideIcons.pencil, size: 20),
                onPressed: () => Navigator.of(context).push<bool>(
                  MaterialPageRoute(
                    builder: (_) => UserEditorScreen(existing: detail.user),
                  ),
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
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(
            child: detailAsync.when(
              loading: () => const ListSkeleton(itemCount: 4, itemHeight: 96),
              error: (error, _) => RefreshableMessage(
                child: ErrorStateView(
                  title: 'Could not load this user',
                  error: error,
                  onRetry: () =>
                      ref.invalidate(managedUserDetailProvider(userId)),
                ),
              ),
              data: (detail) => RefreshIndicator(
                onRefresh: () async =>
                    ref.refresh(managedUserDetailProvider(userId).future),
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(NebulaSpacing.md,
                      NebulaSpacing.md, NebulaSpacing.md, NebulaSpacing.xl),
                  children: [
                    _ProfileCard(user: detail.user),
                    const SizedBox(height: NebulaSpacing.md),
                    _FactsCard(user: detail.user),
                    const SizedBox(height: NebulaSpacing.md),
                    _ActivityCard(activity: detail.activity),
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

class _ProfileCard extends StatelessWidget {
  final ManagedUser user;

  const _ProfileCard({required this.user});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
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
            width: 56,
            height: 56,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: scheme.primary.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: Text(
              user.initials,
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(color: scheme.primary),
            ),
          ),
          const SizedBox(width: NebulaSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(user.fullName,
                    style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 2),
                Text(
                  user.email,
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: textSecondary(context)),
                ),
                const SizedBox(height: NebulaSpacing.sm),
                Wrap(
                  spacing: NebulaSpacing.sm,
                  runSpacing: NebulaSpacing.xs,
                  children: [
                    _Pill(
                      label: 'L${user.accessLevel} · ${user.levelName}',
                      color: scheme.primary,
                    ),
                    _Pill(
                      label: user.isActive ? 'Active' : 'Inactive',
                      color: user.isActive ? scheme.tertiary : scheme.error,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  final String label;
  final Color color;

  const _Pill({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
          horizontal: NebulaSpacing.sm, vertical: NebulaSpacing.xs),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(NebulaSpacing.radiusFull),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Text(
        label,
        style: Theme.of(context)
            .textTheme
            .labelSmall
            ?.copyWith(color: color, fontWeight: FontWeight.w600),
      ),
    );
  }
}

class _FactsCard extends StatelessWidget {
  final ManagedUser user;

  const _FactsCard({required this.user});

  String? _formatDate(String? raw) {
    if (raw == null) return null;
    final parsed = DateTime.tryParse(raw);
    if (parsed == null) return raw;
    return DateFormat('d MMM yyyy, HH:mm').format(parsed.toLocal());
  }

  @override
  Widget build(BuildContext context) {
    final rows = <(String, String)>[
      if (user.employeeId != null) ('Employee ID', user.employeeId!),
      if (user.ventureName != null) ('Venture', user.ventureName!),
      if (user.department != null) ('Department', user.department!),
      if (user.designation != null) ('Designation', user.designation!),
      if (user.phone != null) ('Phone', user.phone!),
      if (user.levelDescription != null) ('Level', user.levelDescription!),
      if (_formatDate(user.lastLogin) != null)
        ('Last login', _formatDate(user.lastLogin)!),
      if (_formatDate(user.createdAt) != null)
        ('Joined', _formatDate(user.createdAt)!),
    ];

    if (rows.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(NebulaSpacing.md),
      decoration: BoxDecoration(
        color: cardSurface(context),
        borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
        border: Border.all(color: hairline(context)),
      ),
      child: Column(
        children: [
          for (var i = 0; i < rows.length; i++) ...[
            if (i > 0) Divider(height: NebulaSpacing.md, color: hairline(context)),
            Semantics(
              label: '${rows[i].$1}: ${rows[i].$2}',
              child: ExcludeSemantics(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: 112,
                      child: Text(
                        rows[i].$1,
                        style: Theme.of(context)
                            .textTheme
                            .labelSmall
                            ?.copyWith(color: textSecondary(context)),
                      ),
                    ),
                    Expanded(
                      child: Text(rows[i].$2,
                          style: Theme.of(context).textTheme.bodySmall),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _ActivityCard extends StatelessWidget {
  final List<UserActivityEntry> activity;

  const _ActivityCard({required this.activity});

  @override
  Widget build(BuildContext context) {
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
          Text('Recent tasks', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: NebulaSpacing.sm),
          if (activity.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: NebulaSpacing.md),
              child: Text(
                'No tasks assigned to or created by this user yet.',
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: textSecondary(context)),
              ),
            )
          else
            for (var i = 0; i < activity.length; i++) ...[
              if (i > 0) Divider(height: 1, color: hairline(context)),
              Padding(
                padding:
                    const EdgeInsets.symmetric(vertical: NebulaSpacing.sm + 2),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(activity[i].title,
                          style: Theme.of(context).textTheme.bodySmall,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis),
                    ),
                    if (activity[i].status != null) ...[
                      const SizedBox(width: NebulaSpacing.sm),
                      Text(
                        activity[i].status!,
                        style: Theme.of(context)
                            .textTheme
                            .labelSmall
                            ?.copyWith(color: textSecondary(context)),
                      ),
                    ],
                  ],
                ),
              ),
            ],
        ],
      ),
    );
  }
}
