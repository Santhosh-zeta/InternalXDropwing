import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/network/network_info_provider.dart';
import '../../../../core/constants/access_levels.dart';
import '../../../../core/rbac/permissions.dart';
import '../../../../core/rbac/rbac_widgets.dart';
import '../../../../core/theme/nebula_spacing.dart';
import '../../../../core/theme/nebula_typography.dart';
import '../../../../core/theme/theme_context.dart';
import '../../../../core/widgets/data_display.dart';
import '../../../../core/widgets/motion.dart';
import '../../../../core/widgets/primitives.dart';
import '../../../../core/widgets/state_views.dart';
import '../../data/access_control_data_source.dart';
import '../../data/access_control_model.dart';
import '../../data/access_control_provider.dart';

/// The same permission feature list and categories as the web dashboard's
/// `AccessControlView.tsx`, so the mobile matrix edits the exact same keys.
const List<(String key, String label, String category)> _permissionFeatures = [
  ('view_overview', 'View Overview', 'Core'),
  ('view_tasks', 'View Tasks', 'Core'),
  ('create_tasks', 'Create Tasks', 'Core'),
  ('edit_tasks', 'Edit Tasks', 'Core'),
  ('delete_tasks', 'Delete Tasks', 'Core'),
  ('view_projects', 'View Projects', 'Projects'),
  ('create_projects', 'Create Projects', 'Projects'),
  ('edit_projects', 'Edit Projects', 'Projects'),
  ('delete_projects', 'Delete Projects', 'Projects'),
  ('view_documents', 'View Documents', 'Documents'),
  ('upload_documents', 'Upload Documents', 'Documents'),
  ('delete_documents', 'Delete Documents', 'Documents'),
  ('view_team_chat', 'Team Chat', 'Communication'),
  ('view_invoices', 'View Invoices', 'Finance'),
  ('create_invoices', 'Create Invoices', 'Finance'),
  ('view_timesheets', 'View Timesheets', 'HR'),
  ('approve_timesheets', 'Approve Timesheets', 'HR'),
  ('view_users', 'View Users', 'Admin'),
  ('manage_users', 'Manage Users', 'Admin'),
  ('view_audit_logs', 'View Audit Logs', 'Admin'),
  ('view_analytics', 'View Analytics', 'Admin'),
  ('view_reports', 'View Reports', 'Admin'),
  ('manage_access', 'Manage Access Control', 'System'),
  ('view_database', 'Database Access', 'System'),
];

final List<String> _categories =
    {for (final f in _permissionFeatures) f.$3}.toList();

/// The per-level permission matrix and the platform-wide 2FA switch.
///
/// `GET/PUT /api/access-control` and `GET/PUT /api/access-control/2fa-config`
/// are the strictest routes in the app — Super Admin only — which is exactly
/// what [Permission.viewAccessControl] and [Permission.manageAccessControl]
/// encode. Remember the direction of the ladder: **level 1 holds the most
/// access, level 9 the least**, so "at or above level 5" means 1 through 5.
class AccessControlScreen extends ConsumerWidget {
  const AccessControlScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Access Control'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            icon: const Icon(LucideIcons.refreshCw, size: 20),
            onPressed: () {
              ref.invalidate(accessLevelsProvider);
              ref.invalidate(twoFactorConfigProvider);
            },
          ),
        ],
      ),
      body: const PermissionScope(
        permission: Permission.viewAccessControl,
        what: 'access control',
        child: _AccessControlBody(),
      ),
    );
  }
}

class _AccessControlBody extends ConsumerStatefulWidget {
  const _AccessControlBody();

  @override
  ConsumerState<_AccessControlBody> createState() => _AccessControlBodyState();
}

class _AccessControlBodyState extends ConsumerState<_AccessControlBody> {
  /// Starts on the most privileged *editable* level: level 1 is fixed.
  int _selectedLevel = AccessLevels.managingDirector;

  /// Null means "unchanged from what the server returned".
  Map<String, bool>? _draft;
  bool _saving = false;

  Future<void> _save() async {
    final draft = _draft;
    if (draft == null || _selectedLevel == AccessLevels.superAdmin) return;

    setState(() => _saving = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref
          .read(accessControlDataSourceProvider)
          .updatePermissions(_selectedLevel, draft);
      ref.invalidate(accessLevelsProvider);
      if (!mounted) return;
      setState(() => _draft = null);
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            'Permissions updated for level $_selectedLevel · '
            '${AccessLevels.nameOf(_selectedLevel)}',
          ),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      messenger.showSnackBar(SnackBar(content: Text(readableError(error))));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final levelsAsync = ref.watch(accessLevelsProvider);
    final online = ref.watch(networkInfoProvider).maybeWhen(
          data: (value) => value,
          orElse: () => true,
        );

    return Column(
      children: [
        if (!online) const OfflineBanner(),
        Expanded(
          child: levelsAsync.when(
            loading: () => const Padding(
              padding: EdgeInsets.all(NebulaSpacing.md),
              child: ListSkeleton(),
            ),
            error: (error, _) => ErrorStateView(
              message: readableError(error),
              onRetry: () => ref.invalidate(accessLevelsProvider),
            ),
            data: (levels) {
              if (levels.isEmpty) {
                return const EmptyStateView(
                  icon: LucideIcons.shieldCheck,
                  title: 'No access levels found',
                  message: 'The access_levels table appears to be empty.',
                );
              }
              return _Matrix(
                levels: levels,
                selectedLevel: _selectedLevel,
                draft: _draft,
                saving: _saving,
                onSelectLevel: (level) => setState(() {
                  _selectedLevel = level;
                  _draft = null;
                }),
                onToggle: (current, key, value) =>
                    setState(() => _draft = {...current, key: value}),
                onReset: () => setState(() => _draft = null),
                onSave: _save,
              );
            },
          ),
        ),
      ],
    );
  }
}

class _Matrix extends ConsumerWidget {
  const _Matrix({
    required this.levels,
    required this.selectedLevel,
    required this.draft,
    required this.saving,
    required this.onSelectLevel,
    required this.onToggle,
    required this.onReset,
    required this.onSave,
  });

  final List<AccessLevelPermissions> levels;
  final int selectedLevel;
  final Map<String, bool>? draft;
  final bool saving;
  final ValueChanged<int> onSelectLevel;
  final void Function(Map<String, bool> current, String key, bool value)
      onToggle;
  final VoidCallback onReset;
  final VoidCallback onSave;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Ascending, so the ladder always reads 1 (most) → 9 (least).
    final ordered = [...levels]
      ..sort((a, b) => a.levelNumber.compareTo(b.levelNumber));
    final selected = ordered.firstWhere(
      (l) => l.levelNumber == selectedLevel,
      orElse: () => ordered.first,
    );
    final current = draft ?? selected.permissions;
    final dirty = draft != null && !mapEquals(draft, selected.permissions);
    final isFixed = selected.levelNumber == AccessLevels.superAdmin;
    final canManage = ref.watch(canProvider(Permission.manageAccessControl));
    final readOnly = isFixed || !canManage;

    final grantedCount =
        _permissionFeatures.where((f) => current[f.$1] == true).length;

    return RefreshIndicator(
      onRefresh: () async => ref.refresh(accessLevelsProvider.future),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(
          NebulaSpacing.md,
          NebulaSpacing.md,
          NebulaSpacing.md,
          NebulaSpacing.xxl,
        ),
        children: [
          const StaggerIn(index: 0, child: _TwoFactorCard()),
          const SizedBox(height: NebulaSpacing.md),
          StaggerIn(
            index: 1,
            child: _LevelLadder(
              levels: ordered,
              selectedLevel: selected.levelNumber,
              onSelect: onSelectLevel,
            ),
          ),
          const SizedBox(height: NebulaSpacing.md),
          StaggerIn(index: 2, child: _SelectedLevelCard(level: selected)),
          const SizedBox(height: NebulaSpacing.md),
          StaggerIn(
            index: 3,
            child: MetricRow([
              StatTile(value: grantedCount, label: 'Granted', tone: DTone.ok),
              StatTile(
                value: _permissionFeatures.length - grantedCount,
                label: 'Withheld',
              ),
              StatTile(value: ordered.length, label: 'Levels'),
            ]),
          ),
          const SizedBox(height: NebulaSpacing.md),
          if (isFixed)
            const _FixedLevelNotice()
          else if (!canManage)
            const _ReadOnlyNotice()
          else
            Row(
              children: [
                Expanded(
                  child: Text(
                    dirty
                        ? 'Unsaved changes'
                        : 'Matching what the server has now',
                    style: context.text.bodySmall
                        ?.copyWith(color: context.dl.textTertiary),
                  ),
                ),
                if (dirty)
                  TextButton(
                    onPressed: onReset,
                    child: const Text('Reset'),
                  ),
              ],
            ),
          const SizedBox(height: NebulaSpacing.sm),
          for (final category in _categories)
            _CategorySection(
              category: category,
              current: current,
              readOnly: readOnly,
              onToggle: (key, value) => onToggle(current, key, value),
            ),
          if (!isFixed)
            PermissionGate(
              permission: Permission.manageAccessControl,
              child: Padding(
                padding: const EdgeInsets.only(top: NebulaSpacing.sm),
                child: SizedBox(
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: (dirty && !saving) ? onSave : null,
                    icon: saving
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(LucideIcons.check, size: 18),
                    label: Text(
                      'Save level ${selected.levelNumber} permissions',
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// The nine levels as a ladder, always top-to-bottom 1 → 9.
///
/// The ordering is the whole point of this screen: a vertical list with the
/// most-privileged level pinned to the top, labelled at both ends, is much
/// harder to misread than a horizontal chip strip.
class _LevelLadder extends StatelessWidget {
  const _LevelLadder({
    required this.levels,
    required this.selectedLevel,
    required this.onSelect,
  });

  final List<AccessLevelPermissions> levels;
  final int selectedLevel;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;

    return DCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionHeader('Access levels'),
          Text(
            'Level 1 holds the most access and level 9 the least. A feature '
            'that requires level 5 is therefore open to levels 1 through 5.',
            style: context.text.bodySmall,
          ),
          const SizedBox(height: NebulaSpacing.md),
          const _EndLabel(
            text: 'Most access · level 1',
            icon: LucideIcons.arrowUp,
          ),
          const SizedBox(height: NebulaSpacing.sm),
          for (var i = 0; i < levels.length; i++) ...[
            if (i > 0) const SizedBox(height: 6),
            _LadderRow(
              level: levels[i],
              selected: levels[i].levelNumber == selectedLevel,
              onTap: () => onSelect(levels[i].levelNumber),
            ),
          ],
          const SizedBox(height: NebulaSpacing.sm),
          const _EndLabel(
            text: 'Least access · level ${AccessLevels.lowest}',
            icon: LucideIcons.arrowDown,
          ),
          const SizedBox(height: NebulaSpacing.xs),
          Text(
            'Tap a level to edit what it may do.',
            style: context.text.bodySmall?.copyWith(color: dl.textTertiary),
          ),
        ],
      ),
    );
  }
}

class _EndLabel extends StatelessWidget {
  const _EndLabel({required this.text, required this.icon});

  final String text;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final color = context.dl.textTertiary;
    return Row(
      children: [
        Icon(icon, size: 12, color: color),
        const SizedBox(width: 6),
        Text(
          text.toUpperCase(),
          style: NebulaTypography.monoLabel(color: color, fontSize: 9),
        ),
      ],
    );
  }
}

class _LadderRow extends StatelessWidget {
  const _LadderRow({
    required this.level,
    required this.selected,
    required this.onTap,
  });

  final AccessLevelPermissions level;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final accent = context.scheme.primary;
    final granted =
        _permissionFeatures.where((f) => level.permissions[f.$1] == true).length;
    final fixed = level.levelNumber == AccessLevels.superAdmin;

    return PressScale(
      onTap: onTap,
      child: Semantics(
        button: true,
        selected: selected,
        label: 'Level ${level.levelNumber}, '
            '${level.levelName.isEmpty ? AccessLevels.nameOf(level.levelNumber) : level.levelName}',
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
          decoration: BoxDecoration(
            color: selected
                ? accent.withValues(alpha: 0.10)
                : dl.surfaceRaised,
            borderRadius: BorderRadius.circular(NebulaSpacing.radiusSm),
            border: Border.all(
              color: selected
                  ? accent.withValues(alpha: 0.55)
                  : dl.border,
            ),
          ),
          child: Row(
            children: [
              SizedBox(
                width: 26,
                child: Mono(
                  'L${level.levelNumber}',
                  size: 13,
                  weight: FontWeight.w600,
                  color: selected ? accent : dl.textTertiary,
                ),
              ),
              const SizedBox(width: NebulaSpacing.sm),
              Expanded(
                child: Text(
                  level.levelName.isEmpty
                      ? AccessLevels.nameOf(level.levelNumber)
                      : level.levelName,
                  overflow: TextOverflow.ellipsis,
                  style: context.text.titleSmall?.copyWith(
                    color: selected ? context.scheme.onSurface : null,
                    fontWeight:
                        selected ? FontWeight.w600 : FontWeight.w500,
                  ),
                ),
              ),
              if (fixed) ...[
                const DTag('Fixed', tone: DTone.warn),
                const SizedBox(width: 8),
              ],
              Mono(
                '$granted/${_permissionFeatures.length}',
                size: 11,
                color: dl.textTertiary,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// What the currently selected level means, and who else clears its bar.
class _SelectedLevelCard extends StatelessWidget {
  const _SelectedLevelCard({required this.level});

  final AccessLevelPermissions level;

  @override
  Widget build(BuildContext context) {
    // Everyone from level 1 down to this level satisfies a requirement of it.
    final satisfies = AccessLevels.atOrAbove(level.levelNumber);

    return DCard(
      emphasised: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(
            'Editing',
            trailing: Mono('L${level.levelNumber}', size: 12),
          ),
          Text(
            level.levelName.isEmpty
                ? AccessLevels.nameOf(level.levelNumber)
                : level.levelName,
            style: context.text.titleMedium,
          ),
          if (level.description != null) ...[
            const SizedBox(height: 3),
            Text(level.description!, style: context.text.bodySmall),
          ],
          const SizedBox(height: NebulaSpacing.sm + 4),
          Text(
            satisfies.length == 1
                ? 'Only level ${level.levelNumber} clears this bar.'
                : 'A requirement of level ${level.levelNumber} is cleared by '
                    'these ${satisfies.length} levels:',
            style: context.text.bodySmall
                ?.copyWith(color: context.dl.textTertiary),
          ),
          const SizedBox(height: NebulaSpacing.sm),
          Wrap(
            spacing: NebulaSpacing.xs + 2,
            runSpacing: NebulaSpacing.xs + 2,
            children: [
              for (final l in satisfies)
                DTag(
                  'L$l · ${AccessLevels.nameOf(l)}',
                  tone: l == level.levelNumber ? DTone.accent : DTone.neutral,
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _FixedLevelNotice extends StatelessWidget {
  const _FixedLevelNotice();

  @override
  Widget build(BuildContext context) => const _Notice(
        icon: LucideIcons.shieldCheck,
        message: 'Super Admin always holds every permission, and the server '
            'refuses to change level 1. These switches are read-only.',
        tone: DTone.warn,
      );
}

class _ReadOnlyNotice extends StatelessWidget {
  const _ReadOnlyNotice();

  @override
  Widget build(BuildContext context) => const _Notice(
        icon: LucideIcons.lock,
        message: 'You can read this matrix but not change it. Editing needs '
            'the manage access control permission.',
        tone: DTone.neutral,
      );
}

class _Notice extends StatelessWidget {
  const _Notice({
    required this.icon,
    required this.message,
    required this.tone,
  });

  final IconData icon;
  final String message;
  final DTone tone;

  @override
  Widget build(BuildContext context) {
    final color = tone.color(context);
    return Container(
      padding: const EdgeInsets.all(NebulaSpacing.sm + 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(NebulaSpacing.radiusSm),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: NebulaSpacing.sm),
          Expanded(
            child: Text(
              message,
              style: context.text.bodySmall?.copyWith(color: color),
            ),
          ),
        ],
      ),
    );
  }
}

class _CategorySection extends StatelessWidget {
  const _CategorySection({
    required this.category,
    required this.current,
    required this.readOnly,
    required this.onToggle,
  });

  final String category;
  final Map<String, bool> current;
  final bool readOnly;
  final void Function(String key, bool value) onToggle;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final features =
        _permissionFeatures.where((f) => f.$3 == category).toList();
    final granted = features.where((f) => current[f.$1] == true).length;

    return Padding(
      padding: const EdgeInsets.only(bottom: NebulaSpacing.md),
      child: DCard(
        padding: EdgeInsets.zero,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(
                NebulaSpacing.md,
                NebulaSpacing.md,
                NebulaSpacing.md,
                0,
              ),
              child: SectionHeader(
                category,
                trailing: Mono(
                  '$granted/${features.length}',
                  size: 11,
                  color: dl.textTertiary,
                ),
              ),
            ),
            for (var i = 0; i < features.length; i++) ...[
              if (i > 0)
                Divider(
                  height: 1,
                  color: dl.border,
                  indent: NebulaSpacing.md,
                  endIndent: NebulaSpacing.md,
                ),
              SwitchListTile.adaptive(
                title: Text(features[i].$2, style: context.text.bodyMedium),
                subtitle: Mono(
                  features[i].$1,
                  size: 10,
                  color: dl.textTertiary,
                ),
                value: current[features[i].$1] ?? false,
                onChanged:
                    readOnly ? null : (value) => onToggle(features[i].$1, value),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: NebulaSpacing.md),
              ),
            ],
            const SizedBox(height: NebulaSpacing.xs),
          ],
        ),
      ),
    );
  }
}

class _TwoFactorCard extends ConsumerWidget {
  const _TwoFactorCard();

  Future<void> _toggle(BuildContext context, WidgetRef ref, bool enabled) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref
          .read(accessControlDataSourceProvider)
          .setTwoFactorEnabled(enabled);
      ref.invalidate(twoFactorConfigProvider);
    } catch (error) {
      messenger.showSnackBar(SnackBar(content: Text(readableError(error))));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(twoFactorConfigProvider);
    final canManage = ref.watch(canProvider(Permission.manageAccessControl));

    return DCard(
      child: Row(
        children: [
          Icon(LucideIcons.keyRound, size: 20, color: context.scheme.primary),
          const SizedBox(width: NebulaSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Two-factor authentication',
                  style: context.text.titleSmall,
                ),
                Text(
                  'Require a one-time code for every sign-in across the '
                  'platform.',
                  style: context.text.bodySmall
                      ?.copyWith(color: context.dl.textTertiary),
                ),
              ],
            ),
          ),
          async.when(
            loading: () => const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            error: (_, __) => IconButton(
              tooltip: 'Retry',
              icon: const Icon(LucideIcons.refreshCw, size: 18),
              onPressed: () => ref.invalidate(twoFactorConfigProvider),
            ),
            data: (enabled) => Switch.adaptive(
              value: enabled,
              onChanged: canManage
                  ? (value) => _toggle(context, ref, value)
                  : null,
            ),
          ),
        ],
      ),
    );
  }
}
