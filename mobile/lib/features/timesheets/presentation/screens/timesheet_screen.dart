import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/constants/access_levels.dart';
import '../../../../core/network/network_info_provider.dart';
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
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/timesheet_model.dart';
import '../providers/timesheets_provider.dart';

// ── Figures ──────────────────────────────────────────────────────────────────

/// `8 h`, `6.5 h`. Hours are a quantity, so this always lands inside a [Mono].
String _hours(double value) {
  final text = value == value.roundToDouble()
      ? value.toStringAsFixed(0)
      : value.toStringAsFixed(2);
  return '$text h';
}

/// `01:24:09` — the running clock.
String _clock(Duration d) {
  String two(int v) => v.toString().padLeft(2, '0');
  return '${two(d.inHours)}:${two(d.inMinutes % 60)}:${two(d.inSeconds % 60)}';
}

DateTime? _parseDate(String raw) => DateTime.tryParse(raw);

bool _isSameDay(DateTime a, DateTime b) =>
    a.year == b.year && a.month == b.month && a.day == b.day;

/// Midnight on the Monday of [day]'s week.
DateTime _weekStart(DateTime day) {
  final d = DateTime(day.year, day.month, day.day);
  return d.subtract(Duration(days: d.weekday - 1));
}

/// Tone for a timesheet status, mirroring the three states the API returns.
DTone _statusTone(String status) {
  switch (status.toLowerCase()) {
    case 'approved':
      return DTone.ok;
    case 'rejected':
      return DTone.critical;
    default:
      return DTone.warn;
  }
}

/// The clock the user started, or null when nothing is running.
///
/// Deliberately not auto-disposed: the timer has to keep running while the
/// user moves between tabs. It is local, user-started state — nothing here is
/// read back from or reported as API data.
final _runningSinceProvider = StateProvider<DateTime?>((ref) => null);

// ── Screen ───────────────────────────────────────────────────────────────────

class TimesheetScreen extends ConsumerStatefulWidget {
  const TimesheetScreen({super.key});

  @override
  ConsumerState<TimesheetScreen> createState() => _TimesheetScreenState();
}

class _TimesheetScreenState extends ConsumerState<TimesheetScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  late final bool _isManager;

  @override
  void initState() {
    super.initState();
    final level = ref.read(authProvider).maybeWhen(
          authenticated: (user) => user.accessLevel,
          orElse: () => AccessLevels.unknown,
        );
    // The approve endpoint turns away level 6 and below. Lower number = more
    // access, so this is a `<=` test via [AccessLevels.hasAtLeast].
    _isManager = AccessLevels.hasAtLeast(level, ApiAccess.approveTimesheet);
    _tabController = TabController(length: _isManager ? 3 : 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Timesheets'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            icon: const Icon(LucideIcons.refreshCw, size: 20),
            onPressed: () {
              ref.invalidate(timesheetsProvider);
              ref.invalidate(timesheetFinancialsProvider);
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            const Tab(text: 'My time'),
            if (_isManager) const Tab(text: 'Approvals'),
            const Tab(text: 'Summary'),
          ],
        ),
      ),
      body: PermissionScope(
        permission: Permission.viewTimesheets,
        what: 'timesheets',
        child: Column(
          children: [
            const _OfflineStrip(),
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  const _MyTimeTab(),
                  if (_isManager) const _ApprovalsTab(),
                  const _SummaryTab(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── My time ──────────────────────────────────────────────────────────────────

class _MyTimeTab extends ConsumerWidget {
  const _MyTimeTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final timesheetsAsync = ref.watch(timesheetsProvider);

    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => showLogTimeSheet(context, ref),
        icon: const Icon(LucideIcons.plus, size: 18),
        label: const Text('Log time'),
      ),
      body: timesheetsAsync.when(
        loading: () => const Padding(
          padding: EdgeInsets.all(NebulaSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              ShimmerBox(height: 150, radius: NebulaSpacing.radiusMd),
              SizedBox(height: NebulaSpacing.lg),
              Expanded(child: ListSkeleton(count: 4)),
            ],
          ),
        ),
        error: (error, _) => _Refreshable(
          child: ErrorStateView(
            message: readableError(error),
            onRetry: () => ref.invalidate(timesheetsProvider),
          ),
        ),
        data: (entries) => RefreshIndicator(
          onRefresh: () => ref.read(timesheetsProvider.notifier).refresh(),
          child: _MyTimeBody(entries: entries),
        ),
      ),
    );
  }
}

class _MyTimeBody extends ConsumerWidget {
  const _MyTimeBody({required this.entries});

  final List<TimesheetEntry> entries;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final now = DateTime.now();
    final weekStart = _weekStart(now);
    final weekEnd = weekStart.add(const Duration(days: 7));

    final today = <TimesheetEntry>[];
    final thisWeek = <TimesheetEntry>[];
    final earlier = <TimesheetEntry>[];

    for (final entry in entries) {
      final date = _parseDate(entry.date);
      if (date != null && _isSameDay(date, now)) {
        today.add(entry);
      }
      if (date != null && !date.isBefore(weekStart) && date.isBefore(weekEnd)) {
        thisWeek.add(entry);
      } else {
        earlier.add(entry);
      }
    }

    final children = <Widget>[
      const _RunningClock(),
      const SizedBox(height: NebulaSpacing.lg),
      _TodaySection(entries: today),
      const SizedBox(height: NebulaSpacing.lg),
      _WeekChart(entries: thisWeek, weekStart: weekStart, today: now),
    ];

    if (entries.isEmpty) {
      children.addAll([
        const SizedBox(height: NebulaSpacing.md),
        const EmptyStateView(
          icon: LucideIcons.clock,
          title: 'No time logged yet',
          message: 'Start the clock above, or log an entry by hand.',
        ),
      ]);
    } else if (earlier.isNotEmpty) {
      children.add(_EarlierWeeks(entries: earlier));
    }

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(
        NebulaSpacing.md,
        NebulaSpacing.md,
        NebulaSpacing.md,
        96,
      ),
      children: children,
    );
  }
}

/// The app's "now": elapsed time, huge, in the brightest value the theme has.
///
/// This card holds the only [LiveDot] on these four screens, and therefore the
/// only glow. The clock is local state the user starts and stops — stopping it
/// hands the elapsed hours to the log sheet, which is what actually writes to
/// the API.
class _RunningClock extends ConsumerStatefulWidget {
  const _RunningClock();

  @override
  ConsumerState<_RunningClock> createState() => _RunningClockState();
}

class _RunningClockState extends ConsumerState<_RunningClock> {
  Timer? _ticker;

  void _sync(DateTime? startedAt) {
    if (startedAt == null) {
      _ticker?.cancel();
      _ticker = null;
      return;
    }
    _ticker ??= Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  void _start() {
    HapticFeedback.lightImpact();
    ref.read(_runningSinceProvider.notifier).state = DateTime.now();
  }

  void _stop(DateTime startedAt) {
    HapticFeedback.mediumImpact();
    final elapsed = DateTime.now().difference(startedAt);
    ref.read(_runningSinceProvider.notifier).state = null;
    // Two decimals of an hour — the precision the API's `hours_worked` accepts.
    final hours = elapsed.inSeconds / 3600;
    showLogTimeSheet(
      context,
      ref,
      initialHours: hours <= 0 ? null : hours.toStringAsFixed(2),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final startedAt = ref.watch(_runningSinceProvider);
    _sync(startedAt);

    final running = startedAt != null;
    final elapsed =
        running ? DateTime.now().difference(startedAt) : Duration.zero;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(
          running ? 'RUNNING' : 'CLOCK',
          trailing: running
              ? Mono(
                  'since ${DateFormat('HH:mm').format(startedAt)}',
                  size: 10,
                  color: dl.textTertiary,
                )
              : null,
        ),
        DCard(
          emphasised: running,
          padding: const EdgeInsets.symmetric(
            horizontal: NebulaSpacing.md,
            vertical: NebulaSpacing.lg,
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  if (running) ...[
                    const LiveDot(size: 8),
                    const SizedBox(width: 12),
                  ],
                  Flexible(
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Mono(
                        _clock(elapsed),
                        size: 44,
                        weight: FontWeight.w600,
                        color: running ? dl.timeNow : dl.timePast,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                running
                    ? 'Elapsed — stop to log it'
                    : 'Nothing running right now',
                style: context.text.bodySmall?.copyWith(fontSize: 11.5),
              ),
              const SizedBox(height: NebulaSpacing.md),
              SizedBox(
                width: double.infinity,
                child: running
                    ? FilledButton.icon(
                        onPressed: () => _stop(startedAt),
                        icon: const Icon(LucideIcons.square, size: 15),
                        label: const Text('Stop and log'),
                      )
                    : OutlinedButton.icon(
                        onPressed: _start,
                        icon: const Icon(LucideIcons.play, size: 15),
                        label: const Text('Start clock'),
                      ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Everything booked to today, with the running clock at the head of the list.
class _TodaySection extends ConsumerWidget {
  const _TodaySection({required this.entries});

  final List<TimesheetEntry> entries;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dl = context.dl;
    final startedAt = ref.watch(_runningSinceProvider);
    final logged = entries.fold<double>(0, (sum, e) => sum + e.hoursWorked);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(
          'TODAY · ${DateFormat('EEE d MMM').format(DateTime.now()).toUpperCase()}',
          trailing: Mono(
            _hours(logged),
            size: 10,
            color: logged > 0 ? dl.timeNext : dl.textTertiary,
          ),
        ),
        if (startedAt != null)
          Padding(
            padding: const EdgeInsets.only(bottom: NebulaSpacing.sm),
            child: EntityRow(
              title: 'Clock running',
              timeState: TimeState.now,
              spineColor: context.scheme.primary,
              meta: [
                Mono('${DateFormat('HH:mm').format(startedAt)} → now',
                    size: 10.5),
                const Mono('not logged yet', size: 10.5),
              ],
              trailing: Mono(
                _hours(DateTime.now().difference(startedAt).inSeconds / 3600),
                size: 13.5,
                weight: FontWeight.w600,
                color: dl.timeNow,
              ),
            ),
          ),
        if (entries.isEmpty && startedAt == null)
          DCard(
            padding: const EdgeInsets.symmetric(
              horizontal: NebulaSpacing.md,
              vertical: NebulaSpacing.lg,
            ),
            child: Center(
              child: Text(
                'No time booked to today yet.',
                style: context.text.bodySmall,
              ),
            ),
          )
        else
          for (var i = 0; i < entries.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: NebulaSpacing.sm),
              child: StaggerIn(
                index: i,
                child: _EntryRow(entry: entries[i]),
              ),
            ),
      ],
    );
  }
}

/// A logged entry. Already in the books, so it renders as [TimeState.past].
class _EntryRow extends StatelessWidget {
  const _EntryRow({required this.entry, this.showDate = false});

  final TimesheetEntry entry;
  final bool showDate;

  @override
  Widget build(BuildContext context) {
    final loggedAt = entry.createdAt == null
        ? null
        : _parseDate(entry.createdAt!);
    final date = _parseDate(entry.date);

    return EntityRow(
      title: entry.projectName ?? entry.taskTitle ?? 'General',
      timeState: TimeState.past,
      spineColor: NebulaColors.forVentureId(entry.ventureId),
      meta: [
        if (showDate && date != null)
          Mono(DateFormat('EEE d MMM').format(date), size: 10.5),
        if (loggedAt != null)
          Mono('logged ${DateFormat('HH:mm').format(loggedAt)}', size: 10.5),
        if (entry.ventureName != null && entry.ventureName!.isNotEmpty)
          Text(entry.ventureName!),
        if (entry.notes != null && entry.notes!.isNotEmpty)
          Text(entry.notes!),
      ],
      trailing: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        mainAxisSize: MainAxisSize.min,
        children: [
          Mono(_hours(entry.hoursWorked), size: 13.5, weight: FontWeight.w600),
          const SizedBox(height: 5),
          DTag(entry.status, tone: _statusTone(entry.status)),
        ],
      ),
    );
  }
}

/// Hours actually logged this week, one bar per day. No target, no projection
/// — the bars are the sum of real entries and nothing else.
class _WeekChart extends StatelessWidget {
  const _WeekChart({
    required this.entries,
    required this.weekStart,
    required this.today,
  });

  final List<TimesheetEntry> entries;
  final DateTime weekStart;
  final DateTime today;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final totals = List<double>.filled(7, 0);

    for (final entry in entries) {
      final date = _parseDate(entry.date);
      if (date == null) continue;
      final index = DateTime(date.year, date.month, date.day)
          .difference(weekStart)
          .inDays;
      if (index >= 0 && index < 7) totals[index] += entry.hoursWorked;
    }

    final peak = totals.fold<double>(0, math.max);
    final weekTotal = totals.fold<double>(0, (a, b) => a + b);
    final todayIndex = DateTime(today.year, today.month, today.day)
        .difference(weekStart)
        .inDays;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(
          'THIS WEEK',
          trailing: Mono(_hours(weekTotal), size: 10, color: dl.timeNext),
        ),
        DCard(
          child: Column(
            children: [
              SizedBox(
                height: 96,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    for (var i = 0; i < 7; i++) ...[
                      if (i > 0) const SizedBox(width: 6),
                      Expanded(
                        child: _DayBar(
                          hours: totals[i],
                          peak: peak,
                          isToday: i == todayIndex,
                          isFuture: i > todayIndex,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  for (var i = 0; i < 7; i++) ...[
                    if (i > 0) const SizedBox(width: 6),
                    Expanded(
                      child: Center(
                        child: Text(
                          DateFormat('E')
                              .format(weekStart.add(Duration(days: i)))
                              .substring(0, 1)
                              .toUpperCase(),
                          style: NebulaTypography.monoLabel(
                            color: i == todayIndex
                                ? dl.timeNext
                                : dl.textTertiary,
                            fontSize: 9,
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _DayBar extends StatelessWidget {
  const _DayBar({
    required this.hours,
    required this.peak,
    required this.isToday,
    required this.isFuture,
  });

  final double hours;
  final double peak;
  final bool isToday;
  final bool isFuture;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final fraction = peak > 0 ? hours / peak : 0.0;

    final color = hours <= 0
        ? dl.border
        : isToday
            ? dl.timeNext
            : isFuture
                ? context.scheme.primary.withValues(alpha: 0.45)
                : context.scheme.primary.withValues(alpha: 0.72);

    return Column(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        Mono(
          hours <= 0 ? '—' : hours.toStringAsFixed(hours % 1 == 0 ? 0 : 1),
          size: 9,
          color: hours <= 0 ? dl.textTertiary : dl.timeNext,
        ),
        const SizedBox(height: 4),
        Expanded(
          child: FractionallySizedBox(
            heightFactor: hours <= 0 ? 0.04 : fraction.clamp(0.08, 1.0),
            alignment: Alignment.bottomCenter,
            child: Container(
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// Everything before this week, grouped into its weeks.
class _EarlierWeeks extends StatelessWidget {
  const _EarlierWeeks({required this.entries});

  final List<TimesheetEntry> entries;

  @override
  Widget build(BuildContext context) {
    final grouped = <String, List<TimesheetEntry>>{};
    for (final entry in entries) {
      grouped.putIfAbsent(_label(entry.date), () => []).add(entry);
    }

    final children = <Widget>[];
    var index = 0;
    for (final week in grouped.keys) {
      final group = grouped[week]!;
      final total = group.fold<double>(0, (sum, e) => sum + e.hoursWorked);
      children
        ..add(
          Row(
            children: [
              Expanded(child: GroupHeader(week, count: group.length)),
              Padding(
                padding: const EdgeInsets.only(top: NebulaSpacing.sm),
                child: Mono(
                  _hours(total),
                  size: 10,
                  color: context.dl.textTertiary,
                ),
              ),
            ],
          ),
        )
        ..addAll([
          for (final entry in group)
            Padding(
              padding: const EdgeInsets.only(bottom: NebulaSpacing.sm),
              child: StaggerIn(
                index: index++,
                child: _EntryRow(entry: entry, showDate: true),
              ),
            ),
        ]);
    }

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children);
  }

  static String _label(String raw) {
    final date = _parseDate(raw);
    if (date == null) return 'Undated';
    final monday = _weekStart(date);
    final sunday = monday.add(const Duration(days: 6));
    return '${DateFormat('d MMM').format(monday)} – '
        '${DateFormat('d MMM yyyy').format(sunday)}';
  }
}

// ── Log time ─────────────────────────────────────────────────────────────────

/// Opens the log sheet, optionally prefilled with hours from the clock.
void showLogTimeSheet(BuildContext context, WidgetRef ref, {String? initialHours}) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(
        top: Radius.circular(NebulaSpacing.radiusLg),
      ),
    ),
    builder: (_) => _LogTimeSheet(ref: ref, initialHours: initialHours),
  );
}

class _LogTimeSheet extends StatefulWidget {
  const _LogTimeSheet({required this.ref, this.initialHours});

  final WidgetRef ref;
  final String? initialHours;

  @override
  State<_LogTimeSheet> createState() => _LogTimeSheetState();
}

class _LogTimeSheetState extends State<_LogTimeSheet> {
  late final TextEditingController _hoursController =
      TextEditingController(text: widget.initialHours ?? '');
  final _notesController = TextEditingController();
  DateTime _selectedDate = DateTime.now();
  bool _isSaving = false;

  @override
  void dispose() {
    _hoursController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now(),
    );
    if (picked != null) setState(() => _selectedDate = picked);
  }

  Future<void> _submit() async {
    final hours = double.tryParse(_hoursController.text.trim());
    if (hours == null || hours < 0.5 || hours > 24) {
      _snack('Enter hours between 0.5 and 24', error: true);
      return;
    }
    setState(() => _isSaving = true);
    try {
      await widget.ref.read(timesheetsProvider.notifier).logTime(
            hoursWorked: hours,
            date: DateFormat('yyyy-MM-dd').format(_selectedDate),
            notes: _notesController.text.trim().isEmpty
                ? null
                : _notesController.text.trim(),
          );
      if (mounted) {
        Navigator.of(context).pop();
        _snack('Time logged');
      }
    } catch (e) {
      if (mounted) _snack(readableError(e), error: true);
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  void _snack(String message, {bool error = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor:
            error ? context.dl.critical : context.scheme.surfaceContainerHighest,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final bottom = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.fromLTRB(
        NebulaSpacing.md,
        NebulaSpacing.md,
        NebulaSpacing.md,
        NebulaSpacing.md + bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(child: Text('Log time', style: context.text.titleLarge)),
              IconButton(
                tooltip: 'Close',
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(LucideIcons.x, size: 18),
              ),
            ],
          ),
          const SizedBox(height: NebulaSpacing.sm),
          const SectionHeader('HOURS WORKED'),
          TextField(
            controller: _hoursController,
            autofocus: widget.initialHours == null,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputFormatters: [
              FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d*')),
            ],
            style: NebulaTypography.mono(
              fontSize: 15,
              color: context.scheme.onSurface,
            ),
            decoration: const InputDecoration(
              hintText: '4.5',
              prefixIcon: Icon(LucideIcons.timer, size: 18),
            ),
          ),
          const SizedBox(height: NebulaSpacing.md),
          const SectionHeader('DATE'),
          PressScale(
            onTap: _pickDate,
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: NebulaSpacing.md,
                vertical: 14,
              ),
              decoration: BoxDecoration(
                color: dl.surfaceRaised,
                borderRadius: BorderRadius.circular(NebulaSpacing.radiusSm),
                border: Border.all(color: dl.border),
              ),
              child: Row(
                children: [
                  Icon(LucideIcons.calendar, size: 17, color: dl.textTertiary),
                  const SizedBox(width: 10),
                  Mono(DateFormat('EEE d MMM yyyy').format(_selectedDate)),
                ],
              ),
            ),
          ),
          const SizedBox(height: NebulaSpacing.md),
          const SectionHeader('NOTES (OPTIONAL)'),
          TextField(
            controller: _notesController,
            maxLines: 3,
            decoration: const InputDecoration(
              hintText: 'What did you work on?',
            ),
          ),
          const SizedBox(height: NebulaSpacing.lg),
          FilledButton(
            onPressed: _isSaving ? null : _submit,
            child: _isSaving
                ? const SizedBox(
                    height: 17,
                    width: 17,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Submit'),
          ),
        ],
      ),
    );
  }
}

// ── Approvals ────────────────────────────────────────────────────────────────

class _ApprovalsTab extends ConsumerWidget {
  const _ApprovalsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final timesheetsAsync = ref.watch(timesheetsProvider);

    return timesheetsAsync.when(
      loading: () => const Padding(
        padding: EdgeInsets.all(NebulaSpacing.md),
        child: ListSkeleton(count: 4),
      ),
      error: (error, _) => _Refreshable(
        child: ErrorStateView(
          message: readableError(error),
          onRetry: () => ref.invalidate(timesheetsProvider),
        ),
      ),
      data: (entries) {
        final pending = entries.where((e) => e.status == 'pending').toList();
        if (pending.isEmpty) {
          return const _Refreshable(
            child: EmptyStateView(
              icon: LucideIcons.circleCheck,
              title: 'All caught up',
              message: 'No timesheets are waiting on a decision.',
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () => ref.read(timesheetsProvider.notifier).refresh(),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(
              NebulaSpacing.md,
              NebulaSpacing.sm,
              NebulaSpacing.md,
              NebulaSpacing.xl,
            ),
            children: [
              GroupHeader('Pending', count: pending.length, tone: DTone.warn),
              for (var i = 0; i < pending.length; i++)
                Padding(
                  padding: const EdgeInsets.only(bottom: NebulaSpacing.sm),
                  child: StaggerIn(
                    index: i,
                    child: _ApprovalCard(
                      entry: pending[i],
                      onApprove: () =>
                          _confirm(context, ref, pending[i].id, true),
                      onReject: () =>
                          _confirm(context, ref, pending[i].id, false),
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _confirm(
    BuildContext context,
    WidgetRef ref,
    int id,
    bool approve,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(approve ? 'Approve timesheet?' : 'Reject timesheet?'),
        content: Text(
          approve
              ? 'This marks the entry approved and makes it billable.'
              : 'This rejects the entry. The person who logged it will need '
                  'to resubmit.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: Text(approve ? 'Approve' : 'Reject'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    // The dialog above is an async gap: by the time it closes this widget may
    // be gone, and reading ScaffoldMessenger off a dead context throws.
    if (!context.mounted) return;

    final messenger = ScaffoldMessenger.of(context);
    try {
      if (approve) {
        await ref.read(timesheetsProvider.notifier).approve(id);
      } else {
        await ref.read(timesheetsProvider.notifier).reject(id);
      }
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(readableError(e))));
    }
  }
}

class _ApprovalCard extends StatelessWidget {
  const _ApprovalCard({
    required this.entry,
    required this.onApprove,
    required this.onReject,
  });

  final TimesheetEntry entry;
  final VoidCallback onApprove;
  final VoidCallback onReject;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final date = _parseDate(entry.date);

    return DCard(
      accent: NebulaColors.forVentureId(entry.ventureId),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              DAvatar(entry.employeeName, size: 34),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      entry.employeeName ?? 'Team member',
                      style: context.text.titleSmall,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 3),
                    Mono(
                      date == null
                          ? entry.date
                          : DateFormat('EEE d MMM yyyy').format(date),
                      size: 10.5,
                      color: dl.textTertiary,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: NebulaSpacing.sm),
              Mono(
                _hours(entry.hoursWorked),
                size: 15,
                weight: FontWeight.w600,
              ),
            ],
          ),
          if (entry.projectName != null || entry.taskTitle != null) ...[
            const SizedBox(height: NebulaSpacing.sm + 2),
            Row(
              children: [
                Icon(LucideIcons.briefcase, size: 13, color: dl.textTertiary),
                const SizedBox(width: 7),
                Expanded(
                  child: Text(
                    entry.projectName ?? entry.taskTitle ?? '',
                    style: context.text.bodySmall,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ],
          if (entry.notes != null && entry.notes!.isNotEmpty) ...[
            const SizedBox(height: NebulaSpacing.sm),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: dl.surfaceRaised,
                borderRadius: BorderRadius.circular(NebulaSpacing.radiusSm),
              ),
              child: Text(entry.notes!, style: context.text.bodySmall),
            ),
          ],
          const SizedBox(height: NebulaSpacing.md),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: onReject,
                  icon: const Icon(LucideIcons.x, size: 15),
                  label: const Text('Reject'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: dl.critical,
                    side: BorderSide(color: dl.critical.withValues(alpha: 0.5)),
                  ),
                ),
              ),
              const SizedBox(width: NebulaSpacing.sm),
              Expanded(
                child: FilledButton.icon(
                  onPressed: onApprove,
                  icon: const Icon(LucideIcons.check, size: 15),
                  label: const Text('Approve'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Summary ──────────────────────────────────────────────────────────────────

class _SummaryTab extends ConsumerWidget {
  const _SummaryTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final financialsAsync = ref.watch(timesheetFinancialsProvider);
    final dl = context.dl;

    return financialsAsync.when(
      loading: () => const Padding(
        padding: EdgeInsets.all(NebulaSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ShimmerBox(height: 140, radius: NebulaSpacing.radiusMd),
            SizedBox(height: NebulaSpacing.lg),
            ShimmerBox(height: 74, radius: NebulaSpacing.radiusMd),
          ],
        ),
      ),
      error: (error, _) => _Refreshable(
        child: ErrorStateView(
          message: readableError(error),
          onRetry: () => ref.invalidate(timesheetFinancialsProvider),
        ),
      ),
      data: (f) {
        final approvedShare =
            f.totalHours > 0 ? f.approvedHours / f.totalHours : 0.0;

        return RefreshIndicator(
          onRefresh: () =>
              ref.read(timesheetFinancialsProvider.notifier).refresh(),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(
              NebulaSpacing.md,
              NebulaSpacing.md,
              NebulaSpacing.md,
              NebulaSpacing.xl,
            ),
            children: [
              const SectionHeader('LOGGED'),
              DCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Mono(
                      _hours(f.totalHours),
                      size: 34,
                      weight: FontWeight.w600,
                      color: dl.timeNext,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Total hours across every entry',
                      style: context.text.bodySmall?.copyWith(fontSize: 11.5),
                    ),
                    const SizedBox(height: NebulaSpacing.md),
                    ProgressTrack.segmented(
                      [
                        (value: approvedShare, color: dl.success),
                        (value: 1 - approvedShare, color: dl.warning),
                      ],
                      height: 8,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: NebulaSpacing.lg),
              const SectionHeader('BREAKDOWN'),
              Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(
                    child: _HoursTile(
                      label: 'Approved',
                      value: f.approvedHours,
                      tone: DTone.ok,
                    ),
                  ),
                  const SizedBox(width: NebulaSpacing.sm),
                  Expanded(
                    child: _HoursTile(
                      label: 'Pending',
                      value: f.pendingHours,
                      tone: DTone.warn,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: NebulaSpacing.sm),
              MetricRow([
                StatTile(value: f.totalEntries, label: 'Entries logged'),
              ]),
            ],
          ),
        );
      },
    );
  }
}

class _HoursTile extends StatelessWidget {
  const _HoursTile({
    required this.label,
    required this.value,
    required this.tone,
  });

  final String label;
  final double value;
  final DTone tone;

  @override
  Widget build(BuildContext context) {
    return DCard(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Mono(_hours(value), size: 21, weight: FontWeight.w600, tone: tone),
          const SizedBox(height: 3),
          Text(
            label,
            style: context.text.bodySmall?.copyWith(
              fontSize: 10.5,
              color: context.dl.textTertiary,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Shared ───────────────────────────────────────────────────────────────────

class _Refreshable extends StatelessWidget {
  const _Refreshable({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) => ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          ConstrainedBox(
            constraints: BoxConstraints(minHeight: constraints.maxHeight),
            child: child,
          ),
        ],
      ),
    );
  }
}

/// The kit's [OfflineBanner] is unconditional; this only shows it while the
/// device actually reports no connectivity.
class _OfflineStrip extends ConsumerWidget {
  const _OfflineStrip();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final online = ref.watch(networkInfoProvider).maybeWhen(
          data: (value) => value,
          orElse: () => true,
        );
    if (online) return const SizedBox.shrink();
    return const OfflineBanner();
  }
}
