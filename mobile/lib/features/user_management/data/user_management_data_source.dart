import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import 'user_management_model.dart';

final userManagementDataSourceProvider =
    Provider<UserManagementDataSource>((ref) {
  final dio = ref.watch(dioProvider);
  return UserManagementDataSource(dio);
});

/// CRUD access to `/api/team-members`.
class UserManagementDataSource {
  final Dio _dio;

  UserManagementDataSource(this._dio);

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

  /// Throws when the server reports `success: false` so the caller can show the
  /// real reason (e.g. "Cannot modify users at or above your level").
  void _assertSuccess(dynamic body) {
    if (body is Map && body['success'] == false) {
      throw Exception(body['message']?.toString() ?? 'Request failed');
    }
  }

  Future<List<ManagedUser>> getUsers() async {
    try {
      final response = await _dio.get('/team-members');
      return _dataList(response.data).map(ManagedUser.fromJson).toList();
    } catch (e) {
      throw Exception('Failed to load users: ${_describe(e)}');
    }
  }

  Future<ManagedUserDetail> getUser(int id) async {
    try {
      final response = await _dio.get('/team-members/$id');
      final body = response.data;
      final data = (body is Map && body['data'] != null) ? body['data'] : body;
      if (data is! Map<String, dynamic>) {
        throw Exception('Unexpected user detail response');
      }
      return ManagedUserDetail.fromJson(data);
    } catch (e) {
      throw Exception('Failed to load user: ${_describe(e)}');
    }
  }

  Future<List<VentureOption>> getVentures() async {
    try {
      final response = await _dio.get('/team-members/ventures');
      return _dataList(response.data).map(VentureOption.fromJson).toList();
    } catch (e) {
      throw Exception('Failed to load ventures: ${_describe(e)}');
    }
  }

  Future<List<AccessLevelOption>> getAccessLevels() async {
    try {
      final response = await _dio.get('/team-members/access-levels');
      return _dataList(response.data).map(AccessLevelOption.fromJson).toList();
    } catch (e) {
      throw Exception('Failed to load access levels: ${_describe(e)}');
    }
  }

  /// `POST /api/team-members` — requires Level 3 (Admin) or above.
  Future<void> createUser({
    required String fullName,
    required String email,
    required String password,
    required int accessLevel,
    int? ventureId,
    String? department,
    String? designation,
  }) async {
    try {
      final response = await _dio.post('/team-members', data: {
        'full_name': fullName,
        'email': email,
        'password': password,
        'access_level': accessLevel,
        'venture_id': ventureId,
        'department': department,
        'designation': designation,
      });
      _assertSuccess(response.data);
    } catch (e) {
      throw Exception('Failed to create user: ${_describe(e)}');
    }
  }

  /// `PUT /api/team-members/:id`. Only the fields passed are sent, matching the
  /// route's partial-update semantics.
  Future<void> updateUser(
    int id, {
    String? fullName,
    int? accessLevel,
    int? ventureId,
    bool? isActive,
    String? department,
    String? designation,
    String? phone,
  }) async {
    final payload = <String, dynamic>{
      if (fullName != null) 'full_name': fullName,
      if (accessLevel != null) 'access_level': accessLevel,
      if (ventureId != null) 'venture_id': ventureId,
      if (isActive != null) 'is_active': isActive,
      if (department != null) 'department': department,
      if (designation != null) 'designation': designation,
      if (phone != null) 'phone': phone,
    };
    try {
      final response = await _dio.put('/team-members/$id', data: payload);
      _assertSuccess(response.data);
    } catch (e) {
      throw Exception('Failed to update user: ${_describe(e)}');
    }
  }

  /// `DELETE /api/team-members/:id` — permanently removes the user row.
  Future<void> deleteUser(int id) async {
    try {
      final response = await _dio.delete('/team-members/$id');
      _assertSuccess(response.data);
    } catch (e) {
      throw Exception('Failed to delete user: ${_describe(e)}');
    }
  }
}
