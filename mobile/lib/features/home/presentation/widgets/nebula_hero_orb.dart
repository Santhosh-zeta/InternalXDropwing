import 'package:flutter/material.dart';
import 'dart:math' as math;
import '../../../../core/theme/nebula_colors.dart';
import '../../../../core/theme/nebula_animations.dart';

class NebulaHeroOrb extends StatefulWidget {
  final int healthPercentage;
  final int activeVentures;
  final int runningProjects;
  final int openTasks;

  const NebulaHeroOrb({
    Key? key,
    required this.healthPercentage,
    required this.activeVentures,
    required this.runningProjects,
    required this.openTasks,
  }) : super(key: key);

  @override
  State<NebulaHeroOrb> createState() => _NebulaHeroOrbState();
}

class _NebulaHeroOrbState extends State<NebulaHeroOrb> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 10),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const Text(
          'ORGANIZATION HEALTH',
          style: TextStyle(
            color: NebulaColors.textSecondary,
            letterSpacing: 3,
            fontSize: 10,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 32),
        SizedBox(
          height: 200,
          width: 200,
          child: Stack(
            alignment: Alignment.center,
            children: [
              AnimatedBuilder(
                animation: _controller,
                builder: (context, child) {
                  return CustomPaint(
                    size: const Size(200, 200),
                    painter: _OrbPainter(_controller.value, widget.healthPercentage),
                  );
                },
              ),
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '${widget.healthPercentage}%',
                    style: const TextStyle(
                      fontSize: 48,
                      fontWeight: FontWeight.w300,
                      color: NebulaColors.textPrimary,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 32),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: const BoxDecoration(
                color: NebulaColors.success,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 8),
            const Text(
              'Healthy',
              style: TextStyle(
                color: NebulaColors.success,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _StatItem(value: widget.activeVentures.toString(), label: 'Active\nVentures'),
            _StatItem(value: widget.runningProjects.toString(), label: 'Running\nProjects'),
            _StatItem(value: widget.openTasks.toString(), label: 'Open\nTasks'),
          ],
        )
      ],
    );
  }
}

class _StatItem extends StatelessWidget {
  final String value;
  final String label;

  const _StatItem({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: NebulaColors.textPrimary,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 11,
            color: NebulaColors.textSecondary,
          ),
        ),
      ],
    );
  }
}

class _OrbPainter extends CustomPainter {
  final double progress;
  final int health;

  _OrbPainter(this.progress, this.health);

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2;

    // Glowing outer rings
    for (int i = 0; i < 3; i++) {
      final ringRadius = radius - (i * 15);
      final offset = (progress * 2 * math.pi) + (i * math.pi / 2);
      
      final paint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..color = NebulaColors.primary.withOpacity(0.1 + (math.sin(offset) * 0.1).abs())
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 5);

      canvas.drawCircle(center, ringRadius, paint);
    }

    // Main health arc
    final healthPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 6
      ..strokeCap = StrokeCap.round
      ..color = health >= 90 ? NebulaColors.highlight : NebulaColors.warning
      ..maskFilter = const MaskFilter.blur(BlurStyle.solid, 3);

    const startAngle = -math.pi / 2;
    final sweepAngle = 2 * math.pi * (health / 100);

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius - 10),
      startAngle,
      sweepAngle,
      false,
      healthPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _OrbPainter oldDelegate) {
    return oldDelegate.progress != progress || oldDelegate.health != health;
  }
}
