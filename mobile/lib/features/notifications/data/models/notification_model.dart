class NotificationModel {
  final int id;
  final String type;
  final String title;
  final String message;
  final String? link;
  final bool isRead;
  final String createdAt;

  NotificationModel({
    required this.id,
    required this.type,
    required this.title,
    required this.message,
    this.link,
    required this.isRead,
    required this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id'] ?? 0,
      type: json['type'] ?? 'info',
      title: json['title'] ?? '',
      message: json['message'] ?? '',
      link: json['link'],
      isRead: json['is_read'] == true || json['is_read'] == 1,
      createdAt: json['created_at']?.toString() ?? '',
    );
  }

  NotificationModel copyWith({bool? isRead}) {
    return NotificationModel(
      id: id,
      type: type,
      title: title,
      message: message,
      link: link,
      isRead: isRead ?? this.isRead,
      createdAt: createdAt,
    );
  }
}

class NotificationsResponse {
  final List<NotificationModel> notifications;
  final int unreadCount;

  NotificationsResponse({
    required this.notifications,
    required this.unreadCount,
  });
}
