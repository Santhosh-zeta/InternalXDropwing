import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../auth/data/models/auth_models.dart';
import '../../team/data/team_repository.dart';

part 'team_provider.g.dart';

@riverpod
Future<List<User>> teamMembers(TeamMembersRef ref) async {
  final repository = ref.watch(teamRepositoryProvider);
  return repository.getTeamMembers();
}
