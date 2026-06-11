import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/api/api_client.dart';
import '../models/home_models.dart';
import '../../../auth/data/models/auth_models.dart';

final homeRepositoryProvider = Provider<HomeRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return HomeRepository(dio);
});

class HomeRepository {
  final Dio _dio;

  HomeRepository(this._dio);

  Future<HomeAnalytics> getPlatformMetrics() async {
    try {
      final response = await _dio.get('/platform-metrics');
      if (response.data['success'] == true) {
        return HomeAnalytics.fromJson(response.data['data']);
      }
      throw Exception(response.data['message'] ?? 'Failed to load metrics');
    } catch (e) {
      throw Exception('Failed to load platform metrics: $e');
    }
  }

  Future<List<HomeTask>> getTasks() async {
    try {
      final response = await _dio.get('/tasks');
      if (response.data['success'] == true) {
        final List<dynamic> data = response.data['data'];
        return data.map((json) => HomeTask.fromJson(json)).toList();
      }
      throw Exception(response.data['message'] ?? 'Failed to load tasks');
    } catch (e) {
      throw Exception('Failed to load tasks: $e');
    }
  }

  Future<int> getUnreadNotificationCount() async {
    try {
      final response = await _dio.get('/notifications');
      if (response.data['success'] == true) {
        return response.data['unreadCount'] ?? 0;
      }
      throw Exception('Failed to load notifications');
    } catch (e) {
      throw Exception('Failed to load unread notifications count: $e');
    }
  }
}
