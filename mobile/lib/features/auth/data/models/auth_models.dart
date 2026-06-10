import 'package:freezed_annotation/freezed_annotation.dart';

part 'auth_models.freezed.dart';
part 'auth_models.g.dart';

@freezed
class LoginRequest with _$LoginRequest {
  const factory LoginRequest({
    required String email,
    required String password,
  }) = _LoginRequest;

  factory LoginRequest.fromJson(Map<String, dynamic> json) => _$LoginRequestFromJson(json);
}

@freezed
class AuthSession with _$AuthSession {
  const factory AuthSession({
    required String token,
    required User user,
  }) = _AuthSession;

  factory AuthSession.fromJson(Map<String, dynamic> json) => _$AuthSessionFromJson(json);
}

@freezed
class User with _$User {
  const factory User({
    required int id,
    @JsonKey(name: 'employeeId') required String employeeId,
    @JsonKey(name: 'fullName') required String fullName,
    required String email,
    @JsonKey(name: 'accessLevel') required int accessLevel,
    @JsonKey(name: 'levelName') required String levelName,
    String? department,
    String? designation,
    String? phone,
    @JsonKey(name: 'avatarUrl') String? avatarUrl,
    String? lastLogin,
    String? createdAt,
    Venture? venture,
  }) = _User;

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
}

@freezed
class Venture with _$Venture {
  const factory Venture({
    required int id,
    required String name,
    required String slug,
    @JsonKey(name: 'primaryColor') String? primaryColor,
  }) = _Venture;

  factory Venture.fromJson(Map<String, dynamic> json) => _$VentureFromJson(json);
}
