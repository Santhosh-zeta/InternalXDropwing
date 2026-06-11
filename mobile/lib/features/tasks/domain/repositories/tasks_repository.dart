import '../../data/models/task_models.dart';

abstract class TasksRepository {
  Future<List<TaskModel>> getTasks();
  Future<TaskModel> getTaskById(int id);
  Future<TaskModel> createTask(TaskRequestDto request);
  Future<void> updateTask(int id, TaskRequestDto request);
  Future<void> updateTaskStatus(int id, String status);
  Future<void> deleteTask(int id);
}
