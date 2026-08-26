import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/api/api_client.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/datasources/calendar_remote_data_source.dart';
import '../../data/models/calendar_model.dart';

final calendarDataSourceProvider = Provider<CalendarRemoteDataSource>((ref) {
  final dio = ref.watch(dioProvider);
  return CalendarRemoteDataSource(dio);
});

final selectedMonthProvider = StateProvider<DateTime>((ref) {
  return DateTime(DateTime.now().year, DateTime.now().month);
});

final calendarEventsProvider =
    FutureProvider.family<List<CalendarEvent>, DateTime>((ref, month) async {
  final dataSource = ref.watch(calendarDataSourceProvider);
  return dataSource.getCalendarEvents(month: month);
});

final monthCalendarEventsProvider = FutureProvider<List<CalendarEvent>>((ref) async {
  final month = ref.watch(selectedMonthProvider);
  return ref.watch(calendarEventsProvider(month).future);
});

class CalendarNotifier extends StateNotifier<AsyncValue<List<CalendarEvent>>> {
  final CalendarRemoteDataSource _dataSource;
  DateTime _currentMonth;

  CalendarNotifier(this._dataSource)
      : _currentMonth = DateTime(DateTime.now().year, DateTime.now().month),
        super(const AsyncValue.loading());

  Future<void> initialize() async {
    state = const AsyncValue.loading();
    try {
      final events = await _dataSource.getCalendarEvents(month: _currentMonth);
      state = AsyncValue.data(events);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> changeMonth(int month, int year) async {
    _currentMonth = DateTime(year, month);
    state = const AsyncValue.loading();
    try {
      final events = await _dataSource.getCalendarEvents(month: _currentMonth);
      state = AsyncValue.data(events);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> markMilestoneComplete(int eventId) async {
    try {
      await _dataSource.markMilestoneComplete(eventId);
      // Refresh the calendar
      await initialize();
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }
}

final calendarNotifierProvider =
    StateNotifierProvider<CalendarNotifier, AsyncValue<List<CalendarEvent>>>((ref) {
  final dataSource = ref.watch(calendarDataSourceProvider);
  return CalendarNotifier(dataSource);
});
