import 'package:dio/dio.dart';
import '../models/client_portal_model.dart';

class ClientPortalRemoteDataSource {
  final Dio _dio;

  ClientPortalRemoteDataSource(this._dio);

  Future<ClientPortalOverview> getClientPortalOverview() async {
    try {
      final response = await _dio.get('/client-portal/overview');

      if (response.statusCode == 200) {
        return ClientPortalOverview.fromJson(response.data['data'] as Map<String, dynamic>);
      }
      return ClientPortalOverview(projects: [], deliverables: [], invoices: []);
    } catch (e) {
      rethrow;
    }
  }

  Future<String> getInvoicePdfUrl(int invoiceId) async {
    try {
      final response = await _dio.get('/client-portal/invoices/$invoiceId/pdf-url');
      return response.data['data']['pdf_url'] ?? '';
    } catch (e) {
      rethrow;
    }
  }
}
