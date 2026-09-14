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
import '../../../projects/presentation/providers/projects_provider.dart';
import '../../../team/presentation/providers/team_provider.dart';
import '../../data/models/task_models.dart';
import '../providers/task_detail_provider.dart';
import '../providers/task_form_provider.dart';
import '../providers/task_list_provider.dart';
import '../widgets/picker_row.dart';
import '../widgets/task_chrome.dart';

const _priorities = ['low', 'medium', 'high', 'urgent'];

class TaskFormScreen extends ConsumerStatefulWidget {
  const TaskFormScreen({super.key, this.taskId});

  final int? taskId;

  @override
  ConsumerState<TaskFormScreen> createState() => _TaskFormScreenState();
}

class _TaskFormScreenState extends ConsumerState<TaskFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _titleController = TextEditingController();
  late final TextEditingController _descController = TextEditingController();

  String _priority = 'medium';
  DateTime? _dueDate;
  int? _selectedProjectId;
  int? _selectedParentTaskId;
  List<int> _selectedAssignees = [];

  /// True until the record being edited has been read back. A create form is
  /// ready immediately.
  bool _hydrating = false;

  bool get _isEdit => widget.taskId != null;

  @override
  void initState() {
    super.initState();
    if (widget.taskId != null) {
      _hydrating = true;
      _hydrate(widget.taskId!);
    }
  }

  /// Fills the form from the task being edited.
  ///
  /// Awaits the provider rather than reading whatever happens to be cached:
  /// opening the edit route directly (a deep link, or after a cold start) used
  /// to leave every field blank, and saving then wrote those blanks over the
  /// real task.
  Future<void> _hydrate(int id) async {
    try {
      final task = await ref.read(taskDetailProvider(id).future);
      if (!mounted) return;
      setState(() {
        _titleController.text = task.title;
        _descController.text = task.description ?? '';
        if (_priorities.contains(task.priority.toLowerCase())) {
          _priority = task.priority.toLowerCase();
        }
        _dueDate = task.dueDate;
        _selectedProjectId = task.projectId;
        _selectedParentTaskId = task.parentTaskId;
        _selectedAssignees = task.assignees.map((a) => a.id).toList();
        _hydrating = false;
      });
    } catch (_) {
      if (mounted) setState(() => _hydrating = false);
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    if (_selectedAssignees.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select at least one assignee')),
      );
      return;
    }

    final dto = TaskRequestDto(
      title: _titleController.text,
      description: _descController.text,
      assignedTo: _selectedAssignees,
      priority: _priority,
      dueDate: _dueDate?.toIso8601String(),
      projectId: _selectedProjectId,
      parentTaskId: _selectedParentTaskId,
    );

    final success = await ref
        .read(taskFormControllerProvider.notifier)
        .submitTask(dto, existingTaskId: widget.taskId);

    if (success && mounted) context.pop();
  }

  Future<void> _pickDueDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _dueDate ?? DateTime.now(),
      firstDate: DateTime(2000),
      lastDate: DateTime(2101),
    );
    if (picked != null && mounted) setState(() => _dueDate = picked);
  }

  @override
  Widget build(BuildContext context) {
    final formState = ref.watch(taskFormControllerProvider);

    ref.listen(taskFormControllerProvider, (prev, next) {
      if (next is AsyncError) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(readableError(next.error))),
        );
      }
    });

    return Scaffold(
      appBar: AppBar(title: Text(_isEdit ? 'Edit task' : 'New task')),
      body: PermissionScope(
        permission: _isEdit ? Permission.updateTask : Permission.createTask,
        what: _isEdit ? 'editing tasks' : 'creating tasks',
        child: _hydrating || formState is AsyncLoading
            ? const Padding(
                padding: EdgeInsets.all(NebulaSpacing.md),
                child: ListSkeleton(count: 4),
              )
            : _buildForm(context),
      ),
    );
  }

  Widget _buildForm(BuildContext context) {
    final projectsAsync = ref.watch(projectListProvider);
    final usersAsync = ref.watch(teamMembersProvider);
    final tasksAsync = ref.watch(filteredTasksProvider);

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
          const SectionHeader('THE TASK'),
          TextFormField(
            controller: _titleController,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(
              labelText: 'Title',
              hintText: 'What needs doing',
            ),
            validator: (v) => v == null || v.isEmpty ? 'Required' : null,
          ),
          const SizedBox(height: NebulaSpacing.md),
          TextFormField(
            controller: _descController,
            maxLines: 4,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(
              labelText: 'Description',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: NebulaSpacing.lg),

          const SectionHeader('SCHEDULE'),
          DropdownButtonFormField<String>(
            initialValue: _priority,
            decoration: const InputDecoration(labelText: 'Priority'),
            items: [
              for (final p in _priorities)
                DropdownMenuItem(
                  value: p,
                  child: Row(
                    children: [
                      DTag(p, tone: priorityTone(p)),
                    ],
                  ),
                ),
            ],
            onChanged: (v) => setState(() => _priority = v ?? _priority),
          ),
          const SizedBox(height: NebulaSpacing.md),
          _DateField(
            label: 'Due date',
            value: _dueDate,
            onTap: _pickDueDate,
            onClear: _dueDate == null
                ? null
                : () => setState(() => _dueDate = null),
          ),
          const SizedBox(height: NebulaSpacing.lg),

          const SectionHeader('WHERE IT LIVES'),
          projectsAsync.when(
            data: (projects) => DropdownButtonFormField<int?>(
              initialValue: projects.any((p) => p.id == _selectedProjectId)
                  ? _selectedProjectId
                  : null,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Project'),
              items: [
                const DropdownMenuItem<int?>(
                  value: null,
                  child: Text('No project'),
                ),
                ...projects.map(
                  (p) => DropdownMenuItem<int?>(
                    value: p.id,
                    child: Text(p.name, overflow: TextOverflow.ellipsis),
                  ),
                ),
              ],
              onChanged: (v) => setState(() => _selectedProjectId = v),
            ),
            loading: () => const ShimmerBox(height: 52, radius: 12),
            error: (e, _) => _FieldError(message: readableError(e)),
          ),
          const SizedBox(height: NebulaSpacing.md),
          tasksAsync.when(
            data: (tasks) {
              final available = tasks
                  .where((t) =>
                      t.id != widget.taskId &&
                      (_selectedProjectId == null ||
                          t.projectId == _selectedProjectId))
                  .toList();
              // A parent that is not in the filtered set would assert inside
              // the dropdown, so fall back to "none" rather than crash.
              final value = available.any((t) => t.id == _selectedParentTaskId)
                  ? _selectedParentTaskId
                  : null;
              return DropdownButtonFormField<int?>(
                initialValue: value,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Parent task'),
                items: [
                  const DropdownMenuItem<int?>(
                    value: null,
                    child: Text('None — top level'),
                  ),
                  ...available.map(
                    (t) => DropdownMenuItem<int?>(
                      value: t.id,
                      child: Text(t.title, overflow: TextOverflow.ellipsis),
                    ),
                  ),
                ],
                onChanged: (v) => setState(() => _selectedParentTaskId = v),
              );
            },
            loading: () => const ShimmerBox(height: 52, radius: 12),
            error: (e, _) => _FieldError(message: readableError(e)),
          ),
          const SizedBox(height: NebulaSpacing.lg),

          SectionHeader('ASSIGNEES · ${_selectedAssignees.length}'),
          usersAsync.when(
            data: (users) => Column(
              children: [
                for (final user in users)
                  Padding(
                    padding: const EdgeInsets.only(bottom: NebulaSpacing.sm),
                    child: _PersonToggle(
                      name: user.fullName,
                      subtitle: user.designation,
                      avatarUrl: user.avatarUrl,
                      selected: _selectedAssignees.contains(user.id),
                      onTap: () => setState(() {
                        if (_selectedAssignees.contains(user.id)) {
                          _selectedAssignees.remove(user.id);
                        } else {
                          _selectedAssignees.add(user.id);
                        }
                      }),
                    ),
                  ),
              ],
            ),
            loading: () => const ListSkeleton(count: 3),
            error: (e, _) => _FieldError(message: readableError(e)),
          ),
          const SizedBox(height: NebulaSpacing.lg),

          FilledButton(
            onPressed: _submit,
            child: Text(_isEdit ? 'Save changes' : 'Create task'),
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
    this.onClear,
  });

  final String label;
  final DateTime? value;
  final VoidCallback onTap;
  final VoidCallback? onClear;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(NebulaSpacing.radiusSm),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          suffixIcon: onClear == null
              ? const Icon(LucideIcons.calendar, size: 16)
              : IconButton(
                  icon: const Icon(LucideIcons.x, size: 15),
                  tooltip: 'Clear',
                  onPressed: onClear,
                ),
        ),
        child: value == null
            ? Text('Not set', style: context.text.bodyMedium)
            : Mono(DateFormat('d MMM yyyy').format(value!)),
      ),
    );
  }
}

/// One selectable person. Replaces a `FilterChip` grid that gave no room for
/// an avatar or a role.
class _PersonToggle extends StatelessWidget {
  const _PersonToggle({
    required this.name,
    required this.selected,
    required this.onTap,
    this.subtitle,
    this.avatarUrl,
  });

  final String name;
  final String? subtitle;
  final String? avatarUrl;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final scheme = context.scheme;

    return PickerRow(
      selected: selected,
      onTap: onTap,
      child: Row(
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
            color: selected ? scheme.primary : dl.textTertiary,
          ),
        ],
      ),
    );
  }
}

class _FieldError extends StatelessWidget {
  const _FieldError({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Text(
      message,
      style: context.text.bodySmall?.copyWith(color: context.dl.critical),
    );
  }
}
