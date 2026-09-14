import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'db_explorer_data_source.dart';
import 'db_explorer_model.dart';

final dbTablesProvider = FutureProvider.autoDispose<List<String>>((ref) async {
  final dataSource = ref.watch(dbExplorerDataSourceProvider);
  return dataSource.getTables();
});

final dbTablePreviewProvider =
    FutureProvider.autoDispose.family<TablePreview, String>((ref, table) async {
  final dataSource = ref.watch(dbExplorerDataSourceProvider);
  return dataSource.getTable(table);
});
