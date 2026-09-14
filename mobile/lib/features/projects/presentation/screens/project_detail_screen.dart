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
import '../../data/models/project_models.dart';
import '../providers/projects_provider.dart';
import '../widgets/project_chrome.dart';

class ProjectDetailScreen extends ConsumerWidget {
  const ProjectDetailScreen({super.key, required this.projectId});

  final int projectId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final projectAsync = ref.watch(projectDetailProvider(projectId));

    return Scaffold(
      appBar: AppBar(
        title: Text(
          projectAsync.valueOrNull?.name ?? 'Project',
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          PermissionGate(
            permission: Permission.updateProject,
            child: IconButton(
              icon: const Icon(LucideIcons.pencil, size: 18),
              tooltip: 'Edit project',
              onPressed: () => context.push('/projects/$projectId/edit'),
            ),
          ),
          const SizedBox(width: NebulaSpacing.xs),
        ],
      ),
      body: PermissionScope(
        permission: Permission.viewProjects,
        what: 'projects',
        child: projectAsync.when(
          data: (project) => _ProjectDetailBody(project: project),
          loading: () => const Padding(
            padding: EdgeInsets.all(NebulaSpacing.md),
            child: ListSkeleton(count: 4),
          ),
          error: (e, _) => ErrorStateView(
            message: readableError(e),
            onRetry: () => ref.invalidate(projectDetailProvider(projectId)),
          ),
        ),
      ),
    );
  }
}

class _ProjectDetailBody extends StatelessWidget {
  const _ProjectDetailBody({required this.project});

  final ProjectModel project;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final ventureColor = projectVentureColor(project);
    final start = formatApiDate(project.startDate);
    final end = formatApiDate(project.endDate);
    final hasDates = start != null || end != null;

    return RefreshIndicator(
      onRefresh: () async {},
      notificationPredicate: (_) => false,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(
          NebulaSpacing.md,
          NebulaSpacing.md,
          NebulaSpacing.md,
          NebulaSpacing.xxl,
        ),
        children: [
          // ── Header ────────────────────────────────────────────────────
          StaggerIn(
            index: 0,
            child: DCard(
              accent: ventureColor,
              emphasised: project.isActive,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (project.ventureName != null &&
                      project.ventureName!.isNotEmpty)
                    Row(
                      children: [
                        VentureDot(ventureColor),
                        const SizedBox(width: 7),
                        Expanded(
                          child: Text(
                            project.ventureName!,
                            style: context.text.bodySmall,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  const SizedBox(height: NebulaSpacing.sm),
                  Text(
                    project.name,
                    style: context.text.headlineSmall?.copyWith(
                      color: project.isCompleted || project.isArchived
                          ? dl.timePast
                          : null,
                    ),
                  ),
                  const SizedBox(height: NebulaSpacing.md),
                  Wrap(
                    spacing: NebulaSpacing.sm,
                    runSpacing: NebulaSpacing.sm,
                    children: [
                      DTag(
                        projectStatusLabel(project.status),
                        tone: projectStatusTone(project.status),
                      ),
                      DTag(
                        project.priority,
                        tone: projectPriorityTone(project.priority),
                      ),
                      if (project.category != null &&
                          project.category!.isNotEmpty)
                        DTag(project.category!),
                      for (final tag in project.tags) DTag(tag),
                    ],
                  ),
                  if (project.description != null &&
                      project.description!.trim().isNotEmpty) ...[
                    const SizedBox(height: NebulaSpacing.md),
                    Text(
                      project.description!,
                      style: context.text.bodyMedium,
                    ),
                  ],
                ],
              ),
            ),
          ),

          // ── Progress ──────────────────────────────────────────────────
          if (project.taskCount > 0) ...[
            const SizedBox(height: NebulaSpacing.lg),
            const SectionHeader('PROGRESS'),
            StaggerIn(
              index: 1,
              child: DCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text('Tasks completed', style: context.text.bodySmall),
                        Mono(
                          '${(project.progress * 100).round()}%',
                          size: 17,
                          color: ventureColor,
                        ),
                      ],
                    ),
                    const SizedBox(height: NebulaSpacing.sm),
                    ProgressTrack(
                      value: project.progress,
                      color: ventureColor,
                      height: 6,
                    ),
                    const SizedBox(height: NebulaSpacing.md),
                    MetricRow([
                      StatTile(
                        value: project.completedTaskCount,
                        label: 'Done',
                        tone: DTone.ok,
                      ),
                      StatTile(
                        value: project.taskCount - project.completedTaskCount,
                        label: 'Open',
                      ),
                      StatTile(value: project.taskCount, label: 'Total tasks'),
                    ]),
                  ],
                ),
              ),
            ),
          ],

          // ── Budget ────────────────────────────────────────────────────
          //
          // The API strips `budget` from the payload above access level 4, so
          // a null here means "not sent", not "zero". There is no spend field
          // on the project record, so only the allocation is shown — a
          // "spent vs total" split would have to be invented.
          if (project.budget != null) ...[
            const SizedBox(height: NebulaSpacing.lg),
            const SectionHeader('BUDGET'),
            PermissionGate(
              permission: Permission.viewBudget,
              child: StaggerIn(
                index: 2,
                child: DCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Allocated', style: context.text.bodySmall),
                      const SizedBox(height: 4),
                      Mono(
                        NumberFormat.currency(symbol: '\$', decimalDigits: 0)
                            .format(project.budget),
                        size: 22,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],

          // ── Timeline ──────────────────────────────────────────────────
          if (hasDates) ...[
            const SizedBox(height: NebulaSpacing.lg),
            const SectionHeader('TIMELINE'),
            StaggerIn(
              index: 3,
              child: DCard(
                child: Column(
                  children: [
                    _DetailLine(label: 'Starts', value: start),
                    _DetailLine(
                      label: 'Ends',
                      value: end,
                      tone: projectTimeState(project) == TimeState.overdue
                          ? DTone.critical
                          : null,
                    ),
                  ],
                ),
              ),
            ),
          ],

          // ── Client ────────────────────────────────────────────────────
          if (project.clientName != null && project.clientName!.isNotEmpty) ...[
            const SizedBox(height: NebulaSpacing.lg),
            const SectionHeader('CLIENT'),
            StaggerIn(
              index: 4,
              child: EntityRow(
                title: project.clientName!,
                leading: DAvatar(project.clientName, size: 32),
                meta: [
                  if (project.clientEmail != null &&
                      project.clientEmail!.isNotEmpty)
                    Text(project.clientEmail!),
                ],
              ),
            ),
          ],

          // ── Team ──────────────────────────────────────────────────────
          if (project.members.isNotEmpty) ...[
            const SizedBox(height: NebulaSpacing.lg),
            SectionHeader('TEAM · ${project.members.length}'),
            for (var i = 0; i < project.members.length; i++)
              Padding(
                padding: const EdgeInsets.only(bottom: NebulaSpacing.sm),
                child: StaggerIn(
                  index: 5 + i,
                  child: EntityRow(
                    title: project.members[i].fullName,
                    leading: DAvatar(project.members[i].fullName, size: 32),
                    meta: [
                      if (project.members[i].email.isNotEmpty)
                        Text(
                          project.members[i].email,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                    ],
                    trailing: project.members[i].role == null
                        ? null
                        : DTag(project.members[i].role!),
                  ),
                ),
              ),
          ],

          // ── Milestones ────────────────────────────────────────────────
          if (project.milestones.isNotEmpty) ...[
            const SizedBox(height: NebulaSpacing.md),
            SectionHeader('MILESTONES · ${project.milestones.length}'),
            for (var i = 0; i < project.milestones.length; i++)
              Padding(
                padding: const EdgeInsets.only(bottom: NebulaSpacing.sm),
                child: StaggerIn(
                  index: 5 + project.members.length + i,
                  child: _MilestoneRow(
                    milestone: project.milestones[i],
                    accent: ventureColor,
                  ),
                ),
              ),
          ],

          if (project.createdByName != null) ...[
            const SizedBox(height: NebulaSpacing.md),
            const SectionHeader('CREATED BY'),
            EntityRow(
              title: project.createdByName!,
              leading: DAvatar(project.createdByName, size: 32),
              meta: [
                if (formatApiDate(project.createdAt) != null)
                  Mono(formatApiDate(project.createdAt)!, size: 10.5),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _MilestoneRow extends StatelessWidget {
  const _MilestoneRow({required this.milestone, required this.accent});

  final ProjectMilestone milestone;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    final done = isMilestoneDone(milestone);
    final state = milestoneTimeState(milestone);
    final due = formatApiDate(milestone.dueDate, pattern: 'd MMM yyyy');

    return EntityRow(
      title: milestone.title,
      spineColor: accent,
      timeState: state,
      strikeThrough: done,
      leading: Icon(
        done ? LucideIcons.circleCheck : LucideIcons.circle,
        size: 18,
        color: done ? context.dl.success : context.dl.textTertiary,
      ),
      meta: [
        DTag(
          projectStatusLabel(milestone.status),
          tone: done ? DTone.ok : DTone.neutral,
        ),
        if (due != null)
          Mono(
            due,
            size: 10.5,
            color: state == TimeState.overdue
                ? context.dl.critical
                : context.dl.textTertiary,
          ),
      ],
    );
  }
}

/// Label on the left, figure on the right. Renders nothing when the API did
/// not send the value.
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
