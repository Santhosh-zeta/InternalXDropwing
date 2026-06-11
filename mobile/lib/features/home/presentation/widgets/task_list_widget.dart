import 'package:flutter/material.dart';
import '../../data/models/home_models.dart';
import 'package:intl/intl.dart';

class TaskListWidget extends StatelessWidget {
  final List<HomeTask> tasks;
  final String title;
  final bool emptyStateIsPositive;

  const TaskListWidget({
    Key? key, 
    required this.tasks, 
    required this.title,
    this.emptyStateIsPositive = false,
  }) : super(key: key);

  Color _getPriorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'high': return Colors.red;
      case 'medium': return Colors.orange;
      case 'low': return Colors.green;
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (tasks.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4.0, vertical: 8.0),
            child: Text(
              title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Theme.of(context).dividerColor.withOpacity(0.1)),
            ),
            child: Column(
              children: [
                Icon(
                  emptyStateIsPositive ? Icons.check_circle_outline : Icons.inbox,
                  size: 48,
                  color: Theme.of(context).disabledColor,
                ),
                const SizedBox(height: 16),
                Text(
                  emptyStateIsPositive ? 'No pending tasks right now. Great job!' : 'No tasks found.',
                  style: TextStyle(color: Theme.of(context).disabledColor),
                ),
              ],
            ),
          )
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4.0, vertical: 8.0),
          child: Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: tasks.length > 5 ? 5 : tasks.length,
          separatorBuilder: (context, index) => const SizedBox(height: 8),
          itemBuilder: (context, index) {
            final task = tasks[index];
            DateTime? parsedDate;
            try {
              if (task.dueDate != null) {
                parsedDate = DateTime.parse(task.dueDate!);
              }
            } catch (e) {
              // ignore
            }

            return Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).cardColor,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Theme.of(context).dividerColor.withOpacity(0.1)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    task.title,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Theme.of(context).scaffoldBackgroundColor,
                          border: Border.all(color: Theme.of(context).dividerColor.withOpacity(0.2)),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          task.status,
                          style: TextStyle(fontSize: 10, color: Theme.of(context).textTheme.bodySmall?.color),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Row(
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: _getPriorityColor(task.priority),
                            ),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${task.priority} Priority',
                            style: TextStyle(fontSize: 11, color: Theme.of(context).textTheme.bodySmall?.color),
                          ),
                        ],
                      ),
                      const Spacer(),
                      if (parsedDate != null)
                        Text(
                          'Due: ${DateFormat('MMM d').format(parsedDate)}',
                          style: TextStyle(fontSize: 11, color: Theme.of(context).textTheme.bodySmall?.color),
                        ),
                    ],
                  ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }
}

