import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/network/network_info_provider.dart';
import '../../../../core/rbac/permissions.dart';
import '../../../../core/rbac/rbac_widgets.dart';
import '../../../../core/theme/nebula_colors.dart';
import '../../../../core/theme/nebula_spacing.dart';
import '../../../../core/theme/nebula_typography.dart';
import '../../../../core/theme/theme_context.dart';
import '../../../../core/widgets/primitives.dart';
import '../../../../core/widgets/state_views.dart';
import '../../data/role_management_data_source.dart';
import '../../data/role_management_model.dart';
import '../../data/role_management_provider.dart';

/// The same permission keys the web dashboard's Access Control screen edits
/// (`frontend/src/app/dashboard/AccessControlView.tsx`), reused here so a
/// custom role's permission set is expressed with the platform's real feature
/// list rather than an invented one.
const List<(String key, String label)> _permissionFeatures = [
  ('view_overview', 'View Overview'),
  ('view_tasks', 'View Tasks'),
  ('create_tasks', 'Create Tasks'),
  ('edit_tasks', 'Edit Tasks'),
  ('delete_tasks', 'Delete Tasks'),
  ('view_projects', 'View Projects'),
  ('create_projects', 'Create Projects'),
  ('edit_projects', 'Edit Projects'),
  ('delete_projects', 'Delete Projects'),
  ('view_documents', 'View Documents'),
  ('upload_documents', 'Upload Documents'),
  ('delete_documents', 'Delete Documents'),
  ('view_team_chat', 'Team Chat'),
  ('view_invoices', 'View Invoices'),
  ('create_invoices', 'Create Invoices'),
  ('view_timesheets', 'View Timesheets'),
  ('approve_timesheets', 'Approve Timesheets'),
  ('view_users', 'View Users'),
  ('manage_users', 'Manage Users'),
  ('view_audit_logs', 'View Audit Logs'),
  ('view_analytics', 'View Analytics'),
  ('view_reports', 'View Reports'),
];

const List<String> _iconOptions = [
  '🔷', '⭐', '🛡️', '🚀', '📊', '💼', '🔑', '🎯', '⚙️', '👥',
];

/// Create or edit a custom venture role.
/// `POST /api/role-management` (create) or `PUT /api/role-management/:id`.
class RoleEditorScreen extends ConsumerStatefulWidget {
  final VentureRole? existing;

  const RoleEditorScreen({super.key, this.existing});

  @override
  ConsumerState<RoleEditorScreen> createState() => _RoleEditorScreenState();
}

class _RoleEditorScreenState extends ConsumerState<RoleEditorScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _roleName =
      TextEditingController(text: widget.existing?.roleName ?? '');
  late final TextEditingController _roleKey =
      TextEditingController(text: widget.existing?.roleKey ?? '');
  late final TextEditingController _description =
      TextEditingController(text: widget.existing?.description ?? '');

  late int? _ventureId = widget.existing?.ventureId;
  late String _icon = widget.existing?.icon ?? _iconOptions.first;
  late final Map<String, bool> _permissions = {
    for (final feature in _permissionFeatures)
      feature.$1: widget.existing?.permissions[feature.$1] ?? false,
  };

  bool _saving = false;
  String? _submitError;

  bool get _isEdit => widget.existing != null;

  @override
  void dispose() {
    _roleName.dispose();
    _roleKey.dispose();
    _description.dispose();
    super.dispose();
  }

  String? _required(String? value, String field) =>
      (value == null || value.trim().isEmpty) ? '$field is required' : null;

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() {
      _saving = true;
      _submitError = null;
    });

    final dataSource = ref.read(roleManagementDataSourceProvider);
    try {
      if (_isEdit) {
        await dataSource.updateRole(
          widget.existing!.id,
          roleName: _roleName.text.trim(),
          roleKey: _roleKey.text.trim(),
          description: _description.text.trim(),
          icon: _icon,
          permissions: _permissions,
        );
      } else {
        await dataSource.createRole(
          roleName: _roleName.text.trim(),
          roleKey: _roleKey.text.trim(),
          description: _description.text.trim().isEmpty
              ? null
              : _description.text.trim(),
          icon: _icon,
          permissions: _permissions,
          ventureId: _ventureId,
        );
      }

      ref.invalidate(ventureRolesProvider);
      if (_isEdit) {
        ref.invalidate(ventureRoleDetailProvider(widget.existing!.id));
      }
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _submitError = readableError(error);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_isEdit ? 'Edit role' : 'New role')),
      body: PermissionScope(
        permission: Permission.manageRoles,
        what: 'creating and editing roles',
        child: _form(context),
      ),
    );
  }

  Widget _form(BuildContext context) {
    final dl = context.dl;
    final venturesAsync = ref.watch(roleVenturesProvider);
    final enabledCount = _permissions.values.where((v) => v).length;
    final online = ref.watch(networkInfoProvider).maybeWhen(
          data: (value) => value,
          orElse: () => true,
        );

    return Column(
      children: [
        if (!online) const OfflineBanner(),
        Expanded(
          child: Form(
            key: _formKey,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(
                NebulaSpacing.md,
                NebulaSpacing.md,
                NebulaSpacing.md,
                NebulaSpacing.xl,
              ),
              children: [
                DCard(
                  accent: NebulaColors.parseHex(widget.existing?.color),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SectionHeader('Identity'),
                      TextFormField(
                        controller: _roleName,
                        textCapitalization: TextCapitalization.words,
                        decoration: const InputDecoration(
                          labelText: 'Role name',
                          prefixIcon: Icon(LucideIcons.shieldCheck, size: 18),
                        ),
                        validator: (v) => _required(v, 'Role name'),
                      ),
                      const SizedBox(height: NebulaSpacing.md),
                      TextFormField(
                        controller: _roleKey,
                        decoration: const InputDecoration(
                          labelText: 'Role key',
                          helperText:
                              'Lowercase letters, numbers and underscores.',
                          prefixIcon: Icon(LucideIcons.hash, size: 18),
                        ),
                        style: NebulaTypography.mono(
                          fontSize: 14,
                          color: context.scheme.onSurface,
                        ),
                        validator: (v) => _required(v, 'Role key'),
                      ),
                      const SizedBox(height: NebulaSpacing.md),
                      TextFormField(
                        controller: _description,
                        maxLines: 3,
                        decoration: const InputDecoration(
                          labelText: 'Description',
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: NebulaSpacing.md),
                DCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SectionHeader('Appearance'),
                      Wrap(
                        spacing: NebulaSpacing.sm,
                        runSpacing: NebulaSpacing.xs,
                        children: [
                          for (final icon in _iconOptions)
                            ChoiceChip(
                              label: Text(icon,
                                  style: const TextStyle(fontSize: 18)),
                              selected: _icon == icon,
                              onSelected: (_) => setState(() => _icon = icon),
                            ),
                        ],
                      ),
                      if (!_isEdit) ...[
                        const SizedBox(height: NebulaSpacing.md),
                        venturesAsync.when(
                          loading: () => const ShimmerBox(height: 56),
                          error: (error, _) => Text(
                            'Could not load ventures: ${readableError(error)}',
                            style: context.text.bodySmall
                                ?.copyWith(color: dl.critical),
                          ),
                          data: (ventures) => DropdownButtonFormField<int?>(
                            initialValue: _ventureId,
                            isExpanded: true,
                            decoration: const InputDecoration(
                              labelText: 'Venture',
                              helperText:
                                  'Leave unset for a role usable across '
                                  'ventures.',
                            ),
                            items: [
                              const DropdownMenuItem<int?>(
                                value: null,
                                child: Text('All ventures'),
                              ),
                              for (final venture in ventures)
                                DropdownMenuItem<int?>(
                                  value: venture.id,
                                  child: Row(
                                    children: [
                                      VentureDot(
                                        NebulaColors.parseHex(
                                          venture.primaryColor,
                                          fallback: NebulaColors.forVentureId(
                                              venture.id),
                                        ),
                                      ),
                                      const SizedBox(width: NebulaSpacing.sm),
                                      Expanded(
                                        child: Text(
                                          venture.name,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                            ],
                            onChanged: (value) =>
                                setState(() => _ventureId = value),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: NebulaSpacing.md),
                DCard(
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
                          'Permissions',
                          trailing: Mono(
                            '$enabledCount/${_permissionFeatures.length}',
                            size: 11,
                            color: dl.textTertiary,
                          ),
                        ),
                      ),
                      for (var i = 0; i < _permissionFeatures.length; i++) ...[
                        if (i > 0)
                          Divider(
                            height: 1,
                            color: dl.border,
                            indent: NebulaSpacing.md,
                            endIndent: NebulaSpacing.md,
                          ),
                        SwitchListTile.adaptive(
                          title: Text(
                            _permissionFeatures[i].$2,
                            style: context.text.bodyMedium,
                          ),
                          subtitle: Mono(
                            _permissionFeatures[i].$1,
                            size: 10,
                            color: dl.textTertiary,
                          ),
                          value: _permissions[_permissionFeatures[i].$1] ??
                              false,
                          onChanged: (value) => setState(() =>
                              _permissions[_permissionFeatures[i].$1] = value),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: NebulaSpacing.md,
                          ),
                        ),
                      ],
                      const SizedBox(height: NebulaSpacing.xs),
                    ],
                  ),
                ),
                if (_submitError != null) ...[
                  const SizedBox(height: NebulaSpacing.md),
                  Container(
                    padding: const EdgeInsets.all(NebulaSpacing.sm + 4),
                    decoration: BoxDecoration(
                      color: dl.critical.withValues(alpha: 0.12),
                      borderRadius:
                          BorderRadius.circular(NebulaSpacing.radiusSm),
                      border: Border.all(
                        color: dl.critical.withValues(alpha: 0.4),
                      ),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(LucideIcons.circleAlert,
                            size: 16, color: dl.critical),
                        const SizedBox(width: NebulaSpacing.sm),
                        Expanded(
                          child: Semantics(
                            liveRegion: true,
                            child: Text(
                              _submitError!,
                              style: context.text.bodySmall
                                  ?.copyWith(color: dl.critical),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: NebulaSpacing.lg),
                SizedBox(
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: _saving ? null : _submit,
                    icon: _saving
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(LucideIcons.check, size: 18),
                    label: Text(_isEdit ? 'Save changes' : 'Create role'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
