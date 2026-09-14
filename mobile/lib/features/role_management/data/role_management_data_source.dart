import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import 'role_management_model.dart';

final roleManagementDataSourceProvider =
    Provider<RoleManagementDataSource>((ref) {
  final dio = ref.watch(dioProvider);
  return RoleManagementDataSource(dio);
});

/// Wraps every `/api/role-management` endpoint.
class RoleManagementDataSource {
  final Dio _dio;

  RoleManagementDataSource(this._dio);

  String _describe(Object error) {
    if (error is DioException) {
      final body = error.response?.data;
      if (body is Map && body['message'] != null) return body['message'].toString();
      if (error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.receiveTimeout ||
          error.type == DioExceptionType.connectionError) {
        return 'Could not reach the server. Check your connection and try again.';
      }
      return error.message ?? 'Request failed';
    }
    return error.toString();
  }

  List<Map<String, dynamic>> _dataList(dynamic body) {
    final list = (body is Map && body['data'] != null) ? body['data'] : body;
    if (list is! List) throw Exception('Unexpected response shape');
    return list.whereType<Map<String, dynamic>>().toList();
  }

  void _assertSuccess(dynamic body) {
    if (body is Map && body['success'] == false) {
      throw Exception(body['message']?.toString() ?? 'Request failed');
    }
  }

  Future<List<VentureRole>> getRoles() async {
    try {
      final response = await _dio.get('/role-management');
      return _dataList(response.data).map(VentureRole.fromJson).toList();
    } catch (e) {
      throw Exception('Failed to load roles: ${_describe(e)}');
    }
  }

  Future<VentureRole> getRole(int id) async {
    try {
      final response = await _dio.get('/role-management/$id');
      final body = response.data;
      final data = (body is Map && body['data'] != null) ? body['data'] : body;
      if (data is! Map<String, dynamic>) {
        throw Exception('Unexpected role detail response');
      }
      return VentureRole.fromJson(data);
    } catch (e) {
      throw Exception('Failed to load role: ${_describe(e)}');
    }
  }

  Future<List<RoleVentureOption>> getVentures() async {
    try {
      final response = await _dio.get('/role-management/ventures');
      return _dataList(response.data).map(RoleVentureOption.fromJson).toList();
    } catch (e) {
      throw Exception('Failed to load ventures: ${_describe(e)}');
    }
  }

  Future<List<AssignableTeamMember>> getAssignableTeamMembers() async {
    try {
      final response = await _dio.get('/role-management/assign-team-members');
      return _dataList(response.data)
          .map(AssignableTeamMember.fromJson)
          .toList();
    } catch (e) {
      throw Exception('Failed to load team members: ${_describe(e)}');
    }
  }

  Future<void> createRole({
    required String roleName,
    required String roleKey,
    String? description,
    String? color,
    String? icon,
    int? baseLevel,
    Map<String, bool>? permissions,
    int? ventureId,
  }) async {
    try {
      final response = await _dio.post('/role-management', data: {
        'role_name': roleName,
        'role_key': roleKey,
        'description': description,
        'color': color,
        'icon': icon,
        'base_level': baseLevel,
        'permissions': permissions ?? const {},
        'venture_id': ventureId,
      });
      _assertSuccess(response.data);
    } catch (e) {
      throw Exception('Failed to create role: ${_describe(e)}');
    }
  }

  Future<void> updateRole(
    int id, {
    String? roleName,
    String? roleKey,
    String? description,
    String? color,
    String? icon,
    int? baseLevel,
    Map<String, bool>? permissions,
    int? sortOrder,
  }) async {
    final payload = <String, dynamic>{
      if (roleName != null) 'role_name': roleName,
      if (roleKey != null) 'role_key': roleKey,
      if (description != null) 'description': description,
      if (color != null) 'color': color,
      if (icon != null) 'icon': icon,
      if (baseLevel != null) 'base_level': baseLevel,
      if (permissions != null) 'permissions': permissions,
      if (sortOrder != null) 'sort_order': sortOrder,
    };
    try {
      final response = await _dio.put('/role-management/$id', data: payload);
      _assertSuccess(response.data);
    } catch (e) {
      throw Exception('Failed to update role: ${_describe(e)}');
    }
  }

  /// Soft-deletes (deactivates) a role.
  Future<void> deleteRole(int id) async {
    try {
      final response = await _dio.delete('/role-management/$id');
      _assertSuccess(response.data);
    } catch (e) {
      throw Exception('Failed to delete role: ${_describe(e)}');
    }
  }

  Future<void> duplicateRole(int id) async {
    try {
      final response = await _dio.post('/role-management/$id/duplicate');
      _assertSuccess(response.data);
    } catch (e) {
      throw Exception('Failed to duplicate role: ${_describe(e)}');
    }
  }

  Future<void> assignRole({required int userId, required int roleId}) async {
    try {
      final response = await _dio.post('/role-management/assign', data: {
        'user_id': userId,
        'role_id': roleId,
      });
      _assertSuccess(response.data);
    } catch (e) {
      throw Exception('Failed to assign role: ${_describe(e)}');
    }
  }

  Future<void> unassignRole({required int userId, required int roleId}) async {
    try {
      final response = await _dio.delete('/role-management/assign', data: {
        'user_id': userId,
        'role_id': roleId,
      });
      _assertSuccess(response.data);
    } catch (e) {
      throw Exception('Failed to remove role: ${_describe(e)}');
    }
  }
}
