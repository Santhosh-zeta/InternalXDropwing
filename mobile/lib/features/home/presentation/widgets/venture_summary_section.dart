import 'package:flutter/material.dart';
import '../../data/models/home_models.dart';
import '../../providers/home_provider.dart';

class VentureSummarySection extends StatelessWidget {
  final HomeData data;
  final int accessLevel;

  const VentureSummarySection({
    Key? key,
    required this.data,
    required this.accessLevel,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (accessLevel < 4) {
      return const SizedBox.shrink();
    }

    // Mock data for V1, since venture health isn't fully supported in API yet.
    final ventures = [
      {'name': 'Dropwing', 'health': 98},
      {'name': 'Fenixa', 'health': 92},
      {'name': 'PerSyniX', 'health': 85},
      {'name': 'Grovia', 'health': 95},
    ];

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
                      color: Colors.black.withOpacity(0.05),
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
                    const Text('Health',
                        style: TextStyle(color: Colors.grey, fontSize: 12)),
                    Text('${v['health']}%',
                        style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 24,
                            color: (v['health'] as int) > 90
                                ? Colors.green
                                : Colors.orange)),
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

