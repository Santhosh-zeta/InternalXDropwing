import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import 'timesheet_model.dart';

final timesheetsRemoteDataSourceProvider =
    Provider<TimesheetsRemoteDataSource>((ref) {
  final dio = ref.watch(dioProvider);
  return TimesheetsRemoteDataSource(dio);
});

class TimesheetsRemoteDataSource {
  final Dio _dio;

  TimesheetsRemoteDataSource(this._dio);

  Future<List<TimesheetEntry>> getTimesheets() async {
    try {
      final response = await _dio.get('/timesheets');
      final body = response.data;
      if (body['success'] == true) {
        final List<dynamic> data = body['data'] ?? [];
        return data.map((j) => TimesheetEntry.fromJson(j as Map<String, dynamic>)).toList();
      }
      throw Exception(body['message'] ?? 'Failed to load timesheets');
    } catch (e) {
      throw Exception('Failed to load timesheets: $e');
    }
  }

  Future<TimesheetEntry> logTimesheet({
    required double hoursWorked,
    required String date,
    String? notes,
    int? taskId,
    int? projectId,
  }) async {
    try {
      final payload = <String, dynamic>{
        'hours_worked': hoursWorked,
        'date': date,
        if (notes != null && notes.isNotEmpty) 'notes': notes,
        if (taskId != null) 'task_id': taskId,
        if (projectId != null) 'project_id': projectId,
      };
      final response = await _dio.post('/timesheets', data: payload);
      final body = response.data;
      if (body['success'] == true) {
        return TimesheetEntry.fromJson(body['data'] as Map<String, dynamic>);
      }
      throw Exception(body['message'] ?? 'Failed to log timesheet');
    } catch (e) {
      throw Exception('Failed to log timesheet: $e');
    }
  }

  Future<void> approveTimesheet(int id) async {
    try {
      final response =
          await _dio.patch('/timesheets/$id/approve', data: {'status': 'approved'});
      final body = response.data;
      if (body['success'] != true) {
        throw Exception(body['message'] ?? 'Failed to approve timesheet');
      }
    } catch (e) {
      throw Exception('Failed to approve timesheet: $e');
    }
  }

  Future<void> rejectTimesheet(int id) async {
    try {
      final response =
          await _dio.patch('/timesheets/$id/approve', data: {'status': 'rejected'});
      final body = response.data;
      if (body['success'] != true) {
        throw Exception(body['message'] ?? 'Failed to reject timesheet');
      }
    } catch (e) {
      throw Exception('Failed to reject timesheet: $e');
    }
  }

  Future<TimesheetFinancials> getFinancials() async {
    try {
      final response = await _dio.get('/timesheets/financials');
      final body = response.data;
      if (body['success'] == true) {
        return TimesheetFinancials.fromJson(body['data'] as Map<String, dynamic>);
      }
      throw Exception(body['message'] ?? 'Failed to load financials');
    } catch (e) {
      throw Exception('Failed to load financials: $e');
    }
  }
}
