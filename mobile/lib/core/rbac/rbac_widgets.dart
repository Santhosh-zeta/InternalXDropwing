import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/data/models/auth_models.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';
import '../widgets/state_views.dart';
import 'permissions.dart';

/// The signed-in user, or null. Every screen that gates on role reads this
/// instead of repeating a `maybeWhen` over the auth state.
final currentUserProvider = Provider<User?>((ref) {
  return ref.watch(authProvider).maybeWhen(
        authenticated: (user) => user,
        orElse: () => null,
      );
});

/// Convenience: the current access level, or null when signed out.
final accessLevelProvider = Provider<int?>((ref) {
  return ref.watch(currentUserProvider)?.accessLevel;
});

/// True when the signed-in user holds [permission].
///
/// ```dart
/// if (ref.watch(canProvider(Permission.deleteTask))) ... // show Delete
/// ```
final canProvider = Provider.family<bool, Permission>((ref, permission) {
  return Rbac.can(ref.watch(currentUserProvider), permission);
});

/// Renders [child] only when the user holds [permission].
///
/// Defaults to rendering nothing — an action the user cannot perform should
/// not be shown disabled, because a greyed-out button invites a support
/// ticket. Pass [fallback] where absence would be confusing.
class PermissionGate extends ConsumerWidget {
  const PermissionGate({
    super.key,
    required this.permission,
    required this.child,
    this.fallback,
  });

  final Permission permission;
  final Widget child;
  final Widget? fallback;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final allowed = ref.watch(canProvider(permission));
    return allowed ? child : (fallback ?? const SizedBox.shrink());
  }
}

/// Wraps a whole screen body. Shows the restricted state, with the requirement
/// spelled out, when the user is not permitted.
class PermissionScope extends ConsumerWidget {
  const PermissionScope({
    super.key,
    required this.permission,
    required this.child,
    this.what = 'this area',
  });

  final Permission permission;
  final Widget child;

  /// Named in the restricted copy: "Access to the audit log is limited to…".
  final String what;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (ref.watch(canProvider(permission))) return child;
    return RestrictedStateView(
      requirement: Rbac.requirementLabel(permission),
      what: what,
    );
  }
}
