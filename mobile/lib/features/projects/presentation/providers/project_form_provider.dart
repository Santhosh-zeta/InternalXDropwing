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
}
