import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/providers/auth_provider.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/forgot_password_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final isLoggingIn = state.uri.path == '/login';
      final isSplash = state.uri.path == '/';
      final isForgotPassword = state.uri.path == '/forgot-password';

      return authState.maybeWhen(
        initial: () => isSplash ? null : '/',
        loading: () => null, // don't redirect while loading
        authenticated: (_) => (isLoggingIn || isSplash || isForgotPassword) ? '/dashboard' : null,
        unauthenticated: () => (!isLoggingIn && !isForgotPassword) ? '/login' : null,
        error: (_) => (!isLoggingIn && !isForgotPassword) ? '/login' : null,
        orElse: () => null,
      );
    },
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/forgot-password',
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/dashboard',
        builder: (context, state) => Scaffold(
          appBar: AppBar(
            title: const Text('Dashboard'),
            actions: [
              IconButton(
                icon: const Icon(Icons.logout),
                onPressed: () {
                  ref.read(authProvider.notifier).logout();
                },
              )
            ],
          ),
          body: const Center(child: Text('Protected Dashboard Scaffold')),
        ),
      ),
      // Add other routes here: projects, tasks, notifications, profile
    ],
  );
});
