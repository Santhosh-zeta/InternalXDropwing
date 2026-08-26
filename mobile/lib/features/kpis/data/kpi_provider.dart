import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'kpi_data_source.dart';
import 'kpi_model.dart';

final hrKpiProvider = FutureProvider.autoDispose<HRKPIData>((ref) async {
  final dataSource = ref.watch(kpiDataSourceProvider);
  return dataSource.getHRKpis();
});

final departmentKpiProvider = FutureProvider.autoDispose<List<DeptKPIData>>((ref) async {
  final dataSource = ref.watch(kpiDataSourceProvider);
  return dataSource.getDepartmentKpis();
});
