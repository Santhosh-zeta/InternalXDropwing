// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'task_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$TaskAssigneeImpl _$$TaskAssigneeImplFromJson(Map<String, dynamic> json) =>
    _$TaskAssigneeImpl(
      id: (json['id'] as num).toInt(),
      name: json['name'] as String,
      avatar: json['avatar'] as String?,
    );

Map<String, dynamic> _$$TaskAssigneeImplToJson(_$TaskAssigneeImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'avatar': instance.avatar,
    };

_$TaskModelImpl _$$TaskModelImplFromJson(Map<String, dynamic> json) =>
    _$TaskModelImpl(
      id: (json['id'] as num).toInt(),
      title: json['title'] as String,
      description: json['description'] as String?,
      status: json['status'] as String,
      priority: json['priority'] as String,
      assignedBy: (json['assigned_by'] as num).toInt(),
      ventureId: (json['venture_id'] as num?)?.toInt(),
      projectId: (json['project_id'] as num?)?.toInt(),
      parentTaskId: (json['parent_task_id'] as num?)?.toInt(),
      dueDate: json['due_date'] == null
          ? null
          : DateTime.parse(json['due_date'] as String),
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
      assignedByName: json['assigned_by_name'] as String?,
      assignedByAvatar: json['assigned_by_avatar'] as String?,
      ventureName: json['venture_name'] as String?,
      primaryColor: json['primary_color'] as String?,
      projectName: json['project_name'] as String?,
      parentTaskTitle: json['parent_task_title'] as String?,
      assignees: (json['assignees'] as List<dynamic>?)
              ?.map((e) => TaskAssignee.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );

Map<String, dynamic> _$$TaskModelImplToJson(_$TaskModelImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'title': instance.title,
      'description': instance.description,
      'status': instance.status,
      'priority': instance.priority,
      'assigned_by': instance.assignedBy,
      'venture_id': instance.ventureId,
      'project_id': instance.projectId,
      'parent_task_id': instance.parentTaskId,
      'due_date': instance.dueDate?.toIso8601String(),
      'created_at': instance.createdAt.toIso8601String(),
      'updated_at': instance.updatedAt.toIso8601String(),
      'assigned_by_name': instance.assignedByName,
      'assigned_by_avatar': instance.assignedByAvatar,
      'venture_name': instance.ventureName,
      'primary_color': instance.primaryColor,
      'project_name': instance.projectName,
      'parent_task_title': instance.parentTaskTitle,
      'assignees': instance.assignees,
    };

_$TaskRequestDtoImpl _$$TaskRequestDtoImplFromJson(Map<String, dynamic> json) =>
    _$TaskRequestDtoImpl(
      title: json['title'] as String,
      description: json['description'] as String?,
      assignedTo: (json['assigned_to'] as List<dynamic>)
          .map((e) => (e as num).toInt())
          .toList(),
      dueDate: json['due_date'] as String?,
      priority: json['priority'] as String?,
      projectId: (json['project_id'] as num?)?.toInt(),
      parentTaskId: (json['parent_task_id'] as num?)?.toInt(),
      ventureId: (json['venture_id'] as num?)?.toInt(),
    );

Map<String, dynamic> _$$TaskRequestDtoImplToJson(
        _$TaskRequestDtoImpl instance) =>
    <String, dynamic>{
      'title': instance.title,
      'description': instance.description,
      'assigned_to': instance.assignedTo,
      'due_date': instance.dueDate,
      'priority': instance.priority,
      'project_id': instance.projectId,
      'parent_task_id': instance.parentTaskId,
      'venture_id': instance.ventureId,
    };

_$TaskStatusUpdateRequestDtoImpl _$$TaskStatusUpdateRequestDtoImplFromJson(
        Map<String, dynamic> json) =>
    _$TaskStatusUpdateRequestDtoImpl(
      status: json['status'] as String,
    );

Map<String, dynamic> _$$TaskStatusUpdateRequestDtoImplToJson(
        _$TaskStatusUpdateRequestDtoImpl instance) =>
    <String, dynamic>{
      'status': instance.status,
    };
