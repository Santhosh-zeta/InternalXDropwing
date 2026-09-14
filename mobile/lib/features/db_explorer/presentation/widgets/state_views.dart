import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/network/network_info_provider.dart';
import '../../../../core/theme/nebula_spacing.dart';

// ─── Theme readers ───────────────────────────────────────────────────────────
// Every colour on this screen is read from the active [ThemeData] so the module
// renders correctly under both `AppTheme.lightTheme` and `AppTheme.darkTheme`.

/// Elevated card surface for the current brightness.
Color cardSurface(BuildContext context) =>
    Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface;

/// Hairline / divider colour for the current brightness.
Color hairline(BuildContext context) => Theme.of(context).dividerColor;

/// Muted, lower-contrast surface used for chips, table headers and inputs.
Color mutedSurface(BuildContext context) {
  final scheme = Theme.of(context).colorScheme;
  return Color.alphaBlend(
    scheme.onSurface.withValues(alpha: 0.05),
    cardSurface(context),
  );
}

/// Primary body text colour.
Color textPrimary(BuildContext context) => Theme.of(context).colorScheme.onSurface;

/// Secondary / supporting text colour.
Color textSecondary(BuildContext context) =>
    Theme.of(context).colorScheme.onSurfaceVariant;

/// Parses a `#RRGGBB` string coming from the API into a [Color].
///
/// Returns `null` when the value is missing or malformed so callers can fall
/// back to a theme colour instead of rendering an invented one.
Color? parseHexColor(String? hex) {
  if (hex == null) return null;
  final cleaned = hex.replaceAll('#', '').trim();
  if (cleaned.length != 6) return null;
  final value = int.tryParse(cleaned, radix: 16);
  if (value == null) return null;
  return Color(0xFF000000 | value);
}

/// Strips the `Exception: ` prefixes Dio/our data sources add so the user sees
/// the underlying failure rather than Dart plumbing.
String readableError(Object error) {
  var message = error.toString();
  while (message.startsWith('Exception: ')) {
    message = message.substring('Exception: '.length);
  }
  return message.trim().isEmpty ? 'An unexpected error occurred.' : message.trim();
}

// ─── Shimmer primitives ──────────────────────────────────────────────────────

/// A pulsing placeholder block, matching the skeleton style already used by the
/// team and timesheet screens.
class ShimmerBox extends StatefulWidget {
  final double height;
  final double? width;
  final double radius;

  const ShimmerBox({
    super.key,
    required this.height,
    this.width,
    this.radius = NebulaSpacing.radiusSm,
  });

  @override
  State<ShimmerBox> createState() => _ShimmerBoxState();
}

class _ShimmerBoxState extends State<ShimmerBox>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  )..repeat(reverse: true);

  late final Animation<double> _pulse =
      Tween<double>(begin: 0.35, end: 0.75).animate(_controller);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final base = Theme.of(context).colorScheme.onSurface;
    return AnimatedBuilder(
      animation: _pulse,
      builder: (context, _) => Container(
        height: widget.height,
        width: widget.width,
        decoration: BoxDecoration(
          color: base.withValues(alpha: 0.08 * _pulse.value + 0.04),
          borderRadius: BorderRadius.circular(widget.radius),
        ),
      ),
    );
  }
}

/// Skeleton placeholder for a vertical list of cards.
class ListSkeleton extends StatelessWidget {
  final int itemCount;
  final double itemHeight;
  final EdgeInsetsGeometry padding;

  const ListSkeleton({
    super.key,
    this.itemCount = 6,
    this.itemHeight = 84,
    this.padding = const EdgeInsets.all(NebulaSpacing.md),
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Loading',
      liveRegion: true,
      child: ListView.separated(
        padding: padding,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: itemCount,
        separatorBuilder: (_, __) => const SizedBox(height: NebulaSpacing.sm + 2),
        itemBuilder: (_, __) => ShimmerBox(
          height: itemHeight,
          radius: NebulaSpacing.radiusMd,
        ),
      ),
    );
  }
}

// ─── Empty / error / restricted ──────────────────────────────────────────────

/// Centred message used when a request succeeded but returned nothing.
class EmptyStateView extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;
  final Widget? action;

  const EmptyStateView({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    this.action,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(NebulaSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon,
                size: 56,
                color: textSecondary(context).withValues(alpha: 0.45),
                semanticLabel: ''),
            const SizedBox(height: NebulaSpacing.md),
            Text(
              title,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: NebulaSpacing.sm),
            Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: textSecondary(context)),
            ),
            if (action != null) ...[
              const SizedBox(height: NebulaSpacing.lg),
              action!,
            ],
          ],
        ),
      ),
    );
  }
}

/// Centred failure message that surfaces the real error and offers a retry.
class ErrorStateView extends StatelessWidget {
  final String title;
  final Object error;
  final VoidCallback onRetry;

  const ErrorStateView({
    super.key,
    required this.title,
    required this.error,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(NebulaSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(LucideIcons.circleAlert, size: 48, color: scheme.error),
            const SizedBox(height: NebulaSpacing.md),
            Text(title,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: NebulaSpacing.sm),
            Semantics(
              label: 'Error details',
              child: Text(
                readableError(error),
                textAlign: TextAlign.center,
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: textSecondary(context)),
              ),
            ),
            const SizedBox(height: NebulaSpacing.lg),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(LucideIcons.refreshCw, size: 16),
              label: const Text('Try again'),
            ),
          ],
        ),
      ),
    );
  }
}

/// Rendered instead of the module body when the signed-in user's access level
/// is not high enough. Lower level number means more access.
class RestrictedStateView extends StatelessWidget {
  final String moduleName;
  final String requirement;

  const RestrictedStateView({
    super.key,
    required this.moduleName,
    required this.requirement,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Container(
        margin: const EdgeInsets.all(NebulaSpacing.lg),
        padding: const EdgeInsets.all(NebulaSpacing.xl),
        decoration: BoxDecoration(
          color: cardSurface(context),
          borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
          border: Border.all(color: scheme.error.withValues(alpha: 0.35)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(LucideIcons.lock,
                size: 48, color: scheme.error.withValues(alpha: 0.8)),
            const SizedBox(height: NebulaSpacing.md),
            Text('Restricted', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: NebulaSpacing.sm),
            Text(
              '$moduleName requires $requirement. Ask a Super Admin if you '
              'believe you should have access.',
              textAlign: TextAlign.center,
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: textSecondary(context)),
            ),
          ],
        ),
      ),
    );
  }
}

/// Slim banner shown above module content while the device reports no
/// connectivity, so a stale list or a failed write has an obvious explanation.
class OfflineBanner extends ConsumerWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final online = ref.watch(networkInfoProvider).maybeWhen(
          data: (value) => value,
          orElse: () => true,
        );
    if (online) return const SizedBox.shrink();

    final scheme = Theme.of(context).colorScheme;
    return Semantics(
      liveRegion: true,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(
          horizontal: NebulaSpacing.md,
          vertical: NebulaSpacing.sm,
        ),
        color: scheme.error.withValues(alpha: 0.14),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(LucideIcons.wifiOff, size: 14, color: scheme.error),
            const SizedBox(width: NebulaSpacing.sm),
            Flexible(
              child: Text(
                'You are offline — showing the last loaded data.',
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: scheme.error),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Wraps a non-scrolling state (empty / error) so pull-to-refresh still works.
class RefreshableMessage extends StatelessWidget {
  final Widget child;

  const RefreshableMessage({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) => ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          ConstrainedBox(
            constraints: BoxConstraints(minHeight: constraints.maxHeight),
            child: child,
          ),
        ],
      ),
    );
  }
}
