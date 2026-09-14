import 'package:flutter/material.dart';
import 'dart:math' as math;
import '../../../../core/theme/nebula_colors.dart';

class DynamicNebulaBackground extends StatefulWidget {
  final Widget child;

  const DynamicNebulaBackground({super.key, required this.child});

  @override
  State<DynamicNebulaBackground> createState() => _DynamicNebulaBackgroundState();
}

class _DynamicNebulaBackgroundState extends State<DynamicNebulaBackground> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 20),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Container(
          decoration: BoxDecoration(
            gradient: RadialGradient(
              center: Alignment(
                math.cos(_controller.value * 2 * math.pi) * 0.3,
                math.sin(_controller.value * 2 * math.pi) * 0.3 - 0.5,
              ),
              radius: 1.5,
              colors: NebulaColors.nebulaGradient,
              stops: const [0.0, 0.4, 0.8, 1.0],
            ),
          ),
          child: child,
        );
      },
      child: widget.child,
    );
  }
}
