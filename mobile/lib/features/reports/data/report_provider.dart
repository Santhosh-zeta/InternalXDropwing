import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'report_data_source.dart';
import 'report_model.dart';

final platformMetricsProvider =
    FutureProvider.autoDispose<PlatformMetrics>((ref) async {
  final dataSource = ref.watch(reportDataSourceProvider);
  return dataSource.getPlatformMetrics();
});
