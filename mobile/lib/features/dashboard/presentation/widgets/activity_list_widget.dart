import 'package:flutter/material.dart';
import '../../data/models/dashboard_models.dart';
import 'package:intl/intl.dart';

class ActivityListWidget extends StatelessWidget {
  final List<ActivityItem> activities;

  const ActivityListWidget({Key? key, required this.activities}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (activities.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24.0),
          child: Text('No recent activity found.'),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4.0, vertical: 8.0),
          child: Text(
            'Recent Activity',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: activities.length > 5 ? 5 : activities.length,
          separatorBuilder: (context, index) => const Divider(height: 1),
          itemBuilder: (context, index) {
            final activity = activities[index];
            DateTime? parsedDate;
            try {
              parsedDate = DateTime.parse(activity.createdAt);
            } catch (e) {
              // ignore
            }

            return ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Theme.of(context).primaryColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(Icons.local_activity, size: 16, color: Theme.of(context).primaryColor),
              ),
              title: Text(
                activity.action,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
              ),
              subtitle: Text(
                '${activity.userName ?? 'System'} • ${parsedDate != null ? DateFormat('MMM d, h:mm a').format(parsedDate) : activity.createdAt}',
                style: TextStyle(fontSize: 12, color: Theme.of(context).textTheme.bodySmall?.color),
              ),
            );
          },
        ),
      ],
    );
  }
}
