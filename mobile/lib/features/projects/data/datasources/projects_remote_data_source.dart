import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/api/api_client.dart';
import '../models/project_models.dart';

final projectsRemoteDataSourceProvider =
    Provider<ProjectsRemoteDataSource>((ref) {
  final dio = ref.watch(dioProvider);
  return ProjectsRemoteDataSource(dio);
});

class ProjectsRemoteDataSource {
  final Dio _dio;

  ProjectsRemoteDataSource(this._dio);

  Future<List<ProjectModel>> getProjects() async {
    try {
      final response = await _dio.get('/projects');
      if (response.data['success'] == true) {
        final List<dynamic> data = response.data['data'];
        return data.map((json) => ProjectModel.fromJson(json)).toList();
      }
      throw Exception(response.data['message'] ?? 'Failed to load projects');
    } catch (e) {
      throw Exception('Failed to load projects: $e');
    }
  }

  Future<ProjectModel> getProjectById(int id) async {
    try {
      final response = await _dio.get('/projects/$id');
      if (response.data['success'] == true) {
        return ProjectModel.fromJson(response.data['data']);
      }
      throw Exception(
          response.data['message'] ?? 'Failed to load project details');
    } catch (e) {
      throw Exception('Failed to load project details: $e');
    }
  }

  Future<int> createProject(ProjectRequestDto request) async {
    try {
      final response = await _dio.post('/projects', data: request.toJson());
      if (response.data['success'] == true) {
        return response.data['data']['id'] as int;
      }
      throw Exception(response.data['message'] ?? 'Failed to create project');
    } catch (e) {
      throw Exception('Failed to create project: $e');
    }
  }

  Future<void> updateProject(int id, ProjectRequestDto request) async {
    try {
      final response =
          await _dio.put('/projects/$id', data: request.toJson());
      if (response.data['success'] != true) {
        throw Exception(
            response.data['message'] ?? 'Failed to update project');
      }
    } catch (e) {
      throw Exception('Failed to update project: $e');
    }
  }

  Future<void> deleteProject(int id) async {
    try {
      final response = await _dio.delete('/projects/$id');
      if (response.data['success'] != true) {
        throw Exception(
            response.data['message'] ?? 'Failed to delete project');
      }
    } catch (e) {
      throw Exception('Failed to delete project: $e');
    }
  }
}
