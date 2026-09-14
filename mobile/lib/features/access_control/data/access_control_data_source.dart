import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import 'access_control_model.dart';

final accessControlDataSourceProvider =
    Provider<AccessControlDataSource>((ref) {
  final dio = ref.watch(dioProvider);
  return AccessControlDataSource(dio);
});

/// Wraps `/api/access-control`, the L1-only permission matrix and 2FA toggle.
class AccessControlDataSource {
  final Dio _dio;

  AccessControlDataSource(this._dio);

  String _describe(Object error) {
    if (error is DioException) {
      final body = error.response?.data;
      if (body is Map && body['message'] != null) return body['message'].toString();
      if (error.response?.statusCode == 403) {
        return 'Level 1 (Super Admin) access is required for this action.';
      }
      if (error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.receiveTimeout ||
          error.type == DioExceptionType.connectionError) {
        return 'Could not reach the server. Check your connection and try again.';
      }
      return error.message ?? 'Request failed';
    }
    return error.toString();
  }

  void _assertSuccess(dynamic body) {
    if (body is Map && body['success'] == false) {
      throw Exception(body['message']?.toString() ?? 'Request failed');
    }
  }

  Future<List<AccessLevelPermissions>> getAccessLevels() async {
    try {
      final response = await _dio.get('/access-control');
      final body = response.data;
      final list = (body is Map && body['data'] != null) ? body['data'] : body;
      if (list is! List) throw Exception('Unexpected response shape');
      return list
          .whereType<Map<String, dynamic>>()
          .map(AccessLevelPermissions.fromJson)
          .toList();
    } catch (e) {
      throw Exception('Failed to load access levels: ${_describe(e)}');
    }
  }

  /// `level` must not be 1 — the route refuses to modify Super Admin.
  Future<void> updatePermissions(
      int level, Map<String, bool> permissions) async {
    try {
      final response = await _dio
          .put('/access-control/$level', data: {'permissions': permissions});
      _assertSuccess(response.data);
    } catch (e) {
      throw Exception('Failed to update permissions: ${_describe(e)}');
    }
  }

  Future<bool> get2FAConfig() async {
    try {
      final response = await _dio.get('/access-control/2fa-config');
      final body = response.data;
      if (body is Map && body['success'] == false) {
        throw Exception(body['message']?.toString() ?? 'Request failed');
      }
      return body is Map ? body['enable2FA'] == true : true;
    } catch (e) {
      throw Exception('Failed to load 2FA setting: ${_describe(e)}');
    }
  }

  Future<void> setTwoFactorEnabled(bool enabled) async {
    try {
      final response = await _dio
          .put('/access-control/2fa-config', data: {'enable2FA': enabled});
      _assertSuccess(response.data);
    } catch (e) {
      throw Exception('Failed to update 2FA setting: ${_describe(e)}');
    }
  }
}
