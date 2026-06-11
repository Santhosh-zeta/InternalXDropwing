import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/api/api_client.dart';
import '../models/notification_model.dart';

final notificationsRemoteDataSourceProvider =
    Provider<NotificationsRemoteDataSource>((ref) {
  final dio = ref.watch(dioProvider);
  return NotificationsRemoteDataSource(dio);
});

class NotificationsRemoteDataSource {
  final Dio _dio;

  NotificationsRemoteDataSource(this._dio);

  Future<NotificationsResponse> getNotifications() async {
    try {
      final response = await _dio.get('/notifications');
      if (response.data['success'] == true) {
        final List<dynamic> data = response.data['data'];
        final int unreadCount = response.data['unreadCount'] ?? 0;
        final notifications =
            data.map((json) => NotificationModel.fromJson(json)).toList();
        return NotificationsResponse(
            notifications: notifications, unreadCount: unreadCount);
      }
      throw Exception(
          response.data['message'] ?? 'Failed to load notifications');
    } catch (e) {
      throw Exception('Failed to load notifications: $e');
    }
  }

  Future<void> markAsRead(int id) async {
    try {
      final response = await _dio.patch('/notifications/$id/read');
      if (response.data['success'] != true) {
        throw Exception(
            response.data['message'] ?? 'Failed to mark notification as read');
      }
    } catch (e) {
      throw Exception('Failed to mark notification as read: $e');
    }
  }

  Future<void> markAllAsRead() async {
    try {
      final response = await _dio.patch('/notifications/read-all');
      if (response.data['success'] != true) {
        throw Exception(
            response.data['message'] ?? 'Failed to mark all as read');
      }
    } catch (e) {
      throw Exception('Failed to mark all as read: $e');
    }
  }

  Future<void> clearReadNotifications() async {
    try {
      final response = await _dio.delete('/notifications/clear');
      if (response.data['success'] != true) {
        throw Exception(
            response.data['message'] ?? 'Failed to clear notifications');
      }
    } catch (e) {
      throw Exception('Failed to clear notifications: $e');
    }
  }
}
