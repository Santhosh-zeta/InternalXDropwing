import 'package:flutter/material.dart';
import '../../data/models/home_models.dart';
import '../../providers/home_provider.dart';
import 'announcement_card_widget.dart';

class AnnouncementsSection extends StatelessWidget {
  final HomeData data;
  final int accessLevel;

  const AnnouncementsSection({
    Key? key,
    required this.data,
    required this.accessLevel,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (accessLevel >= 4) {
      return const SizedBox.shrink(); // MDs/Super Admin get Venture Summary instead, but maybe we can show both. User said "move the existing dashboard widgets into Home." 
    }

    if (data.analytics.announcements.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Company Updates',
          style: Theme.of(context)
              .textTheme
              .titleMedium
              ?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        ...data.analytics.announcements
            .map((a) => AnnouncementCardWidget(announcement: a))
            .toList(),
      ],
    );
  }
}

