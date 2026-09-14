import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../data/models/task_models.dart';
import '../providers/task_form_provider.dart';
import '../providers/task_detail_provider.dart';
import '../providers/task_list_provider.dart';
import '../../../projects/presentation/providers/projects_provider.dart';
import '../../../team/presentation/providers/team_provider.dart';

class TaskFormScreen extends ConsumerStatefulWidget {
  final int? taskId;

  const TaskFormScreen({super.key, this.taskId});

  @override
  ConsumerState<TaskFormScreen> createState() => _TaskFormScreenState();
}

class _TaskFormScreenState extends ConsumerState<TaskFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _titleController;
  late TextEditingController _descController;
  String _priority = 'medium';
  DateTime? _dueDate;
  int? _selectedProjectId;
  int? _selectedParentTaskId;
  List<int> _selectedAssignees = [];

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController();
    _descController = TextEditingController();
    
    if (widget.taskId != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        final taskState = ref.read(taskDetailProvider(widget.taskId!));
        if (taskState.hasValue) {
          final task = taskState.value!;
          _titleController.text = task.title;
          _descController.text = task.description ?? '';
          _priority = task.priority;
          _dueDate = task.dueDate;
          _selectedProjectId = task.projectId;
          _selectedParentTaskId = task.parentTaskId;
          _selectedAssignees = task.assignees.map((a) => a.id).toList();
          setState(() {});
        }
      });
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    super.dispose();
  }

  void _submit() async {
    if (_formKey.currentState!.validate()) {
      if (_selectedAssignees.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please select at least one assignee')),
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

      final success = await ref.read(taskFormControllerProvider.notifier).submitTask(
        dto,
        existingTaskId: widget.taskId,
      );

      if (success && mounted) {
        context.pop();
      }
    }
  }

  Future<void> _selectDueDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _dueDate ?? DateTime.now(),
      firstDate: DateTime(2000),
      lastDate: DateTime(2101),
    );
    if (picked != null && picked != _dueDate) {
      setState(() {
        _dueDate = picked;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final formState = ref.watch(taskFormControllerProvider);
    final projectsAsync = ref.watch(projectListProvider);
    final usersAsync = ref.watch(teamMembersProvider);
    final tasksAsync = ref.watch(filteredTasksProvider);

    ref.listen(taskFormControllerProvider, (prev, next) {
      if (next is AsyncError) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(next.error.toString())),
        );
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.taskId == null ? 'Create Task' : 'Edit Task'),
      ),
      body: formState is AsyncLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TextFormField(
                      controller: _titleController,
                      decoration: const InputDecoration(labelText: 'Title'),
                      validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _descController,
                      decoration: const InputDecoration(labelText: 'Description'),
                      maxLines: 4,
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      initialValue: _priority,
                      decoration: const InputDecoration(labelText: 'Priority'),
                      items: const [
                        DropdownMenuItem(value: 'low', child: Text('Low')),
                        DropdownMenuItem(value: 'medium', child: Text('Medium')),
                        DropdownMenuItem(value: 'high', child: Text('High')),
                        DropdownMenuItem(value: 'urgent', child: Text('Urgent')),
                      ],
                      onChanged: (v) => setState(() => _priority = v!),
                    ),
                    const SizedBox(height: 16),
                    
                    // Due Date Picker
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Due Date'),
                      subtitle: Text(_dueDate == null ? 'Not set' : DateFormat('MMM d, yyyy').format(_dueDate!)),
                      trailing: const Icon(Icons.calendar_today),
                      onTap: () => _selectDueDate(context),
                    ),
                    const SizedBox(height: 16),

                    // Project Dropdown
                    projectsAsync.when(
                      data: (projects) => DropdownButtonFormField<int?>(
                        initialValue: _selectedProjectId,
                        decoration: const InputDecoration(labelText: 'Link to Project'),
                        items: [
                          const DropdownMenuItem<int?>(value: null, child: Text('No Project')),
                          ...projects.map((p) => DropdownMenuItem<int?>(value: p.id, child: Text(p.name))),
                        ],
                        onChanged: (v) => setState(() => _selectedProjectId = v),
                      ),
                      loading: () => const LinearProgressIndicator(),
                      error: (_, __) => const Text('Error loading projects'),
                    ),
                    const SizedBox(height: 16),

                    // Parent Task Dropdown
                    tasksAsync.when(
                      data: (tasks) {
                        final availableTasks = tasks.where((t) => t.id != widget.taskId && (t.projectId == _selectedProjectId || _selectedProjectId == null)).toList();
                        return DropdownButtonFormField<int?>(
                          initialValue: _selectedParentTaskId,
                          decoration: const InputDecoration(labelText: 'Parent Task (Subtask of)'),
                          items: [
                            const DropdownMenuItem<int?>(value: null, child: Text('None (Top-level)')),
                            ...availableTasks.map((t) => DropdownMenuItem<int?>(value: t.id, child: Text(t.title))),
                          ],
                          onChanged: (v) => setState(() => _selectedParentTaskId = v),
                        );
                      },
                      loading: () => const LinearProgressIndicator(),
                      error: (_, __) => const Text('Error loading tasks'),
                    ),
                    const SizedBox(height: 16),

                    // Assignees
                    const Text('Assign To', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    usersAsync.when(
                      data: (users) => Wrap(
                        spacing: 8,
                        children: users.map((user) {
                          final isSelected = _selectedAssignees.contains(user.id);
                          return FilterChip(
                            label: Text(user.fullName),
                            selected: isSelected,
                            onSelected: (selected) {
                              setState(() {
                                if (selected) {
                                  _selectedAssignees.add(user.id);
                                } else {
                                  _selectedAssignees.remove(user.id);
                                }
                              });
                            },
                          );
                        }).toList(),
                      ),
                      loading: () => const CircularProgressIndicator(),
                      error: (_, __) => const Text('Error loading users'),
                    ),
                    const SizedBox(height: 32),
                    
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _submit,
                        child: const Text('Save Task'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
