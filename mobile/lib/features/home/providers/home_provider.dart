import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/models/home_models.dart';
import '../data/repository/home_repository.dart';
import '../../notifications/presentation/providers/notifications_provider.dart';

final homeDataProvider = FutureProvider.autoDispose<HomeData>((ref) async {
  final repository = ref.watch(homeRepositoryProvider);
  
  final results = await Future.wait([
    repository.getPlatformMetrics(),
    repository.getTasks(),
  ]);

  return HomeData(
    analytics: results[0] as HomeAnalytics,
    tasks: results[1] as List<HomeTask>,
  );
});

// Real unread count from the notifications provider
final unreadNotificationsProvider = Provider.autoDispose<int>((ref) {
  return ref.watch(unreadCountProvider);
});
