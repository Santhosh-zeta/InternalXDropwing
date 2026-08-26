import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import 'strategy_model.dart';

final strategyDataSourceProvider = Provider<StrategyDataSource>((ref) {
  final dio = ref.watch(dioProvider);
  return StrategyDataSource(dio);
});

class StrategyDataSource {
  final Dio _dio;

  StrategyDataSource(this._dio);

  Future<StrategyData> getStrategyData() async {
    try {
      final response = await _dio.get('/strategy');
      final data = response.data is Map ? response.data : response.data['data'];
      final okrList = (data['okrs'] ?? []) as List;
      final riskList = (data['risks'] ?? []) as List;
      return StrategyData(
        okrs: okrList.map((j) => OKRModel.fromJson(j as Map<String, dynamic>)).toList(),
        risks: riskList.map((j) => StrategicRiskModel.fromJson(j as Map<String, dynamic>)).toList(),
      );
    } catch (e) {
      throw Exception('Failed to load strategy data: $e');
    }
  }
}
