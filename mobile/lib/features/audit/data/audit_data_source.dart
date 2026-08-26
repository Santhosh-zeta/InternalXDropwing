import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import 'audit_model.dart';

final auditDataSourceProvider = Provider<AuditDataSource>((ref) {
  final dio = ref.watch(dioProvider);
  return AuditDataSource(dio);
});

class AuditDataSource {
  final Dio _dio;

  AuditDataSource(this._dio);

  Future<List<AuditLog>> getAuditLogs() async {
    try {
      final response = await _dio.get('/action-logs');
      final raw = response.data;
      final list = (raw is Map && raw['data'] != null) ? raw['data'] : raw;
      return (list as List).map((j) => AuditLog.fromJson(j as Map<String, dynamic>)).toList();
    } catch (e) {
      throw Exception('Failed to load audit logs: $e');
    }
  }
}
