import 'package:flutter/material.dart';
import '../../../../core/constants/access_levels.dart';
import '../../data/models/home_models.dart';
import 'announcement_card_widget.dart';

class AnnouncementsSection extends StatelessWidget {
  final HomeData data;
  final int accessLevel;

  const AnnouncementsSection({
    super.key,
    required this.data,
    required this.accessLevel,
  });

  @override
  Widget build(BuildContext context) {
    // Admin (3) and above get the cross-venture summary instead.
    if (AccessLevels.hasAtLeast(accessLevel, AccessLevels.admin)) {
      return const SizedBox.shrink();
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
            ,
      ],
    );
  }
}

