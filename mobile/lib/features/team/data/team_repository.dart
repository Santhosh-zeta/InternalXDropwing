import 'package:dio/dio.dart';
import '../../../../core/api/api_client.dart';
import '../../auth/data/models/auth_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final teamRepositoryProvider = Provider((ref) => TeamRepository(ref.watch(dioProvider)));

class TeamRepository {
  final Dio _dio;

  TeamRepository(this._dio);

  Future<List<User>> getTeamMembers() async {
    try {
      final response = await _dio.get('/team-members');
      if (response.data['success'] == true) {
        final List<dynamic> data = response.data['data'];
        return data.map((json) => User.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }
}
