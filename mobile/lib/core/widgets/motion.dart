import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Motion primitives.
///
/// The previous app animated nothing on 31 of its 38 screens, which is most of
/// why it felt like a form rather than a product. The rules here:
///
///  * Motion explains a change — where a thing came from, that a number moved,
///    that a tap registered. Motion that merely decorates is not added.
///  * Everything respects `MediaQuery.disableAnimations`, so a user who asked
///    the OS for reduced motion gets the end state instantly.
class Motion {
  const Motion._();

  static const Duration fast = Duration(milliseconds: 140);
  static const Duration normal = Duration(milliseconds: 240);
  static const Duration slow = Duration(milliseconds: 320);

  static const Curve entrance = Curves.easeOutCubic;
  static const Curve exit = Curves.easeInCubic;
  static const Curve emphasis = Curves.easeOutQuart;

  /// Per-item delay in a staggered list.
  static const Duration stagger = Duration(milliseconds: 40);

  static bool reduced(BuildContext context) =>
      MediaQuery.maybeDisableAnimationsOf(context) ?? false;
}

/// Fades and lifts a child into place, offset by [index] so a list assembles
/// itself in sequence rather than appearing all at once.
///
/// Deliberately caps the cascade: past ~12 items the delay stops growing, or
/// the last row of a long list would arrive a second and a half late.
class StaggerIn extends StatefulWidget {
  const StaggerIn({
    super.key,
    required this.child,
    this.index = 0,
    this.offset = 12,
  });

  final Widget child;
  final int index;
  final double offset;

  @override
  State<StaggerIn> createState() => _StaggerInState();
}

class _StaggerInState extends State<StaggerIn>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: Motion.normal,
  );

  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;

    if (Motion.reduced(context)) {
      _c.value = 1;
      return;
    }
    final steps = widget.index.clamp(0, 12);
    Future<void>.delayed(Motion.stagger * steps, () {
      if (mounted) _c.forward();
    });
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (context, child) {
        final t = Motion.entrance.transform(_c.value);
        return Opacity(
          opacity: t,
          child: Transform.translate(
            offset: Offset(0, (1 - t) * widget.offset),
            child: child,
          ),
        );
      },
      child: widget.child,
    );
  }
}

/// A number that rolls to its new value instead of cutting.
///
/// Uses the mono/tabular style so the row never reflows mid-animation — the
/// whole reason figures are monospaced in this app.
class CountUp extends ImplicitlyAnimatedWidget {
  const CountUp(
    this.value, {
    super.key,
    required this.style,
    this.prefix = '',
    this.suffix = '',
    super.duration = const Duration(milliseconds: 400),
    super.curve = Curves.easeOutCubic,
  });

  final int value;
  final TextStyle style;
  final String prefix;
  final String suffix;

  @override
  ImplicitlyAnimatedWidgetState<CountUp> createState() => _CountUpState();
}

class _CountUpState extends AnimatedWidgetBaseState<CountUp> {
  IntTween? _tween;

  @override
  void forEachTween(TweenVisitor<dynamic> visitor) {
    _tween = visitor(
      _tween,
      widget.value,
      (dynamic v) => IntTween(begin: v as int),
    ) as IntTween?;
  }

  @override
  Widget build(BuildContext context) {
    final v = _tween?.evaluate(animation) ?? widget.value;
    return Text('${widget.prefix}$v${widget.suffix}', style: widget.style);
  }
}

/// Scales a child down on press and fires a light haptic.
///
/// Applied to anything that navigates or commits, so touch has a physical
/// answer on a device where there is no hover state to rely on.
class PressScale extends StatefulWidget {
  const PressScale({
    super.key,
    required this.child,
    this.onTap,
    this.onLongPress,
    this.scale = 0.97,
    this.haptic = true,
  });

  final Widget child;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final double scale;
  final bool haptic;

  @override
  State<PressScale> createState() => _PressScaleState();
}

class _PressScaleState extends State<PressScale> {
  bool _down = false;

  void _set(bool v) {
    if (widget.onTap == null && widget.onLongPress == null) return;
    if (_down != v && mounted) setState(() => _down = v);
  }

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onTap != null || widget.onLongPress != null;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTapDown: enabled ? (_) => _set(true) : null,
      onTapUp: enabled ? (_) => _set(false) : null,
      onTapCancel: enabled ? () => _set(false) : null,
      onTap: widget.onTap == null
          ? null
          : () {
              if (widget.haptic) HapticFeedback.lightImpact();
              widget.onTap!.call();
            },
      onLongPress: widget.onLongPress == null
          ? null
          : () {
              if (widget.haptic) HapticFeedback.mediumImpact();
              widget.onLongPress!.call();
            },
      child: AnimatedScale(
        scale: _down && !Motion.reduced(context) ? widget.scale : 1.0,
        duration: Motion.fast,
        curve: Motion.emphasis,
        child: widget.child,
      ),
    );
  }
}
