import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import 'db_explorer_model.dart';

final dbExplorerDataSourceProvider = Provider<DbExplorerDataSource>((ref) {
  final dio = ref.watch(dioProvider);
  return DbExplorerDataSource(dio);
});

/// Wraps `/api/database` — table listing, table preview, and raw SQL
/// execution. Every one of these calls is destructive-capable on the server
/// side; this class does no client-side safety filtering, it only surfaces
/// whatever the backend reports.
class DbExplorerDataSource {
  final Dio _dio;

  DbExplorerDataSource(this._dio);

  String _describe(Object error) {
    if (error is DioException) {
      final body = error.response?.data;
      if (body is Map && body['message'] != null) return body['message'].toString();
      if (error.response?.statusCode == 403) {
        return 'Level 1 (Super Admin) access is required.';
      }
      if (error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.receiveTimeout ||
          error.type == DioExceptionType.connectionError) {
        return 'Could not reach the server. Check your connection and try again.';
      }
      return error.message ?? 'Request failed';
    }
    return error.toString();
  }

  Future<List<String>> getTables() async {
    try {
      final response = await _dio.get('/database/tables');
      final body = response.data;
      if (body is Map && body['success'] == false) {
        throw Exception(body['message']?.toString() ?? 'Request failed');
      }
      final tables = (body is Map) ? body['tables'] : null;
      if (tables is! List) throw Exception('Unexpected response shape');
      return tables.map((t) => t.toString()).toList();
    } catch (e) {
      throw Exception('Failed to load tables: ${_describe(e)}');
    }
  }

  Future<TablePreview> getTable(String name) async {
    try {
      final response = await _dio.get('/database/table/$name');
      final body = response.data;
      if (body is Map && body['success'] == false) {
        throw Exception(body['message']?.toString() ?? 'Request failed');
      }
      if (body is! Map<String, dynamic>) {
        throw Exception('Unexpected response shape');
      }
      return TablePreview.fromJson(body);
    } catch (e) {
      throw Exception('Failed to load table "$name": ${_describe(e)}');
    }
  }

  /// Executes arbitrary SQL. There is no client-side validation or
  /// restriction — the caller must have already confirmed intent, since the
  /// backend runs exactly the string given.
  Future<QueryResult> runQuery(String query) async {
    try {
      final response = await _dio.post('/database/query', data: {'query': query});
      final body = response.data;
      if (body is Map && body['success'] == false) {
        throw Exception(body['message']?.toString() ?? 'Query failed');
      }
      if (body is! Map<String, dynamic>) {
        throw Exception('Unexpected response shape');
      }
      return QueryResult.fromJson(body);
    } catch (e) {
      throw Exception(_describe(e));
    }
  }
}
