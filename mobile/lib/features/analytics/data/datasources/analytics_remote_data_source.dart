import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/api/api_client.dart';
import '../models/analytics_model.dart';

final analyticsRemoteDataSourceProvider =
    Provider<AnalyticsRemoteDataSource>((ref) {
  final dio = ref.watch(dioProvider);
  return AnalyticsRemoteDataSource(dio);
});

class AnalyticsRemoteDataSource {
  final Dio _dio;

  AnalyticsRemoteDataSource(this._dio);

  Future<AnalyticsReport> getAnalytics(String dateRange) async {
    try {
      final response = await _dio.get(
        '/platform-metrics',
        queryParameters: {'range': dateRange},
      );
      if (response.data['success'] == true) {
        return AnalyticsReport.fromJson(response.data['data']);
      }
      throw Exception(response.data['message'] ?? 'Failed to load analytics');
    } catch (e) {
      throw Exception('Failed to load analytics: $e');
    }
  }

  Future<List<TaskVelocityPoint>> getTaskVelocity(String dateRange) async {
    try {
      final response = await _dio.get(
        '/platform-metrics/task-velocity',
        queryParameters: {'range': dateRange},
      );
      if (response.data['success'] == true) {
        final List<dynamic> data = response.data['data'];
        return data
            .map((json) => TaskVelocityPoint.fromJson(json))
            .toList();
      }
      throw Exception(response.data['message'] ?? 'Failed to load task velocity');
    } catch (e) {
      throw Exception('Failed to load task velocity: $e');
    }
  }
}
