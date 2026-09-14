import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../network/network_info_provider.dart';

import '../theme/nebula_colors.dart';
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
  const ListSkeleton({
    super.key,
    this.count = 5,
    this.itemCount,
    this.itemHeight,
    this.padding = EdgeInsets.zero,
  });

  final int count;

  /// Older spelling kept so existing call sites keep working; wins over
  /// [count] when supplied.
  final int? itemCount;
  final double? itemHeight;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final n = itemCount ?? count;
    return Padding(
      padding: padding,
      child: Column(
      children: [
        for (var i = 0; i < n; i++)
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
      ),
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
  const ErrorStateView({
    super.key,
    this.message,
    this.error,
    this.title = 'Could not load this',
    this.onRetry,
  }) : assert(message != null || error != null,
            'ErrorStateView needs either a message or an error');

  /// Ready-made copy.
  final String? message;

  /// A thrown object, rendered through [readableError].
  final Object? error;

  final String title;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) => _StateFrame(
        icon: LucideIcons.triangleAlert,
        title: title,
        message: message ?? readableError(error!),
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
    this.what,
    this.moduleName,
  });

  /// e.g. "Manager and above".
  final String requirement;

  final String? what;

  /// Older spelling kept so existing call sites keep working.
  final String? moduleName;

  @override
  Widget build(BuildContext context) => _StateFrame(
        icon: LucideIcons.lock,
        title: 'Restricted',
        message: 'Access to ${what ?? moduleName ?? 'this area'} '
            'is limited to $requirement. '
            'Ask an administrator if you need it.',
        tint: context.dl.warning,
      );
}

/// Persistent strip shown while the device has no connection.
class OfflineBanner extends ConsumerWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Assume online until told otherwise: a banner shown because a provider
    // has not resolved yet is worse than no banner.
    final online = ref.watch(networkInfoProvider).maybeWhen(
          data: (value) => value,
          orElse: () => true,
        );
    if (online) return const SizedBox.shrink();

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

// ── Terse theme readers ──────────────────────────────────────────────────
//
// These came from the duplicated per-feature copies of this file, where they
// were the reason those modules were the only ones in the app that rendered
// correctly in both themes. Kept because they read better at the call site
// than the full expression, and because making the correct thing the short
// thing is how the hardcoded-colour problem stays fixed.

/// Panel fill.
Color cardSurface(BuildContext context) =>
    context.scheme.surfaceContainerHighest;

/// 1px divider / border.
Color hairline(BuildContext context) => context.dl.border;

/// One step above a card — chips, inputs, table headers.
Color mutedSurface(BuildContext context) => context.dl.surfaceRaised;

/// Body text.
Color textPrimary(BuildContext context) => context.scheme.onSurface;

/// Secondary text.
Color textSecondary(BuildContext context) => context.scheme.onSurfaceVariant;

/// Parses an API `#RRGGBB` string. Delegates to [NebulaColors.parseHex] so
/// there is one hex parser in the app rather than seven.
Color parseHexColor(String? hex, {Color fallback = NebulaColors.primary}) =>
    NebulaColors.parseHex(hex, fallback: fallback);


/// Wraps a state view so pull-to-refresh still works on a screen that is
/// currently showing a message rather than a list.
class RefreshableMessage extends StatelessWidget {
  const RefreshableMessage({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: constraints.maxHeight),
          child: child,
        ),
      ),
    );
  }
}
