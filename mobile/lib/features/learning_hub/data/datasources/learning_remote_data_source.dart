import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/api/api_client.dart';
import '../models/learning_models.dart';

final learningRemoteDataSourceProvider =
    Provider<LearningRemoteDataSource>((ref) {
  final dio = ref.watch(dioProvider);
  return LearningRemoteDataSource(dio);
});

class LearningRemoteDataSource {
  final Dio _dio;

  LearningRemoteDataSource(this._dio);

  // ── CHECKLIST ──────────────────────────────────────────────────────────────

  Future<List<LearningChecklistItem>> getChecklist() async {
    try {
      final response = await _dio.get('/learning/checklist');
      if (response.data['success'] == true) {
        final List<dynamic> data = response.data['data'];
        return data
            .map((json) => LearningChecklistItem.fromJson(json))
            .toList();
      }
      throw Exception(
          response.data['message'] ?? 'Failed to load checklist');
    } catch (e) {
      throw Exception('Failed to load checklist: $e');
    }
  }

  Future<void> updateProgress(int checklistItemId, bool completed) async {
    try {
      final response = await _dio.patch(
        '/learning/progress/$checklistItemId',
        data: {'completed': completed},
      );
      if (response.data['success'] != true) {
        throw Exception(
            response.data['message'] ?? 'Failed to update progress');
      }
    } catch (e) {
      throw Exception('Failed to update progress: $e');
    }
  }

  // ── RESOURCES ──────────────────────────────────────────────────────────────

  Future<List<LearningResource>> getResources() async {
    try {
      final response = await _dio.get('/learning/resources');
      if (response.data['success'] == true) {
        final List<dynamic> data = response.data['data'];
        return data.map((json) => LearningResource.fromJson(json)).toList();
      }
      throw Exception(
          response.data['message'] ?? 'Failed to load resources');
    } catch (e) {
      throw Exception('Failed to load resources: $e');
    }
  }

  // ── FEEDBACK ───────────────────────────────────────────────────────────────

  Future<List<LearningFeedback>> getFeedback() async {
    try {
      final response = await _dio.get('/learning/feedback');
      if (response.data['success'] == true) {
        final List<dynamic> data = response.data['data'];
        return data.map((json) => LearningFeedback.fromJson(json)).toList();
      }
      throw Exception(
          response.data['message'] ?? 'Failed to load feedback');
    } catch (e) {
      throw Exception('Failed to load feedback: $e');
    }
  }
}
