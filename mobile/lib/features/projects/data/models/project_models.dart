class ProjectModel {
  final int id;
  final String name;
  final double progress; // 0.0 to 1.0
  final double budget;
  final List<String> memberAvatars;
  final int completedMilestones;
  final int totalMilestones;
  final bool isArchived;
  final bool isMine;

  ProjectModel({
    required this.id,
    required this.name,
    required this.progress,
    required this.budget,
    required this.memberAvatars,
    required this.completedMilestones,
    required this.totalMilestones,
    required this.isArchived,
    required this.isMine,
  });
}
