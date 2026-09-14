import 'package:flutter/material.dart';
import '../../../auth/data/models/auth_models.dart';
import '../../../../core/theme/nebula_colors.dart';

class GreetingSection extends StatelessWidget {
  final User user;

  const GreetingSection({
    super.key,
    required this.user,
  });

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          _getGreeting(),
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
            color: NebulaColors.textSecondary,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          user.fullName.split(' ').first,
          style: Theme.of(context).textTheme.displayLarge,
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            color: NebulaColors.highlight.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(100),
            border: Border.all(color: NebulaColors.highlight.withValues(alpha: 0.3)),
          ),
          child: Text(
            user.levelName,
            style: const TextStyle(
              color: NebulaColors.highlight,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}
