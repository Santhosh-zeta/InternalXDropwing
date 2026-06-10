import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/api/api_client.dart';
import '../models/dashboard_models.dart';
import '../../../auth/data/models/auth_models.dart'; // For User model if needed

final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return DashboardRepository(dio);
});

class DashboardRepository {
  final Dio _dio;

  DashboardRepository(this._dio);

  Future<AnalyticsResponse> getPlatformMetrics() async {
    try {
      final response = await _dio.get('/platform-metrics');
      if (response.data['success'] == true) {
        return AnalyticsResponse.fromJson(response.data['data']);
      }
      throw Exception(response.data['message'] ?? 'Failed to load metrics');
    } catch (e) {
      throw Exception('Failed to load platform metrics: $e');
    }
  }

  Future<List<DashboardTask>> getTasks() async {
    try {
      final response = await _dio.get('/tasks');
      if (response.data['success'] == true) {
        final List<dynamic> data = response.data['data'];
        return data.map((json) => DashboardTask.fromJson(json)).toList();
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

  Future<User> getMe() async {
    try {
      final response = await _dio.get('/team-members/me');
      if (response.data['success'] == true) {
        return User.fromJson(response.data['data']);
      }
      throw Exception(response.data['message'] ?? 'Failed to load user profile');
    } catch (e) {
      throw Exception('Failed to load user profile: $e');
    }
  }
}
