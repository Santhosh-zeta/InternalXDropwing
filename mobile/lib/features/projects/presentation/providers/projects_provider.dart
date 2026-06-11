import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/project_models.dart';

enum ProjectFilter { all, mine, archived }

final projectFilterProvider =
    StateProvider<ProjectFilter>((ref) => ProjectFilter.all);

final projectsProvider = Provider<List<ProjectModel>>((ref) {
  return [
    ProjectModel(
      id: 1,
      name: 'Website Redesign',
      progress: 0.75,
      budget: 15000.0,
      memberAvatars: [
        'https://i.pravatar.cc/150?img=11',
        'https://i.pravatar.cc/150?img=12'
      ],
      completedMilestones: 3,
      totalMilestones: 4,
      isArchived: false,
      isMine: true,
    ),
    ProjectModel(
      id: 2,
      name: 'Mobile App Launch',
      progress: 0.40,
      budget: 32000.0,
      memberAvatars: [
        'https://i.pravatar.cc/150?img=33',
        'https://i.pravatar.cc/150?img=44',
        'https://i.pravatar.cc/150?img=55'
      ],
      completedMilestones: 2,
      totalMilestones: 5,
      isArchived: false,
      isMine: true,
    ),
    ProjectModel(
      id: 3,
      name: 'Marketing Campaign Q3',
      progress: 1.0,
      budget: 8500.0,
      memberAvatars: ['https://i.pravatar.cc/150?img=66'],
      completedMilestones: 5,
      totalMilestones: 5,
      isArchived: true,
      isMine: false,
    ),
    ProjectModel(
      id: 4,
      name: 'Backend Migration',
      progress: 0.10,
      budget: 50000.0,
      memberAvatars: [
        'https://i.pravatar.cc/150?img=68',
        'https://i.pravatar.cc/150?img=69'
      ],
      completedMilestones: 1,
      totalMilestones: 10,
      isArchived: false,
      isMine: false,
    ),
  ];
});

final filteredProjectsProvider = Provider<List<ProjectModel>>((ref) {
  final projects = ref.watch(projectsProvider);
  final filter = ref.watch(projectFilterProvider);

  switch (filter) {
    case ProjectFilter.mine:
      return projects.where((p) => p.isMine && !p.isArchived).toList();
    case ProjectFilter.archived:
      return projects.where((p) => p.isArchived).toList();
    case ProjectFilter.all:
    default:
      return projects.where((p) => !p.isArchived).toList();
  }
});
