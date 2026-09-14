import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'access_control_data_source.dart';
import 'access_control_model.dart';

final accessLevelsProvider =
    FutureProvider.autoDispose<List<AccessLevelPermissions>>((ref) async {
  final dataSource = ref.watch(accessControlDataSourceProvider);
  return dataSource.getAccessLevels();
});

final twoFactorConfigProvider = FutureProvider.autoDispose<bool>((ref) async {
  final dataSource = ref.watch(accessControlDataSourceProvider);
  return dataSource.get2FAConfig();
});
