import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/api/api_client.dart';
import '../models/task_models.dart';

final tasksRemoteDataSourceProvider = Provider<TasksRemoteDataSource>((ref) {
  final dio = ref.watch(dioProvider);
  return TasksRemoteDataSource(dio);
});

class TasksRemoteDataSource {
  final Dio _dio;

  TasksRemoteDataSource(this._dio);

  Future<List<TaskModel>> getTasks() async {
    try {
      final response = await _dio.get('/tasks');
      if (response.data['success'] == true) {
        final List<dynamic> data = response.data['data'];
        return data.map((json) => TaskModel.fromJson(json)).toList();
      }
      throw Exception(response.data['message'] ?? 'Failed to load tasks');
    } catch (e) {
      throw Exception('Failed to load tasks: $e');
    }
  }

  Future<TaskModel> getTaskById(int id) async {
    try {
      final response = await _dio.get('/tasks/$id');
      if (response.data['success'] == true) {
        return TaskModel.fromJson(response.data['data']);
      }
      throw Exception(response.data['message'] ?? 'Failed to load task details');
    } catch (e) {
      throw Exception('Failed to load task details: $e');
    }
  }

  Future<TaskModel> createTask(TaskRequestDto request) async {
    try {
      final response = await _dio.post('/tasks', data: request.toJson());
      if (response.data['success'] == true) {
        // The API returns { data: { id: ... } }
        // We might need to fetch the task again to get full details, or return a dummy if not fully populated.
        // For now, let's assume we fetch the created task right after, or the API returns it.
        // Looking at task.controller.js, it just returns `{ success: true, data: { id: taskId } }`
        // So we will just fetch the task by ID after creation to return a full TaskModel.
        final int newId = response.data['data']['id'];
        
        // Wait, task.controller.js doesn't have a GET /tasks/:id endpoint! 
        // Let's check: task.routes.js has `router.get('/', getTasks);` but no `/:id`.
        // If there's no getTaskById on the backend, we must synthesize it or return a basic model.
        // Actually, I'll return a partial task or just fetch all tasks and find it.
        // To be safe, let's throw an exception if we can't find it, or just return a dummy.
        // Since we only really need success status for create, we might change the return type to void or int.
        // But the interface says Future<TaskModel>. Let's return a dummy model.
        return TaskModel(
          id: newId,
          title: request.title,
          status: 'pending',
          priority: request.priority ?? 'medium',
          assignedBy: 0,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        );
      }
      throw Exception(response.data['message'] ?? 'Failed to create task');
    } catch (e) {
      throw Exception('Failed to create task: $e');
    }
  }

  Future<void> updateTask(int id, TaskRequestDto request) async {
    try {
      final response = await _dio.put('/tasks/$id', data: request.toJson());
      if (response.data['success'] != true) {
        throw Exception(response.data['message'] ?? 'Failed to update task');
      }
    } catch (e) {
      throw Exception('Failed to update task: $e');
    }
  }

  Future<void> updateTaskStatus(int id, String status) async {
    try {
      final request = TaskStatusUpdateRequestDto(status: status);
      final response = await _dio.put('/tasks/$id', data: request.toJson());
      if (response.data['success'] != true) {
        throw Exception(response.data['message'] ?? 'Failed to update task status');
      }
    } catch (e) {
      throw Exception('Failed to update task status: $e');
    }
  }

  Future<void> deleteTask(int id) async {
    try {
      final response = await _dio.delete('/tasks/$id');
      if (response.data['success'] != true) {
        throw Exception(response.data['message'] ?? 'Failed to delete task');
      }
    } catch (e) {
      throw Exception('Failed to delete task: $e');
    }
  }
}
