class HomeData {
  final HomeAnalytics analytics;
  final List<HomeTask> tasks;
  // Using a dynamic or simple map for user since we can fetch User from auth
  // But for UI rendering, let's keep it simple.

  HomeData({
    required this.analytics,
    required this.tasks,
  });
}

class HomeAnalytics {
  final List<ActivityItem> recentActivity;
  final List<Announcement> announcements;
  final List<VentureData> userDistribution;

  HomeAnalytics({
    this.recentActivity = const [],
    this.announcements = const [],
    this.userDistribution = const [],
  });

  factory HomeAnalytics.fromJson(Map<String, dynamic> json) {
    return HomeAnalytics(
      recentActivity: (json['recentActivity'] as List<dynamic>?)
              ?.map((e) => ActivityItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      announcements: (json['announcements'] as List<dynamic>?)
              ?.map((e) => Announcement.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      userDistribution: (json['userDistribution'] as List<dynamic>?)
              ?.map((e) => VentureData.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class VentureData {
  final String name;
  final int value;
  final String colorHex;

  VentureData({required this.name, required this.value, required this.colorHex});

  factory VentureData.fromJson(Map<String, dynamic> json) {
    return VentureData(
      name: json['name'] ?? '',
      value: int.tryParse(json['value'].toString()) ?? 0,
      colorHex: json['color'] ?? '#000000',
    );
  }
}

class ActivityItem {
  final String action;
  final String createdAt;
  final String? userName;

  ActivityItem({
    required this.action,
    required this.createdAt,
    this.userName,
  });

  factory ActivityItem.fromJson(Map<String, dynamic> json) {
    return ActivityItem(
      action: json['action'] ?? '',
      createdAt: json['created_at'] ?? '',
      userName: json['user_name'],
    );
  }
}

class Announcement {
  final int id;
  final String type;
  final String title;
  final String content;

  Announcement({
    required this.id,
    required this.type,
    required this.title,
    required this.content,
  });

  factory Announcement.fromJson(Map<String, dynamic> json) {
    return Announcement(
      id: json['id'] ?? 0,
      type: json['type'] ?? '',
      title: json['title'] ?? '',
      content: json['content'] ?? '',
    );
  }
}

class HomeTask {
  final int id;
  final String title;
  final String status;
  final String priority;
  final int? assignedTo;
  final String? dueDate;

  // The /tasks response has always carried these; the model just was not
  // reading them, which is why the home screen could not scope anything by
  // venture and invented its own numbers instead.
  final int? ventureId;
  final String? ventureName;
  final String? ventureColor;
  final String? assignedByName;

  HomeTask({
    required this.id,
    required this.title,
    required this.status,
    required this.priority,
    this.assignedTo,
    this.dueDate,
    this.ventureId,
    this.ventureName,
    this.ventureColor,
    this.assignedByName,
  });

  factory HomeTask.fromJson(Map<String, dynamic> json) {
    return HomeTask(
      id: json['id'] ?? 0,
      title: json['title'] ?? '',
      status: json['status'] ?? '',
      priority: json['priority'] ?? '',
      assignedTo: json['assigned_to'],
      dueDate: json['due_date'],
      ventureId: json['venture_id'],
      ventureName: json['venture_name'],
      ventureColor: json['primary_color'],
      assignedByName: json['assigned_by_name'],
    );
  }

  /// Status strings arrive lower-case-hyphenated from Postgres
  /// ('in-progress'), but older rows and some clients send 'In Progress'.
  /// Normalise once here rather than at a dozen comparison sites - a
  /// case-mismatch bug in exactly this spot shipped in the previous version.
  String get normalisedStatus =>
      status.toLowerCase().replaceAll('_', '-').replaceAll(' ', '-');

  bool get isDone => normalisedStatus == 'completed';

  bool get isInProgress => normalisedStatus == 'in-progress';

  DateTime? get due => dueDate == null ? null : DateTime.tryParse(dueDate!);
}

class KPICard {
  final String title;
  final String value;
  final String icon;
  final String color;

  KPICard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });
}
