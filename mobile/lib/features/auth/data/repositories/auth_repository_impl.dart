import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../../core/cache/secure_storage_provider.dart';
import '../../domain/repositories/auth_repository.dart';
import '../data_sources/auth_remote_data_source.dart';
import '../models/auth_models.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource remoteDataSource;
  final FlutterSecureStorage secureStorage;

  AuthRepositoryImpl(this.remoteDataSource, this.secureStorage);

  static const String _tokenKey = 'jwt_token';

  @override
  Future<User> login(LoginRequest request) async {
    final session = await remoteDataSource.login(request);
    await secureStorage.write(key: _tokenKey, value: session.token);
    return session.user;
  }

  @override
  Future<User> getMe() async {
    return await remoteDataSource.getMe();
  }

  @override
  Future<void> logout() async {
    try {
      await remoteDataSource.logout();
    } catch (e) {
      // Ignore network errors on logout, we still want to clear local cache
    } finally {
      await secureStorage.delete(key: _tokenKey);
    }
  }

  @override
  Future<void> forgotPassword(String email) async {
    await remoteDataSource.forgotPassword(email);
  }

  @override
  Future<bool> hasCachedToken() async {
    final token = await secureStorage.read(key: _tokenKey);
    return token != null;
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepositoryImpl(
    ref.watch(authRemoteDataSourceProvider),
    ref.watch(secureStorageProvider),
  );
});
