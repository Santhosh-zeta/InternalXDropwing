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
import '../../../tasks/presentation/widgets/segmented_filter.dart';
import '../../data/models/project_models.dart';
import '../providers/projects_provider.dart';
import '../widgets/project_chrome.dart';

class ProjectsScreen extends ConsumerWidget {
  const ProjectsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Projects'),
        centerTitle: false,
      ),
      body: const PermissionScope(
        permission: Permission.viewProjects,
        what: 'projects',
        child: _ProjectsBody(),
      ),
      floatingActionButton: PermissionGate(
        permission: Permission.createProject,
        child: FloatingActionButton(
          onPressed: () => context.push('/projects/create'),
          tooltip: 'New project',
          child: const Icon(LucideIcons.plus),
        ),
      ),
    );
  }
}

class _ProjectsBody extends ConsumerWidget {
  const _ProjectsBody();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final projectsAsync = ref.watch(filteredProjectsProvider);
    final currentFilter = ref.watch(projectFilterProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(
            NebulaSpacing.md,
            NebulaSpacing.sm,
            NebulaSpacing.md,
            NebulaSpacing.sm,
          ),
          child: SegmentedFilter<ProjectFilter>(
            selected: currentFilter,
            segments: const [
              (value: ProjectFilter.all, label: 'All'),
              (value: ProjectFilter.active, label: 'Active'),
              (value: ProjectFilter.completed, label: 'Completed'),
              (value: ProjectFilter.archived, label: 'Archived'),
            ],
            onChanged: (v) =>
                ref.read(projectFilterProvider.notifier).state = v,
          ),
        ),
        Expanded(
          child: projectsAsync.when(
            data: (projects) => _ProjectGroups(projects: projects),
            loading: () => const Padding(
              padding: EdgeInsets.all(NebulaSpacing.md),
              child: ListSkeleton(),
            ),
            error: (e, _) => ErrorStateView(
              message: readableError(e),
              onRetry: () => ref.invalidate(projectListProvider),
            ),
          ),
        ),
      ],
    );
  }
}

/// Projects sectioned by status, in the order work actually moves through
/// them — what is running, what is being planned, what has stalled, what is
/// finished, what has been put away.
class _ProjectGroups extends ConsumerWidget {
  const _ProjectGroups({required this.projects});

  final List<ProjectModel> projects;

  static const _order = [
    'active',
    'planning',
    'on-hold',
    'completed',
    'archived',
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (projects.isEmpty) {
      return const EmptyStateView(
        title: 'No projects',
        message: 'Nothing matches this filter yet.',
        icon: LucideIcons.folderOpen,
      );
    }

    final grouped = <String, List<ProjectModel>>{};
    for (final project in projects) {
      grouped.putIfAbsent(project.status, () => []).add(project);
    }

    final keys = grouped.keys.toList()
      ..sort((a, b) {
        final ai = _order.indexOf(a);
        final bi = _order.indexOf(b);
        // Anything the backend adds later sorts after the known statuses
        // rather than disappearing.
        return (ai == -1 ? _order.length : ai)
            .compareTo(bi == -1 ? _order.length : bi);
      });

    var index = 0;
    final children = <Widget>[];
    for (final key in keys) {
      final items = grouped[key]!;
      children.add(
        GroupHeader(
          projectStatusLabel(key),
          count: items.length,
          tone: key == 'on-hold' ? DTone.warn : null,
        ),
      );
      for (final project in items) {
        children.add(
          Padding(
            padding: const EdgeInsets.only(bottom: NebulaSpacing.sm),
            child: StaggerIn(
              index: index++,
              child: _ProjectRow(project: project),
            ),
          ),
        );
      }
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(projectListProvider.notifier).refresh(),
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

class _ProjectRow extends StatelessWidget {
  const _ProjectRow({required this.project});

  final ProjectModel project;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final ventureColor = projectVentureColor(project);
    final lead = project.members.isNotEmpty ? project.members.first : null;
    final end = parseApiDate(project.endDate);
    final overdue = end != null &&
        !project.isCompleted &&
        !project.isArchived &&
        end.isBefore(DateTime.now());

    return EntityRow(
      title: project.name,
      spineColor: ventureColor,
      timeState: projectTimeState(project),
      strikeThrough: project.isCompleted,
      leading: lead == null ? null : DAvatar(lead.fullName, size: 30),
      trailing: project.taskCount == 0
          ? null
          : _ProgressPip(value: project.progress, color: ventureColor),
      meta: [
        DTag(project.priority, tone: projectPriorityTone(project.priority)),
        if (project.ventureName != null && project.ventureName!.isNotEmpty)
          Text(
            project.ventureName!,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        if (project.taskCount > 0)
          Mono(
            '${project.completedTaskCount}/${project.taskCount}',
            size: 10.5,
            color: dl.textTertiary,
          ),
        if (project.members.length > 1)
          Mono(
            '+${project.members.length - 1}',
            size: 10.5,
            color: dl.textTertiary,
          ),
        if (end != null)
          Mono(
            DateFormat('d MMM').format(end),
            size: 10.5,
            color: overdue ? dl.critical : dl.textTertiary,
          ),
      ],
      onTap: () => context.push('/projects/${project.id}'),
    );
  }
}

/// Percentage over a short track — the row's one figure and its picture.
class _ProgressPip extends StatelessWidget {
  const _ProgressPip({required this.value, required this.color});

  final double value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 52,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Mono(
            '${(value.clamp(0.0, 1.0) * 100).round()}%',
            size: 11,
            color: context.dl.textTertiary,
          ),
          const SizedBox(height: 5),
          ProgressTrack(value: value, color: color, height: 4),
        ],
      ),
    );
  }
}
