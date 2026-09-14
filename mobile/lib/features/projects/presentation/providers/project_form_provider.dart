import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../data/models/project_models.dart';
import '../../data/repositories/projects_repository_impl.dart';
import 'projects_provider.dart';

part 'project_form_provider.g.dart';

@riverpod
class ProjectFormController extends _$ProjectFormController {
  @override
  FutureOr<void> build() {}

  Future<bool> submitProject(ProjectRequestDto dto, {int? existingProjectId}) async {
    state = const AsyncLoading();
    try {
      final repository = ref.read(projectsRepositoryProvider);
      
      if (existingProjectId != null) {
        await repository.updateProject(existingProjectId, dto);
        ref.invalidate(projectDetailProvider(existingProjectId));
      } else {
        await repository.createProject(dto);
      }
      
      ref.invalidate(projectListProvider);
      state = const AsyncData(null);
      return true;
    } catch (e, st) {
      state = AsyncError(e, st);
      return false;
    }
  }

  /// Delete a project via `DELETE /api/projects/:id`.
  ///
  /// Rethrows on failure so the caller can surface the reason — the backend
  /// rejects the call with 403 for anyone below Admin (access level 3).
  Future<void> deleteProject(int projectId) async {
    state = const AsyncLoading();
    try {
      final repository = ref.read(projectsRepositoryProvider);
      await repository.deleteProject(projectId);

      ref.invalidate(projectDetailProvider(projectId));
      ref.invalidate(projectListProvider);
      state = const AsyncData(null);
    } catch (e, st) {
      state = AsyncError(e, st);
      rethrow;
    }
  }
}
