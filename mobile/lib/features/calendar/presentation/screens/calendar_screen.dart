import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/rbac/permissions.dart';
import '../../../../core/rbac/rbac_widgets.dart';
import '../../../../core/theme/nebula_colors.dart';
import '../../../../core/theme/nebula_spacing.dart';
import '../../../../core/theme/nebula_typography.dart';
import '../../../../core/theme/theme_context.dart';
import '../../../../core/widgets/data_display.dart';
import '../../../../core/widgets/motion.dart';
import '../../../../core/widgets/primitives.dart';
import '../../../../core/widgets/state_views.dart';
import '../../data/models/calendar_model.dart';
import '../providers/calendar_provider.dart';

/// Where a day sits relative to today, at day granularity.
///
/// The API returns dates at midnight, so classifying with the 15-minute live
/// window would make every one of today's events read as overdue by lunchtime.
TimeState _dayState(DateTime day, DateTime today, {bool completed = false}) {
  if (completed) return TimeState.past;
  final d = DateTime(day.year, day.month, day.day);
  if (d.isBefore(today)) return TimeState.past;
  if (d == today) return TimeState.now;
  return TimeState.next;
}

/// Hue means venture. An event inherits the colour of the project it belongs
/// to; group-wide entries with no project get the neutral accent.
Color _eventColor(BuildContext context, CalendarEvent event) =>
    event.projectId == null
        ? context.scheme.primary
        : NebulaColors.forVentureId(event.projectId);

class CalendarScreen extends ConsumerStatefulWidget {
  const CalendarScreen({super.key});

  @override
  ConsumerState<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends ConsumerState<CalendarScreen> {
  late DateTime _month;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _month = DateTime(now.year, now.month);
    Future.microtask(() {
      if (mounted) ref.read(calendarNotifierProvider.notifier).initialize();
    });
  }

  void _shiftMonth(int delta) {
    setState(() => _month = DateTime(_month.year, _month.month + delta));
    ref
        .read(calendarNotifierProvider.notifier)
        .changeMonth(_month.month, _month.year);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Calendar'),
        centerTitle: false,
      ),
      body: PermissionScope(
        permission: Permission.viewCalendar,
        what: 'the calendar',
        child: Column(
          children: [
            _MonthBar(
              month: _month,
              onPrevious: () => _shiftMonth(-1),
              onNext: () => _shiftMonth(1),
            ),
            Expanded(child: _body()),
          ],
        ),
      ),
    );
  }

  Widget _body() {
    final eventsAsync = ref.watch(calendarNotifierProvider);

    return eventsAsync.when(
      loading: () => const Padding(
        padding: EdgeInsets.all(NebulaSpacing.md),
        child: ListSkeleton(count: 4),
      ),
      error: (error, _) => ErrorStateView(
        message: readableError(error),
        onRetry: () => ref.read(calendarNotifierProvider.notifier).initialize(),
      ),
      data: (events) {
        final now = DateTime.now();
        final today = DateTime(now.year, now.month, now.day);
        final sorted = [...events]..sort((a, b) => a.date.compareTo(b.date));

        return ListView(
          padding: const EdgeInsets.fromLTRB(
            NebulaSpacing.md,
            0,
            NebulaSpacing.md,
            NebulaSpacing.lg,
          ),
          children: [
            _MonthGrid(
              month: _month,
              today: today,
              events: events,
              onDayTap: (date, dayEvents) =>
                  _showDay(context, date, dayEvents, today),
            ),
            const SizedBox(height: NebulaSpacing.md),
            SectionHeader(
              DateFormat('MMMM').format(_month),
              trailing: Mono(
                '${events.length}',
                size: 11,
                color: context.dl.textTertiary,
              ),
            ),
            if (sorted.isEmpty)
              const EmptyStateView(
                icon: LucideIcons.calendarDays,
                title: 'Nothing scheduled',
                message: 'No milestones, deadlines or events this month.',
              )
            else
              for (var i = 0; i < sorted.length; i++)
                Padding(
                  padding: const EdgeInsets.only(bottom: NebulaSpacing.sm),
                  child: StaggerIn(
                    index: i,
                    child: _EventRow(
                      event: sorted[i],
                      today: today,
                      onTap: () => _showDay(
                        context,
                        sorted[i].date,
                        events
                            .where((e) => _sameDay(e.date, sorted[i].date))
                            .toList(),
                        today,
                      ),
                    ),
                  ),
                ),
          ],
        );
      },
    );
  }

  void _showDay(
    BuildContext context,
    DateTime date,
    List<CalendarEvent> dayEvents,
    DateTime today,
  ) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (sheetContext) => _DaySheet(
        date: date,
        events: dayEvents,
        today: today,
      ),
    );
  }
}

bool _sameDay(DateTime a, DateTime b) =>
    a.year == b.year && a.month == b.month && a.day == b.day;

class _MonthBar extends StatelessWidget {
  const _MonthBar({
    required this.month,
    required this.onPrevious,
    required this.onNext,
  });

  final DateTime month;
  final VoidCallback onPrevious;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: NebulaSpacing.sm,
        vertical: NebulaSpacing.xs,
      ),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(LucideIcons.chevronLeft, size: 19),
            onPressed: onPrevious,
            tooltip: 'Previous month',
          ),
          Expanded(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  DateFormat('MMMM').format(month),
                  style: context.text.titleMedium,
                ),
                const SizedBox(width: 7),
                Mono(
                  DateFormat('yyyy').format(month),
                  size: 15,
                  color: context.dl.textTertiary,
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(LucideIcons.chevronRight, size: 19),
            onPressed: onNext,
            tooltip: 'Next month',
          ),
        ],
      ),
    );
  }
}

class _MonthGrid extends StatelessWidget {
  const _MonthGrid({
    required this.month,
    required this.today,
    required this.events,
    required this.onDayTap,
  });

  final DateTime month;
  final DateTime today;
  final List<CalendarEvent> events;
  final void Function(DateTime date, List<CalendarEvent> dayEvents) onDayTap;

  static const _weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  /// Days in [month], via the zeroth day of the following month.
  int get _daysInMonth => DateTime(month.year, month.month + 1, 0).day;

  /// Blank cells before the 1st. `DateTime.weekday` is Mon=1…Sun=7, and this
  /// grid starts on Sunday.
  ///
  /// The previous implementation had no offset at all, so the 1st of every
  /// month was drawn in the Sunday column and every date sat under the wrong
  /// weekday for the rest of the month.
  int get _leadingBlanks => DateTime(month.year, month.month, 1).weekday % 7;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final cells = _leadingBlanks + _daysInMonth;

    return DCard(
      padding: const EdgeInsets.all(NebulaSpacing.sm + 2),
      child: Column(
        children: [
          Row(
            children: [
              for (var i = 0; i < _weekdays.length; i++)
                Expanded(
                  child: Center(
                    child: Text(
                      _weekdays[i],
                      style: NebulaTypography.monoLabel(
                        color: dl.textTertiary,
                        fontSize: 9.5,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 6),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate:
                const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 7,
              childAspectRatio: 1,
              mainAxisSpacing: 4,
              crossAxisSpacing: 4,
            ),
            itemCount: cells,
            itemBuilder: (context, index) {
              if (index < _leadingBlanks) return const SizedBox.shrink();

              final day = index - _leadingBlanks + 1;
              final date = DateTime(month.year, month.month, day);
              final dayEvents =
                  events.where((e) => _sameDay(e.date, date)).toList();

              return _DayCell(
                day: day,
                state: _dayState(date, today),
                events: dayEvents,
                onTap: dayEvents.isEmpty
                    ? null
                    : () => onDayTap(date, dayEvents),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _DayCell extends StatelessWidget {
  const _DayCell({
    required this.day,
    required this.state,
    required this.events,
    this.onTap,
  });

  final int day;
  final TimeState state;
  final List<CalendarEvent> events;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final isToday = state.isNow;

    return PressScale(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: isToday ? dl.surfaceRaised : null,
          borderRadius: BorderRadius.circular(NebulaSpacing.radiusSm),
          border: isToday ? Border.all(color: dl.borderStrong) : null,
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Mono(
              '$day',
              size: 12.5,
              weight: state.weight,
              // Today is the single cell at full contrast; days already gone
              // in this month recede.
              color: state.foreground(context),
            ),
            const SizedBox(height: 3),
            SizedBox(
              height: 6,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (final event in events.take(3))
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 1.5),
                      child: Opacity(
                        opacity: state == TimeState.past ? 0.45 : 1,
                        child: VentureDot(_eventColor(context, event), size: 5),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EventRow extends StatelessWidget {
  const _EventRow({required this.event, required this.today, this.onTap});

  final CalendarEvent event;
  final DateTime today;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final state = _dayState(event.date, today, completed: event.completed);

    return EntityRow(
      title: event.title,
      timeState: state,
      strikeThrough: event.completed,
      onTap: onTap,
      spineColor: _eventColor(context, event),
      meta: [
        Mono(
          DateFormat('d MMM').format(event.date),
          size: 10.5,
          color: state.isNow ? dl.timeNow : dl.textTertiary,
        ),
        if (event.projectName != null && event.projectName!.isNotEmpty)
          Text(event.projectName!, overflow: TextOverflow.ellipsis),
      ],
      trailing: DTag(
        event.type,
        tone: event.completed ? DTone.ok : DTone.neutral,
      ),
    );
  }
}

class _DaySheet extends StatelessWidget {
  const _DaySheet({
    required this.date,
    required this.events,
    required this.today,
  });

  final DateTime date;
  final List<CalendarEvent> events;
  final DateTime today;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          NebulaSpacing.md,
          NebulaSpacing.md,
          NebulaSpacing.md,
          NebulaSpacing.md,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SectionHeader(
              DateFormat('EEEE').format(date),
              trailing: Mono(
                DateFormat('d MMM yyyy').format(date),
                size: 11,
                color: context.dl.textTertiary,
              ),
            ),
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: events.length,
                separatorBuilder: (_, __) =>
                    const SizedBox(height: NebulaSpacing.sm),
                itemBuilder: (context, index) => _DayEventCard(
                  event: events[index],
                  today: today,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DayEventCard extends ConsumerWidget {
  const _DayEventCard({required this.event, required this.today});

  final CalendarEvent event;
  final DateTime today;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dl = context.dl;
    final state = _dayState(event.date, today, completed: event.completed);

    return DCard(
      accent: _eventColor(context, event),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  event.title,
                  style: context.text.titleSmall?.copyWith(
                    color: state.isNow ? dl.timeNow : null,
                    fontWeight: state.weight,
                    decoration:
                        event.completed ? TextDecoration.lineThrough : null,
                    decorationColor: dl.textTertiary,
                  ),
                ),
              ),
              const SizedBox(width: NebulaSpacing.sm),
              DTag(
                event.type,
                tone: event.completed ? DTone.ok : DTone.neutral,
              ),
            ],
          ),
          if (event.projectName != null && event.projectName!.isNotEmpty) ...[
            const SizedBox(height: 5),
            Text(
              event.projectName!,
              style: context.text.bodySmall?.copyWith(color: dl.textTertiary),
            ),
          ],
          if (event.description != null && event.description!.isNotEmpty) ...[
            const SizedBox(height: 7),
            Text(
              event.description!,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: context.text.bodySmall,
            ),
          ],
          const SizedBox(height: NebulaSpacing.sm + 2),
          Row(
            children: [
              if (event.projectId != null)
                OutlinedButton.icon(
                  onPressed: () {
                    Navigator.pop(context);
                    context.push('/projects/${event.projectId}');
                  },
                  icon: const Icon(LucideIcons.externalLink, size: 13),
                  label: const Text('View project'),
                ),
              const Spacer(),
              // Milestones live on projects, and `PUT /api/projects/:id` is
              // requireLevel(4) — CXO and above. Lower number means more
              // access, so this is `<=` inside Rbac, never `>= 4`.
              if (event.type == 'milestone' && !event.completed)
                PermissionGate(
                  permission: Permission.updateProject,
                  child: FilledButton.icon(
                    onPressed: () => _markComplete(context, ref),
                    icon: const Icon(LucideIcons.check, size: 13),
                    label: const Text('Mark done'),
                  ),
                ),
              if (event.completed)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(LucideIcons.circleCheck, size: 13, color: dl.success),
                    const SizedBox(width: 5),
                    Text(
                      'Completed',
                      style: context.text.bodySmall?.copyWith(
                        color: dl.success,
                      ),
                    ),
                  ],
                ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _markComplete(BuildContext context, WidgetRef ref) async {
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    try {
      await ref
          .read(calendarNotifierProvider.notifier)
          .markMilestoneComplete(event.id);
      navigator.pop();
      messenger.showSnackBar(
        const SnackBar(
          content: Text('Milestone marked complete'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (error) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(readableError(error)),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }
}
