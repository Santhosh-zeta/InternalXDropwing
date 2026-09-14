import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'user_management_data_source.dart';
import 'user_management_model.dart';

final managedUsersProvider =
    FutureProvider.autoDispose<List<ManagedUser>>((ref) async {
  final dataSource = ref.watch(userManagementDataSourceProvider);
  return dataSource.getUsers();
});

final managedUserDetailProvider =
    FutureProvider.autoDispose.family<ManagedUserDetail, int>((ref, id) async {
  final dataSource = ref.watch(userManagementDataSourceProvider);
  return dataSource.getUser(id);
});

final ventureOptionsProvider =
    FutureProvider.autoDispose<List<VentureOption>>((ref) async {
  final dataSource = ref.watch(userManagementDataSourceProvider);
  return dataSource.getVentures();
});

final accessLevelOptionsProvider =
    FutureProvider.autoDispose<List<AccessLevelOption>>((ref) async {
  final dataSource = ref.watch(userManagementDataSourceProvider);
  return dataSource.getAccessLevels();
});
