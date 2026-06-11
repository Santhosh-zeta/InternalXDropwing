import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/repositories/tasks_repository.dart';
import '../data_sources/tasks_remote_data_source.dart';
import '../models/task_models.dart';

final tasksRepositoryProvider = Provider<TasksRepository>((ref) {
  return TasksRepositoryImpl(ref.watch(tasksRemoteDataSourceProvider));
});

class TasksRepositoryImpl implements TasksRepository {
  final TasksRemoteDataSource remoteDataSource;

  TasksRepositoryImpl(this.remoteDataSource);

  @override
  Future<List<TaskModel>> getTasks() {
    return remoteDataSource.getTasks();
  }

  @override
  Future<TaskModel> getTaskById(int id) {
    return remoteDataSource.getTaskById(id);
  }

  @override
  Future<TaskModel> createTask(TaskRequestDto request) {
    return remoteDataSource.createTask(request);
  }

  @override
  Future<void> updateTask(int id, TaskRequestDto request) {
    return remoteDataSource.updateTask(id, request);
  }

  @override
  Future<void> updateTaskStatus(int id, String status) {
    return remoteDataSource.updateTaskStatus(id, status);
  }

  @override
  Future<void> deleteTask(int id) {
    return remoteDataSource.deleteTask(id);
  }
}
