import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/api/api_client.dart';
import '../models/auth_models.dart';

abstract class AuthRemoteDataSource {
  Future<AuthSession> login(LoginRequest request);
  Future<User> getMe();
  Future<void> logout();
  Future<void> forgotPassword(String email);
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final Dio dio;

  AuthRemoteDataSourceImpl(this.dio);

  @override
  Future<AuthSession> login(LoginRequest request) async {
    final response = await dio.post('/auth/login', data: request.toJson());
    if (response.data['success'] == true) {
      return AuthSession.fromJson(response.data['data']);
    } else {
      throw Exception(response.data['message'] ?? 'Login failed');
    }
  }

  @override
  Future<User> getMe() async {
    final response = await dio.get('/auth/me');
    if (response.data['success'] == true) {
      return User.fromJson(response.data['data']);
    } else {
      throw Exception(response.data['message'] ?? 'Failed to fetch user');
    }
  }

  @override
  Future<void> logout() async {
    await dio.post('/auth/logout');
  }

  @override
  Future<void> forgotPassword(String email) async {
    final response = await dio.post('/auth/forgot-password', data: {'email': email});
    if (response.data['success'] != true) {
      throw Exception(response.data['message'] ?? 'Failed to send reset link');
    }
  }
}

final authRemoteDataSourceProvider = Provider<AuthRemoteDataSource>((ref) {
  return AuthRemoteDataSourceImpl(ref.watch(dioProvider));
});
