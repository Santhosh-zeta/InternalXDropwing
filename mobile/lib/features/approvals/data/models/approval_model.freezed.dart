// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'approval_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

ApprovalRequest _$ApprovalRequestFromJson(Map<String, dynamic> json) {
  return _ApprovalRequest.fromJson(json);
}

/// @nodoc
mixin _$ApprovalRequest {
  int get id => throw _privateConstructorUsedError;

  /// Category shown on the badge and used by the filter chips,
  /// e.g. `Timesheets`.
  String get type => throw _privateConstructorUsedError;

  /// Short one-line summary of what is being approved.
  String get title => throw _privateConstructorUsedError;
  @JsonKey(name: 'user_name')
  String get requesterName => throw _privateConstructorUsedError;
  String get status => throw _privateConstructorUsedError;
  @JsonKey(name: 'created_at')
  DateTime get createdAt => throw _privateConstructorUsedError;

  /// Free-form extra detail rendered in the expanded card.
  Map<String, dynamic>? get metadata => throw _privateConstructorUsedError;

  /// Serializes this ApprovalRequest to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of ApprovalRequest
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ApprovalRequestCopyWith<ApprovalRequest> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ApprovalRequestCopyWith<$Res> {
  factory $ApprovalRequestCopyWith(
          ApprovalRequest value, $Res Function(ApprovalRequest) then) =
      _$ApprovalRequestCopyWithImpl<$Res, ApprovalRequest>;
  @useResult
  $Res call(
      {int id,
      String type,
      String title,
      @JsonKey(name: 'user_name') String requesterName,
      String status,
      @JsonKey(name: 'created_at') DateTime createdAt,
      Map<String, dynamic>? metadata});
}

/// @nodoc
class _$ApprovalRequestCopyWithImpl<$Res, $Val extends ApprovalRequest>
    implements $ApprovalRequestCopyWith<$Res> {
  _$ApprovalRequestCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ApprovalRequest
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? type = null,
    Object? title = null,
    Object? requesterName = null,
    Object? status = null,
    Object? createdAt = null,
    Object? metadata = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as int,
      type: null == type
          ? _value.type
          : type // ignore: cast_nullable_to_non_nullable
              as String,
      title: null == title
          ? _value.title
          : title // ignore: cast_nullable_to_non_nullable
              as String,
      requesterName: null == requesterName
          ? _value.requesterName
          : requesterName // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      createdAt: null == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      metadata: freezed == metadata
          ? _value.metadata
          : metadata // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$ApprovalRequestImplCopyWith<$Res>
    implements $ApprovalRequestCopyWith<$Res> {
  factory _$$ApprovalRequestImplCopyWith(_$ApprovalRequestImpl value,
          $Res Function(_$ApprovalRequestImpl) then) =
      __$$ApprovalRequestImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {int id,
      String type,
      String title,
      @JsonKey(name: 'user_name') String requesterName,
      String status,
      @JsonKey(name: 'created_at') DateTime createdAt,
      Map<String, dynamic>? metadata});
}

/// @nodoc
class __$$ApprovalRequestImplCopyWithImpl<$Res>
    extends _$ApprovalRequestCopyWithImpl<$Res, _$ApprovalRequestImpl>
    implements _$$ApprovalRequestImplCopyWith<$Res> {
  __$$ApprovalRequestImplCopyWithImpl(
      _$ApprovalRequestImpl _value, $Res Function(_$ApprovalRequestImpl) _then)
      : super(_value, _then);

  /// Create a copy of ApprovalRequest
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? type = null,
    Object? title = null,
    Object? requesterName = null,
    Object? status = null,
    Object? createdAt = null,
    Object? metadata = freezed,
  }) {
    return _then(_$ApprovalRequestImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as int,
      type: null == type
          ? _value.type
          : type // ignore: cast_nullable_to_non_nullable
              as String,
      title: null == title
          ? _value.title
          : title // ignore: cast_nullable_to_non_nullable
              as String,
      requesterName: null == requesterName
          ? _value.requesterName
          : requesterName // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      createdAt: null == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      metadata: freezed == metadata
          ? _value._metadata
          : metadata // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ApprovalRequestImpl implements _ApprovalRequest {
  const _$ApprovalRequestImpl(
      {required this.id,
      required this.type,
      required this.title,
      @JsonKey(name: 'user_name') required this.requesterName,
      required this.status,
      @JsonKey(name: 'created_at') required this.createdAt,
      final Map<String, dynamic>? metadata})
      : _metadata = metadata;

  factory _$ApprovalRequestImpl.fromJson(Map<String, dynamic> json) =>
      _$$ApprovalRequestImplFromJson(json);

  @override
  final int id;

  /// Category shown on the badge and used by the filter chips,
  /// e.g. `Timesheets`.
  @override
  final String type;

  /// Short one-line summary of what is being approved.
  @override
  final String title;
  @override
  @JsonKey(name: 'user_name')
  final String requesterName;
  @override
  final String status;
  @override
  @JsonKey(name: 'created_at')
  final DateTime createdAt;

  /// Free-form extra detail rendered in the expanded card.
  final Map<String, dynamic>? _metadata;

  /// Free-form extra detail rendered in the expanded card.
  @override
  Map<String, dynamic>? get metadata {
    final value = _metadata;
    if (value == null) return null;
    if (_metadata is EqualUnmodifiableMapView) return _metadata;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  @override
  String toString() {
    return 'ApprovalRequest(id: $id, type: $type, title: $title, requesterName: $requesterName, status: $status, createdAt: $createdAt, metadata: $metadata)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ApprovalRequestImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.type, type) || other.type == type) &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.requesterName, requesterName) ||
                other.requesterName == requesterName) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt) &&
            const DeepCollectionEquality().equals(other._metadata, _metadata));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, id, type, title, requesterName,
      status, createdAt, const DeepCollectionEquality().hash(_metadata));

  /// Create a copy of ApprovalRequest
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ApprovalRequestImplCopyWith<_$ApprovalRequestImpl> get copyWith =>
      __$$ApprovalRequestImplCopyWithImpl<_$ApprovalRequestImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ApprovalRequestImplToJson(
      this,
    );
  }
}

abstract class _ApprovalRequest implements ApprovalRequest {
  const factory _ApprovalRequest(
      {required final int id,
      required final String type,
      required final String title,
      @JsonKey(name: 'user_name') required final String requesterName,
      required final String status,
      @JsonKey(name: 'created_at') required final DateTime createdAt,
      final Map<String, dynamic>? metadata}) = _$ApprovalRequestImpl;

  factory _ApprovalRequest.fromJson(Map<String, dynamic> json) =
      _$ApprovalRequestImpl.fromJson;

  @override
  int get id;

  /// Category shown on the badge and used by the filter chips,
  /// e.g. `Timesheets`.
  @override
  String get type;

  /// Short one-line summary of what is being approved.
  @override
  String get title;
  @override
  @JsonKey(name: 'user_name')
  String get requesterName;
  @override
  String get status;
  @override
  @JsonKey(name: 'created_at')
  DateTime get createdAt;

  /// Free-form extra detail rendered in the expanded card.
  @override
  Map<String, dynamic>? get metadata;

  /// Create a copy of ApprovalRequest
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ApprovalRequestImplCopyWith<_$ApprovalRequestImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
