import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/api/api_client.dart';
import '../models/approval_model.dart';

final approvalDataSourceProvider = Provider<ApprovalDataSource>((ref) {
  final dio = ref.watch(dioProvider);
  return ApprovalDataSource(dio);
});

/// Reads and decides approvals.
///
/// There is no `/approvals` endpoint on the backend — the only approval flow
/// that exists is timesheets: `GET /api/timesheets` returns every timesheet the
/// caller may see and `PATCH /api/timesheets/:id/approve` records the decision
/// via a `status` body of `approved` or `rejected`.
class ApprovalDataSource {
  final Dio _dio;

  ApprovalDataSource(this._dio);

  /// Fetch the timesheets still awaiting a decision.
  Future<List<ApprovalRequest>> getApprovals() async {
    try {
      final response = await _dio.get('/timesheets');
      final raw = response.data;
      final list = (raw is Map && raw['data'] != null) ? raw['data'] : raw;

      return (list as List)
          .cast<Map<String, dynamic>>()
          .where((json) => (json['status'] ?? 'pending') == 'pending')
          .map(_approvalFromTimesheet)
          .toList();
    } catch (e) {
      throw Exception('Failed to load approvals: $e');
    }
  }

  /// Approve a pending timesheet.
  Future<void> approveRequest(int id) async {
    try {
      await _dio.patch('/timesheets/$id/approve', data: {'status': 'approved'});
    } catch (e) {
      throw Exception('Failed to approve request: $e');
    }
  }

  /// Reject a pending timesheet.
  ///
  /// The backend accepts no rejection reason, so [reason] is carried along only
  /// for callers that log it locally.
  Future<void> rejectRequest(int id, {String? reason}) async {
    try {
      await _dio.patch('/timesheets/$id/approve', data: {'status': 'rejected'});
    } catch (e) {
      throw Exception('Failed to reject request: $e');
    }
  }

  /// Adapt a timesheet row from `GET /api/timesheets` into an
  /// [ApprovalRequest]. The row is the raw `timesheets` table joined with the
  /// user, project, task and venture names, plus the computed `hourly_rate`
  /// and `total_cost`.
  ApprovalRequest _approvalFromTimesheet(Map<String, dynamic> json) {
    final hours = json['hours_worked'];
    final workedOn = json['task_title'] ?? json['project_name'] ?? 'General work';

    return ApprovalRequest(
      id: json['id'] as int,
      type: 'Timesheets',
      title: '$hours h — $workedOn',
      requesterName: (json['user_name'] as String?) ?? 'Unknown',
      status: (json['status'] as String?) ?? 'pending',
      createdAt:
          DateTime.tryParse(json['created_at']?.toString() ?? '') ??
              DateTime.now(),
      metadata: {
        if (json['date'] != null) 'Date': json['date'],
        if (json['hours_worked'] != null) 'Hours': json['hours_worked'],
        if (json['project_name'] != null) 'Project': json['project_name'],
        if (json['task_title'] != null) 'Task': json['task_title'],
        if (json['venture_name'] != null) 'Venture': json['venture_name'],
        if (json['hourly_rate'] != null) 'Hourly rate': json['hourly_rate'],
        if (json['total_cost'] != null) 'Total cost': json['total_cost'],
        if ((json['notes'] as String?)?.isNotEmpty ?? false)
          'Notes': json['notes'],
      },
    );
  }
}
