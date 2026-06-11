import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../data/models/task_models.dart';
import '../../data/repositories/tasks_repository_impl.dart';
import 'task_list_provider.dart';
import 'task_detail_provider.dart';

part 'task_form_provider.g.dart';

@riverpod
class TaskFormController extends _$TaskFormController {
  @override
  FutureOr<void> build() {}

  Future<bool> submitTask(TaskRequestDto dto, {int? existingTaskId}) async {
    state = const AsyncLoading();
    try {
      final repository = ref.read(tasksRepositoryProvider);
      
      if (existingTaskId != null) {
        await repository.updateTask(existingTaskId, dto);
        ref.invalidate(taskDetailProvider(existingTaskId));
      } else {
        await repository.createTask(dto);
      }
      
      ref.invalidate(taskListProvider);
      state = const AsyncData(null);
      return true;
    } catch (e, st) {
      state = AsyncError(e, st);
      return false;
    }
  }

  Future<bool> deleteTask(int id) async {
    state = const AsyncLoading();
    try {
      final repository = ref.read(tasksRepositoryProvider);
      await repository.deleteTask(id);
      ref.invalidate(taskListProvider);
      state = const AsyncData(null);
      return true;
    } catch (e, st) {
      state = AsyncError(e, st);
      return false;
    }
  }
}
