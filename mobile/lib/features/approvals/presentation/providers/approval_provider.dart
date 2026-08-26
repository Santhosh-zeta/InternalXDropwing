import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/approval_model.dart';
import '../../data/data_sources/approval_data_source.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../../core/api/api_client.dart';

final approvalDataSourceProvider = Provider<ApprovalDataSource>((ref) {
  final dio = ref.watch(apiClientProvider);
  return ApprovalDataSource(dio: dio);
});

/// Provider to fetch list of pending approvals
final approvalsProvider =
    FutureProvider<List<ApprovalRequest>>((ref) async {
  final dataSource = ref.watch(approvalDataSourceProvider);
  return await dataSource.getApprovals();
});

/// Provider for approval/rejection mutations
final approvalActionProvider =
    StateNotifierProvider<ApprovalActionNotifier, AsyncValue<void>>(
  (ref) => ApprovalActionNotifier(
    ref.watch(approvalDataSourceProvider),
    ref,
  ),
);

class ApprovalActionNotifier extends StateNotifier<AsyncValue<void>> {
  final ApprovalDataSource _dataSource;
  final Ref _ref;

  ApprovalActionNotifier(this._dataSource, this._ref)
      : super(const AsyncValue.data(null));

  Future<void> approveRequest(int id) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      await _dataSource.approveRequest(id);
      // Invalidate the approvals list to refetch
      _ref.invalidate(approvalsProvider);
    });
  }

  Future<void> rejectRequest(int id, {String? reason}) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      await _dataSource.rejectRequest(id, reason: reason);
      // Invalidate the approvals list to refetch
      _ref.invalidate(approvalsProvider);
    });
  }
}
