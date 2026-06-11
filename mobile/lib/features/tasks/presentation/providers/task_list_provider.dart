import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../data/models/task_models.dart';
import '../../data/repositories/tasks_repository_impl.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

part 'task_list_provider.g.dart';

enum TaskFilter { all, assignedToMe, createdByMe, overdue, completed }

final taskFilterProvider = StateProvider<TaskFilter>((ref) => TaskFilter.all);
final taskSearchQueryProvider = StateProvider<String>((ref) => '');

@riverpod
class TaskList extends _$TaskList {
  @override
  Future<List<TaskModel>> build() async {
    final repository = ref.watch(tasksRepositoryProvider);
    return repository.getTasks();
  }

  Future<void> updateTaskStatusLocally(int taskId, String newStatus) async {
    final previousState = state;

    // Optimistic update
    if (state.hasValue) {
      final currentList = state.value!;
      final index = currentList.indexWhere((t) => t.id == taskId);
      if (index != -1) {
        final updatedList = List<TaskModel>.from(currentList);
        updatedList[index] = updatedList[index].copyWith(status: newStatus);
        state = AsyncData(updatedList);
      }
    }

    try {
      final repository = ref.read(tasksRepositoryProvider);
      await repository.updateTaskStatus(taskId, newStatus);
    } catch (e) {
      // Revert on failure
      state = previousState;
      rethrow;
    }
  }
}

@riverpod
Future<List<TaskModel>> filteredTasks(FilteredTasksRef ref) async {
  final tasks = await ref.watch(taskListProvider.future);
  final filter = ref.watch(taskFilterProvider);
  final searchQuery = ref.watch(taskSearchQueryProvider).toLowerCase();
  final authState = ref.watch(authProvider);

  int? currentUserId;
  authState.maybeWhen(
    authenticated: (user) => currentUserId = user.id,
    orElse: () {},
  );

  var resultTasks = tasks;

  // 1. Apply Filter
  if (filter != TaskFilter.all) {
    resultTasks = resultTasks.where((t) {
      switch (filter) {
        case TaskFilter.assignedToMe:
          return t.assignees.any((a) => a.id == currentUserId);
        case TaskFilter.createdByMe:
          return t.assignedBy == currentUserId;
        case TaskFilter.overdue:
          if (t.dueDate == null) return false;
          final isCompleted = t.status.toLowerCase() == 'completed' ||
              t.status.toLowerCase() == 'done';
          return !isCompleted && t.dueDate!.isBefore(DateTime.now());
        case TaskFilter.completed:
          return t.status.toLowerCase() == 'completed' ||
              t.status.toLowerCase() == 'done';
        default:
          return true;
      }
    }).toList();
  }

  // 2. Apply Search Query
  if (searchQuery.isNotEmpty) {
    resultTasks = resultTasks.where((t) {
      return t.title.toLowerCase().contains(searchQuery) ||
          (t.description?.toLowerCase().contains(searchQuery) ?? false);
    }).toList();
  }

  return resultTasks;
}
