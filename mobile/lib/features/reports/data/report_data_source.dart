import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import 'report_model.dart';

final reportDataSourceProvider = Provider<ReportDataSource>((ref) {
  final dio = ref.watch(dioProvider);
  return ReportDataSource(dio);
});

/// Reads the cross-venture analytics payload backing the Reports module.
class ReportDataSource {
  final Dio _dio;

  ReportDataSource(this._dio);

  String _describe(Object error) {
    if (error is DioException) {
      final body = error.response?.data;
      if (body is Map && body['message'] != null) return body['message'].toString();
      if (error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.receiveTimeout ||
          error.type == DioExceptionType.connectionError) {
        return 'Could not reach the server. Check your connection and try again.';
      }
      return error.message ?? 'Request failed';
    }
    return error.toString();
  }

  Future<PlatformMetrics> getPlatformMetrics() async {
    try {
      final response = await _dio.get('/platform-metrics');
      final body = response.data;
      final data = (body is Map && body['data'] != null) ? body['data'] : body;
      if (data is! Map<String, dynamic>) {
        throw Exception('Unexpected platform metrics response');
      }
      return PlatformMetrics.fromJson(data);
    } catch (e) {
      throw Exception('Failed to load reports: ${_describe(e)}');
    }
  }
}
