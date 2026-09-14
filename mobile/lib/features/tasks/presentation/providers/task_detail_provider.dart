import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../data/models/task_models.dart';
import '../../data/repositories/tasks_repository_impl.dart';
import 'task_list_provider.dart';

part 'task_detail_provider.g.dart';

@riverpod
Future<TaskModel> taskDetail(Ref ref, int taskId) async {
  // Try to find it in the cached list first
  final listState = ref.read(taskListProvider);
  if (listState.hasValue) {
    final cached = listState.value!.where((t) => t.id == taskId).firstOrNull;
    if (cached != null) {
      return cached;
    }
  }

  final repository = ref.watch(tasksRepositoryProvider);
  return repository.getTaskById(taskId);
}

