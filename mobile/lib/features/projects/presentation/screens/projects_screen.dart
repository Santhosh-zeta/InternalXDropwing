import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/nebula_colors.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../providers/projects_provider.dart';
import '../../data/models/project_models.dart';

class ProjectsScreen extends ConsumerWidget {
  const ProjectsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final projectsAsync = ref.watch(filteredProjectsProvider);
    final currentFilter = ref.watch(projectFilterProvider);

    return Scaffold(
      backgroundColor: NebulaColors.background,
      appBar: AppBar(
        title: const Text('Projects',
            style: TextStyle(
                fontWeight: FontWeight.w600,
                color: NebulaColors.textPrimary)),
        backgroundColor: NebulaColors.surfaceCard,
        elevation: 0,
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.plus, color: NebulaColors.primary),
            onPressed: () => context.push('/projects/create'),
            tooltip: 'New Project',
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: Container(
            alignment: Alignment.centerLeft,
            padding:
                const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _FilterChip(
                    label: 'All',
                    isSelected: currentFilter == ProjectFilter.all,
                    onSelected: () => ref
                        .read(projectFilterProvider.notifier)
                        .state = ProjectFilter.all,
                  ),
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: 'Active',
                    isSelected: currentFilter == ProjectFilter.active,
                    onSelected: () => ref
                        .read(projectFilterProvider.notifier)
                        .state = ProjectFilter.active,
                  ),
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: 'Completed',
                    isSelected: currentFilter == ProjectFilter.completed,
                    onSelected: () => ref
                        .read(projectFilterProvider.notifier)
                        .state = ProjectFilter.completed,
                  ),
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: 'Archived',
                    isSelected: currentFilter == ProjectFilter.archived,
                    onSelected: () => ref
                        .read(projectFilterProvider.notifier)
                        .state = ProjectFilter.archived,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
      body: projectsAsync.when(
        data: (projects) {
          if (projects.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(LucideIcons.folderOpen,
                      size: 64,
                      color: NebulaColors.textSecondary.withValues(alpha: 0.4)),
                  const SizedBox(height: 16),
                  const Text('No projects found.',
                      style: TextStyle(
                          color: NebulaColors.textSecondary, fontSize: 16)),
                  const SizedBox(height: 8),
                  const Text('Tap + to create your first project.',
                      style: TextStyle(
                          color: NebulaColors.textSecondary, fontSize: 13)),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () => ref.read(projectListProvider.notifier).refresh(),
            child: ListView.separated(
              padding: const EdgeInsets.all(16.0),
              itemCount: projects.length,
              separatorBuilder: (context, index) =>
                  const SizedBox(height: 16),
              itemBuilder: (context, index) {
                return _ProjectCard(project: projects[index]);
              },
            ),
          );
        },
        loading: () => const Center(
            child: CircularProgressIndicator(color: NebulaColors.primary)),
        error: (e, st) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(LucideIcons.alertCircle,
                  size: 48, color: NebulaColors.critical),
              const SizedBox(height: 12),
              const Text(
                'Failed to load projects',
                style: TextStyle(
                    color: NebulaColors.textPrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              Text(e.toString(),
                  style: const TextStyle(
                      color: NebulaColors.textSecondary, fontSize: 12),
                  textAlign: TextAlign.center),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                onPressed: () => ref.invalidate(projectListProvider),
                icon: const Icon(LucideIcons.refreshCw),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProjectCard extends StatelessWidget {
  final ProjectModel project;

  const _ProjectCard({required this.project});

  Color _statusColor() {
    switch (project.status) {
      case 'active':
        return NebulaColors.primary;
      case 'completed':
        return NebulaColors.success;
      case 'archived':
        return NebulaColors.textSecondary;
      case 'on-hold':
        return NebulaColors.warning;
      default:
        return NebulaColors.highlight;
    }
  }

  Color _priorityColor() {
    switch (project.priority) {
      case 'high':
        return NebulaColors.critical;
      case 'medium':
        return NebulaColors.warning;
      case 'low':
        return NebulaColors.success;
      default:
        return NebulaColors.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = _statusColor();
    final hasProgress = project.taskCount > 0;
    final progressValue =
        hasProgress ? project.completedTaskCount / project.taskCount : 0.0;

    return InkWell(
      onTap: () => context.push('/projects/${project.id}'),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          color: NebulaColors.surfaceCard,
          borderRadius: BorderRadius.circular(16),
          border: Border(
            left: BorderSide(color: statusColor, width: 3),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header row
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (project.ventureName != null)
                        Text(
                          project.ventureName!,
                          style: TextStyle(
                              fontSize: 11,
                              color: statusColor,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.5),
                        ),
                      const SizedBox(height: 2),
                      Text(
                        project.name,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: NebulaColors.textPrimary,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    project.status.toUpperCase(),
                    style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: statusColor),
                  ),
                ),
              ],
            ),

            if (project.description != null &&
                project.description!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                project.description!,
                style: const TextStyle(
                    fontSize: 13, color: NebulaColors.textSecondary),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],

            const SizedBox(height: 16),

            // Progress bar
            if (hasProgress) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${project.completedTaskCount}/${project.taskCount} tasks',
                    style: const TextStyle(
                        fontSize: 12, color: NebulaColors.textSecondary),
                  ),
                  Text(
                    '${(progressValue * 100).toInt()}%',
                    style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: statusColor),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: progressValue,
                  backgroundColor: NebulaColors.surface,
                  valueColor: AlwaysStoppedAnimation<Color>(statusColor),
                  minHeight: 5,
                ),
              ),
              const SizedBox(height: 14),
            ],

            // Footer row: priority, members, date
            Row(
              children: [
                // Priority badge
                Row(
                  children: [
                    Icon(LucideIcons.flag,
                        size: 13, color: _priorityColor()),
                    const SizedBox(width: 4),
                    Text(
                      project.priority.toUpperCase(),
                      style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: _priorityColor()),
                    ),
                  ],
                ),

                if (project.category != null) ...[
                  const SizedBox(width: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: NebulaColors.surface,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      project.category!,
                      style: const TextStyle(
                          fontSize: 10, color: NebulaColors.textSecondary),
                    ),
                  ),
                ],

                const Spacer(),

                // Members avatars
                if (project.members.isNotEmpty)
                  SizedBox(
                    width: project.members.length.clamp(1, 3) * 18.0 + 12,
                    height: 26,
                    child: Stack(
                      children: List.generate(
                        project.members.length > 3
                            ? 3
                            : project.members.length,
                        (i) => Positioned(
                          right: i * 14.0,
                          child: CircleAvatar(
                            radius: 13,
                            backgroundColor: NebulaColors.primary,
                            child: Text(
                              project.members[i].fullName.isNotEmpty
                                  ? project.members[i].fullName[0]
                                      .toUpperCase()
                                  : '?',
                              style: const TextStyle(
                                  fontSize: 9,
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),

                if (project.endDate != null) ...[
                  const SizedBox(width: 8),
                  const Icon(LucideIcons.calendar,
                      size: 12, color: NebulaColors.textSecondary),
                  const SizedBox(width: 3),
                  Text(
                    _formatDate(project.endDate!),
                    style: const TextStyle(
                        fontSize: 11, color: NebulaColors.textSecondary),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(String dateStr) {
    try {
      final dt = DateTime.parse(dateStr);
      return DateFormat('MMM d, yy').format(dt);
    } catch (_) {
      return dateStr;
    }
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onSelected;

  const _FilterChip({
    required this.label,
    required this.isSelected,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => onSelected(),
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : NebulaColors.textPrimary,
        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
        fontSize: 12,
      ),
      selectedColor: NebulaColors.primary,
      backgroundColor: NebulaColors.surfaceCard,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(
          color: isSelected ? Colors.transparent : NebulaColors.surface,
        ),
      ),
      showCheckmark: false,
    );
  }
}
