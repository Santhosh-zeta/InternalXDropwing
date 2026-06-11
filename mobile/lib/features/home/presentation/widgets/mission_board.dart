import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/nebula_colors.dart';
import '../../data/models/home_models.dart';

class MissionBoard extends StatelessWidget {
  final List<HomeTask> tasks;

  const MissionBoard({Key? key, required this.tasks}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    int urgent = 0;
    int today = 0;
    int completed = 0;

    final now = DateTime.now();

    for (var task in tasks) {
      if (task.status == 'Completed') {
        completed++;
      } else {
        if (task.priority.toLowerCase() == 'high') {
          urgent++;
        }
        if (task.dueDate != null) {
          try {
            final due = DateTime.parse(task.dueDate!);
            if (due.year == now.year && due.month == now.month && due.day == now.day) {
              today++;
            }
          } catch (_) {}
        }
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'MISSION BOARD',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: NebulaColors.textSecondary,
                letterSpacing: 1.5,
              ),
            ),
            const Icon(LucideIcons.arrowRight, color: NebulaColors.textSecondary, size: 16),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _MissionCard(
                title: 'Urgent',
                count: urgent,
                color: NebulaColors.critical,
                icon: LucideIcons.alertTriangle,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _MissionCard(
                title: 'Today',
                count: today,
                color: NebulaColors.warning,
                icon: LucideIcons.calendar,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _MissionCard(
                title: 'Completed',
                count: completed,
                color: NebulaColors.success,
                icon: LucideIcons.checkCircle2,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _MissionCard extends StatelessWidget {
  final String title;
  final int count;
  final Color color;
  final IconData icon;

  const _MissionCard({
    required this.title,
    required this.count,
    required this.color,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 12),
          Text(
            count.toString(),
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: NebulaColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

