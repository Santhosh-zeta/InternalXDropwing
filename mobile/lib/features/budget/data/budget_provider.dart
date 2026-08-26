import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'budget_data_source.dart';
import 'budget_model.dart';

final budgetSummaryProvider = FutureProvider.autoDispose<BudgetSummary>((ref) async {
  final dataSource = ref.watch(budgetDataSourceProvider);
  return dataSource.getSummary();
});

final budgetExpensesProvider = FutureProvider.autoDispose<List<ExpenseEntry>>((ref) async {
  final dataSource = ref.watch(budgetDataSourceProvider);
  return dataSource.getExpenses();
});

final monthlyBudgetProvider = FutureProvider.autoDispose<List<MonthlyBudget>>((ref) async {
  final dataSource = ref.watch(budgetDataSourceProvider);
  return dataSource.getMonthlyBudget();
});
