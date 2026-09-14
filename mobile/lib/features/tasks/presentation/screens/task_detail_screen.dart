import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/rbac/permissions.dart';
import '../../../../core/rbac/rbac_widgets.dart';
import '../../../../core/theme/nebula_spacing.dart';
import '../../../../core/theme/theme_context.dart';
import '../../../../core/widgets/data_display.dart';
import '../../../../core/widgets/primitives.dart';
import '../../../../core/widgets/state_views.dart';
import '../../data/models/task_models.dart';
import '../providers/task_detail_provider.dart';
import '../providers/task_form_provider.dart';
import '../widgets/task_chrome.dart';

class TaskDetailScreen extends ConsumerWidget {
  const TaskDetailScreen({super.key, required this.taskId});

  final int taskId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final taskAsync = ref.watch(taskDetailProvider(taskId));

    ref.listen(taskFormControllerProvider, (prev, next) {
      if (next is AsyncError) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(readableError(next.error))),
        );
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: const Text('Task'),
        actions: [
          PermissionGate(
            permission: Permission.updateTask,
            child: IconButton(
              icon: const Icon(LucideIcons.pencil, size: 18),
              tooltip: 'Edit task',
              onPressed: () => context.push('/tasks/edit/$taskId'),
            ),
          ),
          PermissionGate(
            permission: Permission.deleteTask,
            child: IconButton(
              icon: const Icon(LucideIcons.trash2, size: 18),
              tooltip: 'Delete task',
              onPressed: () => _confirmDelete(context, ref),
            ),
          ),
          const SizedBox(width: NebulaSpacing.xs),
        ],
      ),
      body: PermissionScope(
        permission: Permission.viewTasks,
        what: 'tasks',
        child: taskAsync.when(
          data: (task) => _TaskDetailBody(task: task),
          loading: () => const Padding(
            padding: EdgeInsets.all(NebulaSpacing.md),
            child: ListSkeleton(count: 4),
          ),
          error: (e, _) => ErrorStateView(
            message: readableError(e),
            onRetry: () => ref.invalidate(taskDetailProvider(taskId)),
          ),
        ),
      ),
    );
  }

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Delete this task?'),
        content: const Text('This cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            style: TextButton.styleFrom(
              foregroundColor: dialogContext.dl.critical,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;
    final success =
        await ref.read(taskFormControllerProvider.notifier).deleteTask(taskId);
    if (success && context.mounted) context.pop();
  }
}

class _TaskDetailBody extends ConsumerWidget {
  const _TaskDetailBody({required this.task});

  final TaskModel task;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dl = context.dl;
    final now = DateTime.now();
    final overdue = isTaskOverdue(task, now);
    final done = isTaskDone(task);
    final trail = [task.ventureName, task.projectName]
        .where((e) => e != null && e.isNotEmpty)
        .join(' / ');

    return ListView(
      padding: const EdgeInsets.fromLTRB(
        NebulaSpacing.md,
        NebulaSpacing.md,
        NebulaSpacing.md,
        NebulaSpacing.xxl,
      ),
      children: [
        DCard(
          accent: taskVentureColor(task),
          emphasised: isTaskInProgress(task),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (trail.isNotEmpty) ...[
                Row(
                  children: [
                    VentureDot(taskVentureColor(task)),
                    const SizedBox(width: 7),
                    Expanded(
                      child: Text(
                        trail,
                        style: context.text.bodySmall,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: NebulaSpacing.sm),
              ],
              Text(
                task.title,
                style: context.text.headlineSmall?.copyWith(
                  color: done ? dl.timePast : null,
                  decoration: done ? TextDecoration.lineThrough : null,
                  decorationColor: dl.textTertiary,
                ),
              ),
              const SizedBox(height: NebulaSpacing.md),
              Wrap(
                spacing: NebulaSpacing.sm,
                runSpacing: NebulaSpacing.sm,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  TaskStatusControl(
                    task: task,
                    onChanged: (_) =>
                        ref.invalidate(taskDetailProvider(task.id)),
                  ),
                  DTag(task.priority, tone: priorityTone(task.priority)),
                  if (overdue) const DTag('Overdue', tone: DTone.critical),
                ],
              ),
            ],
          ),
        ),
        if (task.parentTaskTitle != null) ...[
          const SizedBox(height: NebulaSpacing.lg),
          const SectionHeader('PARENT TASK'),
          DCard(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
            onTap: task.parentTaskId == null
                ? null
                : () => context.push('/tasks/${task.parentTaskId}'),
            child: Row(
              children: [
                Icon(LucideIcons.gitBranch, size: 15, color: dl.textTertiary),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    task.parentTaskTitle!,
                    style: context.text.titleSmall,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: NebulaSpacing.lg),
        const SectionHeader('DESCRIPTION'),
        DCard(
          child: Text(
            (task.description == null || task.description!.trim().isEmpty)
                ? 'No description.'
                : task.description!,
            style: context.text.bodyMedium,
          ),
        ),
        const SizedBox(height: NebulaSpacing.lg),
        SectionHeader('ASSIGNEES · ${task.assignees.length}'),
        if (task.assignees.isEmpty)
          DCard(
            child: Text('No one assigned.', style: context.text.bodyMedium),
          )
        else
          for (final assignee in task.assignees)
            Padding(
              padding: const EdgeInsets.only(bottom: NebulaSpacing.sm),
              child: EntityRow(
                title: assignee.name,
                leading: DAvatar(
                  assignee.name,
                  size: 32,
                  imageUrl: assignee.avatar,
                ),
                timeState: TimeState.next,
              ),
            ),
        const SizedBox(height: NebulaSpacing.md),
        const SectionHeader('DATES'),
        DCard(
          child: Column(
            children: [
              _DetailLine(
                label: 'Due',
                value: task.dueDate == null
                    ? null
                    : DateFormat('d MMM yyyy').format(task.dueDate!),
                tone: overdue ? DTone.critical : null,
              ),
              _DetailLine(
                label: 'Created',
                value: task.createdAt == null
                    ? null
                    : DateFormat('d MMM yyyy').format(task.createdAt!),
              ),
              _DetailLine(
                label: 'Updated',
                value: task.updatedAt == null
                    ? null
                    : DateFormat('d MMM yyyy').format(task.updatedAt!),
              ),
            ],
          ),
        ),
        if (task.assignedByName != null) ...[
          const SizedBox(height: NebulaSpacing.lg),
          const SectionHeader('ASSIGNED BY'),
          EntityRow(
            title: task.assignedByName!,
            leading: DAvatar(
              task.assignedByName,
              size: 32,
              imageUrl: task.assignedByAvatar,
            ),
            timeState: TimeState.next,
          ),
        ],
      ],
    );
  }
}

/// Label on the left, figure on the right. Renders nothing when the API did
/// not send the value — an empty row is better than an invented one.
class _DetailLine extends StatelessWidget {
  const _DetailLine({required this.label, required this.value, this.tone});

  final String label;
  final String? value;
  final DTone? tone;

  @override
  Widget build(BuildContext context) {
    if (value == null) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: context.text.bodySmall),
          Mono(value!, tone: tone),
        ],
      ),
    );
  }
}
