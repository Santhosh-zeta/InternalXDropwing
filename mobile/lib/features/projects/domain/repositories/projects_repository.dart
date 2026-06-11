import '../../data/models/project_models.dart';

abstract class ProjectsRepository {
  Future<List<ProjectModel>> getProjects();
  Future<ProjectModel> getProjectById(int id);
  Future<int> createProject(ProjectRequestDto request);
  Future<void> updateProject(int id, ProjectRequestDto request);
  Future<void> deleteProject(int id);
}
