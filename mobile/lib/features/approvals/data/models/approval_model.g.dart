// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'approval_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$ApprovalRequestImpl _$$ApprovalRequestImplFromJson(
        Map<String, dynamic> json) =>
    _$ApprovalRequestImpl(
      id: (json['id'] as num).toInt(),
      type: json['type'] as String,
      title: json['title'] as String,
      requesterName: json['user_name'] as String,
      status: json['status'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      metadata: json['metadata'] as Map<String, dynamic>?,
    );

Map<String, dynamic> _$$ApprovalRequestImplToJson(
        _$ApprovalRequestImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'type': instance.type,
      'title': instance.title,
      'user_name': instance.requesterName,
      'status': instance.status,
      'created_at': instance.createdAt.toIso8601String(),
      'metadata': instance.metadata,
    };
