import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/theme/nebula_spacing.dart';
import '../../../../core/theme/nebula_typography.dart';
import '../../../../core/theme/theme_context.dart';
import '../../../../core/widgets/motion.dart';
import '../../../../core/widgets/state_views.dart';
import '../providers/auth_provider.dart';
import '../providers/auth_state.dart';

/// Sign in — the first thing anyone sees, so it sets the standard.
///
/// The previous version put the form on a hard-coded navy-to-purple gradient
/// inside a translucent "glass" panel, and restyled every field by hand: its
/// own fill, its own three borders, its own label and error styles, none of
/// which existed in light mode. All of that is gone. The fields here carry no
/// decoration of their own — they take `inputDecorationTheme` from the theme,
/// which is what makes them correct under both brightnesses.
///
/// A failed sign-in used to fire a red `SnackBar` carrying the raw exception
/// string, which scrolled away before it could be read. It is now an inline
/// note that stays put, sits directly above the button that produced it, and
/// says what to do next.
///
/// Nothing about the credential flow changed: the same controllers, the same
/// validators, the same `authProvider.login(email, password)` call, and the
/// same router-driven navigation on success.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _emailController;
  late TextEditingController _passwordController;

  /// The last failure, held so it can be shown inline instead of in a
  /// SnackBar. Cleared as soon as another attempt starts.
  String? _error;

  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    _emailController = TextEditingController(
      text: kDebugMode ? 'admin@internalx.com' : '',
    );
    _passwordController = TextEditingController(
      text: kDebugMode ? 'password123' : '',
    );
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _submit() {
    if (_formKey.currentState!.validate()) {
      setState(() => _error = null);
      ref.read(authProvider.notifier).login(
            _emailController.text.trim(),
            _passwordController.text,
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    ref.listen<AuthState>(authProvider, (previous, next) {
      next.maybeWhen(
        error: (message) => setState(() => _error = message),
        loading: () => setState(() => _error = null),
        orElse: () {},
      );
    });

    final isLoading = authState.maybeWhen(
      loading: () => true,
      orElse: () => false,
    );

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(
              horizontal: NebulaSpacing.lg,
              vertical: NebulaSpacing.xl,
            ),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const _Wordmark(),
                    const SizedBox(height: NebulaSpacing.xl),

                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                      autofillHints: const [AutofillHints.username],
                      decoration: const InputDecoration(
                        labelText: 'Work email',
                        prefixIcon: Icon(LucideIcons.mail, size: 18),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Email is required';
                        }
                        if (!value.contains('@')) {
                          return 'Enter a valid email';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: NebulaSpacing.md),

                    TextFormField(
                      controller: _passwordController,
                      obscureText: _obscurePassword,
                      textInputAction: TextInputAction.done,
                      autofillHints: const [AutofillHints.password],
                      onFieldSubmitted: (_) {
                        if (!isLoading) _submit();
                      },
                      decoration: InputDecoration(
                        labelText: 'Password',
                        prefixIcon: const Icon(LucideIcons.lock, size: 18),
                        suffixIcon: IconButton(
                          tooltip: _obscurePassword ? 'Show password' : 'Hide password',
                          icon: Icon(
                            _obscurePassword ? LucideIcons.eye : LucideIcons.eyeOff,
                            size: 18,
                          ),
                          onPressed: () => setState(
                            () => _obscurePassword = !_obscurePassword,
                          ),
                        ),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Password is required';
                        }
                        return null;
                      },
                    ),

                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: () => context.push('/forgot-password'),
                        child: const Text('Forgot password?'),
                      ),
                    ),

                    if (_error != null) ...[
                      const SizedBox(height: NebulaSpacing.xs),
                      _SignInProblem(message: _error!),
                      const SizedBox(height: NebulaSpacing.md),
                    ] else
                      const SizedBox(height: NebulaSpacing.sm),

                    FilledButton(
                      onPressed: isLoading ? null : _submit,
                      child: isLoading
                          ? SizedBox(
                              height: 18,
                              width: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: context.scheme.onSurfaceVariant,
                              ),
                            )
                          : const Text('Sign in'),
                    ),

                    const SizedBox(height: NebulaSpacing.lg),
                    Text(
                      'Dropwing Groups · internal use only',
                      textAlign: TextAlign.center,
                      style: NebulaTypography.monoLabel(
                        color: context.dl.textTertiary,
                        fontSize: 9,
                      ),
                    ),

                    if (kDebugMode) ...[
                      const SizedBox(height: NebulaSpacing.xl),
                      _QuickAccess(
                        onPick: (email) {
                          _emailController.text = email;
                          _passwordController.text = 'Test@1234';
                          _submit();
                        },
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Eyebrow plus heading. The heading is the largest thing on the screen; the
/// wordmark sits above it in mono, small, and does not compete.
class _Wordmark extends StatelessWidget {
  const _Wordmark();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'INTERNALX · DROPWING GROUPS',
          style: NebulaTypography.monoLabel(color: context.dl.textTertiary),
        ),
        const SizedBox(height: NebulaSpacing.md),
        Text('Sign in', style: context.text.displayMedium),
        const SizedBox(height: 6),
        Text(
          'Use the work account your administrator issued you.',
          style: context.text.bodyMedium,
        ),
      ],
    );
  }
}

/// An inline failure note.
///
/// Says what to do about it first and what the server said second, because
/// "Unauthorized" on its own has never told anybody anything.
class _SignInProblem extends StatelessWidget {
  const _SignInProblem({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final detail = readableError(message);
    final guidance = _guidance(detail);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: dl.critical.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(NebulaSpacing.radiusSm),
        border: Border.all(color: dl.critical.withValues(alpha: 0.28)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(LucideIcons.triangleAlert, size: 15, color: dl.critical),
          const SizedBox(width: 9),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  guidance,
                  style: context.text.bodySmall?.copyWith(color: dl.critical),
                ),
                if (detail.isNotEmpty && detail != guidance) ...[
                  const SizedBox(height: 3),
                  Text(
                    detail,
                    style: context.text.bodySmall?.copyWith(
                      color: dl.textTertiary,
                      fontSize: 11,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Maps what came back to something a person can act on.
  static String _guidance(String detail) {
    final d = detail.toLowerCase();
    if (d.contains('cannot reach') ||
        d.contains('socket') ||
        d.contains('network') ||
        d.contains('connection')) {
      return 'Cannot reach the server. Check your connection and try again.';
    }
    if (d.contains('took too long') || d.contains('timed out')) {
      return 'The server took too long to answer. Try again in a moment.';
    }
    if (d.contains('locked') ||
        d.contains('disabled') ||
        d.contains('inactive') ||
        d.contains('suspend')) {
      return 'This account cannot sign in. Ask an administrator to restore it.';
    }
    if (d.contains('invalid') ||
        d.contains('credential') ||
        d.contains('password') ||
        d.contains('unauthor') ||
        d.contains('not found') ||
        d.contains('401')) {
      return 'That email and password do not match an account. '
          'Check both and try again.';
    }
    return 'Sign-in did not go through. Try again, or ask an administrator '
        'if it keeps failing.';
  }
}

/// Debug-only seeded accounts. Compiled out of release builds entirely — it
/// sits behind `kDebugMode` at the call site.
class _QuickAccess extends StatelessWidget {
  const _QuickAccess({required this.onPick});

  final ValueChanged<String> onPick;

  static const _accounts = <(String, String)>[
    ('Super Admin', 'sa@dropwinggroups.com'),
    ('MD', 'md@dropwinggroups.com'),
    ('Dropwing Admin', 'ad@dropwing.in'),
    ('Fenixa Admin', 'ad@fenixa.com'),
    ('PerSyniX Admin', 'ad@persynix.com'),
    ('Grovia Admin', 'ad@grovia.in'),
    ('Dropwing Staff', 'st@dropwing.in'),
    ('Fenixa Staff', 'st@fenixa.com'),
  ];

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'QUICK ACCESS · DEBUG BUILD',
          style: NebulaTypography.monoLabel(color: dl.textTertiary, fontSize: 9),
        ),
        const SizedBox(height: NebulaSpacing.sm),
        SizedBox(
          height: 30,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: _accounts.length,
            separatorBuilder: (_, __) => const SizedBox(width: 6),
            itemBuilder: (context, i) {
              final (label, email) = _accounts[i];
              return PressScale(
                onTap: () => onPick(email),
                child: Container(
                  alignment: Alignment.center,
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  decoration: BoxDecoration(
                    color: context.scheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(NebulaSpacing.radiusSm),
                    border: Border.all(color: dl.border),
                  ),
                  child: Text(
                    label,
                    style: context.text.bodySmall?.copyWith(fontSize: 11.5),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
