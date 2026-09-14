import 'package:flutter/material.dart';

import '../../../../core/theme/nebula_spacing.dart';
import '../../../../core/theme/theme_context.dart';
import '../../../../core/widgets/motion.dart';

/// A compact segmented control.
///
/// Replaces the scrolling row of `FilterChip`s both list screens used to
/// carry: one bordered track, one filled segment, so the active filter reads
/// as a *position* rather than as a colour the eye has to hunt for. The track
/// scrolls horizontally so five segments still fit a narrow phone.
///
/// This belongs in `lib/core/widgets/` — it is the one piece of chrome these
/// screens needed that the kit does not yet provide. It lives here because
/// this agent does not own `core/`.
class SegmentedFilter<T> extends StatelessWidget {
  const SegmentedFilter({
    super.key,
    required this.segments,
    required this.selected,
    required this.onChanged,
  });

  final List<({T value, String label})> segments;
  final T selected;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Container(
        padding: const EdgeInsets.all(3),
        decoration: BoxDecoration(
          color: dl.surfaceRaised,
          borderRadius: BorderRadius.circular(NebulaSpacing.radiusSm),
          border: Border.all(color: dl.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final segment in segments)
              _Segment(
                label: segment.label,
                selected: segment.value == selected,
                onTap: () => onChanged(segment.value),
              ),
          ],
        ),
      ),
    );
  }
}

class _Segment extends StatelessWidget {
  const _Segment({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = context.scheme;

    return PressScale(
      onTap: onTap,
      haptic: false,
      child: AnimatedContainer(
        duration: Motion.fast,
        curve: Motion.emphasis,
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 7),
        decoration: BoxDecoration(
          color: selected ? scheme.primary : context.dl.surfaceRaised,
          borderRadius: BorderRadius.circular(NebulaSpacing.radiusSm - 2),
        ),
        child: Text(
          label,
          style: context.text.bodySmall?.copyWith(
            fontSize: 12,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
            color: selected ? scheme.onPrimary : context.dl.textTertiary,
          ),
        ),
      ),
    );
  }
}
