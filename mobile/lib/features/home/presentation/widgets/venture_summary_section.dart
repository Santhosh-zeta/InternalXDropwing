import 'package:flutter/material.dart';
import '../../../../core/constants/access_levels.dart';
import '../../data/models/home_models.dart';

class VentureSummarySection extends StatelessWidget {
  final HomeData data;
  final int accessLevel;

  const VentureSummarySection({
    super.key,
    required this.data,
    required this.accessLevel,
  });

  @override
  Widget build(BuildContext context) {
    // Cross-venture roll-up: Admin (3) and above only. Everyone less
    // privileged sees the announcements feed instead.
    if (!AccessLevels.hasAtLeast(accessLevel, AccessLevels.admin)) {
      return const SizedBox.shrink();
    }

    // `v.value` is the venture's active user headcount (see the backend's
    // `userDistribution` query in analytics.routes.js) — there is no "venture
    // health" concept anywhere in the API, so show the real headcount rather
    // than a number invented from it.
    final ventures = data.analytics.userDistribution.map((v) {
      Color c = Colors.blue;
      try {
        if (v.colorHex.isNotEmpty) {
          c = Color(int.parse(v.colorHex.replaceFirst('#', '0xff')));
        }
      } catch (_) {}
      return {
        'name': v.name,
        'members': v.value,
        'color': c,
      };
    }).toList();

    // No real ventures to summarise — an honest empty state, not a
    // fabricated card.
    if (ventures.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Venture Overview',
          style: Theme.of(context)
              .textTheme
              .titleMedium
              ?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 140,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: ventures.length,
            itemBuilder: (context, index) {
              final v = ventures[index];
              return Container(
                width: 160,
                margin: const EdgeInsets.only(right: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).cardColor,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.05),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(v['name'] as String,
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 8),
                    const Text('Active Members',
                        style: TextStyle(color: Colors.grey, fontSize: 12)),
                    Text('${v['members']}',
                        style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 24,
                            color: v['color'] as Color)),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

