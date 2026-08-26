import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import 'budget_model.dart';

final budgetDataSourceProvider = Provider<BudgetDataSource>((ref) {
  final dio = ref.watch(dioProvider);
  return BudgetDataSource(dio);
});

class BudgetDataSource {
  final Dio _dio;

  BudgetDataSource(this._dio);

  Future<BudgetSummary> getSummary() async {
    try {
      final response = await _dio.get('/budget/summary');
      final raw = response.data;
      final data = (raw is Map && raw['data'] != null) ? raw['data'] : raw;
      return BudgetSummary.fromJson(data as Map<String, dynamic>);
    } catch (e) {
      throw Exception('Failed to load budget summary: $e');
    }
  }

  Future<List<ExpenseEntry>> getExpenses() async {
    try {
      final response = await _dio.get('/budget/expenses');
      final raw = response.data;
      final list = (raw is Map && raw['data'] != null) ? raw['data'] : raw;
      return (list as List).map((j) => ExpenseEntry.fromJson(j as Map<String, dynamic>)).toList();
    } catch (e) {
      throw Exception('Failed to load expenses: $e');
    }
  }

  Future<List<MonthlyBudget>> getMonthlyBudget() async {
    try {
      final response = await _dio.get('/budget/monthly');
      final raw = response.data;
      final list = (raw is Map && raw['data'] != null) ? raw['data'] : raw;
      return (list as List).map((j) => MonthlyBudget.fromJson(j as Map<String, dynamic>)).toList();
    } catch (e) {
      throw Exception('Failed to load monthly budget: $e');
    }
  }
}
