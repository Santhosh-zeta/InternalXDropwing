// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dashboard_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$AnalyticsResponseImpl _$$AnalyticsResponseImplFromJson(
        Map<String, dynamic> json) =>
    _$AnalyticsResponseImpl(
      recentActivity: (json['recentActivity'] as List<dynamic>?)
              ?.map((e) => ActivityItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      announcements: (json['announcements'] as List<dynamic>?)
              ?.map((e) => Announcement.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );

Map<String, dynamic> _$$AnalyticsResponseImplToJson(
        _$AnalyticsResponseImpl instance) =>
    <String, dynamic>{
      'recentActivity': instance.recentActivity,
      'announcements': instance.announcements,
    };

_$ActivityItemImpl _$$ActivityItemImplFromJson(Map<String, dynamic> json) =>
    _$ActivityItemImpl(
      action: json['action'] as String,
      createdAt: json['created_at'] as String,
      userName: json['user_name'] as String?,
    );

Map<String, dynamic> _$$ActivityItemImplToJson(_$ActivityItemImpl instance) =>
    <String, dynamic>{
      'action': instance.action,
      'created_at': instance.createdAt,
      'user_name': instance.userName,
    };

_$AnnouncementImpl _$$AnnouncementImplFromJson(Map<String, dynamic> json) =>
    _$AnnouncementImpl(
      id: (json['id'] as num).toInt(),
      type: json['type'] as String,
      title: json['title'] as String,
      content: json['content'] as String,
    );

Map<String, dynamic> _$$AnnouncementImplToJson(_$AnnouncementImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'type': instance.type,
      'title': instance.title,
      'content': instance.content,
    };

_$DashboardTaskImpl _$$DashboardTaskImplFromJson(Map<String, dynamic> json) =>
    _$DashboardTaskImpl(
      id: (json['id'] as num).toInt(),
      title: json['title'] as String,
      status: json['status'] as String,
      priority: json['priority'] as String,
      assignedTo: (json['assigned_to'] as num?)?.toInt(),
      dueDate: json['due_date'] as String?,
    );

Map<String, dynamic> _$$DashboardTaskImplToJson(_$DashboardTaskImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'title': instance.title,
      'status': instance.status,
      'priority': instance.priority,
      'assigned_to': instance.assignedTo,
      'due_date': instance.dueDate,
    };

_$NotificationItemImpl _$$NotificationItemImplFromJson(
        Map<String, dynamic> json) =>
    _$NotificationItemImpl(
      id: (json['id'] as num).toInt(),
      isRead: (json['is_read'] as num).toInt(),
    );

Map<String, dynamic> _$$NotificationItemImplToJson(
        _$NotificationItemImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'is_read': instance.isRead,
    };
