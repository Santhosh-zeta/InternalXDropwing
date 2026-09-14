import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/nebula_colors.dart';
import '../providers/projects_provider.dart';
import '../../data/models/project_models.dart';

class ProjectDetailScreen extends ConsumerWidget {
  final int projectId;

  const ProjectDetailScreen({super.key, required this.projectId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final projectAsync = ref.watch(projectDetailProvider(projectId));

    return Scaffold(
      backgroundColor: NebulaColors.background,
      body: projectAsync.when(
        data: (project) => _ProjectDetailBody(project: project),
        loading: () => const Scaffold(
          backgroundColor: NebulaColors.background,
          body: Center(
              child: CircularProgressIndicator(color: NebulaColors.primary)),
        ),
        error: (e, st) => Scaffold(
          backgroundColor: NebulaColors.background,
          appBar: AppBar(
            backgroundColor: NebulaColors.surfaceCard,
            leading: IconButton(
              icon: const Icon(LucideIcons.arrowLeft,
                  color: NebulaColors.textPrimary),
              onPressed: () => context.pop(),
            ),
          ),
          body: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(LucideIcons.alertCircle,
                    size: 48, color: NebulaColors.critical),
                const SizedBox(height: 12),
                const Text('Project not found',
                    style: TextStyle(
                        color: NebulaColors.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text(e.toString(),
                    style: const TextStyle(
                        color: NebulaColors.textSecondary, fontSize: 12)),
                const SizedBox(height: 20),
                ElevatedButton(
                    onPressed: () => ref.invalidate(projectDetailProvider(projectId)),
                    child: const Text('Retry')),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ProjectDetailBody extends ConsumerWidget {
  final ProjectModel project;

  const _ProjectDetailBody({required this.project});

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

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statusColor = _statusColor();
    final progressValue = project.taskCount > 0
        ? project.completedTaskCount / project.taskCount
        : 0.0;

    return CustomScrollView(
      slivers: [
        // App Bar
        SliverAppBar(
          expandedHeight: 160,
          pinned: true,
          backgroundColor: NebulaColors.surfaceCard,
          leading: IconButton(
            icon: const Icon(LucideIcons.arrowLeft,
                color: NebulaColors.textPrimary),
            onPressed: () => context.pop(),
          ),
          actions: [
            IconButton(
              icon: const Icon(LucideIcons.edit2, color: NebulaColors.textPrimary),
              onPressed: () => context.push('/projects/${project.id}/edit'),
              tooltip: 'Edit Project',
            ),
          ],
          flexibleSpace: FlexibleSpaceBar(
            titlePadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            title: Text(
              project.name,
              style: const TextStyle(
                  color: NebulaColors.textPrimary,
                  fontWeight: FontWeight.bold,
                  fontSize: 16),
            ),
            background: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    statusColor.withValues(alpha: 0.3),
                    NebulaColors.surfaceCard,
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
            ),
          ),
        ),

        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Status + Priority Row
                Row(
                  children: [
                    _Badge(
                        label: project.status.toUpperCase(),
                        color: statusColor),
                    const SizedBox(width: 8),
                    _Badge(
                        label: project.priority.toUpperCase(),
                        color: _priorityColor()),
                    if (project.category != null) ...[
                      const SizedBox(width: 8),
                      _Badge(
                          label: project.category!,
                          color: NebulaColors.highlight),
                    ],
                  ],
                ),

                // Description
                if (project.description != null &&
                    project.description!.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  const _SectionTitle('Description'),
                  const SizedBox(height: 8),
                  Text(
                    project.description!,
                    style: const TextStyle(
                        color: NebulaColors.textSecondary,
                        fontSize: 14,
                        height: 1.5),
                  ),
                ],

                // Task Progress
                if (project.taskCount > 0) ...[
                  const SizedBox(height: 24),
                  const _SectionTitle('Task Progress'),
                  const SizedBox(height: 12),
                  _ProgressCard(
                    completed: project.completedTaskCount,
                    total: project.taskCount,
                    progress: progressValue,
                    color: statusColor,
                  ),
                ],

                // Dates
                if (project.startDate != null || project.endDate != null) ...[
                  const SizedBox(height: 24),
                  const _SectionTitle('Timeline'),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      if (project.startDate != null)
                        Expanded(
                          child: _InfoCard(
                            icon: LucideIcons.calendarDays,
                            label: 'Start Date',
                            value: _formatDate(project.startDate!),
                            color: NebulaColors.highlight,
                          ),
                        ),
                      if (project.startDate != null && project.endDate != null)
                        const SizedBox(width: 12),
                      if (project.endDate != null)
                        Expanded(
                          child: _InfoCard(
                            icon: LucideIcons.calendarCheck,
                            label: 'End Date',
                            value: _formatDate(project.endDate!),
                            color: NebulaColors.warning,
                          ),
                        ),
                    ],
                  ),
                ],

                // Budget
                if (project.budget != null && project.budget! > 0) ...[
                  const SizedBox(height: 24),
                  const _SectionTitle('Budget'),
                  const SizedBox(height: 12),
                  _InfoCard(
                    icon: LucideIcons.dollarSign,
                    label: 'Project Budget',
                    value: NumberFormat.currency(symbol: '\$')
                        .format(project.budget),
                    color: NebulaColors.success,
                  ),
                ],

                // Client
                if (project.clientName != null) ...[
                  const SizedBox(height: 24),
                  const _SectionTitle('Client'),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: NebulaColors.surfaceCard,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        const Icon(LucideIcons.user,
                            size: 18, color: NebulaColors.highlight),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(project.clientName!,
                                style: const TextStyle(
                                    color: NebulaColors.textPrimary,
                                    fontWeight: FontWeight.w600)),
                            if (project.clientEmail != null)
                              Text(project.clientEmail!,
                                  style: const TextStyle(
                                      color: NebulaColors.textSecondary,
                                      fontSize: 12)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],

                // Members
                if (project.members.isNotEmpty) ...[
                  const SizedBox(height: 24),
                  _SectionTitle('Team Members (${project.members.length})'),
                  const SizedBox(height: 12),
                  ...project.members
                      .map((m) => _MemberTile(member: m))
                      ,
                ],

                // Milestones
                if (project.milestones.isNotEmpty) ...[
                  const SizedBox(height: 24),
                  _SectionTitle(
                      'Milestones (${project.milestones.length})'),
                  const SizedBox(height: 12),
                  ...project.milestones
                      .map((m) => _MilestoneTile(milestone: m))
                      ,
                ],

                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ],
    );
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

  String _formatDate(String dateStr) {
    try {
      final dt = DateTime.parse(dateStr);
      return DateFormat('MMM d, yyyy').format(dt);
    } catch (_) {
      return dateStr;
    }
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;
  const _SectionTitle(this.title);

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: const TextStyle(
          color: NebulaColors.textPrimary,
          fontSize: 15,
          fontWeight: FontWeight.bold),
    );
  }
}

class _Badge extends StatelessWidget {
  final String label;
  final Color color;
  const _Badge({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(label,
          style: TextStyle(
              fontSize: 11, fontWeight: FontWeight.w700, color: color)),
    );
  }
}

class _ProgressCard extends StatelessWidget {
  final int completed;
  final int total;
  final double progress;
  final Color color;
  const _ProgressCard(
      {required this.completed,
      required this.total,
      required this.progress,
      required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: NebulaColors.surfaceCard,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('$completed of $total tasks completed',
                  style: const TextStyle(
                      color: NebulaColors.textSecondary, fontSize: 13)),
              Text('${(progress * 100).toInt()}%',
                  style: TextStyle(
                      color: color,
                      fontWeight: FontWeight.bold,
                      fontSize: 16)),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              backgroundColor: NebulaColors.surface,
              valueColor: AlwaysStoppedAnimation<Color>(color),
              minHeight: 8,
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  const _InfoCard(
      {required this.icon,
      required this.label,
      required this.value,
      required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: NebulaColors.surfaceCard,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 16, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: const TextStyle(
                        color: NebulaColors.textSecondary, fontSize: 11)),
                Text(value,
                    style: const TextStyle(
                        color: NebulaColors.textPrimary,
                        fontWeight: FontWeight.w600,
                        fontSize: 13)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MemberTile extends StatelessWidget {
  final ProjectMember member;
  const _MemberTile({required this.member});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: NebulaColors.surfaceCard,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 18,
            backgroundColor: NebulaColors.primary,
            child: Text(
              member.fullName.isNotEmpty ? member.fullName[0].toUpperCase() : '?',
              style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 14),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(member.fullName,
                    style: const TextStyle(
                        color: NebulaColors.textPrimary,
                        fontWeight: FontWeight.w600,
                        fontSize: 14)),
                Text(member.email,
                    style: const TextStyle(
                        color: NebulaColors.textSecondary, fontSize: 12)),
              ],
            ),
          ),
          if (member.role != null)
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: NebulaColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(member.role!,
                  style: const TextStyle(
                      color: NebulaColors.primary,
                      fontSize: 10,
                      fontWeight: FontWeight.w600)),
            ),
        ],
      ),
    );
  }
}

class _MilestoneTile extends StatelessWidget {
  final ProjectMilestone milestone;
  const _MilestoneTile({required this.milestone});

  @override
  Widget build(BuildContext context) {
    final isDone = milestone.status == 'completed' || milestone.status == 'done';
    final isInProgress = milestone.status == 'in_progress';
    final color = isDone
        ? NebulaColors.success
        : isInProgress
            ? NebulaColors.primary
            : NebulaColors.textSecondary;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: NebulaColors.surfaceCard,
        borderRadius: BorderRadius.circular(10),
        border: Border(left: BorderSide(color: color, width: 2)),
      ),
      child: Row(
        children: [
          Icon(
            isDone ? LucideIcons.checkCircle : LucideIcons.circle,
            size: 18,
            color: color,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(milestone.title,
                    style: TextStyle(
                        color: isDone
                            ? NebulaColors.textSecondary
                            : NebulaColors.textPrimary,
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                        decoration:
                            isDone ? TextDecoration.lineThrough : null)),
                if (milestone.dueDate != null)
                  Text(
                    'Due: ${_formatDate(milestone.dueDate!)}',
                    style: const TextStyle(
                        color: NebulaColors.textSecondary, fontSize: 11),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(String dateStr) {
    try {
      return DateFormat('MMM d, yyyy').format(DateTime.parse(dateStr));
    } catch (_) {
      return dateStr;
    }
  }
}
