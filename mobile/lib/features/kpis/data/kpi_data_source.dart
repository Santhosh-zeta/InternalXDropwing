import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import 'kpi_model.dart';

final kpiDataSourceProvider = Provider<KpiDataSource>((ref) {
  final dio = ref.watch(dioProvider);
  return KpiDataSource(dio);
});

class KpiDataSource {
  final Dio _dio;

  KpiDataSource(this._dio);

  Future<HRKPIData> getHRKpis() async {
    try {
      final response = await _dio.get('/kpis/hr');
      final raw = response.data;
      final data = (raw is Map && raw['data'] != null) ? raw['data'] : raw;
      return HRKPIData.fromJson(data as Map<String, dynamic>);
    } catch (e) {
      throw Exception('Failed to load HR KPIs: $e');
    }
  }

  Future<List<DeptKPIData>> getDepartmentKpis() async {
    try {
      final response = await _dio.get('/kpis/department');
      final raw = response.data;
      final list = (raw is Map && raw['data'] != null) ? raw['data'] : raw;
      return (list as List).map((j) => DeptKPIData.fromJson(j as Map<String, dynamic>)).toList();
    } catch (e) {
      throw Exception('Failed to load department KPIs: $e');
    }
  }
}
