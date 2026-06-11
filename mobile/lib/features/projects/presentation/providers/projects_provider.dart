import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../data/models/project_models.dart';
import '../../data/repositories/projects_repository_impl.dart';

part 'projects_provider.g.dart';

enum ProjectFilter { all, active, completed, archived }

final projectFilterProvider =
    StateProvider<ProjectFilter>((ref) => ProjectFilter.all);

@riverpod
class ProjectList extends _$ProjectList {
  @override
  Future<List<ProjectModel>> build() async {
    final repository = ref.watch(projectsRepositoryProvider);
    return repository.getProjects();
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }

  Future<bool> deleteProject(int id) async {
    try {
      final repository = ref.read(projectsRepositoryProvider);
      await repository.deleteProject(id);
      // Remove from local state
      final currentList = state.value ?? [];
      state = AsyncData(currentList.where((p) => p.id != id).toList());
      return true;
    } catch (e) {
      return false;
    }
  }
}

@riverpod
Future<List<ProjectModel>> filteredProjects(FilteredProjectsRef ref) async {
  final projects = await ref.watch(projectListProvider.future);
  final filter = ref.watch(projectFilterProvider);

  switch (filter) {
    case ProjectFilter.active:
      return projects.where((p) => p.isActive && !p.isArchived).toList();
    case ProjectFilter.completed:
      return projects.where((p) => p.isCompleted).toList();
    case ProjectFilter.archived:
      return projects.where((p) => p.isArchived).toList();
    case ProjectFilter.all:
    default:
      return projects;
  }
}

@riverpod
Future<ProjectModel> projectDetail(ProjectDetailRef ref, int id) async {
  final repository = ref.watch(projectsRepositoryProvider);
  return repository.getProjectById(id);
}
