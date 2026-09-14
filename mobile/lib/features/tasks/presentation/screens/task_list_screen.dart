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
import '../../../../core/widgets/motion.dart';
import '../../../../core/widgets/primitives.dart';
import '../../../../core/widgets/state_views.dart';
import '../../../projects/presentation/providers/projects_provider.dart';
import '../../data/models/task_models.dart';
import '../providers/task_list_provider.dart';
import '../widgets/segmented_filter.dart';
import '../widgets/task_chrome.dart';

/// Where a task sits on the calendar. Drives the [GroupHeader] sections.
enum _Bucket { overdue, today, week, later, done }

/// Tasks, grouped by when they are due.
///
/// Someone opening this screen is asking "what is late, and what is today" —
/// not "what exists". So the list is sectioned by deadline rather than sorted
/// into one undifferentiated run, and the seven filter chips that used to eat
/// two rows of the app bar are one compact segmented control.
class TaskListScreen extends ConsumerWidget {
  const TaskListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tasks'),
        centerTitle: false,
      ),
      body: const PermissionScope(
        permission: Permission.viewTasks,
        what: 'tasks',
        child: _TaskListBody(),
      ),
      floatingActionButton: PermissionGate(
        permission: Permission.createTask,
        child: FloatingActionButton(
          onPressed: () => context.push('/tasks/create'),
          tooltip: 'New task',
          child: const Icon(LucideIcons.plus),
        ),
      ),
    );
  }
}

class _TaskListBody extends ConsumerWidget {
  const _TaskListBody();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tasksAsync = ref.watch(filteredTasksProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const _TaskListControls(),
        Expanded(
          child: tasksAsync.when(
            data: (tasks) => _TaskGroups(tasks: tasks),
            loading: () => const Padding(
              padding: EdgeInsets.all(NebulaSpacing.md),
              child: ListSkeleton(),
            ),
            error: (e, _) => ErrorStateView(
              message: readableError(e),
              onRetry: () => ref.invalidate(taskListProvider),
            ),
          ),
        ),
      ],
    );
  }
}

/// Search, project scope and the filter segments.
class _TaskListControls extends ConsumerWidget {
  const _TaskListControls();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentFilter = ref.watch(taskFilterProvider);
    final currentProject = ref.watch(taskProjectFilterProvider);
    final projectsAsync = ref.watch(projectListProvider);

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        NebulaSpacing.md,
        NebulaSpacing.sm,
        NebulaSpacing.md,
        NebulaSpacing.sm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            decoration: const InputDecoration(
              hintText: 'Search tasks',
              prefixIcon: Icon(LucideIcons.search, size: 16),
            ),
            onChanged: (value) =>
                ref.read(taskSearchQueryProvider.notifier).state = value,
          ),
          const SizedBox(height: NebulaSpacing.sm),
          projectsAsync.when(
            data: (projects) => DropdownButtonFormField<int?>(
              // A project that vanished from the list must not be passed to
              // the dropdown as a value with no matching item — that asserts.
              initialValue: projects.any((p) => p.id == currentProject)
                  ? currentProject
                  : null,
              isExpanded: true,
              decoration: const InputDecoration(hintText: 'All projects'),
              items: [
                const DropdownMenuItem<int?>(
                  value: null,
                  child: Text('All projects'),
                ),
                ...projects.map(
                  (p) => DropdownMenuItem<int?>(
                    value: p.id,
                    child: Text(p.name, overflow: TextOverflow.ellipsis),
                  ),
                ),
              ],
              onChanged: (v) =>
                  ref.read(taskProjectFilterProvider.notifier).state = v,
            ),
            loading: () => const ShimmerBox(height: 44, radius: 12),
            error: (_, __) => const SizedBox.shrink(),
          ),
          const SizedBox(height: NebulaSpacing.sm),
          SegmentedFilter<TaskFilter>(
            selected: currentFilter,
            segments: const [
              (value: TaskFilter.all, label: 'All'),
              (value: TaskFilter.assignedToMe, label: 'Mine'),
              (value: TaskFilter.createdByMe, label: 'Created'),
              (value: TaskFilter.overdue, label: 'Overdue'),
              (value: TaskFilter.completed, label: 'Done'),
            ],
            onChanged: (v) => ref.read(taskFilterProvider.notifier).state = v,
          ),
        ],
      ),
    );
  }
}

class _TaskGroups extends ConsumerWidget {
  const _TaskGroups({required this.tasks});

  final List<TaskModel> tasks;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (tasks.isEmpty) {
      return const EmptyStateView(
        title: 'Nothing here',
        message: 'No task matches the current filter.',
        icon: LucideIcons.checkCheck,
      );
    }

    final now = DateTime.now();
    final buckets = <_Bucket, List<TaskModel>>{
      for (final bucket in _Bucket.values) bucket: <TaskModel>[],
    };
    for (final task in tasks) {
      buckets[_bucketOf(task, now)]!.add(task);
    }

    // Inside a section the nearest deadline comes first; undated work sinks.
    for (final list in buckets.values) {
      list.sort((a, b) {
        final ad = a.dueDate;
        final bd = b.dueDate;
        if (ad == null && bd == null) return 0;
        if (ad == null) return 1;
        if (bd == null) return -1;
        return ad.compareTo(bd);
      });
    }

    var index = 0;
    final children = <Widget>[];
    for (final bucket in _Bucket.values) {
      final items = buckets[bucket]!;
      if (items.isEmpty) continue;
      children.add(
        GroupHeader(
          _bucketLabel(bucket),
          count: items.length,
          tone: bucket == _Bucket.overdue ? DTone.critical : null,
        ),
      );
      for (final task in items) {
        children.add(
          Padding(
            padding: const EdgeInsets.only(bottom: NebulaSpacing.sm),
            child: StaggerIn(
              index: index++,
              child: _TaskRow(task: task, now: now),
            ),
          ),
        );
      }
    }

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(taskListProvider),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(
          NebulaSpacing.md,
          0,
          NebulaSpacing.md,
          NebulaSpacing.xxl,
        ),
        children: children,
      ),
    );
  }
}

class _TaskRow extends StatelessWidget {
  const _TaskRow({required this.task, required this.now});

  final TaskModel task;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final done = isTaskDone(task);
    final overdue = isTaskOverdue(task, now);
    final assignee = task.assignees.isNotEmpty ? task.assignees.first : null;
    final trail = [task.ventureName, task.projectName]
        .where((e) => e != null && e.isNotEmpty)
        .join(' / ');

    return EntityRow(
      title: task.title,
      spineColor: taskVentureColor(task),
      timeState: taskTimeState(task, now),
      strikeThrough: done,
      leading: assignee == null
          ? null
          : DAvatar(assignee.name, size: 30, imageUrl: assignee.avatar),
      trailing: TaskStatusControl(task: task),
      meta: [
        DTag(task.priority, tone: done ? DTone.neutral : priorityTone(task.priority)),
        if (trail.isNotEmpty)
          Text(trail, maxLines: 1, overflow: TextOverflow.ellipsis),
        if (task.dueDate != null)
          Mono(
            DateFormat('d MMM').format(task.dueDate!),
            size: 10.5,
            color: overdue ? dl.critical : dl.textTertiary,
          ),
        if (task.assignees.length > 1)
          Mono(
            '+${task.assignees.length - 1}',
            size: 10.5,
            color: dl.textTertiary,
          ),
      ],
      onTap: () => context.push('/tasks/${task.id}'),
    );
  }
}

_Bucket _bucketOf(TaskModel task, DateTime now) {
  if (isTaskDone(task)) return _Bucket.done;
  final due = task.dueDate;
  if (due == null) return _Bucket.later;

  final today = DateTime(now.year, now.month, now.day);
  final day = DateTime(due.year, due.month, due.day);
  final days = day.difference(today).inDays;

  if (days < 0) return _Bucket.overdue;
  if (days == 0) return _Bucket.today;
  if (days <= 7) return _Bucket.week;
  return _Bucket.later;
}

String _bucketLabel(_Bucket bucket) {
  switch (bucket) {
    case _Bucket.overdue:
      return 'Overdue';
    case _Bucket.today:
      return 'Today';
    case _Bucket.week:
      return 'This week';
    case _Bucket.later:
      return 'Later';
    case _Bucket.done:
      return 'Done';
  }
}
