import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/theme/nebula_spacing.dart';
import '../../data/user_management_data_source.dart';
import '../../data/user_management_model.dart';
import '../../data/user_management_provider.dart';
import '../widgets/state_views.dart';

/// Create or edit a platform user.
///
/// `POST /api/team-members` (create) and `PUT /api/team-members/:id` (edit).
/// Email and password are create-only because the route offers no way to change
/// them for another user.
class UserEditorScreen extends ConsumerStatefulWidget {
  /// Null when creating a new user.
  final ManagedUser? existing;

  const UserEditorScreen({super.key, this.existing});

  @override
  ConsumerState<UserEditorScreen> createState() => _UserEditorScreenState();
}

class _UserEditorScreenState extends ConsumerState<UserEditorScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _fullName =
      TextEditingController(text: widget.existing?.fullName ?? '');
  final TextEditingController _email = TextEditingController();
  final TextEditingController _password = TextEditingController();
  late final TextEditingController _department =
      TextEditingController(text: widget.existing?.department ?? '');
  late final TextEditingController _designation =
      TextEditingController(text: widget.existing?.designation ?? '');
  late final TextEditingController _phone =
      TextEditingController(text: widget.existing?.phone ?? '');

  late int? _accessLevel = widget.existing?.accessLevel;
  late int? _ventureId = widget.existing?.ventureId;
  late bool _isActive = widget.existing?.isActive ?? true;
  bool _obscurePassword = true;
  bool _saving = false;
  String? _submitError;

  bool get _isEdit => widget.existing != null;

  @override
  void dispose() {
    _fullName.dispose();
    _email.dispose();
    _password.dispose();
    _department.dispose();
    _designation.dispose();
    _phone.dispose();
    super.dispose();
  }

  String? _requiredValidator(String? value, String field) {
    if (value == null || value.trim().isEmpty) return '$field is required';
    return null;
  }

  String? _emailValidator(String? value) {
    final required = _requiredValidator(value, 'Email');
    if (required != null) return required;
    final pattern = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
    if (!pattern.hasMatch(value!.trim())) return 'Enter a valid email address';
    return null;
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (_accessLevel == null) {
      setState(() => _submitError = 'Choose an access level.');
      return;
    }

    setState(() {
      _saving = true;
      _submitError = null;
    });

    final dataSource = ref.read(userManagementDataSourceProvider);
    try {
      if (_isEdit) {
        await dataSource.updateUser(
          widget.existing!.id,
          fullName: _fullName.text.trim(),
          accessLevel: _accessLevel,
          // The route maps 0 to NULL, which is how a venture is cleared.
          ventureId: _ventureId ?? 0,
          isActive: _isActive,
          department: _department.text.trim(),
          designation: _designation.text.trim(),
          phone: _phone.text.trim(),
        );
      } else {
        await dataSource.createUser(
          fullName: _fullName.text.trim(),
          email: _email.text.trim(),
          password: _password.text,
          accessLevel: _accessLevel!,
          ventureId: _ventureId,
          department:
              _department.text.trim().isEmpty ? null : _department.text.trim(),
          designation: _designation.text.trim().isEmpty
              ? null
              : _designation.text.trim(),
        );
      }

      ref.invalidate(managedUsersProvider);
      if (_isEdit) {
        ref.invalidate(managedUserDetailProvider(widget.existing!.id));
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
    final levelsAsync = ref.watch(accessLevelOptionsProvider);
    final venturesAsync = ref.watch(ventureOptionsProvider);
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: Text(_isEdit ? 'Edit user' : 'Add user')),
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(
            child: Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(NebulaSpacing.md),
                children: [
                  TextFormField(
                    controller: _fullName,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(
                      labelText: 'Full name',
                      prefixIcon: Icon(LucideIcons.user, size: 18),
                    ),
                    validator: (v) => _requiredValidator(v, 'Full name'),
                  ),
                  const SizedBox(height: NebulaSpacing.md),
                  if (!_isEdit) ...[
                    TextFormField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      autocorrect: false,
                      decoration: const InputDecoration(
                        labelText: 'Email',
                        prefixIcon: Icon(LucideIcons.mail, size: 18),
                      ),
                      validator: _emailValidator,
                    ),
                    const SizedBox(height: NebulaSpacing.md),
                    TextFormField(
                      controller: _password,
                      obscureText: _obscurePassword,
                      decoration: InputDecoration(
                        labelText: 'Temporary password',
                        helperText: 'The user can change this after signing in.',
                        prefixIcon: const Icon(LucideIcons.keyRound, size: 18),
                        suffixIcon: IconButton(
                          tooltip: _obscurePassword
                              ? 'Show password'
                              : 'Hide password',
                          icon: Icon(
                            _obscurePassword
                                ? LucideIcons.eye
                                : LucideIcons.eyeOff,
                            size: 18,
                          ),
                          onPressed: () => setState(
                              () => _obscurePassword = !_obscurePassword),
                        ),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Password is required';
                        }
                        if (value.length < 8) {
                          return 'Use at least 8 characters';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: NebulaSpacing.md),
                  ] else ...[
                    TextFormField(
                      controller: _phone,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        labelText: 'Phone',
                        prefixIcon: Icon(LucideIcons.phone, size: 18),
                      ),
                    ),
                    const SizedBox(height: NebulaSpacing.md),
                  ],
                  _AccessLevelField(
                    levelsAsync: levelsAsync,
                    value: _accessLevel,
                    onChanged: (value) => setState(() => _accessLevel = value),
                    onRetry: () => ref.invalidate(accessLevelOptionsProvider),
                  ),
                  const SizedBox(height: NebulaSpacing.md),
                  _VentureField(
                    venturesAsync: venturesAsync,
                    value: _ventureId,
                    onChanged: (value) => setState(() => _ventureId = value),
                    onRetry: () => ref.invalidate(ventureOptionsProvider),
                  ),
                  const SizedBox(height: NebulaSpacing.md),
                  TextFormField(
                    controller: _department,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(
                      labelText: 'Department',
                      prefixIcon: Icon(LucideIcons.building2, size: 18),
                    ),
                  ),
                  const SizedBox(height: NebulaSpacing.md),
                  TextFormField(
                    controller: _designation,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(
                      labelText: 'Designation',
                      prefixIcon: Icon(LucideIcons.idCard, size: 18),
                    ),
                  ),
                  if (_isEdit) ...[
                    const SizedBox(height: NebulaSpacing.sm),
                    SwitchListTile.adaptive(
                      value: _isActive,
                      onChanged: (value) => setState(() => _isActive = value),
                      title: const Text('Active account'),
                      subtitle: Text(
                        _isActive
                            ? 'The user can sign in.'
                            : 'The user is deactivated and cannot sign in.',
                        style: Theme.of(context)
                            .textTheme
                            .bodySmall
                            ?.copyWith(color: textSecondary(context)),
                      ),
                      contentPadding: EdgeInsets.zero,
                    ),
                  ],
                  if (_submitError != null) ...[
                    const SizedBox(height: NebulaSpacing.md),
                    Container(
                      padding: const EdgeInsets.all(NebulaSpacing.sm + 4),
                      decoration: BoxDecoration(
                        color: scheme.error.withValues(alpha: 0.12),
                        borderRadius:
                            BorderRadius.circular(NebulaSpacing.radiusSm),
                        border:
                            Border.all(color: scheme.error.withValues(alpha: 0.4)),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(LucideIcons.circleAlert,
                              size: 16, color: scheme.error),
                          const SizedBox(width: NebulaSpacing.sm),
                          Expanded(
                            child: Semantics(
                              liveRegion: true,
                              child: Text(
                                _submitError!,
                                style: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(color: scheme.error),
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
                      label: Text(_isEdit ? 'Save changes' : 'Create user'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Access-level picker fed by `GET /api/team-members/access-levels`.
class _AccessLevelField extends StatelessWidget {
  final AsyncValue<List<AccessLevelOption>> levelsAsync;
  final int? value;
  final ValueChanged<int?> onChanged;
  final VoidCallback onRetry;

  const _AccessLevelField({
    required this.levelsAsync,
    required this.value,
    required this.onChanged,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return levelsAsync.when(
      loading: () => const ShimmerBox(height: 56),
      error: (error, _) => _FieldError(
        message: 'Could not load access levels. ${readableError(error)}',
        onRetry: onRetry,
      ),
      data: (levels) => DropdownButtonFormField<int>(
        initialValue: levels.any((l) => l.levelNumber == value) ? value : null,
        isExpanded: true,
        decoration: const InputDecoration(
          labelText: 'Access level',
          helperText: 'A lower level number grants more access.',
          prefixIcon: Icon(LucideIcons.shield, size: 18),
        ),
        items: [
          for (final level in levels)
            DropdownMenuItem<int>(
              value: level.levelNumber,
              child: Text('L${level.levelNumber} · ${level.levelName}',
                  overflow: TextOverflow.ellipsis),
            ),
        ],
        onChanged: onChanged,
        validator: (v) => v == null ? 'Choose an access level' : null,
      ),
    );
  }
}

/// Venture picker fed by `GET /api/team-members/ventures`.
class _VentureField extends StatelessWidget {
  final AsyncValue<List<VentureOption>> venturesAsync;
  final int? value;
  final ValueChanged<int?> onChanged;
  final VoidCallback onRetry;

  const _VentureField({
    required this.venturesAsync,
    required this.value,
    required this.onChanged,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return venturesAsync.when(
      loading: () => const ShimmerBox(height: 56),
      error: (error, _) => _FieldError(
        message: 'Could not load ventures. ${readableError(error)}',
        onRetry: onRetry,
      ),
      data: (ventures) => DropdownButtonFormField<int?>(
        initialValue: ventures.any((v) => v.id == value) ? value : null,
        isExpanded: true,
        decoration: const InputDecoration(
          labelText: 'Venture',
          prefixIcon: Icon(LucideIcons.building, size: 18),
        ),
        items: [
          const DropdownMenuItem<int?>(
            value: null,
            child: Text('No venture'),
          ),
          for (final venture in ventures)
            DropdownMenuItem<int?>(
              value: venture.id,
              child: Text(venture.name, overflow: TextOverflow.ellipsis),
            ),
        ],
        onChanged: onChanged,
      ),
    );
  }
}

class _FieldError extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _FieldError({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Row(
      children: [
        Expanded(
          child: Text(message,
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: scheme.error)),
        ),
        TextButton(onPressed: onRetry, child: const Text('Retry')),
      ],
    );
  }
}
