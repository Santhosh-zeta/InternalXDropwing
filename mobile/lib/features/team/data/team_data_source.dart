import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import 'team_models.dart';

final teamDataSourceProvider = Provider<TeamDataSource>((ref) {
  final dio = ref.watch(dioProvider);
  return TeamDataSource(dio);
});

class TeamDataSource {
  final Dio _dio;

  TeamDataSource(this._dio);

  Future<List<TeamMember>> getTeamMembers() async {
    try {
      final response = await _dio.get('/team/members');
      final body = response.data;
      if (body['success'] == true) {
        final List<dynamic> data = body['data'] ?? [];
        return data.map((j) => TeamMember.fromJson(j as Map<String, dynamic>)).toList();
      }
      throw Exception(body['message'] ?? 'Failed to load team members');
    } catch (e) {
      throw Exception('Failed to load team members: $e');
    }
  }

  Future<void> updateMemberLevel(int userId, int newLevel) async {
    try {
      final response = await _dio.patch('/team/members/$userId/level', data: {'access_level': newLevel});
      final body = response.data;
      if (body['success'] != true) {
        throw Exception(body['message'] ?? 'Failed to update level');
      }
    } catch (e) {
      throw Exception('Failed to update level: $e');
    }
  }

  Future<void> removeMember(int userId) async {
    try {
      final response = await _dio.delete('/team/members/$userId');
      final body = response.data;
      if (body['success'] != true) {
        throw Exception(body['message'] ?? 'Failed to remove member');
      }
    } catch (e) {
      throw Exception('Failed to remove member: $e');
    }
  }
}
