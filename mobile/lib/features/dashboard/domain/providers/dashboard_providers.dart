import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/dashboard_models.dart';
import '../../data/repositories/dashboard_repository.dart';
import '../../../auth/data/models/auth_models.dart';

class DashboardData {
  final AnalyticsResponse analytics;
  final List<DashboardTask> tasks;
  final User currentUser;

  DashboardData({
    required this.analytics,
    required this.tasks,
    required this.currentUser,
  });
}

final dashboardDataProvider = FutureProvider.autoDispose<DashboardData>((ref) async {
  try {
    final repository = ref.watch(dashboardRepositoryProvider);
    final results = await Future.wait([
      repository.getPlatformMetrics(),
      repository.getTasks(),
      repository.getMe(),
    ]);

    return DashboardData(
      analytics: results[0] as AnalyticsResponse,
      tasks: results[1] as List<DashboardTask>,
      currentUser: results[2] as User,
    );
  } catch (e) {
    // Return mock data so we can work on the UI directly
    return DashboardData(
      analytics: const AnalyticsResponse(
        recentActivity: [],
        announcements: [],
      ),
      tasks: [
        const DashboardTask(id: 1, title: 'Design Homepage UI', status: 'In Progress', priority: 'high'),
        const DashboardTask(id: 2, title: 'Fix Backend Connection', status: 'To Do', priority: 'medium'),
      ],
      currentUser: const User(
        id: 1, 
        email: 'admin@dgos.com', 
        fullName: 'Admin User', 
        employeeId: 'EMP-001',
        accessLevel: 5,
        levelName: 'System Admin',
      ),
    );
  }
});

final unreadNotificationsProvider = FutureProvider.autoDispose<int>((ref) async {
  final repository = ref.watch(dashboardRepositoryProvider);
  return repository.getUnreadNotificationCount();
});
