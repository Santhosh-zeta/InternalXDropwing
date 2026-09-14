import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../theme/nebula_spacing.dart';
import '../theme/theme_context.dart';

/// Loading, empty, error and restricted states — one implementation.
///
/// This file used to exist as six byte-identical copies, one per admin module
/// (~2,166 duplicated lines). It is now the single source; the per-feature
/// copies are gone.

/// A shimmering placeholder block.
class ShimmerBox extends StatefulWidget {
  const ShimmerBox({
    super.key,
    this.width,
    this.height = 14,
    this.radius = 6,
  });

  final double? width;
  final double height;
  final double radius;

  @override
  State<ShimmerBox> createState() => _ShimmerBoxState();
}

class _ShimmerBoxState extends State<ShimmerBox>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1200),
  );

  @override
  void initState() {
    super.initState();
    _c.repeat(reverse: true);
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    // Reduced motion still gets a placeholder, just a still one.
    if (MediaQuery.maybeDisableAnimationsOf(context) ?? false) {
      return _box(dl.surfaceRaised);
    }
    return AnimatedBuilder(
      animation: _c,
      builder: (context, _) => _box(
        Color.lerp(dl.surfaceRaised, dl.border, _c.value)!,
      ),
    );
  }

  Widget _box(Color color) => Container(
        width: widget.width,
        height: widget.height,
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(widget.radius),
        ),
      );
}

/// Skeleton rows shaped like [EntityRow], so the layout does not jump when
/// real data replaces it.
class ListSkeleton extends StatelessWidget {
  const ListSkeleton({super.key, this.count = 5});

  final int count;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var i = 0; i < count; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: NebulaSpacing.sm),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 13),
              decoration: BoxDecoration(
                color: context.scheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
                border: Border.all(color: context.dl.border),
              ),
              child: Row(
                children: [
                  const ShimmerBox(width: 3, height: 34, radius: 2),
                  const SizedBox(width: 11),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ShimmerBox(width: 150 + (i % 3) * 40, height: 13),
                        const SizedBox(height: 7),
                        const ShimmerBox(width: 96, height: 9),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

/// Shared frame for the three "nothing to show" states.
class _StateFrame extends StatelessWidget {
  const _StateFrame({
    required this.icon,
    required this.title,
    required this.message,
    this.tint,
    this.action,
  });

  final IconData icon;
  final String title;
  final String message;
  final Color? tint;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final color = tint ?? context.dl.textTertiary;
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: NebulaSpacing.lg,
          vertical: NebulaSpacing.xl,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
                border: Border.all(color: color.withValues(alpha: 0.22)),
              ),
              child: Icon(icon, size: 21, color: color),
            ),
            const SizedBox(height: NebulaSpacing.md),
            Text(
              title,
              textAlign: TextAlign.center,
              style: context.text.titleMedium,
            ),
            const SizedBox(height: 6),
            Text(
              message,
              textAlign: TextAlign.center,
              style: context.text.bodySmall,
            ),
            if (action != null) ...[
              const SizedBox(height: NebulaSpacing.md),
              action!,
            ],
          ],
        ),
      ),
    );
  }
}

class EmptyStateView extends StatelessWidget {
  const EmptyStateView({
    super.key,
    required this.title,
    required this.message,
    this.icon = LucideIcons.inbox,
    this.action,
  });

  final String title;
  final String message;
  final IconData icon;
  final Widget? action;

  @override
  Widget build(BuildContext context) => _StateFrame(
        icon: icon,
        title: title,
        message: message,
        action: action,
      );
}

class ErrorStateView extends StatelessWidget {
  const ErrorStateView({super.key, required this.message, this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) => _StateFrame(
        icon: LucideIcons.triangleAlert,
        title: 'Could not load this',
        message: message,
        tint: context.dl.critical,
        action: onRetry == null
            ? null
            : OutlinedButton.icon(
                onPressed: onRetry,
                icon: const Icon(LucideIcons.rotateCw, size: 15),
                label: const Text('Try again'),
              ),
      );
}

/// Shown when the signed-in user's access level is below what a module needs.
///
/// Explains the requirement rather than showing a bare 403 — the user cannot
/// fix it themselves, so the copy tells them what to ask for.
class RestrictedStateView extends StatelessWidget {
  const RestrictedStateView({
    super.key,
    required this.requirement,
    this.what = 'this area',
  });

  /// e.g. "Manager and above".
  final String requirement;
  final String what;

  @override
  Widget build(BuildContext context) => _StateFrame(
        icon: LucideIcons.lock,
        title: 'Restricted',
        message: 'Access to $what is limited to $requirement. '
            'Ask an administrator if you need it.',
        tint: context.dl.warning,
      );
}

/// Persistent strip shown while the device has no connection.
class OfflineBanner extends StatelessWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
      color: dl.warning.withValues(alpha: 0.12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(LucideIcons.cloudOff, size: 14, color: dl.warning),
          const SizedBox(width: 8),
          Text(
            'Offline — showing the last data loaded',
            style: context.text.bodySmall?.copyWith(color: dl.warning),
          ),
        ],
      ),
    );
  }
}

/// Utility: turn a thrown object into something worth showing a person.
String readableError(Object error) {
  final raw = error.toString().replaceFirst('Exception: ', '').trim();
  if (raw.isEmpty) return 'Something went wrong.';
  if (raw.contains('SocketException') || raw.contains('Connection refused')) {
    return 'Cannot reach the server. Check your connection.';
  }
  if (raw.contains('timed out') || raw.contains('TimeoutException')) {
    return 'The server took too long to respond.';
  }
  return raw;
}
