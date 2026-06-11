import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/nebula_colors.dart';
import '../../data/models/home_models.dart';

class LiveActivityStream extends StatefulWidget {
  final List<ActivityItem> activities;

  const LiveActivityStream({Key? key, required this.activities}) : super(key: key);

  @override
  State<LiveActivityStream> createState() => _LiveActivityStreamState();
}

class _LiveActivityStreamState extends State<LiveActivityStream> {
  // Use to animate items in sequence
  final GlobalKey<AnimatedListState> _listKey = GlobalKey<AnimatedListState>();
  
  @override
  Widget build(BuildContext context) {
    if (widget.activities.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: NebulaColors.highlight,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(color: NebulaColors.highlight.withOpacity(0.5), blurRadius: 10)
                ],
              ),
            ),
            const SizedBox(width: 8),
            Text(
              'LIVE ACTIVITY',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: NebulaColors.textSecondary,
                letterSpacing: 1.5,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: NebulaColors.surfaceCard.withOpacity(0.3),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.white.withOpacity(0.05)),
          ),
          child: ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: widget.activities.length > 5 ? 5 : widget.activities.length,
            itemBuilder: (context, index) {
              return _ActivityStreamItem(
                activity: widget.activities[index],
                isLast: index == (widget.activities.length > 5 ? 4 : widget.activities.length - 1),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _ActivityStreamItem extends StatelessWidget {
  final ActivityItem activity;
  final bool isLast;

  const _ActivityStreamItem({required this.activity, required this.isLast});

  @override
  Widget build(BuildContext context) {
    IconData icon;
    Color color;

    if (activity.action.toLowerCase().contains('task')) {
      icon = LucideIcons.checkCircle2;
      color = NebulaColors.success;
    } else if (activity.action.toLowerCase().contains('project')) {
      icon = LucideIcons.folder;
      color = NebulaColors.primary;
    } else {
      icon = LucideIcons.zap;
      color = NebulaColors.highlight;
    }

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 24,
            child: Column(
              children: [
                const SizedBox(height: 12),
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(color: color.withOpacity(0.5), blurRadius: 5)
                    ]
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 1,
                      color: color.withOpacity(0.2),
                    ),
                  ),
                if (isLast)
                   const SizedBox(height: 12), // Padding for the last item
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 8.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    activity.action,
                    style: const TextStyle(
                      color: NebulaColors.textPrimary,
                      fontWeight: FontWeight.w500,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    activity.createdAt,
                    style: const TextStyle(
                      color: NebulaColors.textSecondary,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

