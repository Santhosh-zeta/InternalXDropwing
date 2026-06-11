import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/task_detail_provider.dart';
import '../providers/task_form_provider.dart';

class TaskDetailScreen extends ConsumerWidget {
  final int taskId;

  const TaskDetailScreen({super.key, required this.taskId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final taskAsync = ref.watch(taskDetailProvider(taskId));

    ref.listen(taskFormControllerProvider, (prev, next) {
      if (next is AsyncError) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(next.error.toString())),
        );
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: const Text('Task Details'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () {
              context.push('/tasks/edit/$taskId');
            },
          ),
          IconButton(
            icon: const Icon(Icons.delete),
            onPressed: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (c) => AlertDialog(
                  title: const Text('Delete Task?'),
                  content: const Text('This action cannot be undone.'),
                  actions: [
                    TextButton(onPressed: () => context.pop(false), child: const Text('Cancel')),
                    TextButton(onPressed: () => context.pop(true), child: const Text('Delete', style: TextStyle(color: Colors.red))),
                  ],
                )
              );
              if (confirm == true) {
                final success = await ref.read(taskFormControllerProvider.notifier).deleteTask(taskId);
                if (success && context.mounted) {
                  context.pop();
                }
              }
            },
          )
        ],
      ),
      body: taskAsync.when(
        data: (task) {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(task.title, style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Chip(label: Text(task.status)),
                    const SizedBox(width: 8),
                    Chip(label: Text(task.priority)),
                  ],
                ),
                const SizedBox(height: 16),
                Text('Description', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                Text(task.description ?? 'No description provided.'),
                const SizedBox(height: 16),
                Text('Assignees', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                if (task.assignees.isEmpty)
                  const Text('No one assigned.')
                else
                  Wrap(
                    spacing: 8,
                    children: task.assignees.map((a) => Chip(
                      avatar: const CircleAvatar(child: Icon(Icons.person, size: 16)),
                      label: Text(a.name),
                    )).toList(),
                  ),
                const SizedBox(height: 16),
                if (task.dueDate != null) ...[
                  Text('Due Date: ${task.dueDate!.toLocal().toString().split(' ')[0]}'),
                ],
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, st) => Center(child: Text('Error: $e')),
      ),
    );
  }
}
