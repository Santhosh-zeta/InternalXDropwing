import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/rbac/permissions.dart';
import '../../../../core/rbac/rbac_widgets.dart';
import '../../../../core/theme/nebula_colors.dart';
import '../../../../core/theme/nebula_spacing.dart';
import '../../../../core/theme/nebula_typography.dart';
import '../../../../core/theme/theme_context.dart';
import '../../../../core/widgets/data_display.dart';
import '../../../../core/widgets/day_rail.dart';
import '../../../../core/widgets/motion.dart';
import '../../../../core/widgets/primitives.dart';
import '../../../../core/widgets/state_views.dart';
import '../../../projects/data/models/project_models.dart';
import '../../../projects/presentation/providers/projects_provider.dart';
import '../../data/models/home_models.dart';
import '../../providers/home_provider.dart';

/// Which venture the whole screen is scoped to. Null means "all four".
final homeLensProvider = StateProvider<int?>((ref) => null);

/// Home — the day, not a dashboard.
///
/// The previous version of this screen spent a 200px custom-painted glowing
/// orb, a 40-second orbiting "venture galaxy" and an animated radial gradient
/// to display four numbers, several of which were fabricated: a hardcoded
/// "92% health", four invented radar scores, and a per-venture health formula
/// with no backing field. All of it is gone.
///
/// What replaced it is a time axis. Everything the day contains — what has
/// already happened, what is happening right now, what is still due — hangs
/// off one rail, dimmed behind you and brightest at the present moment. The
/// screen therefore reads differently at 09:00 than at 16:00, which is the
/// only honest reason an app earns a second open.
///
/// Every figure here is computed from a record the API actually returned.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final homeAsync = ref.watch(homeDataProvider);
    final projectsAsync = ref.watch(projectListProvider);
    final user = ref.watch(currentUserProvider);
    final unread = ref.watch(unreadNotificationsProvider);
    final lens = ref.watch(homeLensProvider);

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(homeDataProvider);
            ref.invalidate(projectListProvider);
            await ref.read(homeDataProvider.future);
          },
          child: ListView(
            padding: const EdgeInsets.fromLTRB(
              NebulaSpacing.md,
              NebulaSpacing.sm,
              NebulaSpacing.md,
              NebulaSpacing.xxl,
            ),
            children: [
              _Header(user: user, unread: unread),
              const SizedBox(height: NebulaSpacing.md),
              homeAsync.when(
                loading: () => const _HomeSkeleton(),
                error: (e, _) => Padding(
                  padding: const EdgeInsets.only(top: NebulaSpacing.xl),
                  child: ErrorStateView(
                    message: readableError(e),
                    onRetry: () => ref.invalidate(homeDataProvider),
                  ),
                ),
                data: (home) {
                  final projects = projectsAsync.valueOrNull ?? const <ProjectModel>[];
                  return _Body(
                    home: home,
                    projects: projects,
                    lens: lens,
                    user: user,
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.user, required this.unread});

  final dynamic user;
  final int unread;

  @override
  Widget build(BuildContext context) {
    final name = user?.fullName as String? ?? 'Signed out';
    final employeeId = user?.employeeId as String?;
    final levelName = user?.levelName as String?;

    final subtitle = [
      if (employeeId != null && employeeId.isNotEmpty) employeeId,
      if (levelName != null && levelName.isNotEmpty) levelName.toUpperCase(),
    ].join(' · ');

    return Row(
      children: [
        DAvatar(name, size: 40, imageUrl: user?.avatarUrl as String?),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: context.text.titleLarge,
              ),
              if (subtitle.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 1),
                  child: Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: NebulaTypography.monoLabel(
                      color: context.dl.textTertiary,
                      fontSize: 9.5,
                    ),
                  ),
                ),
            ],
          ),
        ),
        _BellButton(unread: unread),
      ],
    );
  }
}

class _BellButton extends StatelessWidget {
  const _BellButton({required this.unread});

  final int unread;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    return PressScale(
      onTap: () => context.push('/notifications'),
      child: Padding(
        padding: const EdgeInsets.all(4),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Icon(LucideIcons.bell, size: 21, color: context.scheme.onSurfaceVariant),
            if (unread > 0)
              Positioned(
                top: -5,
                right: -6,
                child: Container(
                  constraints: const BoxConstraints(minWidth: 16),
                  height: 16,
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  decoration: BoxDecoration(
                    color: dl.critical,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: context.scheme.surface,
                      width: 2,
                    ),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    unread > 99 ? '99+' : '$unread',
                    style: NebulaTypography.mono(
                      fontSize: 9,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _Body extends ConsumerWidget {
  const _Body({
    required this.home,
    required this.projects,
    required this.lens,
    required this.user,
  });

  final HomeData home;
  final List<ProjectModel> projects;
  final int? lens;
  final dynamic user;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final now = DateTime.now();

    // ── Scope everything to the selected venture ────────────────────────────
    final tasks = lens == null
        ? home.tasks
        : home.tasks.where((t) => t.ventureId == lens).toList();
    final scopedProjects = lens == null
        ? projects
        : projects.where((p) => p.ventureId == lens).toList();

    // ── Counts, all derived from real records ───────────────────────────────
    final open = tasks.where((t) => !t.isDone).toList();
    final dueToday = open.where((t) {
      final d = t.due;
      return d != null && _sameDay(d, now);
    }).length;
    final overdue = open.where((t) {
      final d = t.due;
      return d != null && d.isBefore(DateTime(now.year, now.month, now.day));
    }).length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _VentureLens(
          ventures: _lensOptions(home, projects, user),
          selected: lens,
        ),
        const SizedBox(height: NebulaSpacing.lg),

        _NowBlock(now: now, open: open.length, dueToday: dueToday, overdue: overdue),
        const SizedBox(height: NebulaSpacing.lg),

        MetricRow([
          StatTile(value: open.length, label: 'Open tasks'),
          StatTile(
            value: dueToday,
            label: 'Due today',
            tone: dueToday > 0 ? DTone.warn : null,
          ),
          StatTile(
            value: overdue,
            label: 'Overdue',
            tone: overdue > 0 ? DTone.critical : null,
          ),
        ]),

        if (home.analytics.recentActivity.isNotEmpty) ...[
          const SizedBox(height: NebulaSpacing.lg),
          const SectionHeader('Today across the group'),
          _Pulse(activity: home.analytics.recentActivity, now: now),
        ],

        if (scopedProjects.isNotEmpty) ...[
          const SizedBox(height: NebulaSpacing.lg),
          SectionHeader(
            lens == null ? 'Ventures' : 'Projects',
            actionLabel: 'All projects',
            onAction: () => context.go('/projects'),
          ),
          _VentureLedger(projects: scopedProjects, byVenture: lens == null),
        ],

        const SizedBox(height: NebulaSpacing.lg),
        const SectionHeader('Your day'),
        _Rail(
          tasks: tasks,
          activity: home.analytics.recentActivity,
          now: now,
        ),
      ],
    );
  }

  /// Ventures the signed-in user is allowed to scope to.
  ///
  /// Levels 1-2 see the whole group; everyone else is pinned to their own
  /// venture, matching the backend's `isGlobal = accessLevel <= 2`.
  List<({int id, String name, Color color})> _lensOptions(
    HomeData home,
    List<ProjectModel> projects,
    dynamic user,
  ) {
    final seen = <int, ({int id, String name, Color color})>{};
    for (final p in projects) {
      final id = p.ventureId;
      if (id == null || seen.containsKey(id)) continue;
      if (!Rbac.canSeeVenture(user, id)) continue;
      seen[id] = (
        id: id,
        name: p.ventureName ?? 'Venture $id',
        color: NebulaColors.parseHex(
          p.ventureColor,
          fallback: NebulaColors.forVentureId(id),
        ),
      );
    }
    return seen.values.toList()..sort((a, b) => a.id.compareTo(b.id));
  }

  static bool _sameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;
}

/// Horizontal venture scope selector. Tapping re-scopes the entire screen.
class _VentureLens extends ConsumerWidget {
  const _VentureLens({required this.ventures, required this.selected});

  final List<({int id, String name, Color color})> ventures;
  final int? selected;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // With one venture there is nothing to switch between — most staff are
    // scoped to a single venture, and a one-item picker is just noise.
    if (ventures.length < 2) return const SizedBox.shrink();

    return SizedBox(
      height: 32,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          _chip(context, ref, null, 'All ${_word(ventures.length)}', null),
          for (final v in ventures) ...[
            const SizedBox(width: 6),
            _chip(context, ref, v.id, v.name, v.color),
          ],
        ],
      ),
    );
  }

  static String _word(int n) => switch (n) {
        2 => 'two',
        3 => 'three',
        4 => 'four',
        _ => '$n',
      };

  Widget _chip(
    BuildContext context,
    WidgetRef ref,
    int? id,
    String label,
    Color? color,
  ) {
    final dl = context.dl;
    final active = selected == id;

    return PressScale(
      onTap: () => ref.read(homeLensProvider.notifier).state = id,
      child: AnimatedContainer(
        duration: Motion.normal,
        curve: Motion.entrance,
        padding: const EdgeInsets.symmetric(horizontal: 11),
        decoration: BoxDecoration(
          color: active ? dl.surfaceRaised : context.scheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(NebulaSpacing.radiusSm),
          border: Border.all(color: active ? dl.borderStrong : dl.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (color != null) ...[
              VentureDot(color),
              const SizedBox(width: 6),
            ],
            Text(
              label,
              style: context.text.bodySmall?.copyWith(
                fontSize: 11.5,
                color: active ? context.scheme.onSurface : dl.textTertiary,
                fontWeight: active ? FontWeight.w600 : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// The present moment, stated in words.
class _NowBlock extends StatelessWidget {
  const _NowBlock({
    required this.now,
    required this.open,
    required this.dueToday,
    required this.overdue,
  });

  final DateTime now;
  final int open;
  final int dueToday;
  final int overdue;

  static const _months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  static const _days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  String get _stamp {
    final d = _days[now.weekday - 1];
    final t = '${now.hour.toString().padLeft(2, '0')}:'
        '${now.minute.toString().padLeft(2, '0')}';
    return '$d ${now.day} ${_months[now.month - 1]} · $t';
  }

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const LiveDot(size: 6),
            const SizedBox(width: 8),
            Text(
              _stamp.toUpperCase(),
              style: NebulaTypography.monoLabel(color: dl.textTertiary),
            ),
          ],
        ),
        const SizedBox(height: 10),
        _Sentence(open: open, dueToday: dueToday, overdue: overdue),
      ],
    );
  }
}

/// One line that says what actually matters right now.
class _Sentence extends StatelessWidget {
  const _Sentence({
    required this.open,
    required this.dueToday,
    required this.overdue,
  });

  final int open;
  final int dueToday;
  final int overdue;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final strong = context.text.titleLarge?.copyWith(
      color: dl.timeNow,
      height: 1.35,
    );
    final normal = context.text.titleLarge?.copyWith(
      color: context.scheme.onSurfaceVariant,
      fontWeight: FontWeight.w400,
      height: 1.35,
    );

    if (open == 0) {
      return Text('Nothing open. Enjoy it.', style: strong);
    }

    final spans = <TextSpan>[];
    if (dueToday > 0) {
      spans.add(TextSpan(text: '$dueToday', style: strong));
      spans.add(TextSpan(
        text: dueToday == 1 ? ' task due today' : ' tasks due today',
        style: normal,
      ));
    }
    if (overdue > 0) {
      if (spans.isNotEmpty) spans.add(TextSpan(text: ', ', style: normal));
      spans.add(TextSpan(
        text: '$overdue',
        style: strong?.copyWith(color: dl.critical),
      ));
      spans.add(TextSpan(text: ' overdue', style: normal));
    }
    if (spans.isEmpty) {
      spans.add(TextSpan(text: '$open', style: strong));
      spans.add(TextSpan(
        text: open == 1 ? ' task open, none due today' : ' tasks open, none due today',
        style: normal,
      ));
    } else {
      spans.add(TextSpan(text: '.', style: normal));
    }

    return Text.rich(TextSpan(children: spans));
  }
}

/// Hourly activity, bucketed from real audit timestamps.
class _Pulse extends StatelessWidget {
  const _Pulse({required this.activity, required this.now});

  final List<ActivityItem> activity;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    const startHour = 6;
    const endHour = 23;

    final counts = <int, int>{};
    for (final a in activity) {
      final t = DateTime.tryParse(a.createdAt);
      if (t == null) continue;
      final local = t.toLocal();
      if (local.year != now.year || local.month != now.month || local.day != now.day) {
        continue;
      }
      counts[local.hour] = (counts[local.hour] ?? 0) + 1;
    }

    // Nothing logged today — an empty strip says nothing worth the space.
    if (counts.isEmpty) return const SizedBox.shrink();

    final bars = [
      for (var h = startHour; h <= endHour; h++)
        PulseBar(
          hour: h,
          value: counts[h] ?? 0,
          color: context.scheme.primary,
        ),
    ];

    return Padding(
      padding: const EdgeInsets.only(top: 2),
      child: PulseStrip(bars: bars, nowHour: now.hour),
    );
  }
}

/// Projects grouped by venture, or listed flat when already scoped to one.
class _VentureLedger extends StatelessWidget {
  const _VentureLedger({required this.projects, required this.byVenture});

  final List<ProjectModel> projects;
  final bool byVenture;

  @override
  Widget build(BuildContext context) {
    if (!byVenture) {
      return Column(
        children: [
          for (var i = 0; i < projects.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: NebulaSpacing.sm),
              child: StaggerIn(
                index: i,
                child: _projectRow(context, projects[i]),
              ),
            ),
        ],
      );
    }

    final groups = <int, List<ProjectModel>>{};
    for (final p in projects) {
      final id = p.ventureId;
      if (id == null) continue;
      groups.putIfAbsent(id, () => []).add(p);
    }
    final ids = groups.keys.toList()..sort();

    return Column(
      children: [
        for (var i = 0; i < ids.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: NebulaSpacing.sm),
            child: StaggerIn(
              index: i,
              child: _ventureRow(context, groups[ids[i]]!),
            ),
          ),
      ],
    );
  }

  Widget _ventureRow(BuildContext context, List<ProjectModel> group) {
    final first = group.first;
    final color = NebulaColors.parseHex(
      first.ventureColor,
      fallback: NebulaColors.forVentureId(first.ventureId),
    );

    // Real completion: tasks actually done over tasks that actually exist.
    // The previous screen invented a "health %" here with no backing field.
    final totalTasks = group.fold<int>(0, (s, p) => s + p.taskCount);
    final doneTasks = group.fold<int>(0, (s, p) => s + p.completedTaskCount);
    final active = group.where((p) => p.status.toLowerCase() == 'active').length;

    return EntityRow(
      title: first.ventureName ?? 'Venture ${first.ventureId}',
      spineColor: color,
      meta: [
        Text('${group.length} ${group.length == 1 ? 'project' : 'projects'}'),
        if (active > 0) Text('$active active'),
      ],
      trailing: totalTasks == 0
          ? null
          : SizedBox(
              width: 54,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Mono(
                    '${((doneTasks / totalTasks) * 100).round()}%',
                    size: 13,
                    weight: FontWeight.w600,
                  ),
                  const SizedBox(height: 6),
                  ProgressTrack(
                    value: doneTasks / totalTasks,
                    color: color,
                    height: 3,
                  ),
                ],
              ),
            ),
      onTap: () => context.go('/projects'),
    );
  }

  Widget _projectRow(BuildContext context, ProjectModel p) {
    final color = NebulaColors.parseHex(
      p.ventureColor,
      fallback: NebulaColors.forVentureId(p.ventureId),
    );
    final done = p.taskCount == 0 ? null : p.completedTaskCount / p.taskCount;

    return EntityRow(
      title: p.name,
      spineColor: color,
      meta: [
        Text(p.status),
        if (p.taskCount > 0)
          Mono('${p.completedTaskCount}/${p.taskCount}', size: 10.5),
      ],
      trailing: done == null
          ? null
          : SizedBox(
              width: 54,
              child: ProgressTrack(value: done, color: color, height: 3),
            ),
      onTap: () => context.go('/projects/${p.id}'),
    );
  }
}

/// The day on one axis: what happened, what is happening, what is still due.
class _Rail extends StatelessWidget {
  const _Rail({required this.tasks, required this.activity, required this.now});

  final List<HomeTask> tasks;
  final List<ActivityItem> activity;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final events = <RailEvent>[];

    // Behind you — real audit entries from today.
    for (final a in activity) {
      final t = DateTime.tryParse(a.createdAt)?.toLocal();
      if (t == null) continue;
      if (t.year != now.year || t.month != now.month || t.day != now.day) continue;
      events.add(RailEvent(
        time: t,
        title: a.action,
        subtitle: a.userName,
        state: TimeState.past,
      ));
    }

    // The present moment itself. This is a real marker, not a fabricated
    // event: it is the only thing on the rail that is definitionally true.
    events.add(RailEvent(
      time: now,
      title: 'Now',
      subtitle: _inProgressLabel(),
      state: TimeState.now,
    ));

    // Ahead of you — tasks with a real due date, today or overdue.
    final upcoming = tasks.where((t) {
      if (t.isDone) return false;
      final d = t.due;
      if (d == null) return false;
      return d.isBefore(DateTime(now.year, now.month, now.day + 1));
    }).toList()
      ..sort((a, b) => a.due!.compareTo(b.due!));

    for (final t in upcoming) {
      final d = t.due!;
      final isOverdue = d.isBefore(DateTime(now.year, now.month, now.day));
      events.add(RailEvent(
        time: d,
        title: t.title,
        subtitle: [
          if (t.ventureName != null) t.ventureName!,
          if (isOverdue) _overdueLabel(d) else t.priority,
        ].join(' · '),
        state: isOverdue ? TimeState.overdue : TimeState.next,
        ventureColor: t.ventureName == null
            ? null
            : NebulaColors.parseHex(
                t.ventureColor,
                fallback: NebulaColors.forVentureId(t.ventureId),
              ),
        onTap: () => context.go('/tasks/${t.id}'),
      ));
    }

    events.sort((a, b) => a.time.compareTo(b.time));

    if (events.length == 1) {
      // Only the "now" marker — nothing logged and nothing due.
      return const EmptyStateView(
        title: 'Nothing on today',
        message: 'No activity logged and nothing due. New work will appear here.',
        icon: LucideIcons.calendarCheck,
      );
    }

    return DayRail(events: events);
  }

  String? _inProgressLabel() {
    final running = tasks.where((t) => t.isInProgress).toList();
    if (running.isEmpty) return null;
    if (running.length == 1) return running.first.title;
    return '${running.length} tasks in progress';
  }

  String _overdueLabel(DateTime due) {
    final days = DateTime(now.year, now.month, now.day)
        .difference(DateTime(due.year, due.month, due.day))
        .inDays;
    return days == 1 ? 'overdue by 1 day' : 'overdue by $days days';
  }
}

class _HomeSkeleton extends StatelessWidget {
  const _HomeSkeleton();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const ShimmerBox(width: 180, height: 12),
        const SizedBox(height: NebulaSpacing.md),
        const ShimmerBox(width: 240, height: 22),
        const SizedBox(height: NebulaSpacing.lg),
        Row(
          children: [
            for (var i = 0; i < 3; i++) ...[
              if (i > 0) const SizedBox(width: NebulaSpacing.sm),
              const Expanded(child: ShimmerBox(height: 62, radius: 16)),
            ],
          ],
        ),
        const SizedBox(height: NebulaSpacing.lg),
        const ListSkeleton(count: 4),
      ],
    );
  }
}
