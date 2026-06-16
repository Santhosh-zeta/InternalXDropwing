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

  HomeTask({
    required this.id,
    required this.title,
    required this.status,
    required this.priority,
    this.assignedTo,
    this.dueDate,
  });

  factory HomeTask.fromJson(Map<String, dynamic> json) {
    return HomeTask(
      id: json['id'] ?? 0,
      title: json['title'] ?? '',
      status: json['status'] ?? '',
      priority: json['priority'] ?? '',
      assignedTo: json['assigned_to'],
      dueDate: json['due_date'],
    );
  }
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
