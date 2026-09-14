import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/constants/access_levels.dart';
import '../../../../core/theme/nebula_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../providers/calendar_provider.dart';

class CalendarScreen extends ConsumerStatefulWidget {
  const CalendarScreen({super.key});

  @override
  ConsumerState<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends ConsumerState<CalendarScreen> {
  late DateTime _currentMonth;

  @override
  void initState() {
    super.initState();
    _currentMonth = DateTime(DateTime.now().year, DateTime.now().month);
    // Initialize calendar on first load
    Future.microtask(() {
      ref.read(calendarNotifierProvider.notifier).initialize();
    });
  }

  void _previousMonth() {
    setState(() {
      _currentMonth = DateTime(_currentMonth.year, _currentMonth.month - 1);
    });
    ref.read(calendarNotifierProvider.notifier).changeMonth(_currentMonth.month, _currentMonth.year);
  }

  void _nextMonth() {
    setState(() {
      _currentMonth = DateTime(_currentMonth.year, _currentMonth.month + 1);
    });
    ref.read(calendarNotifierProvider.notifier).changeMonth(_currentMonth.month, _currentMonth.year);
  }

  @override
  Widget build(BuildContext context) {
    final events = ref.watch(calendarNotifierProvider);
    final authState = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: NebulaColors.background,
      appBar: AppBar(
        title: const Text(
          'Calendar',
          style: TextStyle(fontWeight: FontWeight.w600, color: NebulaColors.textPrimary),
        ),
        backgroundColor: NebulaColors.surfaceCard,
        elevation: 0,
        centerTitle: false,
      ),
      body: events.when(
        data: (eventList) {
          return SingleChildScrollView(
            child: Column(
              children: [
                // Month/Year Picker
                Container(
                  color: NebulaColors.surfaceCard,
                  padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      IconButton(
                        icon: const Icon(LucideIcons.chevronLeft, color: NebulaColors.textPrimary),
                        onPressed: _previousMonth,
                      ),
                      Text(
                        DateFormat('MMMM yyyy').format(_currentMonth),
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: NebulaColors.textPrimary,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(LucideIcons.chevronRight, color: NebulaColors.textPrimary),
                        onPressed: _nextMonth,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                // Weekday headers
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  color: NebulaColors.surfaceCard,
                  child: Row(
                    children: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                        .map((day) => Expanded(
                              child: Container(
                                alignment: Alignment.center,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                child: Text(
                                  day,
                                  style: const TextStyle(
                                    color: NebulaColors.textSecondary,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ))
                        .toList(),
                  ),
                ),
                const SizedBox(height: 4),
                // Calendar Grid
                Container(
                  color: NebulaColors.surfaceCard,
                  padding: const EdgeInsets.all(12),
                  child: GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 7,
                      childAspectRatio: 1,
                      mainAxisSpacing: 8,
                      crossAxisSpacing: 8,
                    ),
                    itemCount: _getDaysInMonth(_currentMonth),
                    itemBuilder: (context, index) {
                      final day = index + 1;
                      final date = DateTime(_currentMonth.year, _currentMonth.month, day);
                      final dayEvents = eventList
                          .where((e) =>
                              e.date.year == date.year &&
                              e.date.month == date.month &&
                              e.date.day == date.day)
                          .toList();
                      final isToday =
                          date.year == DateTime.now().year &&
                          date.month == DateTime.now().month &&
                          date.day == DateTime.now().day;

                      return GestureDetector(
                        onTap: dayEvents.isNotEmpty
                            ? () => _showDayEvents(context, date, dayEvents, authState, ref)
                            : null,
                        child: Container(
                          decoration: BoxDecoration(
                            border: isToday
                                ? Border.all(color: NebulaColors.primary, width: 2)
                                : null,
                            borderRadius: BorderRadius.circular(8),
                            color: isToday
                                ? NebulaColors.primary.withValues(alpha: 0.1)
                                : NebulaColors.background,
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                day.toString(),
                                style: TextStyle(
                                  color: NebulaColors.textPrimary,
                                  fontWeight: isToday ? FontWeight.bold : FontWeight.w500,
                                  fontSize: 14,
                                ),
                              ),
                              if (dayEvents.isNotEmpty) const SizedBox(height: 4),
                              if (dayEvents.isNotEmpty)
                                SizedBox(
                                  height: 12,
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: dayEvents.take(2).map((event) {
                                      final color = _getEventColor(event.type);
                                      return Container(
                                        width: 6,
                                        height: 6,
                                        margin: const EdgeInsets.symmetric(horizontal: 2),
                                        decoration: BoxDecoration(
                                          color: color,
                                          shape: BoxShape.circle,
                                        ),
                                      );
                                    }).toList(),
                                  ),
                                ),
                              if (dayEvents.length > 2)
                                const Text(
                                  '...',
                                  style: TextStyle(
                                    color: NebulaColors.textSecondary,
                                    fontSize: 10,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 24),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Text('Error: $error', style: const TextStyle(color: NebulaColors.textPrimary)),
        ),
      ),
    );
  }

  int _getDaysInMonth(DateTime month) {
    if (month.month == 12) {
      return DateTime(month.year + 1, 1, 0).day;
    } else {
      return DateTime(month.year, month.month + 1, 0).day;
    }
  }

  Color _getEventColor(String type) {
    switch (type) {
      case 'milestone':
        return NebulaColors.primary;
      case 'deadline':
        return NebulaColors.highlight;
      case 'event':
      default:
        return NebulaColors.success;
    }
  }

  void _showDayEvents(
    BuildContext context,
    DateTime date,
    List<dynamic> dayEvents,
    dynamic authState,
    WidgetRef ref,
  ) {
    showModalBottomSheet(
      context: context,
      backgroundColor: NebulaColors.surfaceCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              DateFormat('EEEE, MMMM d, yyyy').format(date),
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: NebulaColors.textPrimary,
              ),
            ),
            const SizedBox(height: 16),
            SingleChildScrollView(
              child: Column(
                children: dayEvents.map<Widget>((event) {
                  // Milestones live on projects, which `PUT /api/projects/:id`
                  // gates at requireLevel(4) — CXO and above. Lower number
                  // means more access.
                  final canMarkComplete =
                      authState.maybeWhen(
                        authenticated: (user) => AccessLevels.hasAtLeast(
                            user.accessLevel, ApiAccess.updateProject),
                        orElse: () => false,
                      ) &&
                      event.type == 'milestone';

                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: NebulaColors.background,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: _getEventColor(event.type),
                        width: 1,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    event.title,
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: NebulaColors.textPrimary,
                                    ),
                                  ),
                                  if (event.projectName != null) ...[
                                    const SizedBox(height: 4),
                                    Text(
                                      event.projectName,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: NebulaColors.textSecondary,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: _getEventColor(event.type).withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                event.type.toUpperCase(),
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: _getEventColor(event.type),
                                ),
                              ),
                            ),
                          ],
                        ),
                        if (event.description != null && event.description!.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Text(
                            event.description!,
                            style: const TextStyle(
                              fontSize: 12,
                              color: NebulaColors.textSecondary,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            GestureDetector(
                              onTap: event.projectId != null
                                  ? () {
                                      Navigator.pop(ctx);
                                      context.push('/projects/${event.projectId}');
                                    }
                                  : null,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                decoration: BoxDecoration(
                                  color: NebulaColors.primary.withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Row(
                                  children: [
                                    Icon(LucideIcons.externalLink, size: 12, color: NebulaColors.primary),
                                    SizedBox(width: 4),
                                    Text(
                                      'View Project',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: NebulaColors.primary,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            if (canMarkComplete)
                              GestureDetector(
                                onTap: !event.completed
                                    ? () async {
                                        try {
                                          await ref
                                              .read(calendarNotifierProvider.notifier)
                                              .markMilestoneComplete(event.id);
                                          if (context.mounted) {
                                            Navigator.pop(ctx);
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              const SnackBar(
                                                content: Text('Milestone marked as complete'),
                                              ),
                                            );
                                          }
                                        } catch (e) {
                                          if (context.mounted) {
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              SnackBar(content: Text('Error: $e')),
                                            );
                                          }
                                        }
                                      }
                                    : null,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: event.completed
                                        ? NebulaColors.success.withValues(alpha: 0.2)
                                        : NebulaColors.highlight.withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Row(
                                    children: [
                                      Icon(
                                        event.completed
                                            ? LucideIcons.checkCircle2
                                            : LucideIcons.check,
                                        size: 12,
                                        color: event.completed
                                            ? NebulaColors.success
                                            : NebulaColors.highlight,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        event.completed ? 'Completed' : 'Mark Done',
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: event.completed
                                              ? NebulaColors.success
                                              : NebulaColors.highlight,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
