import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/rbac/permissions.dart';
import '../../../../core/rbac/rbac_widgets.dart';
import '../../../../core/theme/nebula_spacing.dart';
import '../../../../core/theme/theme_context.dart';
import '../../../../core/widgets/primitives.dart';
import '../../../../core/widgets/state_views.dart';
import '../../../tasks/presentation/widgets/picker_row.dart';
import '../../../team/presentation/providers/team_provider.dart';
import '../../data/models/project_models.dart';
import '../providers/project_form_provider.dart';
import '../providers/projects_provider.dart';
import '../widgets/project_chrome.dart';

const _statuses = ['planning', 'active', 'on-hold', 'completed'];
const _priorities = ['low', 'medium', 'high', 'urgent'];
const _memberRoles = [
  'Lead',
  'Contributor',
  'Reviewer',
  'Architect',
  'Stakeholder',
];

class ProjectFormScreen extends ConsumerStatefulWidget {
  const ProjectFormScreen({super.key, this.projectId});

  final int? projectId;

  @override
  ConsumerState<ProjectFormScreen> createState() => _ProjectFormScreenState();
}

class _ProjectFormScreenState extends ConsumerState<ProjectFormScreen> {
  final _formKey = GlobalKey<FormState>();

  final _nameController = TextEditingController();
  final _descController = TextEditingController();
  final _tagController = TextEditingController();
  final _budgetController = TextEditingController();
  final _clientNameController = TextEditingController();
  final _clientEmailController = TextEditingController();

  String _status = 'planning';
  String _priority = 'medium';
  DateTime? _startDate;
  DateTime? _endDate;

  List<Map<String, dynamic>> _members = [];
  List<String> _tags = [];
  List<Map<String, dynamic>> _milestones = [];

  bool _hydrating = false;

  bool get _isEdit => widget.projectId != null;

  @override
  void initState() {
    super.initState();
    if (widget.projectId != null) {
      _hydrating = true;
      _hydrate(widget.projectId!);
    }
  }

  /// Fills the form from the project being edited.
  ///
  /// Awaits the provider instead of reading whatever is cached: opening the
  /// edit route directly used to render an empty form, and saving it then
  /// wrote those blanks over the real project.
  Future<void> _hydrate(int id) async {
    try {
      final project = await ref.read(projectDetailProvider(id).future);
      if (!mounted) return;
      setState(() {
        _nameController.text = project.name;
        _descController.text = project.description ?? '';
        if (_statuses.contains(project.status)) _status = project.status;
        if (_priorities.contains(project.priority.toLowerCase())) {
          _priority = project.priority.toLowerCase();
        }
        // Left blank when the API sent no budget — level 5 and below never
        // receive the field, and writing "0" into the box would push a zero
        // budget back on save.
        _budgetController.text =
            project.budget == null ? '' : project.budget!.toStringAsFixed(0);
        _startDate = parseApiDate(project.startDate);
        _endDate = parseApiDate(project.endDate);
        _clientNameController.text = project.clientName ?? '';
        _clientEmailController.text = project.clientEmail ?? '';
        _tags = List.of(project.tags);
        _members = project.members
            .map((m) => <String, dynamic>{
                  'user_id': m.userId,
                  'role': _memberRoles.contains(m.role)
                      ? m.role
                      : 'Contributor',
                })
            .toList();
        _milestones = project.milestones
            .map((m) => <String, dynamic>{
                  'title': m.title,
                  'description': m.description,
                  'due_date': m.dueDate,
                  'status': m.status == 'completed' ? 'completed' : 'pending',
                })
            .toList();
        _hydrating = false;
      });
    } catch (_) {
      if (mounted) setState(() => _hydrating = false);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descController.dispose();
    _tagController.dispose();
    _budgetController.dispose();
    _clientNameController.dispose();
    _clientEmailController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final dto = ProjectRequestDto(
      name: _nameController.text,
      description: _descController.text,
      status: _status,
      priority: _priority,
      budget: double.tryParse(_budgetController.text),
      startDate: _startDate?.toIso8601String(),
      endDate: _endDate?.toIso8601String(),
      clientName: _clientNameController.text,
      clientEmail: _clientEmailController.text,
      tags: _tags,
      members: _members,
      milestones: _milestones,
    );

    final success = await ref
        .read(projectFormControllerProvider.notifier)
        .submitProject(dto, existingProjectId: widget.projectId);

    if (success && mounted) context.pop();
  }

  Future<void> _confirmDelete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Delete this project?'),
        content: const Text(
          'The project and everything filed under it goes with it. '
          'This cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            style: TextButton.styleFrom(
              foregroundColor: dialogContext.dl.critical,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      await ref
          .read(projectFormControllerProvider.notifier)
          .deleteProject(widget.projectId!);
      if (mounted) context.go('/projects');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(readableError(e))),
        );
      }
    }
  }

  void _addTag() {
    final text = _tagController.text.trim();
    if (text.isEmpty || _tags.contains(text)) return;
    setState(() {
      _tags.add(text);
      _tagController.clear();
    });
  }

  Future<DateTime?> _pickDate(DateTime? current) => showDatePicker(
        context: context,
        initialDate: current ?? DateTime.now(),
        firstDate: DateTime(2000),
        lastDate: DateTime(2101),
      );

  @override
  Widget build(BuildContext context) {
    final formState = ref.watch(projectFormControllerProvider);

    ref.listen(projectFormControllerProvider, (prev, next) {
      if (next is AsyncError) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(readableError(next.error))),
        );
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: Text(_isEdit ? 'Edit project' : 'New project'),
        actions: [
          if (_isEdit)
            PermissionGate(
              permission: Permission.deleteProject,
              child: IconButton(
                icon: const Icon(LucideIcons.trash2, size: 18),
                tooltip: 'Delete project',
                onPressed: _confirmDelete,
              ),
            ),
          const SizedBox(width: NebulaSpacing.xs),
        ],
      ),
      body: PermissionScope(
        permission:
            _isEdit ? Permission.updateProject : Permission.createProject,
        what: _isEdit ? 'editing projects' : 'creating projects',
        child: _hydrating || formState is AsyncLoading
            ? const Padding(
                padding: EdgeInsets.all(NebulaSpacing.md),
                child: ListSkeleton(count: 5),
              )
            : _buildForm(context),
      ),
    );
  }

  Widget _buildForm(BuildContext context) {
    final usersAsync = ref.watch(teamMembersProvider);

    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(
          NebulaSpacing.md,
          NebulaSpacing.md,
          NebulaSpacing.md,
          NebulaSpacing.xxl,
        ),
        children: [
          const SectionHeader('THE PROJECT'),
          TextFormField(
            controller: _nameController,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(
              labelText: 'Name',
              hintText: 'What is being built',
            ),
            validator: (v) => v == null || v.isEmpty ? 'Required' : null,
          ),
          const SizedBox(height: NebulaSpacing.md),
          TextFormField(
            controller: _descController,
            maxLines: 3,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(
              labelText: 'Description',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: NebulaSpacing.md),
          if (_tags.isNotEmpty) ...[
            Wrap(
              spacing: NebulaSpacing.sm,
              runSpacing: NebulaSpacing.sm,
              children: [
                for (final tag in _tags)
                  GestureDetector(
                    onTap: () => setState(() => _tags.remove(tag)),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        DTag(tag, tone: DTone.accent),
                        const SizedBox(width: 3),
                        Icon(
                          LucideIcons.x,
                          size: 12,
                          color: context.dl.textTertiary,
                        ),
                      ],
                    ),
                  ),
              ],
            ),
            const SizedBox(height: NebulaSpacing.sm),
          ],
          TextFormField(
            controller: _tagController,
            decoration: InputDecoration(
              labelText: 'Tags',
              hintText: 'Add a tag',
              suffixIcon: IconButton(
                icon: const Icon(LucideIcons.plus, size: 16),
                tooltip: 'Add tag',
                onPressed: _addTag,
              ),
            ),
            onFieldSubmitted: (_) => _addTag(),
          ),
          const SizedBox(height: NebulaSpacing.lg),

          const SectionHeader('STATUS'),
          DropdownButtonFormField<String>(
            initialValue: _status,
            decoration: const InputDecoration(labelText: 'Phase'),
            items: [
              for (final s in _statuses)
                DropdownMenuItem(
                  value: s,
                  child: DTag(
                    projectStatusLabel(s),
                    tone: projectStatusTone(s),
                  ),
                ),
            ],
            onChanged: (v) => setState(() => _status = v ?? _status),
          ),
          const SizedBox(height: NebulaSpacing.md),
          DropdownButtonFormField<String>(
            initialValue: _priority,
            decoration: const InputDecoration(labelText: 'Priority'),
            items: [
              for (final p in _priorities)
                DropdownMenuItem(
                  value: p,
                  child: DTag(p, tone: projectPriorityTone(p)),
                ),
            ],
            onChanged: (v) => setState(() => _priority = v ?? _priority),
          ),
          const SizedBox(height: NebulaSpacing.lg),

          const SectionHeader('TIMELINE'),
          Row(
            children: [
              Expanded(
                child: _DateField(
                  label: 'Start',
                  value: _startDate,
                  onTap: () async {
                    final picked = await _pickDate(_startDate);
                    if (picked != null && mounted) {
                      setState(() => _startDate = picked);
                    }
                  },
                ),
              ),
              const SizedBox(width: NebulaSpacing.sm),
              Expanded(
                child: _DateField(
                  label: 'End',
                  value: _endDate,
                  onTap: () async {
                    final picked = await _pickDate(_endDate);
                    if (picked != null && mounted) {
                      setState(() => _endDate = picked);
                    }
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: NebulaSpacing.lg),

          // The backend only accepts a budget from access level 4 and above,
          // and only sends it back to the same levels.
          const PermissionGate(
            permission: Permission.viewBudget,
            child: SectionHeader('BUDGET'),
          ),
          PermissionGate(
            permission: Permission.viewBudget,
            child: TextFormField(
              controller: _budgetController,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              decoration: const InputDecoration(
                labelText: 'Allocation',
                prefixText: '\$ ',
              ),
              validator: (v) {
                if (v == null || v.trim().isEmpty) return null;
                return double.tryParse(v) == null ? 'Numbers only' : null;
              },
            ),
          ),
          const SizedBox(height: NebulaSpacing.lg),

          const SectionHeader('CLIENT'),
          TextFormField(
            controller: _clientNameController,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(labelText: 'Name'),
          ),
          const SizedBox(height: NebulaSpacing.md),
          TextFormField(
            controller: _clientEmailController,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(labelText: 'Email'),
            validator: (v) {
              if (v == null || v.trim().isEmpty) return null;
              return v.contains('@') ? null : 'Not an email address';
            },
          ),
          const SizedBox(height: NebulaSpacing.lg),

          SectionHeader('TEAM · ${_members.length}'),
          usersAsync.when(
            data: (users) => Column(
              children: [
                for (final user in users)
                  Padding(
                    padding: const EdgeInsets.only(bottom: NebulaSpacing.sm),
                    child: _MemberToggle(
                      name: user.fullName,
                      subtitle: user.designation,
                      avatarUrl: user.avatarUrl,
                      role: _roleOf(user.id),
                      onToggle: () => setState(() {
                        final i = _members
                            .indexWhere((m) => m['user_id'] == user.id);
                        if (i == -1) {
                          _members.add({
                            'user_id': user.id,
                            'role': 'Contributor',
                          });
                        } else {
                          _members.removeAt(i);
                        }
                      }),
                      onRoleChanged: (role) => setState(() {
                        final i = _members
                            .indexWhere((m) => m['user_id'] == user.id);
                        if (i != -1) _members[i]['role'] = role;
                      }),
                    ),
                  ),
              ],
            ),
            loading: () => const ListSkeleton(count: 3),
            error: (e, _) => Text(
              readableError(e),
              style: context.text.bodySmall?.copyWith(
                color: context.dl.critical,
              ),
            ),
          ),
          const SizedBox(height: NebulaSpacing.lg),

          SectionHeader(
            'MILESTONES · ${_milestones.length}',
            actionLabel: 'Add',
            onAction: () => setState(
              () => _milestones.add({
                'title': '',
                'description': null,
                'due_date': null,
                'status': 'pending',
              }),
            ),
          ),
          if (_milestones.isEmpty)
            DCard(
              child: Text(
                'No milestones yet.',
                style: context.text.bodyMedium,
              ),
            )
          else
            for (final milestone in _milestones)
              Padding(
                padding: const EdgeInsets.only(bottom: NebulaSpacing.sm),
                child: _MilestoneEditor(
                  // Keyed on the map's identity, not its index — otherwise
                  // deleting one row left the next row showing the deleted
                  // row's text.
                  key: ObjectKey(milestone),
                  milestone: milestone,
                  onPickDate: () async {
                    final picked =
                        await _pickDate(parseApiDate(milestone['due_date']));
                    if (picked != null && mounted) {
                      setState(
                        () => milestone['due_date'] = picked.toIso8601String(),
                      );
                    }
                  },
                  onStatusChanged: (v) =>
                      setState(() => milestone['status'] = v),
                  onRemove: () =>
                      setState(() => _milestones.remove(milestone)),
                ),
              ),
          const SizedBox(height: NebulaSpacing.lg),

          FilledButton(
            onPressed: _submit,
            child: Text(_isEdit ? 'Save changes' : 'Create project'),
          ),
        ],
      ),
    );
  }

  String? _roleOf(int userId) {
    for (final member in _members) {
      if (member['user_id'] == userId) return member['role'] as String?;
    }
    return null;
  }
}

/// A person, with the role they hold on this project once selected.
class _MemberToggle extends StatelessWidget {
  const _MemberToggle({
    required this.name,
    required this.role,
    required this.onToggle,
    required this.onRoleChanged,
    this.subtitle,
    this.avatarUrl,
  });

  final String name;
  final String? subtitle;
  final String? avatarUrl;

  /// Null when this person is not on the project.
  final String? role;

  final VoidCallback onToggle;
  final ValueChanged<String> onRoleChanged;

  @override
  Widget build(BuildContext context) {
    final selected = role != null;
    final dl = context.dl;

    return PickerRow(
      selected: selected,
      onTap: onToggle,
      child: Column(
        children: [
          Row(
            children: [
              DAvatar(name, size: 32, imageUrl: avatarUrl),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(name, style: context.text.titleSmall),
                    if (subtitle != null && subtitle!.isNotEmpty)
                      Text(
                        subtitle!,
                        style: context.text.bodySmall?.copyWith(fontSize: 10.5),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                  ],
                ),
              ),
              Icon(
                selected ? LucideIcons.circleCheck : LucideIcons.circle,
                size: 18,
                color: selected ? context.scheme.primary : dl.textTertiary,
              ),
            ],
          ),
          if (selected) ...[
            const SizedBox(height: NebulaSpacing.sm),
            Row(
              children: [
                const SizedBox(width: 43),
                Expanded(
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: role,
                      isDense: true,
                      isExpanded: true,
                      style: context.text.bodySmall,
                      items: [
                        for (final r in _memberRoles)
                          DropdownMenuItem(value: r, child: Text(r)),
                      ],
                      onChanged: (v) {
                        if (v != null) onRoleChanged(v);
                      },
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _MilestoneEditor extends StatelessWidget {
  const _MilestoneEditor({
    super.key,
    required this.milestone,
    required this.onPickDate,
    required this.onStatusChanged,
    required this.onRemove,
  });

  final Map<String, dynamic> milestone;
  final VoidCallback onPickDate;
  final ValueChanged<String> onStatusChanged;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final due = formatApiDate(milestone['due_date'] as String?);
    final done = milestone['status'] == 'completed';

    return DCard(
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  initialValue: milestone['title'] as String?,
                  textCapitalization: TextCapitalization.sentences,
                  decoration: const InputDecoration(labelText: 'Milestone'),
                  onChanged: (v) => milestone['title'] = v,
                ),
              ),
              IconButton(
                icon: const Icon(LucideIcons.x, size: 15),
                tooltip: 'Remove milestone',
                onPressed: onRemove,
              ),
            ],
          ),
          const SizedBox(height: NebulaSpacing.sm),
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: onPickDate,
                  child: Row(
                    children: [
                      Icon(
                        LucideIcons.calendar,
                        size: 14,
                        color: context.dl.textTertiary,
                      ),
                      const SizedBox(width: 7),
                      due == null
                          ? Text('Set a date', style: context.text.bodySmall)
                          : Mono(due, size: 11.5),
                    ],
                  ),
                ),
              ),
              GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => onStatusChanged(done ? 'pending' : 'completed'),
                child: DTag(
                  done ? 'Completed' : 'Pending',
                  tone: done ? DTone.ok : DTone.neutral,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// A tappable date row that uses the theme's input chrome.
class _DateField extends StatelessWidget {
  const _DateField({
    required this.label,
    required this.value,
    required this.onTap,
  });

  final String label;
  final DateTime? value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(NebulaSpacing.radiusSm),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          suffixIcon: const Icon(LucideIcons.calendar, size: 15),
        ),
        child: value == null
            ? Text('Not set', style: context.text.bodyMedium)
            : Mono(DateFormat('d MMM yyyy').format(value!), size: 12),
      ),
    );
  }
}
