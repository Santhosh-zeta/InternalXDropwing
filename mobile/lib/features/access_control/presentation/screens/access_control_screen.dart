import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/constants/access_levels.dart';
import '../../../../core/theme/nebula_spacing.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/access_control_data_source.dart';
import '../../data/access_control_model.dart';
import '../../data/access_control_provider.dart';
import '../widgets/state_views.dart';

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

/// The per-level permission matrix and 2FA toggle.
///
/// `GET/PUT /api/access-control` and `GET/PUT /api/access-control/2fa-config`
/// are both gated Level 1 (Super Admin) only on the backend — the strictest
/// gate in the app, matching that exactly.
class AccessControlScreen extends ConsumerStatefulWidget {
  const AccessControlScreen({super.key});

  static bool canView(int accessLevel) => accessLevel == AccessLevels.superAdmin;

  @override
  ConsumerState<AccessControlScreen> createState() =>
      _AccessControlScreenState();
}

class _AccessControlScreenState extends ConsumerState<AccessControlScreen> {
  int _selectedLevel = 2;
  Map<String, bool>? _draft;
  bool _saving = false;

  void _selectLevel(int level, List<AccessLevelPermissions> levels) {
    final match = levels.where((l) => l.levelNumber == level).toList();
    setState(() {
      _selectedLevel = level;
      _draft = match.isEmpty ? {} : Map.of(match.first.permissions);
    });
  }

  Future<void> _save() async {
    if (_draft == null || _selectedLevel == AccessLevels.superAdmin) return;
    setState(() => _saving = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref
          .read(accessControlDataSourceProvider)
          .updatePermissions(_selectedLevel, _draft!);
      ref.invalidate(accessLevelsProvider);
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(content: Text('Permissions updated for level $_selectedLevel')),
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
    final accessLevel = ref.watch(authProvider).maybeWhen<int?>(
          authenticated: (user) => user.accessLevel,
          orElse: () => null,
        );

    if (accessLevel == null || !AccessControlScreen.canView(accessLevel)) {
      return Scaffold(
        appBar: AppBar(title: const Text('Access Control')),
        body: const RestrictedStateView(
          moduleName: 'Access Control',
          requirement: 'Level 1 (Super Admin)',
        ),
      );
    }

    final levelsAsync = ref.watch(accessLevelsProvider);
    final twoFAAsync = ref.watch(twoFactorConfigProvider);

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
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(
            child: levelsAsync.when(
              loading: () => const ListSkeleton(itemCount: 5, itemHeight: 72),
              error: (error, _) => RefreshableMessage(
                child: ErrorStateView(
                  title: 'Could not load access levels',
                  error: error,
                  onRetry: () => ref.invalidate(accessLevelsProvider),
                ),
              ),
              data: (levels) {
                if (levels.isEmpty) {
                  return const RefreshableMessage(
                    child: EmptyStateView(
                      icon: LucideIcons.shieldCheck,
                      title: 'No access levels found',
                      message: 'The access_levels table appears to be empty.',
                    ),
                  );
                }

                if (_draft == null) {
                  final initial = levels
                      .where((l) => l.levelNumber == _selectedLevel)
                      .toList();
                  _draft = Map.of(
                      initial.isEmpty ? levels.first.permissions : initial.first.permissions);
                  if (initial.isEmpty) _selectedLevel = levels.first.levelNumber;
                }

                final selected = levels.firstWhere(
                  (l) => l.levelNumber == _selectedLevel,
                  orElse: () => levels.first,
                );
                final isImmutable = selected.levelNumber == AccessLevels.superAdmin;
                final dirty = _draft != null &&
                    _draft.toString() != selected.permissions.toString();
                final enabledCount =
                    (_draft ?? const {}).values.where((v) => v).length;

                return ListView(
                  padding: const EdgeInsets.fromLTRB(NebulaSpacing.md,
                      NebulaSpacing.md, NebulaSpacing.md, NebulaSpacing.xxl),
                  children: [
                    _TwoFactorCard(async: twoFAAsync, ref: ref),
                    const SizedBox(height: NebulaSpacing.md),
                    SizedBox(
                      height: 44,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: levels.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(width: NebulaSpacing.sm),
                        itemBuilder: (context, index) {
                          final level = levels[index];
                          final isSelected = level.levelNumber == _selectedLevel;
                          return ChoiceChip(
                            label: Text('L${level.levelNumber} · ${level.levelName}'),
                            selected: isSelected,
                            onSelected: (_) => _selectLevel(level.levelNumber, levels),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: NebulaSpacing.md),
                    if (isImmutable)
                      Container(
                        padding: const EdgeInsets.all(NebulaSpacing.md),
                        decoration: BoxDecoration(
                          color: mutedSurface(context),
                          borderRadius:
                              BorderRadius.circular(NebulaSpacing.radiusMd),
                        ),
                        child: Row(
                          children: [
                            Icon(LucideIcons.shieldCheck,
                                size: 18, color: textSecondary(context)),
                            const SizedBox(width: NebulaSpacing.sm),
                            Expanded(
                              child: Text(
                                'Super Admin always has every permission and '
                                'cannot be modified.',
                                style: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(color: textSecondary(context)),
                              ),
                            ),
                          ],
                        ),
                      )
                    else
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              '$enabledCount of ${_permissionFeatures.length} permissions enabled',
                              style: Theme.of(context)
                                  .textTheme
                                  .labelSmall
                                  ?.copyWith(color: textSecondary(context)),
                            ),
                          ),
                          if (dirty)
                            TextButton(
                              onPressed: () => setState(
                                  () => _draft = Map.of(selected.permissions)),
                              child: const Text('Reset'),
                            ),
                        ],
                      ),
                    const SizedBox(height: NebulaSpacing.sm),
                    for (final category in _categories)
                      _CategorySection(
                        category: category,
                        draft: _draft!,
                        readOnly: isImmutable,
                        onToggle: (key, value) =>
                            setState(() => _draft = {..._draft!, key: value}),
                      ),
                    if (!isImmutable) ...[
                      const SizedBox(height: NebulaSpacing.md),
                      SizedBox(
                        height: 48,
                        child: ElevatedButton.icon(
                          onPressed: (dirty && !_saving) ? _save : null,
                          icon: _saving
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child:
                                      CircularProgressIndicator(strokeWidth: 2))
                              : const Icon(LucideIcons.check, size: 18),
                          label: const Text('Save permissions'),
                        ),
                      ),
                    ],
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  static final List<String> _categories =
      {for (final f in _permissionFeatures) f.$3}.toList();
}

class _CategorySection extends StatelessWidget {
  final String category;
  final Map<String, bool> draft;
  final bool readOnly;
  final void Function(String key, bool value) onToggle;

  const _CategorySection({
    required this.category,
    required this.draft,
    required this.readOnly,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    final features = _permissionFeatures.where((f) => f.$3 == category).toList();
    return Padding(
      padding: const EdgeInsets.only(bottom: NebulaSpacing.md),
      child: Container(
        decoration: BoxDecoration(
          color: cardSurface(context),
          borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
          border: Border.all(color: hairline(context)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(NebulaSpacing.md,
                  NebulaSpacing.md, NebulaSpacing.md, NebulaSpacing.xs),
              child: Text(category, style: Theme.of(context).textTheme.titleSmall),
            ),
            for (var i = 0; i < features.length; i++) ...[
              if (i > 0) Divider(height: 1, color: hairline(context), indent: NebulaSpacing.md, endIndent: NebulaSpacing.md),
              SwitchListTile.adaptive(
                title: Text(features[i].$2, style: Theme.of(context).textTheme.bodyMedium),
                value: draft[features[i].$1] ?? false,
                onChanged: readOnly
                    ? null
                    : (value) => onToggle(features[i].$1, value),
                contentPadding: const EdgeInsets.symmetric(horizontal: NebulaSpacing.md),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _TwoFactorCard extends StatelessWidget {
  final AsyncValue<bool> async;
  final WidgetRef ref;

  const _TwoFactorCard({required this.async, required this.ref});

  Future<void> _toggle(BuildContext context, bool enabled) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref.read(accessControlDataSourceProvider).setTwoFactorEnabled(enabled);
      ref.invalidate(twoFactorConfigProvider);
    } catch (error) {
      messenger.showSnackBar(SnackBar(content: Text(readableError(error))));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(NebulaSpacing.md),
      decoration: BoxDecoration(
        color: cardSurface(context),
        borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
        border: Border.all(color: hairline(context)),
      ),
      child: Row(
        children: [
          Icon(LucideIcons.keyRound, size: 20, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: NebulaSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Two-factor authentication',
                    style: Theme.of(context).textTheme.titleSmall),
                Text(
                  'Require a one-time code for every sign-in across the platform.',
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: textSecondary(context)),
                ),
              ],
            ),
          ),
          async.when(
            loading: () => const SizedBox(
                width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
            error: (_, __) => IconButton(
              tooltip: 'Retry',
              icon: const Icon(LucideIcons.refreshCw, size: 18),
              onPressed: () => ref.invalidate(twoFactorConfigProvider),
            ),
            data: (enabled) => Switch.adaptive(
              value: enabled,
              onChanged: (value) => _toggle(context, value),
            ),
          ),
        ],
      ),
    );
  }
}
