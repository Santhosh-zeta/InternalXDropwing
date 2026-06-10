import 'package:flutter/material.dart';
import '../../data/models/dashboard_models.dart';

class AnnouncementCardWidget extends StatelessWidget {
  final Announcement announcement;

  const AnnouncementCardWidget({Key? key, required this.announcement}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isUpdate = announcement.type.toLowerCase() == 'update';
    final iconColor = isUpdate ? Colors.purple : Colors.amber;
    final iconData = isUpdate ? Icons.campaign : Icons.notifications_active;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Theme.of(context).dividerColor.withOpacity(0.1)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 5,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(iconData, size: 16, color: iconColor),
              const SizedBox(width: 8),
              Text(
                announcement.type.toUpperCase(),
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.0,
                  color: Theme.of(context).textTheme.bodySmall?.color,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            announcement.title,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
          ),
          const SizedBox(height: 4),
          Text(
            announcement.content,
            style: TextStyle(fontSize: 13, color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.8)),
          ),
        ],
      ),
    );
  }
}
