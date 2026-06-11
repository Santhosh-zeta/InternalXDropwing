// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'task_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

TaskAssignee _$TaskAssigneeFromJson(Map<String, dynamic> json) {
  return _TaskAssignee.fromJson(json);
}

/// @nodoc
mixin _$TaskAssignee {
  int get id => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  String? get avatar => throw _privateConstructorUsedError;

  /// Serializes this TaskAssignee to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of TaskAssignee
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $TaskAssigneeCopyWith<TaskAssignee> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TaskAssigneeCopyWith<$Res> {
  factory $TaskAssigneeCopyWith(
          TaskAssignee value, $Res Function(TaskAssignee) then) =
      _$TaskAssigneeCopyWithImpl<$Res, TaskAssignee>;
  @useResult
  $Res call({int id, String name, String? avatar});
}

/// @nodoc
class _$TaskAssigneeCopyWithImpl<$Res, $Val extends TaskAssignee>
    implements $TaskAssigneeCopyWith<$Res> {
  _$TaskAssigneeCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of TaskAssignee
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? avatar = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as int,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      avatar: freezed == avatar
          ? _value.avatar
          : avatar // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$TaskAssigneeImplCopyWith<$Res>
    implements $TaskAssigneeCopyWith<$Res> {
  factory _$$TaskAssigneeImplCopyWith(
          _$TaskAssigneeImpl value, $Res Function(_$TaskAssigneeImpl) then) =
      __$$TaskAssigneeImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({int id, String name, String? avatar});
}

/// @nodoc
class __$$TaskAssigneeImplCopyWithImpl<$Res>
    extends _$TaskAssigneeCopyWithImpl<$Res, _$TaskAssigneeImpl>
    implements _$$TaskAssigneeImplCopyWith<$Res> {
  __$$TaskAssigneeImplCopyWithImpl(
      _$TaskAssigneeImpl _value, $Res Function(_$TaskAssigneeImpl) _then)
      : super(_value, _then);

  /// Create a copy of TaskAssignee
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? avatar = freezed,
  }) {
    return _then(_$TaskAssigneeImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as int,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      avatar: freezed == avatar
          ? _value.avatar
          : avatar // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$TaskAssigneeImpl implements _TaskAssignee {
  const _$TaskAssigneeImpl({required this.id, required this.name, this.avatar});

  factory _$TaskAssigneeImpl.fromJson(Map<String, dynamic> json) =>
      _$$TaskAssigneeImplFromJson(json);

  @override
  final int id;
  @override
  final String name;
  @override
  final String? avatar;

  @override
  String toString() {
    return 'TaskAssignee(id: $id, name: $name, avatar: $avatar)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TaskAssigneeImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.avatar, avatar) || other.avatar == avatar));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, id, name, avatar);

  /// Create a copy of TaskAssignee
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$TaskAssigneeImplCopyWith<_$TaskAssigneeImpl> get copyWith =>
      __$$TaskAssigneeImplCopyWithImpl<_$TaskAssigneeImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TaskAssigneeImplToJson(
      this,
    );
  }
}

abstract class _TaskAssignee implements TaskAssignee {
  const factory _TaskAssignee(
      {required final int id,
      required final String name,
      final String? avatar}) = _$TaskAssigneeImpl;

  factory _TaskAssignee.fromJson(Map<String, dynamic> json) =
      _$TaskAssigneeImpl.fromJson;

  @override
  int get id;
  @override
  String get name;
  @override
  String? get avatar;

  /// Create a copy of TaskAssignee
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$TaskAssigneeImplCopyWith<_$TaskAssigneeImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

TaskModel _$TaskModelFromJson(Map<String, dynamic> json) {
  return _TaskModel.fromJson(json);
}

/// @nodoc
mixin _$TaskModel {
  int get id => throw _privateConstructorUsedError;
  String get title => throw _privateConstructorUsedError;
  String? get description => throw _privateConstructorUsedError;
  String get status => throw _privateConstructorUsedError;
  String get priority => throw _privateConstructorUsedError;
  @JsonKey(name: 'assigned_by')
  int get assignedBy => throw _privateConstructorUsedError;
  @JsonKey(name: 'venture_id')
  int? get ventureId => throw _privateConstructorUsedError;
  @JsonKey(name: 'project_id')
  int? get projectId => throw _privateConstructorUsedError;
  @JsonKey(name: 'parent_task_id')
  int? get parentTaskId => throw _privateConstructorUsedError;
  @JsonKey(name: 'due_date')
  DateTime? get dueDate => throw _privateConstructorUsedError;
  @JsonKey(name: 'created_at')
  DateTime get createdAt => throw _privateConstructorUsedError;
  @JsonKey(name: 'updated_at')
  DateTime get updatedAt =>
      throw _privateConstructorUsedError; // Virtual fields from joins
  @JsonKey(name: 'assigned_by_name')
  String? get assignedByName => throw _privateConstructorUsedError;
  @JsonKey(name: 'assigned_by_avatar')
  String? get assignedByAvatar => throw _privateConstructorUsedError;
  @JsonKey(name: 'venture_name')
  String? get ventureName => throw _privateConstructorUsedError;
  @JsonKey(name: 'primary_color')
  String? get primaryColor => throw _privateConstructorUsedError;
  @JsonKey(name: 'project_name')
  String? get projectName => throw _privateConstructorUsedError;
  @JsonKey(name: 'parent_task_title')
  String? get parentTaskTitle => throw _privateConstructorUsedError;
  List<TaskAssignee> get assignees => throw _privateConstructorUsedError;

  /// Serializes this TaskModel to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of TaskModel
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $TaskModelCopyWith<TaskModel> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TaskModelCopyWith<$Res> {
  factory $TaskModelCopyWith(TaskModel value, $Res Function(TaskModel) then) =
      _$TaskModelCopyWithImpl<$Res, TaskModel>;
  @useResult
  $Res call(
      {int id,
      String title,
      String? description,
      String status,
      String priority,
      @JsonKey(name: 'assigned_by') int assignedBy,
      @JsonKey(name: 'venture_id') int? ventureId,
      @JsonKey(name: 'project_id') int? projectId,
      @JsonKey(name: 'parent_task_id') int? parentTaskId,
      @JsonKey(name: 'due_date') DateTime? dueDate,
      @JsonKey(name: 'created_at') DateTime createdAt,
      @JsonKey(name: 'updated_at') DateTime updatedAt,
      @JsonKey(name: 'assigned_by_name') String? assignedByName,
      @JsonKey(name: 'assigned_by_avatar') String? assignedByAvatar,
      @JsonKey(name: 'venture_name') String? ventureName,
      @JsonKey(name: 'primary_color') String? primaryColor,
      @JsonKey(name: 'project_name') String? projectName,
      @JsonKey(name: 'parent_task_title') String? parentTaskTitle,
      List<TaskAssignee> assignees});
}

/// @nodoc
class _$TaskModelCopyWithImpl<$Res, $Val extends TaskModel>
    implements $TaskModelCopyWith<$Res> {
  _$TaskModelCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of TaskModel
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? title = null,
    Object? description = freezed,
    Object? status = null,
    Object? priority = null,
    Object? assignedBy = null,
    Object? ventureId = freezed,
    Object? projectId = freezed,
    Object? parentTaskId = freezed,
    Object? dueDate = freezed,
    Object? createdAt = null,
    Object? updatedAt = null,
    Object? assignedByName = freezed,
    Object? assignedByAvatar = freezed,
    Object? ventureName = freezed,
    Object? primaryColor = freezed,
    Object? projectName = freezed,
    Object? parentTaskTitle = freezed,
    Object? assignees = null,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as int,
      title: null == title
          ? _value.title
          : title // ignore: cast_nullable_to_non_nullable
              as String,
      description: freezed == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String?,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      priority: null == priority
          ? _value.priority
          : priority // ignore: cast_nullable_to_non_nullable
              as String,
      assignedBy: null == assignedBy
          ? _value.assignedBy
          : assignedBy // ignore: cast_nullable_to_non_nullable
              as int,
      ventureId: freezed == ventureId
          ? _value.ventureId
          : ventureId // ignore: cast_nullable_to_non_nullable
              as int?,
      projectId: freezed == projectId
          ? _value.projectId
          : projectId // ignore: cast_nullable_to_non_nullable
              as int?,
      parentTaskId: freezed == parentTaskId
          ? _value.parentTaskId
          : parentTaskId // ignore: cast_nullable_to_non_nullable
              as int?,
      dueDate: freezed == dueDate
          ? _value.dueDate
          : dueDate // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      createdAt: null == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      updatedAt: null == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      assignedByName: freezed == assignedByName
          ? _value.assignedByName
          : assignedByName // ignore: cast_nullable_to_non_nullable
              as String?,
      assignedByAvatar: freezed == assignedByAvatar
          ? _value.assignedByAvatar
          : assignedByAvatar // ignore: cast_nullable_to_non_nullable
              as String?,
      ventureName: freezed == ventureName
          ? _value.ventureName
          : ventureName // ignore: cast_nullable_to_non_nullable
              as String?,
      primaryColor: freezed == primaryColor
          ? _value.primaryColor
          : primaryColor // ignore: cast_nullable_to_non_nullable
              as String?,
      projectName: freezed == projectName
          ? _value.projectName
          : projectName // ignore: cast_nullable_to_non_nullable
              as String?,
      parentTaskTitle: freezed == parentTaskTitle
          ? _value.parentTaskTitle
          : parentTaskTitle // ignore: cast_nullable_to_non_nullable
              as String?,
      assignees: null == assignees
          ? _value.assignees
          : assignees // ignore: cast_nullable_to_non_nullable
              as List<TaskAssignee>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$TaskModelImplCopyWith<$Res>
    implements $TaskModelCopyWith<$Res> {
  factory _$$TaskModelImplCopyWith(
          _$TaskModelImpl value, $Res Function(_$TaskModelImpl) then) =
      __$$TaskModelImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {int id,
      String title,
      String? description,
      String status,
      String priority,
      @JsonKey(name: 'assigned_by') int assignedBy,
      @JsonKey(name: 'venture_id') int? ventureId,
      @JsonKey(name: 'project_id') int? projectId,
      @JsonKey(name: 'parent_task_id') int? parentTaskId,
      @JsonKey(name: 'due_date') DateTime? dueDate,
      @JsonKey(name: 'created_at') DateTime createdAt,
      @JsonKey(name: 'updated_at') DateTime updatedAt,
      @JsonKey(name: 'assigned_by_name') String? assignedByName,
      @JsonKey(name: 'assigned_by_avatar') String? assignedByAvatar,
      @JsonKey(name: 'venture_name') String? ventureName,
      @JsonKey(name: 'primary_color') String? primaryColor,
      @JsonKey(name: 'project_name') String? projectName,
      @JsonKey(name: 'parent_task_title') String? parentTaskTitle,
      List<TaskAssignee> assignees});
}

/// @nodoc
class __$$TaskModelImplCopyWithImpl<$Res>
    extends _$TaskModelCopyWithImpl<$Res, _$TaskModelImpl>
    implements _$$TaskModelImplCopyWith<$Res> {
  __$$TaskModelImplCopyWithImpl(
      _$TaskModelImpl _value, $Res Function(_$TaskModelImpl) _then)
      : super(_value, _then);

  /// Create a copy of TaskModel
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? title = null,
    Object? description = freezed,
    Object? status = null,
    Object? priority = null,
    Object? assignedBy = null,
    Object? ventureId = freezed,
    Object? projectId = freezed,
    Object? parentTaskId = freezed,
    Object? dueDate = freezed,
    Object? createdAt = null,
    Object? updatedAt = null,
    Object? assignedByName = freezed,
    Object? assignedByAvatar = freezed,
    Object? ventureName = freezed,
    Object? primaryColor = freezed,
    Object? projectName = freezed,
    Object? parentTaskTitle = freezed,
    Object? assignees = null,
  }) {
    return _then(_$TaskModelImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as int,
      title: null == title
          ? _value.title
          : title // ignore: cast_nullable_to_non_nullable
              as String,
      description: freezed == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String?,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      priority: null == priority
          ? _value.priority
          : priority // ignore: cast_nullable_to_non_nullable
              as String,
      assignedBy: null == assignedBy
          ? _value.assignedBy
          : assignedBy // ignore: cast_nullable_to_non_nullable
              as int,
      ventureId: freezed == ventureId
          ? _value.ventureId
          : ventureId // ignore: cast_nullable_to_non_nullable
              as int?,
      projectId: freezed == projectId
          ? _value.projectId
          : projectId // ignore: cast_nullable_to_non_nullable
              as int?,
      parentTaskId: freezed == parentTaskId
          ? _value.parentTaskId
          : parentTaskId // ignore: cast_nullable_to_non_nullable
              as int?,
      dueDate: freezed == dueDate
          ? _value.dueDate
          : dueDate // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      createdAt: null == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      updatedAt: null == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      assignedByName: freezed == assignedByName
          ? _value.assignedByName
          : assignedByName // ignore: cast_nullable_to_non_nullable
              as String?,
      assignedByAvatar: freezed == assignedByAvatar
          ? _value.assignedByAvatar
          : assignedByAvatar // ignore: cast_nullable_to_non_nullable
              as String?,
      ventureName: freezed == ventureName
          ? _value.ventureName
          : ventureName // ignore: cast_nullable_to_non_nullable
              as String?,
      primaryColor: freezed == primaryColor
          ? _value.primaryColor
          : primaryColor // ignore: cast_nullable_to_non_nullable
              as String?,
      projectName: freezed == projectName
          ? _value.projectName
          : projectName // ignore: cast_nullable_to_non_nullable
              as String?,
      parentTaskTitle: freezed == parentTaskTitle
          ? _value.parentTaskTitle
          : parentTaskTitle // ignore: cast_nullable_to_non_nullable
              as String?,
      assignees: null == assignees
          ? _value._assignees
          : assignees // ignore: cast_nullable_to_non_nullable
              as List<TaskAssignee>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$TaskModelImpl implements _TaskModel {
  const _$TaskModelImpl(
      {required this.id,
      required this.title,
      this.description,
      required this.status,
      required this.priority,
      @JsonKey(name: 'assigned_by') required this.assignedBy,
      @JsonKey(name: 'venture_id') this.ventureId,
      @JsonKey(name: 'project_id') this.projectId,
      @JsonKey(name: 'parent_task_id') this.parentTaskId,
      @JsonKey(name: 'due_date') this.dueDate,
      @JsonKey(name: 'created_at') required this.createdAt,
      @JsonKey(name: 'updated_at') required this.updatedAt,
      @JsonKey(name: 'assigned_by_name') this.assignedByName,
      @JsonKey(name: 'assigned_by_avatar') this.assignedByAvatar,
      @JsonKey(name: 'venture_name') this.ventureName,
      @JsonKey(name: 'primary_color') this.primaryColor,
      @JsonKey(name: 'project_name') this.projectName,
      @JsonKey(name: 'parent_task_title') this.parentTaskTitle,
      final List<TaskAssignee> assignees = const []})
      : _assignees = assignees;

  factory _$TaskModelImpl.fromJson(Map<String, dynamic> json) =>
      _$$TaskModelImplFromJson(json);

  @override
  final int id;
  @override
  final String title;
  @override
  final String? description;
  @override
  final String status;
  @override
  final String priority;
  @override
  @JsonKey(name: 'assigned_by')
  final int assignedBy;
  @override
  @JsonKey(name: 'venture_id')
  final int? ventureId;
  @override
  @JsonKey(name: 'project_id')
  final int? projectId;
  @override
  @JsonKey(name: 'parent_task_id')
  final int? parentTaskId;
  @override
  @JsonKey(name: 'due_date')
  final DateTime? dueDate;
  @override
  @JsonKey(name: 'created_at')
  final DateTime createdAt;
  @override
  @JsonKey(name: 'updated_at')
  final DateTime updatedAt;
// Virtual fields from joins
  @override
  @JsonKey(name: 'assigned_by_name')
  final String? assignedByName;
  @override
  @JsonKey(name: 'assigned_by_avatar')
  final String? assignedByAvatar;
  @override
  @JsonKey(name: 'venture_name')
  final String? ventureName;
  @override
  @JsonKey(name: 'primary_color')
  final String? primaryColor;
  @override
  @JsonKey(name: 'project_name')
  final String? projectName;
  @override
  @JsonKey(name: 'parent_task_title')
  final String? parentTaskTitle;
  final List<TaskAssignee> _assignees;
  @override
  @JsonKey()
  List<TaskAssignee> get assignees {
    if (_assignees is EqualUnmodifiableListView) return _assignees;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_assignees);
  }

  @override
  String toString() {
    return 'TaskModel(id: $id, title: $title, description: $description, status: $status, priority: $priority, assignedBy: $assignedBy, ventureId: $ventureId, projectId: $projectId, parentTaskId: $parentTaskId, dueDate: $dueDate, createdAt: $createdAt, updatedAt: $updatedAt, assignedByName: $assignedByName, assignedByAvatar: $assignedByAvatar, ventureName: $ventureName, primaryColor: $primaryColor, projectName: $projectName, parentTaskTitle: $parentTaskTitle, assignees: $assignees)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TaskModelImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.priority, priority) ||
                other.priority == priority) &&
            (identical(other.assignedBy, assignedBy) ||
                other.assignedBy == assignedBy) &&
            (identical(other.ventureId, ventureId) ||
                other.ventureId == ventureId) &&
            (identical(other.projectId, projectId) ||
                other.projectId == projectId) &&
            (identical(other.parentTaskId, parentTaskId) ||
                other.parentTaskId == parentTaskId) &&
            (identical(other.dueDate, dueDate) || other.dueDate == dueDate) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt) &&
            (identical(other.updatedAt, updatedAt) ||
                other.updatedAt == updatedAt) &&
            (identical(other.assignedByName, assignedByName) ||
                other.assignedByName == assignedByName) &&
            (identical(other.assignedByAvatar, assignedByAvatar) ||
                other.assignedByAvatar == assignedByAvatar) &&
            (identical(other.ventureName, ventureName) ||
                other.ventureName == ventureName) &&
            (identical(other.primaryColor, primaryColor) ||
                other.primaryColor == primaryColor) &&
            (identical(other.projectName, projectName) ||
                other.projectName == projectName) &&
            (identical(other.parentTaskTitle, parentTaskTitle) ||
                other.parentTaskTitle == parentTaskTitle) &&
            const DeepCollectionEquality()
                .equals(other._assignees, _assignees));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hashAll([
        runtimeType,
        id,
        title,
        description,
        status,
        priority,
        assignedBy,
        ventureId,
        projectId,
        parentTaskId,
        dueDate,
        createdAt,
        updatedAt,
        assignedByName,
        assignedByAvatar,
        ventureName,
        primaryColor,
        projectName,
        parentTaskTitle,
        const DeepCollectionEquality().hash(_assignees)
      ]);

  /// Create a copy of TaskModel
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$TaskModelImplCopyWith<_$TaskModelImpl> get copyWith =>
      __$$TaskModelImplCopyWithImpl<_$TaskModelImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TaskModelImplToJson(
      this,
    );
  }
}

abstract class _TaskModel implements TaskModel {
  const factory _TaskModel(
      {required final int id,
      required final String title,
      final String? description,
      required final String status,
      required final String priority,
      @JsonKey(name: 'assigned_by') required final int assignedBy,
      @JsonKey(name: 'venture_id') final int? ventureId,
      @JsonKey(name: 'project_id') final int? projectId,
      @JsonKey(name: 'parent_task_id') final int? parentTaskId,
      @JsonKey(name: 'due_date') final DateTime? dueDate,
      @JsonKey(name: 'created_at') required final DateTime createdAt,
      @JsonKey(name: 'updated_at') required final DateTime updatedAt,
      @JsonKey(name: 'assigned_by_name') final String? assignedByName,
      @JsonKey(name: 'assigned_by_avatar') final String? assignedByAvatar,
      @JsonKey(name: 'venture_name') final String? ventureName,
      @JsonKey(name: 'primary_color') final String? primaryColor,
      @JsonKey(name: 'project_name') final String? projectName,
      @JsonKey(name: 'parent_task_title') final String? parentTaskTitle,
      final List<TaskAssignee> assignees}) = _$TaskModelImpl;

  factory _TaskModel.fromJson(Map<String, dynamic> json) =
      _$TaskModelImpl.fromJson;

  @override
  int get id;
  @override
  String get title;
  @override
  String? get description;
  @override
  String get status;
  @override
  String get priority;
  @override
  @JsonKey(name: 'assigned_by')
  int get assignedBy;
  @override
  @JsonKey(name: 'venture_id')
  int? get ventureId;
  @override
  @JsonKey(name: 'project_id')
  int? get projectId;
  @override
  @JsonKey(name: 'parent_task_id')
  int? get parentTaskId;
  @override
  @JsonKey(name: 'due_date')
  DateTime? get dueDate;
  @override
  @JsonKey(name: 'created_at')
  DateTime get createdAt;
  @override
  @JsonKey(name: 'updated_at')
  DateTime get updatedAt; // Virtual fields from joins
  @override
  @JsonKey(name: 'assigned_by_name')
  String? get assignedByName;
  @override
  @JsonKey(name: 'assigned_by_avatar')
  String? get assignedByAvatar;
  @override
  @JsonKey(name: 'venture_name')
  String? get ventureName;
  @override
  @JsonKey(name: 'primary_color')
  String? get primaryColor;
  @override
  @JsonKey(name: 'project_name')
  String? get projectName;
  @override
  @JsonKey(name: 'parent_task_title')
  String? get parentTaskTitle;
  @override
  List<TaskAssignee> get assignees;

  /// Create a copy of TaskModel
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$TaskModelImplCopyWith<_$TaskModelImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

TaskRequestDto _$TaskRequestDtoFromJson(Map<String, dynamic> json) {
  return _TaskRequestDto.fromJson(json);
}

/// @nodoc
mixin _$TaskRequestDto {
  String get title => throw _privateConstructorUsedError;
  String? get description => throw _privateConstructorUsedError;
  @JsonKey(name: 'assigned_to')
  List<int> get assignedTo => throw _privateConstructorUsedError;
  @JsonKey(name: 'due_date')
  String? get dueDate => throw _privateConstructorUsedError; // ISO-8601 string
  String? get priority => throw _privateConstructorUsedError;
  @JsonKey(name: 'project_id')
  int? get projectId => throw _privateConstructorUsedError;
  @JsonKey(name: 'parent_task_id')
  int? get parentTaskId => throw _privateConstructorUsedError;
  @JsonKey(name: 'venture_id')
  int? get ventureId => throw _privateConstructorUsedError;

  /// Serializes this TaskRequestDto to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of TaskRequestDto
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $TaskRequestDtoCopyWith<TaskRequestDto> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TaskRequestDtoCopyWith<$Res> {
  factory $TaskRequestDtoCopyWith(
          TaskRequestDto value, $Res Function(TaskRequestDto) then) =
      _$TaskRequestDtoCopyWithImpl<$Res, TaskRequestDto>;
  @useResult
  $Res call(
      {String title,
      String? description,
      @JsonKey(name: 'assigned_to') List<int> assignedTo,
      @JsonKey(name: 'due_date') String? dueDate,
      String? priority,
      @JsonKey(name: 'project_id') int? projectId,
      @JsonKey(name: 'parent_task_id') int? parentTaskId,
      @JsonKey(name: 'venture_id') int? ventureId});
}

/// @nodoc
class _$TaskRequestDtoCopyWithImpl<$Res, $Val extends TaskRequestDto>
    implements $TaskRequestDtoCopyWith<$Res> {
  _$TaskRequestDtoCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of TaskRequestDto
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? title = null,
    Object? description = freezed,
    Object? assignedTo = null,
    Object? dueDate = freezed,
    Object? priority = freezed,
    Object? projectId = freezed,
    Object? parentTaskId = freezed,
    Object? ventureId = freezed,
  }) {
    return _then(_value.copyWith(
      title: null == title
          ? _value.title
          : title // ignore: cast_nullable_to_non_nullable
              as String,
      description: freezed == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String?,
      assignedTo: null == assignedTo
          ? _value.assignedTo
          : assignedTo // ignore: cast_nullable_to_non_nullable
              as List<int>,
      dueDate: freezed == dueDate
          ? _value.dueDate
          : dueDate // ignore: cast_nullable_to_non_nullable
              as String?,
      priority: freezed == priority
          ? _value.priority
          : priority // ignore: cast_nullable_to_non_nullable
              as String?,
      projectId: freezed == projectId
          ? _value.projectId
          : projectId // ignore: cast_nullable_to_non_nullable
              as int?,
      parentTaskId: freezed == parentTaskId
          ? _value.parentTaskId
          : parentTaskId // ignore: cast_nullable_to_non_nullable
              as int?,
      ventureId: freezed == ventureId
          ? _value.ventureId
          : ventureId // ignore: cast_nullable_to_non_nullable
              as int?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$TaskRequestDtoImplCopyWith<$Res>
    implements $TaskRequestDtoCopyWith<$Res> {
  factory _$$TaskRequestDtoImplCopyWith(_$TaskRequestDtoImpl value,
          $Res Function(_$TaskRequestDtoImpl) then) =
      __$$TaskRequestDtoImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String title,
      String? description,
      @JsonKey(name: 'assigned_to') List<int> assignedTo,
      @JsonKey(name: 'due_date') String? dueDate,
      String? priority,
      @JsonKey(name: 'project_id') int? projectId,
      @JsonKey(name: 'parent_task_id') int? parentTaskId,
      @JsonKey(name: 'venture_id') int? ventureId});
}

/// @nodoc
class __$$TaskRequestDtoImplCopyWithImpl<$Res>
    extends _$TaskRequestDtoCopyWithImpl<$Res, _$TaskRequestDtoImpl>
    implements _$$TaskRequestDtoImplCopyWith<$Res> {
  __$$TaskRequestDtoImplCopyWithImpl(
      _$TaskRequestDtoImpl _value, $Res Function(_$TaskRequestDtoImpl) _then)
      : super(_value, _then);

  /// Create a copy of TaskRequestDto
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? title = null,
    Object? description = freezed,
    Object? assignedTo = null,
    Object? dueDate = freezed,
    Object? priority = freezed,
    Object? projectId = freezed,
    Object? parentTaskId = freezed,
    Object? ventureId = freezed,
  }) {
    return _then(_$TaskRequestDtoImpl(
      title: null == title
          ? _value.title
          : title // ignore: cast_nullable_to_non_nullable
              as String,
      description: freezed == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String?,
      assignedTo: null == assignedTo
          ? _value._assignedTo
          : assignedTo // ignore: cast_nullable_to_non_nullable
              as List<int>,
      dueDate: freezed == dueDate
          ? _value.dueDate
          : dueDate // ignore: cast_nullable_to_non_nullable
              as String?,
      priority: freezed == priority
          ? _value.priority
          : priority // ignore: cast_nullable_to_non_nullable
              as String?,
      projectId: freezed == projectId
          ? _value.projectId
          : projectId // ignore: cast_nullable_to_non_nullable
              as int?,
      parentTaskId: freezed == parentTaskId
          ? _value.parentTaskId
          : parentTaskId // ignore: cast_nullable_to_non_nullable
              as int?,
      ventureId: freezed == ventureId
          ? _value.ventureId
          : ventureId // ignore: cast_nullable_to_non_nullable
              as int?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$TaskRequestDtoImpl implements _TaskRequestDto {
  const _$TaskRequestDtoImpl(
      {required this.title,
      this.description,
      @JsonKey(name: 'assigned_to') required final List<int> assignedTo,
      @JsonKey(name: 'due_date') this.dueDate,
      this.priority,
      @JsonKey(name: 'project_id') this.projectId,
      @JsonKey(name: 'parent_task_id') this.parentTaskId,
      @JsonKey(name: 'venture_id') this.ventureId})
      : _assignedTo = assignedTo;

  factory _$TaskRequestDtoImpl.fromJson(Map<String, dynamic> json) =>
      _$$TaskRequestDtoImplFromJson(json);

  @override
  final String title;
  @override
  final String? description;
  final List<int> _assignedTo;
  @override
  @JsonKey(name: 'assigned_to')
  List<int> get assignedTo {
    if (_assignedTo is EqualUnmodifiableListView) return _assignedTo;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_assignedTo);
  }

  @override
  @JsonKey(name: 'due_date')
  final String? dueDate;
// ISO-8601 string
  @override
  final String? priority;
  @override
  @JsonKey(name: 'project_id')
  final int? projectId;
  @override
  @JsonKey(name: 'parent_task_id')
  final int? parentTaskId;
  @override
  @JsonKey(name: 'venture_id')
  final int? ventureId;

  @override
  String toString() {
    return 'TaskRequestDto(title: $title, description: $description, assignedTo: $assignedTo, dueDate: $dueDate, priority: $priority, projectId: $projectId, parentTaskId: $parentTaskId, ventureId: $ventureId)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TaskRequestDtoImpl &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.description, description) ||
                other.description == description) &&
            const DeepCollectionEquality()
                .equals(other._assignedTo, _assignedTo) &&
            (identical(other.dueDate, dueDate) || other.dueDate == dueDate) &&
            (identical(other.priority, priority) ||
                other.priority == priority) &&
            (identical(other.projectId, projectId) ||
                other.projectId == projectId) &&
            (identical(other.parentTaskId, parentTaskId) ||
                other.parentTaskId == parentTaskId) &&
            (identical(other.ventureId, ventureId) ||
                other.ventureId == ventureId));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      title,
      description,
      const DeepCollectionEquality().hash(_assignedTo),
      dueDate,
      priority,
      projectId,
      parentTaskId,
      ventureId);

  /// Create a copy of TaskRequestDto
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$TaskRequestDtoImplCopyWith<_$TaskRequestDtoImpl> get copyWith =>
      __$$TaskRequestDtoImplCopyWithImpl<_$TaskRequestDtoImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TaskRequestDtoImplToJson(
      this,
    );
  }
}

abstract class _TaskRequestDto implements TaskRequestDto {
  const factory _TaskRequestDto(
          {required final String title,
          final String? description,
          @JsonKey(name: 'assigned_to') required final List<int> assignedTo,
          @JsonKey(name: 'due_date') final String? dueDate,
          final String? priority,
          @JsonKey(name: 'project_id') final int? projectId,
          @JsonKey(name: 'parent_task_id') final int? parentTaskId,
          @JsonKey(name: 'venture_id') final int? ventureId}) =
      _$TaskRequestDtoImpl;

  factory _TaskRequestDto.fromJson(Map<String, dynamic> json) =
      _$TaskRequestDtoImpl.fromJson;

  @override
  String get title;
  @override
  String? get description;
  @override
  @JsonKey(name: 'assigned_to')
  List<int> get assignedTo;
  @override
  @JsonKey(name: 'due_date')
  String? get dueDate; // ISO-8601 string
  @override
  String? get priority;
  @override
  @JsonKey(name: 'project_id')
  int? get projectId;
  @override
  @JsonKey(name: 'parent_task_id')
  int? get parentTaskId;
  @override
  @JsonKey(name: 'venture_id')
  int? get ventureId;

  /// Create a copy of TaskRequestDto
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$TaskRequestDtoImplCopyWith<_$TaskRequestDtoImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

TaskStatusUpdateRequestDto _$TaskStatusUpdateRequestDtoFromJson(
    Map<String, dynamic> json) {
  return _TaskStatusUpdateRequestDto.fromJson(json);
}

/// @nodoc
mixin _$TaskStatusUpdateRequestDto {
  String get status => throw _privateConstructorUsedError;

  /// Serializes this TaskStatusUpdateRequestDto to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of TaskStatusUpdateRequestDto
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $TaskStatusUpdateRequestDtoCopyWith<TaskStatusUpdateRequestDto>
      get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TaskStatusUpdateRequestDtoCopyWith<$Res> {
  factory $TaskStatusUpdateRequestDtoCopyWith(TaskStatusUpdateRequestDto value,
          $Res Function(TaskStatusUpdateRequestDto) then) =
      _$TaskStatusUpdateRequestDtoCopyWithImpl<$Res,
          TaskStatusUpdateRequestDto>;
  @useResult
  $Res call({String status});
}

/// @nodoc
class _$TaskStatusUpdateRequestDtoCopyWithImpl<$Res,
        $Val extends TaskStatusUpdateRequestDto>
    implements $TaskStatusUpdateRequestDtoCopyWith<$Res> {
  _$TaskStatusUpdateRequestDtoCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of TaskStatusUpdateRequestDto
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? status = null,
  }) {
    return _then(_value.copyWith(
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$TaskStatusUpdateRequestDtoImplCopyWith<$Res>
    implements $TaskStatusUpdateRequestDtoCopyWith<$Res> {
  factory _$$TaskStatusUpdateRequestDtoImplCopyWith(
          _$TaskStatusUpdateRequestDtoImpl value,
          $Res Function(_$TaskStatusUpdateRequestDtoImpl) then) =
      __$$TaskStatusUpdateRequestDtoImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String status});
}

/// @nodoc
class __$$TaskStatusUpdateRequestDtoImplCopyWithImpl<$Res>
    extends _$TaskStatusUpdateRequestDtoCopyWithImpl<$Res,
        _$TaskStatusUpdateRequestDtoImpl>
    implements _$$TaskStatusUpdateRequestDtoImplCopyWith<$Res> {
  __$$TaskStatusUpdateRequestDtoImplCopyWithImpl(
      _$TaskStatusUpdateRequestDtoImpl _value,
      $Res Function(_$TaskStatusUpdateRequestDtoImpl) _then)
      : super(_value, _then);

  /// Create a copy of TaskStatusUpdateRequestDto
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? status = null,
  }) {
    return _then(_$TaskStatusUpdateRequestDtoImpl(
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$TaskStatusUpdateRequestDtoImpl implements _TaskStatusUpdateRequestDto {
  const _$TaskStatusUpdateRequestDtoImpl({required this.status});

  factory _$TaskStatusUpdateRequestDtoImpl.fromJson(
          Map<String, dynamic> json) =>
      _$$TaskStatusUpdateRequestDtoImplFromJson(json);

  @override
  final String status;

  @override
  String toString() {
    return 'TaskStatusUpdateRequestDto(status: $status)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TaskStatusUpdateRequestDtoImpl &&
            (identical(other.status, status) || other.status == status));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, status);

  /// Create a copy of TaskStatusUpdateRequestDto
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$TaskStatusUpdateRequestDtoImplCopyWith<_$TaskStatusUpdateRequestDtoImpl>
      get copyWith => __$$TaskStatusUpdateRequestDtoImplCopyWithImpl<
          _$TaskStatusUpdateRequestDtoImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TaskStatusUpdateRequestDtoImplToJson(
      this,
    );
  }
}

abstract class _TaskStatusUpdateRequestDto
    implements TaskStatusUpdateRequestDto {
  const factory _TaskStatusUpdateRequestDto({required final String status}) =
      _$TaskStatusUpdateRequestDtoImpl;

  factory _TaskStatusUpdateRequestDto.fromJson(Map<String, dynamic> json) =
      _$TaskStatusUpdateRequestDtoImpl.fromJson;

  @override
  String get status;

  /// Create a copy of TaskStatusUpdateRequestDto
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$TaskStatusUpdateRequestDtoImplCopyWith<_$TaskStatusUpdateRequestDtoImpl>
      get copyWith => throw _privateConstructorUsedError;
}
