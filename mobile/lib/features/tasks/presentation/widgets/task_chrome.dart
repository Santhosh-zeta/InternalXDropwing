import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/rbac/permissions.dart';
import '../../../../core/rbac/rbac_widgets.dart';
import '../../../../core/theme/nebula_colors.dart';
import '../../../../core/theme/theme_context.dart';
import '../../../../core/widgets/primitives.dart';
import '../../../../core/widgets/state_views.dart';
import '../../data/models/task_models.dart';
import '../providers/task_list_provider.dart';

/// Task classification, in one place.
///
/// The backend stores status unnormalised — 'completed' and 'done',
/// 'in-progress' and 'in progress' all occur — so the list, the detail screen
/// and the form have to agree on what each means or they render the same task
/// three different ways.

bool isTaskDone(TaskModel task) {
  final s = task.status.toLowerCase();
  return s == 'completed' || s == 'done';
}

bool isTaskInProgress(TaskModel task) {
  final s = task.status.toLowerCase();
  return s == 'in-progress' || s == 'in progress' || s == 'in_progress';
}

bool isTaskOverdue(TaskModel task, DateTime now) =>
    task.dueDate != null && !isTaskDone(task) && task.dueDate!.isBefore(now);

/// Done recedes, work under way is *now*, a missed deadline is critical.
TimeState taskTimeState(TaskModel task, DateTime now) {
  if (isTaskDone(task)) return TimeState.past;
  if (isTaskInProgress(task)) return TimeState.now;
  if (isTaskOverdue(task, now)) return TimeState.overdue;
  return TimeState.next;
}

String taskStatusLabel(String status) {
  switch (status.toLowerCase()) {
    case 'in-progress':
    case 'in progress':
    case 'in_progress':
      return 'In progress';
    case 'completed':
    case 'done':
      return 'Done';
    case 'pending':
      return 'Pending';
    default:
      return status;
  }
}

DTone taskStatusTone(String status) {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'done':
      return DTone.ok;
    case 'in-progress':
    case 'in progress':
    case 'in_progress':
      return DTone.accent;
    default:
      return DTone.neutral;
  }
}

DTone priorityTone(String priority) {
  switch (priority.toLowerCase()) {
    case 'urgent':
    case 'high':
      return DTone.critical;
    case 'medium':
      return DTone.warn;
    default:
      return DTone.neutral;
  }
}

/// The venture colour the API sent with the task, falling back to the stable
/// per-venture colour when the join returned no hex.
Color taskVentureColor(TaskModel task) => NebulaColors.parseHex(
      task.primaryColor,
      fallback: NebulaColors.forVentureId(task.ventureId),
    );

/// The status pill, tappable for anyone who may update a task.
///
/// The backend refuses `PATCH /tasks/:id/status` below level 7, so the menu is
/// hidden rather than offered and then failed — the pill still renders, it
/// just stops being a control.
class TaskStatusControl extends ConsumerWidget {
  const TaskStatusControl({
    super.key,
    required this.task,
    this.onChanged,
  });

  final TaskModel task;

  /// Fired after the status change lands, for screens that need to refresh
  /// something else (the detail screen re-reads its own provider).
  final void Function(String status)? onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tag = DTag(
      taskStatusLabel(task.status),
      tone: taskStatusTone(task.status),
    );

    return PermissionGate(
      permission: Permission.updateTask,
      fallback: tag,
      child: PopupMenuButton<String>(
        initialValue: task.status,
        tooltip: 'Change status',
        onSelected: (newStatus) async {
          final messenger = ScaffoldMessenger.of(context);
          try {
            await ref
                .read(taskListProvider.notifier)
                .updateTaskStatusLocally(task.id, newStatus);
            onChanged?.call(newStatus);
          } catch (e) {
            // The notifier reverts its optimistic write and rethrows; without
            // this the throw reached the framework as an unhandled error.
            messenger.showSnackBar(
              SnackBar(content: Text(readableError(e))),
            );
          }
        },
        itemBuilder: (context) => const [
          PopupMenuItem(value: 'pending', child: Text('Pending')),
          PopupMenuItem(value: 'in-progress', child: Text('In progress')),
          PopupMenuItem(value: 'completed', child: Text('Completed')),
        ],
        child: tag,
      ),
    );
  }
}
