class LearningChecklistItem {
  final int id;
  final String title;
  final String? description;
  final String category;
  final int sortOrder;
  final int? dueDays;
  final int? ventureId;
  // Intern view
  final bool completed;
  final String? completedAt;
  // Manager view
  final int? completions;
  final int? totalInterns;

  LearningChecklistItem({
    required this.id,
    required this.title,
    this.description,
    required this.category,
    required this.sortOrder,
    this.dueDays,
    this.ventureId,
    this.completed = false,
    this.completedAt,
    this.completions,
    this.totalInterns,
  });

  factory LearningChecklistItem.fromJson(Map<String, dynamic> json) {
    return LearningChecklistItem(
      id: json['id'] ?? 0,
      title: json['title'] ?? '',
      description: json['description'],
      category: json['category'] ?? 'General',
      sortOrder: json['sort_order'] ?? 0,
      dueDays: json['due_days'],
      ventureId: json['venture_id'],
      completed: json['completed'] == true || json['completed'] == 1,
      completedAt: json['completed_at']?.toString(),
      completions: json['completions'] != null
          ? int.tryParse(json['completions'].toString())
          : null,
      totalInterns: json['total_interns'] != null
          ? int.tryParse(json['total_interns'].toString())
          : null,
    );
  }

  LearningChecklistItem copyWith({bool? completed}) {
    return LearningChecklistItem(
      id: id,
      title: title,
      description: description,
      category: category,
      sortOrder: sortOrder,
      dueDays: dueDays,
      ventureId: ventureId,
      completed: completed ?? this.completed,
      completedAt: completedAt,
      completions: completions,
      totalInterns: totalInterns,
    );
  }
}

class LearningResource {
  final int id;
  final String title;
  final String? description;
  final String url;
  final String category;
  final String resourceType;
  final int? addedBy;
  final String? addedByName;
  final int? ventureId;
  final String? createdAt;

  LearningResource({
    required this.id,
    required this.title,
    this.description,
    required this.url,
    required this.category,
    required this.resourceType,
    this.addedBy,
    this.addedByName,
    this.ventureId,
    this.createdAt,
  });

  factory LearningResource.fromJson(Map<String, dynamic> json) {
    return LearningResource(
      id: json['id'] ?? 0,
      title: json['title'] ?? '',
      description: json['description'],
      url: json['url'] ?? '',
      category: json['category'] ?? 'General',
      resourceType: json['resource_type'] ?? 'link',
      addedBy: json['added_by'],
      addedByName: json['added_by_name'],
      ventureId: json['venture_id'],
      createdAt: json['created_at']?.toString(),
    );
  }
}

class LearningFeedback {
  final int id;
  final int managerId;
  final int internId;
  final String note;
  final int? rating;
  final String? weekLabel;
  final String? internName;
  final String? managerName;
  final int? ventureId;
  final String? createdAt;

  LearningFeedback({
    required this.id,
    required this.managerId,
    required this.internId,
    required this.note,
    this.rating,
    this.weekLabel,
    this.internName,
    this.managerName,
    this.ventureId,
    this.createdAt,
  });

  factory LearningFeedback.fromJson(Map<String, dynamic> json) {
    return LearningFeedback(
      id: json['id'] ?? 0,
      managerId: json['manager_id'] ?? 0,
      internId: json['intern_id'] ?? 0,
      note: json['note'] ?? '',
      rating: json['rating'],
      weekLabel: json['week_label'],
      internName: json['intern_name'],
      managerName: json['manager_name'],
      ventureId: json['venture_id'],
      createdAt: json['created_at']?.toString(),
    );
  }
}
