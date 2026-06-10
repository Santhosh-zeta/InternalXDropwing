import '../../data/models/auth_models.dart';

abstract class AuthRepository {
  Future<User> login(LoginRequest request);
  Future<User> getMe();
  Future<void> logout();
  Future<void> forgotPassword(String email);
  Future<bool> hasCachedToken();
}
