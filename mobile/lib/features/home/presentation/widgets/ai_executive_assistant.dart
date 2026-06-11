import 'package:flutter/material.dart';
import 'dart:ui';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/nebula_colors.dart';

class AiExecutiveAssistant extends StatelessWidget {
  final String userName;

  const AiExecutiveAssistant({Key? key, required this.userName}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: NebulaColors.primary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: NebulaColors.primary.withOpacity(0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: NebulaColors.primary.withOpacity(0.2),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(LucideIcons.sparkles, color: NebulaColors.highlight, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'DGOS AI',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: NebulaColors.highlight,
                      letterSpacing: 2,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Text(
                'Good morning ${userName.split(" ").first}.',
                style: const TextStyle(
                  color: NebulaColors.textPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'Project completion increased 14% this week.\nTwo projects require attention.\nOne critical task is overdue.',
                style: TextStyle(
                  color: NebulaColors.textSecondary,
                  fontSize: 14,
                  height: 1.6,
                ),
              ),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Ask DGOS AI anything...',
                      style: TextStyle(
                        color: Colors.white38,
                        fontSize: 13,
                      ),
                    ),
                    Icon(LucideIcons.mic, color: Colors.white38, size: 16),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
