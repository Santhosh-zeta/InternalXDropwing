import 'package:flutter/material.dart';
import 'dart:ui';
import '../../../../core/theme/nebula_colors.dart';
import '../../../../core/theme/nebula_shadows.dart';

class MissionControlLayer extends StatelessWidget {
  final int criticalTasks;
  final int pendingProjects;
  final int documentsToApprove;

  const MissionControlLayer({
    Key? key,
    required this.criticalTasks,
    required this.pendingProjects,
    required this.documentsToApprove,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: NebulaColors.surfaceCard.withOpacity(0.5),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withOpacity(0.1)),
            boxShadow: NebulaShadows.subtle,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'TODAY\'S MISSION',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: NebulaColors.highlight,
                  letterSpacing: 1.5,
                ),
              ),
              const SizedBox(height: 16),
              if (criticalTasks > 0)
                _MissionItem(
                  icon: Icons.warning_amber_rounded,
                  text: 'Complete $criticalTasks critical task${criticalTasks == 1 ? '' : 's'}',
                  color: NebulaColors.critical,
                ),
              if (pendingProjects > 0)
                _MissionItem(
                  icon: Icons.folder_special_outlined,
                  text: 'Review $pendingProjects project${pendingProjects == 1 ? '' : 's'}',
                  color: NebulaColors.warning,
                ),
              if (documentsToApprove > 0)
                _MissionItem(
                  icon: Icons.fact_check_outlined,
                  text: 'Approve $documentsToApprove document${documentsToApprove == 1 ? '' : 's'}',
                  color: NebulaColors.success,
                ),
              if (criticalTasks == 0 && pendingProjects == 0 && documentsToApprove == 0)
                _MissionItem(
                  icon: Icons.check_circle_outline,
                  text: 'All clear for today. Explore the galaxy.',
                  color: NebulaColors.highlight,
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MissionItem extends StatelessWidget {
  final IconData icon;
  final String text;
  final Color color;

  const _MissionItem({
    required this.icon,
    required this.text,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}
