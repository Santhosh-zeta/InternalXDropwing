// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'auth_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$LoginRequestImpl _$$LoginRequestImplFromJson(Map<String, dynamic> json) =>
    _$LoginRequestImpl(
      email: json['email'] as String,
      password: json['password'] as String,
    );

Map<String, dynamic> _$$LoginRequestImplToJson(_$LoginRequestImpl instance) =>
    <String, dynamic>{
      'email': instance.email,
      'password': instance.password,
    };

_$AuthSessionImpl _$$AuthSessionImplFromJson(Map<String, dynamic> json) =>
    _$AuthSessionImpl(
      token: json['token'] as String,
      user: User.fromJson(json['user'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$$AuthSessionImplToJson(_$AuthSessionImpl instance) =>
    <String, dynamic>{
      'token': instance.token,
      'user': instance.user,
    };

_$UserImpl _$$UserImplFromJson(Map<String, dynamic> json) => _$UserImpl(
      id: (json['id'] as num).toInt(),
      employeeId: json['employeeId'] as String,
      fullName: json['fullName'] as String,
      email: json['email'] as String,
      accessLevel: (json['accessLevel'] as num).toInt(),
      levelName: json['levelName'] as String,
      department: json['department'] as String?,
      designation: json['designation'] as String?,
      phone: json['phone'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      lastLogin: json['lastLogin'] as String?,
      createdAt: json['createdAt'] as String?,
      venture: json['venture'] == null
          ? null
          : Venture.fromJson(json['venture'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$$UserImplToJson(_$UserImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'employeeId': instance.employeeId,
      'fullName': instance.fullName,
      'email': instance.email,
      'accessLevel': instance.accessLevel,
      'levelName': instance.levelName,
      'department': instance.department,
      'designation': instance.designation,
      'phone': instance.phone,
      'avatarUrl': instance.avatarUrl,
      'lastLogin': instance.lastLogin,
      'createdAt': instance.createdAt,
      'venture': instance.venture,
    };

_$VentureImpl _$$VentureImplFromJson(Map<String, dynamic> json) =>
    _$VentureImpl(
      id: (json['id'] as num).toInt(),
      name: json['name'] as String,
      slug: json['slug'] as String,
      primaryColor: json['primaryColor'] as String?,
    );

Map<String, dynamic> _$$VentureImplToJson(_$VentureImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'slug': instance.slug,
      'primaryColor': instance.primaryColor,
    };
