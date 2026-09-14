import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import 'invoice_model.dart';

final invoiceDataSourceProvider = Provider<InvoiceDataSource>((ref) {
  final dio = ref.watch(dioProvider);
  return InvoiceDataSource(dio);
});

/// Thin wrapper over the `/api/invoices` endpoints.
class InvoiceDataSource {
  final Dio _dio;

  InvoiceDataSource(this._dio);

  /// Lifts the server's failure message out of a Dio error so the UI can show
  /// what actually went wrong instead of a generic status code.
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

  Future<List<InvoiceSummary>> getInvoices() async {
    try {
      final response = await _dio.get('/invoices');
      final body = response.data;
      final list = (body is Map && body['data'] != null) ? body['data'] : body;
      if (list is! List) throw Exception('Unexpected invoice list response');
      return list
          .whereType<Map<String, dynamic>>()
          .map(InvoiceSummary.fromJson)
          .toList();
    } catch (e) {
      throw Exception('Failed to load invoices: ${_describe(e)}');
    }
  }

  Future<InvoiceDetail> getInvoice(String id) async {
    try {
      final response = await _dio.get('/invoices/$id');
      final body = response.data;
      final data = (body is Map && body['data'] != null) ? body['data'] : body;
      if (data is! Map<String, dynamic>) {
        throw Exception('Unexpected invoice detail response');
      }
      return InvoiceDetail.fromJson(data);
    } catch (e) {
      throw Exception('Failed to load invoice: ${_describe(e)}');
    }
  }
}
