import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../data/models/task_models.dart';
import '../../data/repositories/tasks_repository_impl.dart';
import 'task_list_provider.dart';

part 'task_detail_provider.g.dart';

@riverpod
Future<TaskModel> taskDetail(TaskDetailRef ref, int taskId) async {
  // Try to find it in the cached list first
  final listState = ref.read(taskListProvider);
  if (listState.hasValue) {
    final cached = listState.value!.where((t) => t.id == taskId).firstOrNull;
    // We could return cached instantly and let the remote fetch silently,
    // but a standard FutureProvider resolves once.
    // For simplicity, we just fetch from remote to get full details.
  }

  final repository = ref.watch(tasksRepositoryProvider);
  return repository.getTaskById(taskId);
}
