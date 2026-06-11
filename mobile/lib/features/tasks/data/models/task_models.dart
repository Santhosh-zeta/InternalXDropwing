import 'package:freezed_annotation/freezed_annotation.dart';

part 'task_models.freezed.dart';
part 'task_models.g.dart';

@freezed
class TaskAssignee with _$TaskAssignee {
  const factory TaskAssignee({
    required int id,
    required String name,
    String? avatar,
  }) = _TaskAssignee;

  factory TaskAssignee.fromJson(Map<String, dynamic> json) => _$TaskAssigneeFromJson(json);
}

@freezed
class TaskModel with _$TaskModel {
  const factory TaskModel({
    required int id,
    required String title,
    String? description,
    required String status,
    required String priority,
    @JsonKey(name: 'assigned_by') required int assignedBy,
    @JsonKey(name: 'venture_id') int? ventureId,
    @JsonKey(name: 'project_id') int? projectId,
    @JsonKey(name: 'parent_task_id') int? parentTaskId,
    @JsonKey(name: 'due_date') DateTime? dueDate,
    @JsonKey(name: 'created_at') required DateTime createdAt,
    @JsonKey(name: 'updated_at') required DateTime updatedAt,
    
    // Virtual fields from joins
    @JsonKey(name: 'assigned_by_name') String? assignedByName,
    @JsonKey(name: 'assigned_by_avatar') String? assignedByAvatar,
    @JsonKey(name: 'venture_name') String? ventureName,
    @JsonKey(name: 'primary_color') String? primaryColor,
    @JsonKey(name: 'project_name') String? projectName,
    @JsonKey(name: 'parent_task_title') String? parentTaskTitle,
    @Default([]) List<TaskAssignee> assignees,
  }) = _TaskModel;

  factory TaskModel.fromJson(Map<String, dynamic> json) => _$TaskModelFromJson(json);
}

@freezed
class TaskRequestDto with _$TaskRequestDto {
  const factory TaskRequestDto({
    required String title,
    String? description,
    @JsonKey(name: 'assigned_to') required List<int> assignedTo,
    @JsonKey(name: 'due_date') String? dueDate, // ISO-8601 string
    String? priority,
    @JsonKey(name: 'project_id') int? projectId,
    @JsonKey(name: 'parent_task_id') int? parentTaskId,
    @JsonKey(name: 'venture_id') int? ventureId,
  }) = _TaskRequestDto;

  factory TaskRequestDto.fromJson(Map<String, dynamic> json) => _$TaskRequestDtoFromJson(json);
}

@freezed
class TaskStatusUpdateRequestDto with _$TaskStatusUpdateRequestDto {
  const factory TaskStatusUpdateRequestDto({
    required String status,
  }) = _TaskStatusUpdateRequestDto;

  factory TaskStatusUpdateRequestDto.fromJson(Map<String, dynamic> json) => _$TaskStatusUpdateRequestDtoFromJson(json);
}
