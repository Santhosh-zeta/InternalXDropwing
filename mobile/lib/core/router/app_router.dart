import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/providers/auth_provider.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/forgot_password_screen.dart';
import '../../features/dashboard/presentation/screens/dashboard_screen.dart';
import '../../features/tasks/presentation/screens/task_list_screen.dart';
import '../../features/tasks/presentation/screens/task_detail_screen.dart';
import '../../features/tasks/presentation/screens/task_form_screen.dart';
import '../layout/main_layout_screen.dart';
import '../../features/projects/presentation/screens/projects_screen.dart';
import '../../features/workspace/presentation/screens/workspace_screen.dart';
import '../../features/profile/presentation/screens/profile_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/dashboard',
    redirect: (context, state) {
      final isLoggingIn = state.matchedLocation == '/login' || 
                          state.matchedLocation == '/forgot-password' ||
                          state.matchedLocation == '/';
      
      return authState.maybeWhen(
        initial: () => '/',
        loading: () => null, // Don't redirect while loading
        authenticated: (_) {
          if (isLoggingIn) return '/dashboard';
          return null;
        },
        unauthenticated: () {
          if (!isLoggingIn) return '/login';
          return null;
        },
        error: (_) {
          if (!isLoggingIn) return '/login';
          return null;
        },
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
      
      // Bottom Navigation Shell
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return MainLayoutScreen(navigationShell: navigationShell);
        },
        branches: [
          // Tab 0: Home (Dashboard)
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/dashboard',
                builder: (context, state) => const DashboardScreen(),
              ),
            ],
          ),
          
          // Tab 1: Tasks
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/tasks',
                builder: (context, state) => const TaskListScreen(),
                routes: [
                  GoRoute(
                    path: 'create',
                    builder: (context, state) => const TaskFormScreen(),
                  ),
                  GoRoute(
                    path: 'edit/:id',
                    builder: (context, state) {
                      final id = int.tryParse(state.pathParameters['id'] ?? '');
                      return TaskFormScreen(taskId: id);
                    },
                  ),
                  GoRoute(
                    path: ':id',
                    builder: (context, state) {
                      final id = int.tryParse(state.pathParameters['id'] ?? '0') ?? 0;
                      return TaskDetailScreen(taskId: id);
                    },
                  ),
                ],
              ),
            ],
          ),
          
          // Tab 2: Projects
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/projects',
                builder: (context, state) => const ProjectsScreen(),
              ),
            ],
          ),
          
          // Tab 3: Workspace
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/workspace',
                builder: (context, state) => const WorkspaceScreen(),
              ),
            ],
          ),
          
          // Tab 4: Profile
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                builder: (context, state) => const ProfileScreen(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});
