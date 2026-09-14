import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/auth_models.dart';
import '../../data/repositories/auth_repository_impl.dart';
import '../../domain/repositories/auth_repository.dart';
import 'auth_state.dart';
import '../../../../core/demo/demo_mode.dart';
import '../../../../core/demo/demo_data.dart' as demo;

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repository;

  AuthNotifier(this._repository) : super(const AuthState.initial());

  Future<void> checkAuthStatus() async {
    // TEMPORARY — see core/demo/demo_mode.dart. Skips real auth entirely and
    // opens straight to Home as a seeded Super Admin.
    if (kDemoMode) {
      state = AuthState.authenticated(User.fromJson(demo.demoUserJson()));
      return;
    }
    state = const AuthState.loading();
    try {
      final hasToken = await _repository.hasCachedToken();
      if (hasToken) {
        final user = await _repository.getMe();
        state = AuthState.authenticated(user);
      } else {
        state = const AuthState.unauthenticated();
      }
    } catch (e) {
      // If fetching 'me' fails (e.g., token expired), clear local cache and logout
      await _repository.logout();
      state = const AuthState.unauthenticated();
    }
  }

  Future<void> login(String email, String password) async {
    // TEMPORARY — see core/demo/demo_mode.dart. Any credentials succeed.
    if (kDemoMode) {
      state = AuthState.authenticated(User.fromJson(demo.demoUserJson()));
      return;
    }
    state = const AuthState.loading();
    try {
      final user = await _repository.login(LoginRequest(email: email, password: password));
      state = AuthState.authenticated(user);
    } catch (e) {
      state = AuthState.error(e.toString().replaceAll('Exception: ', ''));
    }
  }

  Future<void> logout() async {
    state = const AuthState.loading();
    await _repository.logout();
    state = const AuthState.unauthenticated();
  }

  Future<void> forgotPassword(String email) async {
    state = const AuthState.loading();
    try {
      await _repository.forgotPassword(email);
      // Wait a moment then revert to unauthenticated to allow UI to show success
      state = const AuthState.unauthenticated();
    } catch (e) {
      state = AuthState.error(e.toString().replaceAll('Exception: ', ''));
    }
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(authRepositoryProvider));
});
