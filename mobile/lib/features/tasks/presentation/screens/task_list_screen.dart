import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../providers/task_list_provider.dart';
import '../../data/models/task_models.dart';

class TaskListScreen extends ConsumerWidget {
  const TaskListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tasksAsync = ref.watch(filteredTasksProvider);
    final currentFilter = ref.watch(taskFilterProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title:
            const Text('Tasks', style: TextStyle(fontWeight: FontWeight.w600)),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(120),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Search Bar
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                child: TextField(
                  decoration: InputDecoration(
                    hintText: 'Search tasks...',
                    prefixIcon: const Icon(Icons.search, color: Colors.grey),
                    filled: true,
                    fillColor: Colors.grey[100],
                    contentPadding: const EdgeInsets.symmetric(vertical: 0),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                  ),
                  onChanged: (value) {
                    ref.read(taskSearchQueryProvider.notifier).state = value;
                  },
                ),
              ),
              // Filters
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding:
                    const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                child: Row(
                  children: [
                    _FilterChip(
                      label: 'All',
                      isSelected: currentFilter == TaskFilter.all,
                      onSelected: () => ref
                          .read(taskFilterProvider.notifier)
                          .state = TaskFilter.all,
                    ),
                    const SizedBox(width: 8),
                    _FilterChip(
                      label: 'Assigned To Me',
                      isSelected: currentFilter == TaskFilter.assignedToMe,
                      onSelected: () => ref
                          .read(taskFilterProvider.notifier)
                          .state = TaskFilter.assignedToMe,
                    ),
                    const SizedBox(width: 8),
                    _FilterChip(
                      label: 'Created By Me',
                      isSelected: currentFilter == TaskFilter.createdByMe,
                      onSelected: () => ref
                          .read(taskFilterProvider.notifier)
                          .state = TaskFilter.createdByMe,
                    ),
                    const SizedBox(width: 8),
                    _FilterChip(
                      label: 'Overdue',
                      isSelected: currentFilter == TaskFilter.overdue,
                      onSelected: () => ref
                          .read(taskFilterProvider.notifier)
                          .state = TaskFilter.overdue,
                    ),
                    const SizedBox(width: 8),
                    _FilterChip(
                      label: 'Completed',
                      isSelected: currentFilter == TaskFilter.completed,
                      onSelected: () => ref
                          .read(taskFilterProvider.notifier)
                          .state = TaskFilter.completed,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      body: tasksAsync.when(
        data: (tasks) {
          if (tasks.isEmpty) {
            return const Center(
                child: Text('No tasks found.',
                    style: TextStyle(color: Colors.grey)));
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(taskListProvider);
            },
            child: ListView.separated(
              padding: const EdgeInsets.all(16.0),
              itemCount: tasks.length,
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final task = tasks[index];
                return _TaskCard(task: task);
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, st) => Center(child: Text('Error: $e')),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          context.push('/tasks/create');
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}

class _TaskCard extends StatelessWidget {
  final TaskModel task;

  const _TaskCard({required this.task});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isCompleted = task.status.toLowerCase() == 'completed' ||
        task.status.toLowerCase() == 'done';
    final isOverdue = task.dueDate != null &&
        !isCompleted &&
        task.dueDate!.isBefore(DateTime.now());

    Color statusColor = Colors.grey;
    if (isCompleted) {
      statusColor = Colors.green;
    } else if (isOverdue) {
      statusColor = Colors.red;
    } else if (task.status.toLowerCase() == 'in-progress' ||
        task.status.toLowerCase() == 'in progress') {
      statusColor = Colors.blue;
    } else if (task.status.toLowerCase() == 'pending' ||
        task.status.toLowerCase() == 'to do') {
      statusColor = Colors.orange;
    }

    Color priorityColor = Colors.grey;
    switch (task.priority.toLowerCase()) {
      case 'high':
        priorityColor = Colors.redAccent;
        break;
      case 'medium':
        priorityColor = Colors.orangeAccent;
        break;
      case 'low':
        priorityColor = Colors.greenAccent;
        break;
    }

    return InkWell(
      onTap: () => context.push('/tasks/${task.id}'),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    task.title,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      decoration:
                          isCompleted ? TextDecoration.lineThrough : null,
                      color: isCompleted ? Colors.grey : Colors.black87,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    task.status.toUpperCase(),
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: statusColor,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (task.projectName != null || task.ventureName != null) ...[
              Row(
                children: [
                  const Icon(Icons.folder_outlined,
                      size: 14, color: Colors.grey),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      [task.ventureName, task.projectName]
                          .where((e) => e != null && e.isNotEmpty)
                          .join(' / '),
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
            ],
            Row(
              children: [
                // Priority
                Row(
                  children: [
                    Icon(Icons.flag, size: 14, color: priorityColor),
                    const SizedBox(width: 4),
                    Text(
                      task.priority,
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ],
                ),
                const SizedBox(width: 16),
                // Due Date
                if (task.dueDate != null) ...[
                  Row(
                    children: [
                      Icon(Icons.calendar_today_outlined,
                          size: 14,
                          color: isOverdue ? Colors.red : Colors.grey),
                      const SizedBox(width: 4),
                      Text(
                        DateFormat('MMM d, yyyy').format(task.dueDate!),
                        style: TextStyle(
                            fontSize: 12,
                            color: isOverdue ? Colors.red : Colors.grey,
                            fontWeight: isOverdue
                                ? FontWeight.w600
                                : FontWeight.normal),
                      ),
                    ],
                  ),
                ],
                const Spacer(),
                // Assignees
                if (task.assignees.isNotEmpty)
                  SizedBox(
                    width: task.assignees.length * 16.0 + 12,
                    height: 24,
                    child: Stack(
                      children: List.generate(
                        task.assignees.length > 3 ? 3 : task.assignees.length,
                        (i) => Positioned(
                          right: i * 14.0,
                          child: CircleAvatar(
                            radius: 12,
                            backgroundColor: theme.primaryColor,
                            backgroundImage: task.assignees[i].avatar != null
                                ? NetworkImage(task.assignees[i].avatar!)
                                : null,
                            child: task.assignees[i].avatar == null
                                ? Text(
                                    task.assignees[i].name.isNotEmpty
                                        ? task.assignees[i].name[0]
                                            .toUpperCase()
                                        : '?',
                                    style: const TextStyle(
                                        fontSize: 10, color: Colors.white),
                                  )
                                : null,
                          ),
                        ),
                      ),
                    ),
                  )
                else if (task.assignedByName != null)
                  Row(
                    children: [
                      const Icon(Icons.person_outline,
                          size: 14, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text(
                        task.assignedByName!,
                        style:
                            const TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    ],
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onSelected;

  const _FilterChip({
    required this.label,
    required this.isSelected,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => onSelected(),
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : Colors.black87,
        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
      ),
      selectedColor: Theme.of(context).primaryColor,
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(
          color: isSelected ? Colors.transparent : Colors.grey.shade300,
        ),
      ),
      showCheckmark: false,
    );
  }
}
