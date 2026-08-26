import 'package:dio/dio.dart';
import '../models/approval_model.dart';

class ApprovalDataSource {
  final Dio dio;

  ApprovalDataSource({required this.dio});

  /// Fetch pending approvals
  Future<List<ApprovalRequest>> getApprovals() async {
    try {
      final response = await dio.get('/approvals');

      final data = response.data as Map<String, dynamic>;
      final approvalsList = (data['data'] as List?)?.cast<Map<String, dynamic>>() ?? [];

      return approvalsList
          .map((json) => ApprovalRequest.fromJson(json))
          .toList();
    } catch (e) {
      rethrow;
    }
  }

  /// Approve an approval request
  Future<void> approveRequest(int id) async {
    try {
      await dio.post('/approvals/$id/approve');
    } catch (e) {
      rethrow;
    }
  }

  /// Reject an approval request
  Future<void> rejectRequest(int id, {String? reason}) async {
    try {
      await dio.post(
        '/approvals/$id/reject',
        data: {'reason': reason},
      );
    } catch (e) {
      rethrow;
    }
  }
}
