import 'package:flutter/material.dart';

import '../theme/nebula_colors.dart';
import '../theme/nebula_spacing.dart';
import '../theme/nebula_typography.dart';
import '../theme/theme_context.dart';

/// The Dayline primitives.
///
/// Before this file existed every screen re-implemented its own card, pill and
/// section header, and the six admin modules each carried a byte-identical
/// copy of the same helper file. Everything here reads its colour from the
/// active theme, so a screen built out of these widgets works in light mode
/// without the author thinking about it.

/// A panel. One border, one radius, no shadow.
///
/// Border and fill are the only separators this design uses — elevation was
/// removed deliberately, because a shadow on every block flattens hierarchy
/// instead of creating it.
class DCard extends StatelessWidget {
  const DCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(NebulaSpacing.md),
    this.onTap,
    this.accent,
    this.emphasised = false,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;

  /// Draws a 3px spine down the leading edge — used to carry a venture colour.
  final Color? accent;

  /// Lifts the border for the one card on screen that is "live".
  final bool emphasised;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final body = Padding(padding: padding, child: child);

    return Material(
      color: context.scheme.surfaceContainerHighest,
      borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
            border: Border.all(
              color: emphasised ? dl.borderStrong : dl.border,
            ),
          ),
          child: accent == null
              ? body
              : Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Container(
                      width: 3,
                      margin: const EdgeInsets.symmetric(
                        vertical: NebulaSpacing.sm,
                      ),
                      decoration: BoxDecoration(
                        color: accent,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    Expanded(child: body),
                  ],
                ),
        ),
      ),
    );
  }
}

/// Mono uppercase section label, optionally with a trailing action.
class SectionHeader extends StatelessWidget {
  const SectionHeader(
    this.label, {
    super.key,
    this.actionLabel,
    this.onAction,
    this.trailing,
    this.padding = const EdgeInsets.only(bottom: NebulaSpacing.sm),
  });

  final String label;
  final String? actionLabel;
  final VoidCallback? onAction;
  final Widget? trailing;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Text(
              label.toUpperCase(),
              style: NebulaTypography.monoLabel(color: context.dl.textTertiary),
            ),
          ),
          if (trailing != null)
            trailing!
          else if (actionLabel != null)
            GestureDetector(
              onTap: onAction,
              behavior: HitTestBehavior.opaque,
              child: Text(
                actionLabel!,
                style: context.text.bodySmall?.copyWith(
                  color: context.scheme.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Semantic tone for pills and status text. Kept deliberately small — a
/// palette with fifteen meanings has none.
enum DTone { neutral, ok, warn, critical, accent }

extension DToneColors on DTone {
  Color color(BuildContext context) {
    final dl = context.dl;
    switch (this) {
      case DTone.neutral:
        return context.scheme.onSurfaceVariant;
      case DTone.ok:
        return dl.success;
      case DTone.warn:
        return dl.warning;
      case DTone.critical:
        return dl.critical;
      case DTone.accent:
        return context.scheme.primary;
    }
  }
}

/// Small mono pill. Carries state, never decoration.
class DTag extends StatelessWidget {
  const DTag(
    this.label, {
    super.key,
    this.tone = DTone.neutral,
    this.dotColor,
  });

  /// Convenience for a venture chip: a coloured dot plus the venture name.
  const DTag.venture(this.label, {super.key, required Color color})
      : tone = DTone.neutral,
        dotColor = color;

  final String label;
  final DTone tone;
  final Color? dotColor;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final fg = tone == DTone.neutral ? dl.textTertiary : tone.color(context);
    final isNeutral = tone == DTone.neutral;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: isNeutral ? dl.surfaceRaised : fg.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(5),
        border: Border.all(
          color: isNeutral ? dl.borderStrong : fg.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (dotColor != null) ...[
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle),
            ),
            const SizedBox(width: 5),
          ],
          Text(
            label.toUpperCase(),
            style: NebulaTypography.monoLabel(color: fg, fontSize: 9),
          ),
        ],
      ),
    );
  }
}

/// Initials avatar. Colour is derived from the name so the same person is the
/// same colour everywhere, without needing an avatar upload.
class DAvatar extends StatelessWidget {
  const DAvatar(this.name, {super.key, this.size = 38, this.imageUrl});

  final String? name;
  final double size;
  final String? imageUrl;

  static const _palette = [
    Color(0xFF7C3AED),
    Color(0xFF0891B2),
    Color(0xFF059669),
    Color(0xFFD97706),
    Color(0xFFDB2777),
    Color(0xFF4F46E5),
  ];

  String get _initials {
    final n = (name ?? '').trim();
    if (n.isEmpty) return '?';
    final parts = n.split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.length == 1) {
      return parts.first.characters.take(2).toString().toUpperCase();
    }
    return (parts.first.characters.first + parts.last.characters.first)
        .toUpperCase();
  }

  Color get _seedColor {
    final n = name ?? '';
    if (n.isEmpty) return _palette.first;
    return _palette[n.codeUnits.fold<int>(0, (a, b) => a + b) % _palette.length];
  }

  @override
  Widget build(BuildContext context) {
    final base = _seedColor;
    return Container(
      width: size,
      height: size,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(size * 0.3),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [base, Color.lerp(base, Colors.black, 0.42)!],
        ),
      ),
      alignment: Alignment.center,
      child: imageUrl != null && imageUrl!.isNotEmpty
          ? Image.network(
              imageUrl!,
              fit: BoxFit.cover,
              width: size,
              height: size,
              // A broken avatar URL must never take the row down with it.
              errorBuilder: (_, __, ___) => _initialsText(),
            )
          : _initialsText(),
    );
  }

  Widget _initialsText() => Text(
        _initials,
        style: TextStyle(
          color: Colors.white,
          fontSize: size * 0.34,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.2,
        ),
      );
}

/// A venture's colour as a 6px dot.
class VentureDot extends StatelessWidget {
  const VentureDot(this.color, {super.key, this.size = 6}) : _hex = null;

  const VentureDot.fromHex(String? hex, {super.key, this.size = 6})
      : color = null,
        _hex = hex;

  final Color? color;
  final String? _hex;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color ?? NebulaColors.parseHex(_hex),
        shape: BoxShape.circle,
      ),
    );
  }
}

/// Thin progress track. [segments] lets one bar carry a venture breakdown.
class ProgressTrack extends StatelessWidget {
  const ProgressTrack({
    super.key,
    required this.value,
    this.color,
    this.height = 6,
  }) : segments = null;

  const ProgressTrack.segmented(this.segments, {super.key, this.height = 6})
      : value = 0,
        color = null;

  /// 0..1. Clamped, because a backend that reports 1.2 should not throw.
  final double value;
  final Color? color;
  final double height;
  final List<({double value, Color color})>? segments;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final radius = BorderRadius.circular(height / 2);

    return ClipRRect(
      borderRadius: radius,
      child: Container(
        height: height,
        color: dl.surfaceRaised,
        child: segments != null
            ? Row(
                children: [
                  for (final s in segments!)
                    Expanded(
                      flex: (s.value.clamp(0.0, 1.0) * 1000).round(),
                      child: Container(color: s.color),
                    ),
                ],
              )
            : FractionallySizedBox(
                alignment: Alignment.centerLeft,
                widthFactor: value.isNaN ? 0 : value.clamp(0.0, 1.0),
                child: Container(
                  decoration: BoxDecoration(
                    color: color ?? context.scheme.primary,
                    borderRadius: radius,
                  ),
                ),
              ),
      ),
    );
  }
}

/// The live indicator — a dot that breathes on a 2.4s cycle.
///
/// This is the ONLY looping animation in the app. That exclusivity is the
/// point: when exactly one thing moves, movement means "this is happening now"
/// rather than "this screen has animations".
class LiveDot extends StatefulWidget {
  const LiveDot({super.key, this.size = 7, this.color});

  final double size;
  final Color? color;

  @override
  State<LiveDot> createState() => _LiveDotState();
}

class _LiveDotState extends State<LiveDot> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 2400),
  );

  @override
  void initState() {
    super.initState();
    // Respect the OS setting: a user who asked for less motion should not get
    // a pulsing dot in their peripheral vision all day.
    if (!WidgetsBinding.instance.platformDispatcher.accessibilityFeatures.disableAnimations) {
      _c.repeat();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color = widget.color ?? context.dl.timeNow;
    return AnimatedBuilder(
      animation: _c,
      builder: (context, _) {
        final t = Curves.easeOut.transform(_c.value);
        return Container(
          width: widget.size,
          height: widget.size,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: color.withValues(alpha: (1 - t) * 0.45),
                blurRadius: 0,
                spreadRadius: t * 7,
              ),
            ],
          ),
        );
      },
    );
  }
}

/// Figures. Never use a proportional font for a number the user compares.
class Mono extends StatelessWidget {
  const Mono(
    this.text, {
    super.key,
    this.size = 13,
    this.weight = FontWeight.w500,
    this.color,
    this.tone,
  });

  final String text;
  final double size;
  final FontWeight weight;
  final Color? color;
  final DTone? tone;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: NebulaTypography.mono(
        fontSize: size,
        fontWeight: weight,
        color: color ?? tone?.color(context) ?? context.scheme.onSurface,
      ),
    );
  }
}
