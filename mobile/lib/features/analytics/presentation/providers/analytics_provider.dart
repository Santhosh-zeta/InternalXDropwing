import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/datasources/analytics_remote_data_source.dart';
import '../../data/models/analytics_model.dart';

final dateRangeProvider = StateProvider<String>((ref) => '7d');

final analyticsProvider =
    FutureProvider.family<AnalyticsReport, String>((ref, dateRange) async {
  final dataSource = ref.watch(analyticsRemoteDataSourceProvider);
  return dataSource.getAnalytics(dateRange);
});

final taskVelocityProvider =
    FutureProvider.family<List<TaskVelocityPoint>, String>((ref, dateRange) async {
  final dataSource = ref.watch(analyticsRemoteDataSourceProvider);
  return dataSource.getTaskVelocity(dateRange);
});
