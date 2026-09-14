import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/nebula_spacing.dart';
import '../../../../core/theme/nebula_typography.dart';
import '../../../../core/theme/theme_context.dart';
import '../../../../core/widgets/motion.dart';
import '../providers/auth_provider.dart';

/// The first frame, and nothing more.
///
/// This screen used to spend a `ShaderMask` sweeping a gradient across a
/// glowing orb while the session check ran behind it. The animation was the
/// only reason the app ever sat here longer than it had to. What is left is a
/// wordmark that fades in once and a session check fired on the first frame —
/// routing is driven entirely by `authProvider`, so the moment the check
/// resolves the router moves on, whether or not the fade has finished.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    // Unchanged: the router redirects off this screen as soon as the auth
    // state settles. Nothing here delays that.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(authProvider.notifier).checkAuthStatus();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(NebulaSpacing.lg),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                StaggerIn(
                  child: Text(
                    'InternalX',
                    textAlign: TextAlign.center,
                    style: context.text.displayMedium,
                  ),
                ),
                const SizedBox(height: NebulaSpacing.sm),
                StaggerIn(
                  index: 1,
                  child: Text(
                    'DROPWING GROUPS',
                    textAlign: TextAlign.center,
                    style: NebulaTypography.monoLabel(
                      color: context.dl.textTertiary,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
