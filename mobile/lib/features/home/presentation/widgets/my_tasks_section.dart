import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../data/models/home_models.dart';

class MyTasksSection extends StatelessWidget {
  final List<HomeTask> tasks;

  const MyTasksSection({
    super.key,
    required this.tasks,
  });

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();

    int dueToday = 0;
    int overdue = 0;
    int inProgress = 0;
    int completed = 0;

    for (var task in tasks) {
      if (task.status == 'Completed') {
        completed++;
      } else if (task.status == 'In Progress') {
        inProgress++;
      }

      if (task.dueDate != null) {
        try {
          final due = DateTime.parse(task.dueDate!);
          if (due.year == now.year &&
              due.month == now.month &&
              due.day == now.day) {
            dueToday++;
          } else if (due.isBefore(now)) {
            overdue++;
          }
        } catch (_) {}
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('My Tasks',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold)),
            TextButton(
              onPressed: () => context.go('/tasks'),
              child: const Text('View All'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 100,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              _TaskStatusCard(
                  title: 'Due Today', count: dueToday, color: Colors.orange),
              _TaskStatusCard(
                  title: 'Overdue', count: overdue, color: Colors.red),
              _TaskStatusCard(
                  title: 'In Progress', count: inProgress, color: Colors.blue),
              _TaskStatusCard(
                  title: 'Completed', count: completed, color: Colors.green),
            ],
          ),
        ),
      ],
    );
  }
}

class _TaskStatusCard extends StatelessWidget {
  final String title;
  final int count;
  final Color color;

  const _TaskStatusCard({
    required this.title,
    required this.count,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 120,
      margin: const EdgeInsets.only(right: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(title,
              style: TextStyle(
                  color: color.withValues(alpha: 0.8),
                  fontSize: 13,
                  fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text(count.toString(),
              style: TextStyle(
                  color: color, fontSize: 24, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}

