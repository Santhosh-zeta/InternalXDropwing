import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'strategy_data_source.dart';
import 'strategy_model.dart';

final strategyProvider = FutureProvider.autoDispose<StrategyData>((ref) async {
  final dataSource = ref.watch(strategyDataSourceProvider);
  return dataSource.getStrategyData();
});
