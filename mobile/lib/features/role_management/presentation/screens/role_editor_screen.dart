import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/theme/nebula_spacing.dart';
import '../../data/role_management_data_source.dart';
import '../../data/role_management_model.dart';
import '../../data/role_management_provider.dart';
import '../widgets/state_views.dart';

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
          description:
              _description.text.trim().isEmpty ? null : _description.text.trim(),
          icon: _icon,
          permissions: _permissions,
          ventureId: _ventureId,
        );
      }

      ref.invalidate(ventureRolesProvider);
      if (_isEdit) ref.invalidate(ventureRoleDetailProvider(widget.existing!.id));
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
    final venturesAsync = ref.watch(roleVenturesProvider);
    final scheme = Theme.of(context).colorScheme;
    final enabledCount = _permissions.values.where((v) => v).length;

    return Scaffold(
      appBar: AppBar(title: Text(_isEdit ? 'Edit role' : 'New role')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(NebulaSpacing.md),
          children: [
            TextFormField(
              controller: _roleName,
              decoration: const InputDecoration(labelText: 'Role name'),
              validator: (v) => _required(v, 'Role name'),
            ),
            const SizedBox(height: NebulaSpacing.md),
            TextFormField(
              controller: _roleKey,
              decoration: const InputDecoration(
                labelText: 'Role key',
                helperText: 'Lowercase letters, numbers and underscores.',
              ),
              validator: (v) => _required(v, 'Role key'),
            ),
            const SizedBox(height: NebulaSpacing.md),
            TextFormField(
              controller: _description,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'Description'),
            ),
            const SizedBox(height: NebulaSpacing.md),
            Text('Icon', style: Theme.of(context).textTheme.labelMedium),
            const SizedBox(height: NebulaSpacing.sm),
            Wrap(
              spacing: NebulaSpacing.sm,
              children: [
                for (final icon in _iconOptions)
                  ChoiceChip(
                    label: Text(icon, style: const TextStyle(fontSize: 18)),
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
                  style: TextStyle(color: scheme.error, fontSize: 12),
                ),
                data: (ventures) => DropdownButtonFormField<int?>(
                  initialValue: _ventureId,
                  isExpanded: true,
                  decoration: const InputDecoration(
                    labelText: 'Venture',
                    helperText: 'Leave unset for a role usable across ventures.',
                  ),
                  items: [
                    const DropdownMenuItem<int?>(
                        value: null, child: Text('All ventures')),
                    for (final venture in ventures)
                      DropdownMenuItem<int?>(
                        value: venture.id,
                        child: Text(venture.name, overflow: TextOverflow.ellipsis),
                      ),
                  ],
                  onChanged: (value) => setState(() => _ventureId = value),
                ),
              ),
            ],
            const SizedBox(height: NebulaSpacing.lg),
            Row(
              children: [
                Expanded(
                  child: Text('Permissions',
                      style: Theme.of(context).textTheme.titleSmall),
                ),
                Text('$enabledCount of ${_permissionFeatures.length}',
                    style: Theme.of(context)
                        .textTheme
                        .labelSmall
                        ?.copyWith(color: textSecondary(context))),
              ],
            ),
            const SizedBox(height: NebulaSpacing.sm),
            Container(
              decoration: BoxDecoration(
                color: cardSurface(context),
                borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
                border: Border.all(color: hairline(context)),
              ),
              child: Column(
                children: [
                  for (var i = 0; i < _permissionFeatures.length; i++) ...[
                    if (i > 0) Divider(height: 1, color: hairline(context)),
                    SwitchListTile.adaptive(
                      title: Text(_permissionFeatures[i].$2,
                          style: Theme.of(context).textTheme.bodyMedium),
                      value: _permissions[_permissionFeatures[i].$1] ?? false,
                      onChanged: (value) => setState(
                          () => _permissions[_permissionFeatures[i].$1] = value),
                      contentPadding:
                          const EdgeInsets.symmetric(horizontal: NebulaSpacing.md),
                    ),
                  ],
                ],
              ),
            ),
            if (_submitError != null) ...[
              const SizedBox(height: NebulaSpacing.md),
              Text(_submitError!, style: TextStyle(color: scheme.error, fontSize: 12)),
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
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(LucideIcons.check, size: 18),
                label: Text(_isEdit ? 'Save changes' : 'Create role'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
