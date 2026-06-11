import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../data/models/task_models.dart';
import '../providers/task_form_provider.dart';
import '../providers/task_detail_provider.dart';

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

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController();
    _descController = TextEditingController();
    
    if (widget.taskId != null) {
      // For a real app, you'd wait for data or use it if available.
      // Here we assume if taskId is provided, the data is likely in cache or we should load it.
      // A future improvement: delay rendering until data loads.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        final taskState = ref.read(taskDetailProvider(widget.taskId!));
        if (taskState.hasValue) {
          final task = taskState.value!;
          _titleController.text = task.title;
          _descController.text = task.description ?? '';
          _priority = task.priority;
          _dueDate = task.dueDate;
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
      final dto = TaskRequestDto(
        title: _titleController.text,
        description: _descController.text,
        assignedTo: [0], // TODO: Select assignees
        priority: _priority,
        dueDate: _dueDate?.toIso8601String(),
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

  @override
  Widget build(BuildContext context) {
    final formState = ref.watch(taskFormControllerProvider);

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
                      value: _priority,
                      decoration: const InputDecoration(labelText: 'Priority'),
                      items: const [
                        DropdownMenuItem(value: 'low', child: Text('Low')),
                        DropdownMenuItem(value: 'medium', child: Text('Medium')),
                        DropdownMenuItem(value: 'high', child: Text('High')),
                        DropdownMenuItem(value: 'urgent', child: Text('Urgent')),
                      ],
                      onChanged: (v) => setState(() => _priority = v!),
                    ),
                    const SizedBox(height: 24),
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
