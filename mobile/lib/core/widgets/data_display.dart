import 'package:flutter/material.dart';

import '../theme/nebula_spacing.dart';
import '../theme/nebula_typography.dart';
import '../theme/theme_context.dart';
import 'motion.dart';
import 'primitives.dart';

/// A single figure with a caption. The figure is always mono.
class StatTile extends StatelessWidget {
  const StatTile({
    super.key,
    required this.value,
    required this.label,
    this.tone,
    this.animate = true,
    this.onTap,
  });

  final int value;
  final String label;
  final DTone? tone;
  final bool animate;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final color = tone?.color(context) ?? context.scheme.onSurface;
    final style = NebulaTypography.mono(
      fontSize: 21,
      fontWeight: FontWeight.w500,
      color: color,
      letterSpacing: -0.8,
    );

    return PressScale(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
        decoration: BoxDecoration(
          color: context.scheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
          border: Border.all(color: dl.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            animate
                ? CountUp(value, style: style)
                : Text('$value', style: style),
            const SizedBox(height: 3),
            Text(
              label,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: context.text.bodySmall?.copyWith(
                fontSize: 10.5,
                color: dl.textTertiary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// A row of [StatTile]s that share width evenly.
class MetricRow extends StatelessWidget {
  const MetricRow(this.tiles, {super.key});

  final List<StatTile> tiles;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < tiles.length; i++) ...[
          if (i > 0) const SizedBox(width: NebulaSpacing.sm),
          Expanded(child: tiles[i]),
        ],
      ],
    );
  }
}

/// The workhorse list row.
///
/// Every list in this app — tasks, projects, invoices, people, documents,
/// audit entries — is this widget with different arguments. That is the point:
/// before, each screen drew its own row, and no two agreed on padding, on
/// where the venture colour went, or on what a "meta" line looked like.
class EntityRow extends StatelessWidget {
  const EntityRow({
    super.key,
    required this.title,
    this.meta = const [],
    this.spineColor,
    this.leading,
    this.trailing,
    this.timeState = TimeState.next,
    this.onTap,
    this.onLongPress,
    this.strikeThrough = false,
  });

  final String title;

  /// Small metadata widgets laid out in a row, separated by dots. Build these
  /// with [Mono] for anything numeric.
  final List<Widget> meta;

  /// Venture colour, drawn as a 3px spine down the leading edge.
  final Color? spineColor;

  final Widget? leading;
  final Widget? trailing;

  /// Drives luminance: past rows recede, the live row is brightest.
  final TimeState timeState;

  final VoidCallback? onTap;
  final VoidCallback? onLongPress;

  /// Completed work reads as struck through as well as dimmed.
  final bool strikeThrough;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final isNow = timeState.isNow;

    return PressScale(
      onTap: onTap,
      onLongPress: onLongPress,
      child: Opacity(
        opacity: timeState.rowOpacity,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
          decoration: BoxDecoration(
            color: context.scheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
            border: Border.all(color: isNow ? dl.borderStrong : dl.border),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              if (spineColor != null) ...[
                _Spine(color: spineColor!, glow: isNow, glowColor: dl.nowGlow),
                const SizedBox(width: 11),
              ],
              if (leading != null) ...[
                leading!,
                const SizedBox(width: 11),
              ],
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: context.text.titleSmall?.copyWith(
                        color: isNow ? dl.timeNow : null,
                        fontWeight: timeState.weight,
                        decoration:
                            strikeThrough ? TextDecoration.lineThrough : null,
                        decorationColor: dl.textTertiary,
                      ),
                    ),
                    if (meta.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      _MetaLine(meta: meta),
                    ],
                  ],
                ),
              ),
              if (trailing != null) ...[
                const SizedBox(width: 10),
                trailing!,
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _Spine extends StatelessWidget {
  const _Spine({required this.color, required this.glow, required this.glowColor});

  final Color color;
  final bool glow;
  final Color glowColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 3,
      height: 34,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(2),
        boxShadow: glow
            ? [BoxShadow(color: glowColor, blurRadius: 10, spreadRadius: 0)]
            : null,
      ),
    );
  }
}

/// Metadata separated by 2px dots. Wraps rather than overflowing — a long
/// venture name plus a long assignee name will not clip the row.
class _MetaLine extends StatelessWidget {
  const _MetaLine({required this.meta});

  final List<Widget> meta;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    return DefaultTextStyle.merge(
      style: context.text.bodySmall?.copyWith(
            fontSize: 10.5,
            color: dl.textTertiary,
          ) ??
          const TextStyle(fontSize: 10.5),
      child: Wrap(
        spacing: 6,
        runSpacing: 3,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          for (var i = 0; i < meta.length; i++) ...[
            if (i > 0)
              Container(
                width: 2,
                height: 2,
                decoration: BoxDecoration(
                  color: dl.textTertiary,
                  shape: BoxShape.circle,
                ),
              ),
            meta[i],
          ],
        ],
      ),
    );
  }
}

/// Group divider inside a list — "OVERDUE · 1", "TODAY · 3".
class GroupHeader extends StatelessWidget {
  const GroupHeader(this.label, {super.key, this.count, this.tone});

  final String label;
  final int? count;
  final DTone? tone;

  @override
  Widget build(BuildContext context) {
    final color = tone?.color(context) ?? context.dl.textTertiary;
    final text = count == null ? label.toUpperCase() : '${label.toUpperCase()} · $count';

    return Padding(
      padding: const EdgeInsets.only(
        top: NebulaSpacing.md,
        bottom: NebulaSpacing.sm,
      ),
      child: Row(
        children: [
          Text(text, style: NebulaTypography.monoLabel(color: color, fontSize: 9.5)),
          const SizedBox(width: 9),
          Expanded(child: Container(height: 1, color: context.dl.border)),
        ],
      ),
    );
  }
}
