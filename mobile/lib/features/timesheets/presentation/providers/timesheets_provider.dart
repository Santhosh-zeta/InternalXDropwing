import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/timesheet_model.dart';
import '../../data/timesheets_remote_data_source.dart';

// ── Timesheets list ────────────────────────────────────────────────────────────

final timesheetsProvider =
    AsyncNotifierProvider<TimesheetsNotifier, List<TimesheetEntry>>(
        TimesheetsNotifier.new);

class TimesheetsNotifier extends AsyncNotifier<List<TimesheetEntry>> {
  @override
  Future<List<TimesheetEntry>> build() async {
    final dataSource = ref.watch(timesheetsRemoteDataSourceProvider);
    return dataSource.getTimesheets();
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }

  Future<void> logTime({
    required double hoursWorked,
    required String date,
    String? notes,
    int? taskId,
    int? projectId,
  }) async {
    try {
      final dataSource = ref.read(timesheetsRemoteDataSourceProvider);
      final entry = await dataSource.logTimesheet(
        hoursWorked: hoursWorked,
        date: date,
        notes: notes,
        taskId: taskId,
        projectId: projectId,
      );
      final current = state.value ?? [];
      state = AsyncData([entry, ...current]);
    } catch (e) {
      rethrow;
    }
  }

  Future<void> approve(int id) async {
    // Optimistic update
    final current = state.value;
    if (current != null) {
      state = AsyncData(current.map((e) {
        if (e.id == id) return e.copyWith(status: 'approved');
        return e;
      }).toList());
    }
    try {
      final dataSource = ref.read(timesheetsRemoteDataSourceProvider);
      await dataSource.approveTimesheet(id);
    } catch (e) {
      ref.invalidateSelf();
      rethrow;
    }
  }

  Future<void> reject(int id) async {
    // Optimistic update
    final current = state.value;
    if (current != null) {
      state = AsyncData(current.map((e) {
        if (e.id == id) return e.copyWith(status: 'rejected');
        return e;
      }).toList());
    }
    try {
      final dataSource = ref.read(timesheetsRemoteDataSourceProvider);
      await dataSource.rejectTimesheet(id);
    } catch (e) {
      ref.invalidateSelf();
      rethrow;
    }
  }
}

// ── Financials ─────────────────────────────────────────────────────────────────

final timesheetFinancialsProvider =
    AsyncNotifierProvider<TimesheetFinancialsNotifier, TimesheetFinancials>(
        TimesheetFinancialsNotifier.new);

class TimesheetFinancialsNotifier extends AsyncNotifier<TimesheetFinancials> {
  @override
  Future<TimesheetFinancials> build() async {
    final dataSource = ref.watch(timesheetsRemoteDataSourceProvider);
    return dataSource.getFinancials();
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }
}

// ── Derived providers ──────────────────────────────────────────────────────────

/// My own timesheets (owned by current user) — filtered from the full list.
final myTimesheetsProvider = Provider<List<TimesheetEntry>>((ref) {
  return ref.watch(timesheetsProvider).maybeWhen(
        data: (list) => list,
        orElse: () => [],
      );
});

/// Pending timesheets from other team members (for manager approval view).
final pendingTimesheetsProvider = Provider<List<TimesheetEntry>>((ref) {
  return ref.watch(timesheetsProvider).maybeWhen(
        data: (list) => list.where((e) => e.status == 'pending').toList(),
        orElse: () => [],
      );
});
