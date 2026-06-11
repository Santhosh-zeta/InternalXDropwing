import 'package:flutter/material.dart';
import '../../data/models/home_models.dart';
import '../../providers/home_provider.dart';
import 'kpi_card_widget.dart';

class QuickStatsSection extends StatelessWidget {
  final HomeData data;
  final int accessLevel;

  const QuickStatsSection({
    Key? key,
    required this.data,
    required this.accessLevel,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    List<Widget> cards = [];

    if (accessLevel >= 4) {
      // Managing Director / Super Admin
      cards = [
        KPICardWidget(
            kpi: KPICard(
                title: 'Active Ventures',
                value: '4',
                icon: 'activity',
                color: '#8b5cf6')),
        KPICardWidget(
            kpi: KPICard(
                title: 'Active Projects',
                value: '12',
                icon: 'folder',
                color: '#06b6d4')),
        KPICardWidget(
            kpi: KPICard(
                title: 'Open Tasks',
                value: data.tasks.length.toString(),
                icon: 'check-circle',
                color: '#10b981')),
        KPICardWidget(
            kpi: KPICard(
                title: 'Pending Approvals',
                value: '3',
                icon: 'clock',
                color: '#f59e0b')),
      ];
    } else if (accessLevel == 3) {
      // Manager
      cards = [
        KPICardWidget(
            kpi: KPICard(
                title: 'My Team', value: '8', icon: 'users', color: '#8b5cf6')),
        KPICardWidget(
            kpi: KPICard(
                title: 'Active Projects',
                value: '5',
                icon: 'folder',
                color: '#06b6d4')),
        KPICardWidget(
            kpi: KPICard(
                title: 'Tasks Due Today',
                value: '2',
                icon: 'clock',
                color: '#f59e0b')),
        KPICardWidget(
            kpi: KPICard(
                title: 'Pending Reviews',
                value: '4',
                icon: 'activity',
                color: '#10b981')),
      ];
    } else {
      // Intern / Staff
      final myTasks = data.tasks;
      final inProgress = myTasks.where((t) => t.status == 'In Progress').length;
      cards = [
        KPICardWidget(
            kpi: KPICard(
                title: 'Assigned Tasks',
                value: myTasks.length.toString(),
                icon: 'check-circle',
                color: '#8b5cf6')),
        KPICardWidget(
            kpi: KPICard(
                title: 'Learning Progress',
                value: '75%',
                icon: 'activity',
                color: '#06b6d4')),
        KPICardWidget(
            kpi: KPICard(
                title: 'Checklists',
                value: '2/5',
                icon: 'clock',
                color: '#f59e0b')),
      ];
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Quick Stats',
          style: Theme.of(context)
              .textTheme
              .titleMedium
              ?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.1,
          children: cards,
        ),
      ],
    );
  }
}

