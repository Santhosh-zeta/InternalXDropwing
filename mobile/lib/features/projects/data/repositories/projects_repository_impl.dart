import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/repositories/projects_repository.dart';
import '../datasources/projects_remote_data_source.dart';
import '../models/project_models.dart';

final projectsRepositoryProvider = Provider<ProjectsRepository>((ref) {
  return ProjectsRepositoryImpl(
      ref.watch(projectsRemoteDataSourceProvider));
});

class ProjectsRepositoryImpl implements ProjectsRepository {
  final ProjectsRemoteDataSource remoteDataSource;

  ProjectsRepositoryImpl(this.remoteDataSource);

  @override
  Future<List<ProjectModel>> getProjects() {
    return remoteDataSource.getProjects();
  }

  @override
  Future<ProjectModel> getProjectById(int id) {
    return remoteDataSource.getProjectById(id);
  }

  @override
  Future<int> createProject(ProjectRequestDto request) {
    return remoteDataSource.createProject(request);
  }

  @override
  Future<void> updateProject(int id, ProjectRequestDto request) {
    return remoteDataSource.updateProject(id, request);
  }

  @override
  Future<void> deleteProject(int id) {
    return remoteDataSource.deleteProject(id);
  }
}
