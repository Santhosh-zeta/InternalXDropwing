import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../domain/providers/dashboard_providers.dart';
import '../../data/models/dashboard_models.dart';
import '../../../auth/data/models/auth_models.dart';
import '../widgets/kpi_card_widget.dart';
import '../widgets/activity_list_widget.dart';
import '../widgets/announcement_card_widget.dart';
import '../widgets/task_list_widget.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({Key? key}) : super(key: key);

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardDataAsync = ref.watch(dashboardDataProvider);

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.background,
      body: dashboardDataAsync.when(
        data: (data) => RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(dashboardDataProvider);
            ref.invalidate(unreadNotificationsProvider);
          },
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverAppBar(
                expandedHeight: 120.0,
                floating: true,
                pinned: true,
                flexibleSpace: FlexibleSpaceBar(
                  titlePadding: const EdgeInsets.only(left: 16, bottom: 16),
                  title: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${_getGreeting()}, ${data.currentUser.fullName.split(' ').first}',
                        style: const TextStyle(
                            fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        data.currentUser.levelName ?? 'Employee',
                        style: const TextStyle(
                            fontSize: 12, fontWeight: FontWeight.normal),
                      ),
                    ],
                  ),
                ),
                actions: const [
                  _NotificationBell(),
                  Padding(
                    padding: EdgeInsets.only(right: 16.0),
                    child: CircleAvatar(
                      radius: 16,
                      child: Icon(Icons.person, size: 20),
                    ),
                  ),
                ],
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: _buildDashboardContent(context, data),
                ),
              ),
            ],
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              Text('Failed to load dashboard',
                  style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              Text(error.toString(),
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Theme.of(context).disabledColor)),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () {
                  ref.invalidate(dashboardDataProvider);
                  ref.invalidate(unreadNotificationsProvider);
                },
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDashboardContent(BuildContext context, DashboardData data) {
    final accessLevel = data.currentUser.accessLevel;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildQuickStats(context, data, accessLevel),
        const SizedBox(height: 24),
        _buildQuickActions(context, accessLevel),
        const SizedBox(height: 24),
        _buildMyTasks(context, data.tasks),
        const SizedBox(height: 24),
        // V2 Feature: Recent Activity
        // _buildRecentActivity(context, data.analytics.recentActivity),
        // const SizedBox(height: 24),

        // V1/V2 Logic Split for Company Updates / Venture Overview
        // If it's venture overview (accessLevel >= 4), this is V2.
        // If it's announcements (accessLevel < 4), this is V1.
        if (accessLevel < 4) ...[
          _buildCompanyUpdates(context, data, accessLevel),
          const SizedBox(height: 24),
        ],
        // V2 Feature: Venture Overview
        // if (accessLevel >= 4) ...[
        //   _buildCompanyUpdates(context, data, accessLevel),
        //   const SizedBox(height: 24),
        // ],
      ],
    );
  }

  Widget _buildQuickStats(
      BuildContext context, DashboardData data, int accessLevel) {
    List<Widget> cards = [];

    if (accessLevel >= 4) {
      // Managing Director
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

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.1,
      children: cards,
    );
  }

  Widget _buildQuickActions(BuildContext context, int accessLevel) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Quick Actions',
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            _QuickActionButton(
              icon: Icons.add_task,
              label: 'Create Task',
              color: Colors.blue,
              onTap: () => context.push('/tasks/create'),
            ),
            if (accessLevel >= 3)
              _QuickActionButton(
                icon: Icons.create_new_folder,
                label: 'Create Project',
                color: Colors.purple,
                onTap: () {},
              ),
            if (accessLevel >= 4)
              _QuickActionButton(
                icon: Icons.campaign,
                label: 'Add Announcement',
                color: Colors.orange,
                onTap: () {},
              ),
            _QuickActionButton(
              icon: Icons.upload_file,
              label: 'Upload Document',
              color: Colors.teal,
              onTap: () {},
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildMyTasks(BuildContext context, List<DashboardTask> tasks) {
    final now = DateTime.now();

    int dueToday = 0;
    int overdue = 0;
    int inProgress = 0;
    int completed = 0;

    for (var task in tasks) {
      if (task.status == 'Completed') {
        completed++;
      } else if (task.status == 'In Progress') {
        inProgress++;
      }

      if (task.dueDate != null) {
        try {
          final due = DateTime.parse(task.dueDate!);
          if (due.year == now.year &&
              due.month == now.month &&
              due.day == now.day) {
            dueToday++;
          } else if (due.isBefore(now)) {
            overdue++;
          }
        } catch (_) {}
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('My Tasks',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold)),
            TextButton(
              onPressed: () => context.go('/tasks'),
              child: const Text('View All'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 100,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              _TaskStatusCard(
                  title: 'Due Today', count: dueToday, color: Colors.orange),
              _TaskStatusCard(
                  title: 'Overdue', count: overdue, color: Colors.red),
              _TaskStatusCard(
                  title: 'In Progress', count: inProgress, color: Colors.blue),
              _TaskStatusCard(
                  title: 'Completed', count: completed, color: Colors.green),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildRecentActivity(
      BuildContext context, List<ActivityItem> activities) {
    if (activities.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Recent Activity',
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        ActivityListWidget(activities: activities),
      ],
    );
  }

  Widget _buildCompanyUpdates(
      BuildContext context, DashboardData data, int accessLevel) {
    if (accessLevel >= 4) {
      // Show venture overviews
      final ventures = [
        {'name': 'Dropwing', 'health': 98},
        {'name': 'Fenixa', 'health': 92},
        {'name': 'PerSyniX', 'health': 85},
        {'name': 'Grovia', 'health': 95},
      ];

      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Venture Overview',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.bold)),
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
    } else {
      // Show regular announcements
      if (data.analytics.announcements.isEmpty) return const SizedBox.shrink();

      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Company Updates',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          ...data.analytics.announcements
              .map((a) => AnnouncementCardWidget(announcement: a))
              .toList(),
        ],
      );
    }
  }
}

class _NotificationBell extends ConsumerWidget {
  const _NotificationBell({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unreadAsync = ref.watch(unreadNotificationsProvider);

    return IconButton(
      icon: unreadAsync.when(
        data: (count) {
          if (count > 0) {
            return Badge(
              label: Text(count > 99 ? '99+' : count.toString()),
              child: const Icon(Icons.notifications_none),
            );
          }
          return const Icon(Icons.notifications_none);
        },
        loading: () => const Icon(Icons.notifications_none),
        error: (_, __) => const Icon(Icons.notifications_none),
      ),
      onPressed: () {},
    );
  }
}

class _QuickActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _QuickActionButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 100,
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(label,
                textAlign: TextAlign.center,
                style: TextStyle(
                    fontSize: 12, color: color, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}

class _TaskStatusCard extends StatelessWidget {
  final String title;
  final int count;
  final Color color;

  const _TaskStatusCard({
    required this.title,
    required this.count,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 120,
      margin: const EdgeInsets.only(right: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(title,
              style: TextStyle(
                  color: color.withOpacity(0.8),
                  fontSize: 13,
                  fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text(count.toString(),
              style: TextStyle(
                  color: color, fontSize: 24, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
