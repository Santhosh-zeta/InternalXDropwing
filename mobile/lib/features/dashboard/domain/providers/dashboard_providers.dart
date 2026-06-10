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
  final repository = ref.watch(dashboardRepositoryProvider);
  
  // Fetch data concurrently
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
});

final unreadNotificationsProvider = FutureProvider.autoDispose<int>((ref) async {
  final repository = ref.watch(dashboardRepositoryProvider);
  return repository.getUnreadNotificationCount();
});
