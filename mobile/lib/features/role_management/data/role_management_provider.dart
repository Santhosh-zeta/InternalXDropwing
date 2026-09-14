import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'role_management_data_source.dart';
import 'role_management_model.dart';

final ventureRolesProvider =
    FutureProvider.autoDispose<List<VentureRole>>((ref) async {
  final dataSource = ref.watch(roleManagementDataSourceProvider);
  return dataSource.getRoles();
});

final ventureRoleDetailProvider =
    FutureProvider.autoDispose.family<VentureRole, int>((ref, id) async {
  final dataSource = ref.watch(roleManagementDataSourceProvider);
  return dataSource.getRole(id);
});

final roleVenturesProvider =
    FutureProvider.autoDispose<List<RoleVentureOption>>((ref) async {
  final dataSource = ref.watch(roleManagementDataSourceProvider);
  return dataSource.getVentures();
});

final assignableTeamMembersProvider =
    FutureProvider.autoDispose<List<AssignableTeamMember>>((ref) async {
  final dataSource = ref.watch(roleManagementDataSourceProvider);
  return dataSource.getAssignableTeamMembers();
});
