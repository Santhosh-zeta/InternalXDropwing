import 'package:flutter/material.dart';

import '../../../../core/theme/nebula_spacing.dart';
import '../../../../core/theme/theme_context.dart';
import '../../../../core/widgets/motion.dart';

/// The `EntityRow` box without the entity semantics — for pickers, where the
/// row is a control rather than a record.
///
/// Selection is carried by the border, which is the only affordance in this
/// design system that does not also mean something else.
///
/// This belongs in `lib/core/widgets/` alongside `EntityRow`; it lives here
/// because this agent does not own `core/`.
class PickerRow extends StatelessWidget {
  const PickerRow({
    super.key,
    required this.child,
    required this.onTap,
    this.selected = false,
    this.padding = const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
  });

  final Widget child;
  final VoidCallback onTap;
  final bool selected;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: AnimatedContainer(
        duration: Motion.fast,
        curve: Motion.emphasis,
        padding: padding,
        decoration: BoxDecoration(
          color: context.scheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
          border: Border.all(
            color: selected ? context.scheme.primary : dl.border,
          ),
        ),
        child: child,
      ),
    );
  }
}
