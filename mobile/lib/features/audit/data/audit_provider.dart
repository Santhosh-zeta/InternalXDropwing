import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'audit_data_source.dart';
import 'audit_model.dart';

final auditLogsProvider = FutureProvider.autoDispose<List<AuditLog>>((ref) async {
  final dataSource = ref.watch(auditDataSourceProvider);
  return dataSource.getAuditLogs();
});

final auditSearchProvider = StateProvider.autoDispose<String>((ref) => '');

final auditActionFilterProvider = StateProvider.autoDispose<String?>((ref) => null);

final filteredAuditLogsProvider = Provider.autoDispose<AsyncValue<List<AuditLog>>>((ref) {
  final logsAsync = ref.watch(auditLogsProvider);
  final search = ref.watch(auditSearchProvider).toLowerCase();
  final actionFilter = ref.watch(auditActionFilterProvider);

  return logsAsync.whenData((logs) {
    return logs.where((log) {
      final matchesSearch = search.isEmpty ||
          (log.userName?.toLowerCase().contains(search) ?? false) ||
          log.action.toLowerCase().contains(search) ||
          (log.entityType?.toLowerCase().contains(search) ?? false);
      final matchesAction = actionFilter == null || log.action == actionFilter;
      return matchesSearch && matchesAction;
    }).toList();
  });
});
