class ProjectMember {
  final int userId;
  final String fullName;
  final String email;
  final String? role;

  ProjectMember({
    required this.userId,
    required this.fullName,
    required this.email,
    this.role,
  });

  factory ProjectMember.fromJson(Map<String, dynamic> json) {
    return ProjectMember(
      userId: json['user_id'] ?? 0,
      fullName: json['full_name'] ?? '',
      email: json['email'] ?? '',
      role: json['role'],
    );
  }
}

class ProjectMilestone {
  final int id;
  final String title;
  final String? description;
  final String? dueDate;
  final String status;

  ProjectMilestone({
    required this.id,
    required this.title,
    this.description,
    this.dueDate,
    required this.status,
  });

  factory ProjectMilestone.fromJson(Map<String, dynamic> json) {
    return ProjectMilestone(
      id: json['id'] ?? 0,
      title: json['title'] ?? '',
      description: json['description'],
      dueDate: json['due_date'],
      status: json['status'] ?? 'pending',
    );
  }
}

class ProjectModel {
  final int id;
  final String name;
  final String? description;
  final String status;
  final String priority;
  final String? category;
  final double? budget;
  final int? ventureId;
  final String? ventureName;
  final String? ventureColor;
  final String? startDate;
  final String? endDate;
  final String? clientName;
  final String? clientEmail;
  final List<String> tags;
  final int? createdBy;
  final String? createdByName;
  final int taskCount;
  final int completedTaskCount;
  final List<ProjectMember> members;
  final List<ProjectMilestone> milestones;
  final String? createdAt;
  final String? updatedAt;

  ProjectModel({
    required this.id,
    required this.name,
    this.description,
    required this.status,
    required this.priority,
    this.category,
    this.budget,
    this.ventureId,
    this.ventureName,
    this.ventureColor,
    this.startDate,
    this.endDate,
    this.clientName,
    this.clientEmail,
    this.tags = const [],
    this.createdBy,
    this.createdByName,
    this.taskCount = 0,
    this.completedTaskCount = 0,
    this.members = const [],
    this.milestones = const [],
    this.createdAt,
    this.updatedAt,
  });

  factory ProjectModel.fromJson(Map<String, dynamic> json) {
    List<String> parsedTags = [];
    final rawTags = json['tags'];
    if (rawTags is List) {
      parsedTags = rawTags.map((e) => e.toString()).toList();
    } else if (rawTags is String && rawTags.isNotEmpty) {
      try {
        // If stored as JSON string
        parsedTags = [rawTags];
      } catch (_) {}
    }

    List<ProjectMember> parsedMembers = [];
    final rawMembers = json['members'];
    if (rawMembers is List) {
      parsedMembers = rawMembers
          .map((e) => ProjectMember.fromJson(e as Map<String, dynamic>))
          .toList();
    }

    List<ProjectMilestone> parsedMilestones = [];
    final rawMilestones = json['milestones'];
    if (rawMilestones is List) {
      parsedMilestones = rawMilestones
          .map((e) => ProjectMilestone.fromJson(e as Map<String, dynamic>))
          .toList();
    }

    return ProjectModel(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      description: json['description'],
      status: json['status'] ?? 'planning',
      priority: json['priority'] ?? 'medium',
      category: json['category'],
      budget: json['budget'] != null
          ? double.tryParse(json['budget'].toString())
          : null,
      ventureId: json['venture_id'],
      ventureName: json['venture_name'],
      ventureColor: json['venture_color'],
      startDate: json['start_date'],
      endDate: json['end_date'],
      clientName: json['client_name'],
      clientEmail: json['client_email'],
      tags: parsedTags,
      createdBy: json['created_by'],
      createdByName: json['created_by_name'],
      taskCount: int.tryParse(json['task_count']?.toString() ?? '0') ?? 0,
      completedTaskCount:
          int.tryParse(json['completed_task_count']?.toString() ?? '0') ?? 0,
      members: parsedMembers,
      milestones: parsedMilestones,
      createdAt: json['created_at']?.toString(),
      updatedAt: json['updated_at']?.toString(),
    );
  }

  double get progress {
    if (taskCount == 0) return 0.0;
    return completedTaskCount / taskCount;
  }

  bool get isArchived => status == 'archived';
  bool get isCompleted => status == 'completed';
  bool get isActive => status == 'active';
}

class ProjectRequestDto {
  final String name;
  final String? description;
  final String? status;
  final String? priority;
  final String? category;
  final double? budget;
  final int? ventureId;
  final String? startDate;
  final String? endDate;
  final String? clientName;
  final String? clientEmail;
  final List<Map<String, dynamic>> members;
  final List<String> tags;
  final List<Map<String, dynamic>> milestones;

  ProjectRequestDto({
    required this.name,
    this.description,
    this.status,
    this.priority,
    this.category,
    this.budget,
    this.ventureId,
    this.startDate,
    this.endDate,
    this.clientName,
    this.clientEmail,
    this.members = const [],
    this.tags = const [],
    this.milestones = const [],
  });

  Map<String, dynamic> toJson() => {
        'name': name,
        if (description != null) 'description': description,
        if (status != null) 'status': status,
        if (priority != null) 'priority': priority,
        if (category != null) 'category': category,
        if (budget != null) 'budget': budget,
        if (ventureId != null) 'venture_id': ventureId,
        if (startDate != null) 'start_date': startDate,
        if (endDate != null) 'end_date': endDate,
        if (clientName != null) 'client_name': clientName,
        if (clientEmail != null) 'client_email': clientEmail,
        'members': members,
        'tags': tags,
        'milestones': milestones,
      };
}
