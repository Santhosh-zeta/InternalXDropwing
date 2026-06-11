import 'package:flutter/material.dart';
import 'dart:math' as math;
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/nebula_colors.dart';

class StrategicRadar extends StatefulWidget {
  final Map<String, double> metrics;

  const StrategicRadar({Key? key, required this.metrics}) : super(key: key);

  @override
  State<StrategicRadar> createState() => _StrategicRadarState();
}

class _StrategicRadarState extends State<StrategicRadar> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
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
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'STRATEGIC RADAR',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: NebulaColors.textSecondary,
                letterSpacing: 1.5,
              ),
            ),
            const Icon(LucideIcons.scan, color: NebulaColors.textSecondary, size: 16),
          ],
        ),
        const SizedBox(height: 24),
        SizedBox(
          height: 250,
          width: double.infinity,
          child: AnimatedBuilder(
            animation: _controller,
            builder: (context, child) {
              return CustomPaint(
                size: const Size(double.infinity, 250),
                painter: _RadarPainter(_controller.value, widget.metrics),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _RadarPainter extends CustomPainter {
  final double progress;
  final Map<String, double> metrics;

  _RadarPainter(this.progress, this.metrics);

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final maxRadius = math.min(size.width, size.height) / 2 - 30;

    // Draw radar circles
    final gridPaint = Paint()
      ..style = PaintingStyle.stroke
      ..color = Colors.white.withOpacity(0.05)
      ..strokeWidth = 1;

    for (int i = 1; i <= 4; i++) {
      canvas.drawCircle(center, maxRadius * (i / 4), gridPaint);
    }

    // Draw radar sweep
    final sweepPaint = Paint()
      ..style = PaintingStyle.fill
      ..shader = SweepGradient(
        center: Alignment.center,
        startAngle: 0.0,
        endAngle: math.pi / 2,
        colors: [
          NebulaColors.highlight.withOpacity(0.0),
          NebulaColors.highlight.withOpacity(0.3),
        ],
        transform: GradientRotation(progress * 2 * math.pi),
      ).createShader(Rect.fromCircle(center: center, radius: maxRadius));
      
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: maxRadius),
      progress * 2 * math.pi - math.pi / 2,
      math.pi / 2,
      true,
      sweepPaint,
    );

    // Draw sweep line
    final linePaint = Paint()
      ..style = PaintingStyle.stroke
      ..color = NebulaColors.highlight
      ..strokeWidth = 2
      ..maskFilter = const MaskFilter.blur(BlurStyle.solid, 2);

    final lineX = center.dx + math.cos(progress * 2 * math.pi) * maxRadius;
    final lineY = center.dy + math.sin(progress * 2 * math.pi) * maxRadius;
    canvas.drawLine(center, Offset(lineX, lineY), linePaint);

    // Draw data polygon
    if (metrics.isNotEmpty) {
      final polyPaint = Paint()
        ..style = PaintingStyle.fill
        ..color = NebulaColors.primary.withOpacity(0.2);
        
      final polyStrokePaint = Paint()
        ..style = PaintingStyle.stroke
        ..color = NebulaColors.primary
        ..strokeWidth = 2;

      final path = Path();
      final angleStep = (2 * math.pi) / metrics.length;
      
      int i = 0;
      final textPainter = TextPainter(textDirection: TextDirection.ltr);

      metrics.forEach((key, value) {
        final angle = i * angleStep - math.pi / 2;
        // Normalize value to 0-100%
        final normalizedValue = value.clamp(0, 100) / 100;
        final r = maxRadius * normalizedValue;
        
        final x = center.dx + math.cos(angle) * r;
        final y = center.dy + math.sin(angle) * r;

        if (i == 0) {
          path.moveTo(x, y);
        } else {
          path.lineTo(x, y);
        }

        // Draw points
        canvas.drawCircle(Offset(x, y), 4, Paint()..color = NebulaColors.highlight);

        // Draw labels
        final labelRadius = maxRadius + 20;
        final labelX = center.dx + math.cos(angle) * labelRadius;
        final labelY = center.dy + math.sin(angle) * labelRadius;

        textPainter.text = TextSpan(
          text: key,
          style: const TextStyle(
            color: NebulaColors.textSecondary,
            fontSize: 10,
            fontWeight: FontWeight.w600,
          ),
        );
        textPainter.layout();
        textPainter.paint(
          canvas, 
          Offset(labelX - textPainter.width / 2, labelY - textPainter.height / 2),
        );

        i++;
      });
      
      path.close();
      canvas.drawPath(path, polyPaint);
      canvas.drawPath(path, polyStrokePaint);
    }
  }

  @override
  bool shouldRepaint(covariant _RadarPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}
