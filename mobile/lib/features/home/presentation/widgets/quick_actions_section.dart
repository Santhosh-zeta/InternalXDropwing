import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/access_levels.dart';

class QuickActionsSection extends StatelessWidget {
  final int accessLevel;

  const QuickActionsSection({
    super.key,
    required this.accessLevel,
  });

  @override
  Widget build(BuildContext context) {
    // V1 Quick Actions: Create Task, Create Project, Upload Document, View Tasks
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Quick Actions',
          style: Theme.of(context)
              .textTheme
              .titleMedium
              ?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            // `POST /api/tasks` is requireLevel(7): interns (8) and clients (9)
            // would get a 403, so they do not get the button.
            if (AccessLevels.hasAtLeast(accessLevel, ApiAccess.createTask))
              _QuickActionButton(
                icon: Icons.add_task,
                label: 'Create Task',
                color: Colors.blue,
                onTap: () => context.push('/tasks/create'),
              ),
            // `POST /api/projects` is requireLevel(4) — CXO and above.
            if (AccessLevels.hasAtLeast(accessLevel, ApiAccess.createProject))
              _QuickActionButton(
                icon: Icons.create_new_folder,
                label: 'Create Project',
                color: Colors.purple,
                onTap: () {}, // To be implemented later
              ),
            // `POST /api/documents/upload` carries no level guard, so every
            // authenticated user may upload.
            _QuickActionButton(
              icon: Icons.upload_file,
              label: 'Upload Document',
              color: Colors.teal,
              onTap: () {}, // To be implemented later
            ),
            _QuickActionButton(
              icon: Icons.task_alt,
              label: 'View Tasks',
              color: Colors.orange,
              onTap: () => context.go('/tasks'),
            ),
          ],
        ),
      ],
    );
  }
}

class _QuickActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _QuickActionButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 100,
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(label,
                textAlign: TextAlign.center,
                style: TextStyle(
                    fontSize: 12, color: color, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}
