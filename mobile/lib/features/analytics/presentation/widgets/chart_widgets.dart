import 'package:flutter/material.dart';
import '../../../../core/theme/nebula_colors.dart';

class SimpleBarChart extends StatelessWidget {
  final List<dynamic> data;

  const SimpleBarChart({required this.data});

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) {
      return const Center(
        child: Text('No data available',
            style: TextStyle(color: NebulaColors.textSecondary)),
      );
    }

    return CustomPaint(
      painter: BarChartPainter(data),
      child: Container(),
    );
  }
}

class SimplePieChart extends StatelessWidget {
  final List<dynamic> data;

  const SimplePieChart({required this.data});

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) {
      return const Center(
        child: Text('No data available',
            style: TextStyle(color: NebulaColors.textSecondary)),
      );
    }

    return CustomPaint(
      painter: PieChartPainter(data),
      child: Container(),
    );
  }
}

class TaskVelocityChart extends StatelessWidget {
  final List<dynamic> data;

  const TaskVelocityChart({required this.data});

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) {
      return const Center(
        child: Text('No data available',
            style: TextStyle(color: NebulaColors.textSecondary)),
      );
    }

    return CustomPaint(
      painter: LineChartPainter(data),
      child: Container(),
    );
  }
}

class BarChartPainter extends CustomPainter {
  final List<dynamic> data;

  BarChartPainter(this.data);

  @override
  void paint(Canvas canvas, Size size) {
    if (data.isEmpty) return;

    final paint = Paint()
      ..color = const Color(0xFF7C3AED)
      ..style = PaintingStyle.fill;

    final textPaint = TextPainter(
      textDirection: TextDirection.ltr,
    );

    final maxCount = data.fold<int>(
        0, (max, item) => item.count > max ? item.count : max);

    if (maxCount == 0) return;

    final barWidth = size.width / (data.length * 1.5);
    final spacing = barWidth * 0.5;

    for (int i = 0; i < data.length; i++) {
      final item = data[i];
      final height = (item.count / maxCount) * (size.height * 0.8);
      final xPosition = (i + 0.25) * (size.width / data.length);
      final yPosition = size.height - height - 20;

      // Draw bar
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(xPosition, yPosition, barWidth, height),
          const Radius.circular(4),
        ),
        paint,
      );

      // Draw label
      final dateLabel = item.date.toString().split('-').last;
      textPaint.text = TextSpan(
        text: dateLabel,
        style: const TextStyle(
          color: NebulaColors.textSecondary,
          fontSize: 10,
        ),
      );
      textPaint.layout();
      textPaint.paint(
        canvas,
        Offset(xPosition + barWidth / 2 - textPaint.width / 2,
            size.height - 15),
      );
    }
  }

  @override
  bool shouldRepaint(BarChartPainter oldDelegate) => false;
}

class PieChartPainter extends CustomPainter {
  final List<dynamic> data;

  PieChartPainter(this.data);

  @override
  void paint(Canvas canvas, Size size) {
    if (data.isEmpty) return;

    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2.5;

    final totalTasks =
        data.fold<int>(0, (sum, item) => sum + (item.taskCount ?? 0));

    if (totalTasks == 0) return;

    final colors = [
      const Color(0xFF7C3AED),
      const Color(0xFF06B6D4),
      const Color(0xFF22C55E),
      const Color(0xFFF59E0B),
      const Color(0xFFEF4444),
    ];

    var startAngle = -1.5708; // -90 degrees

    for (int i = 0; i < data.length; i++) {
      final item = data[i];
      final percentage = (item.taskCount ?? 0) / totalTasks;
      final sweepAngle = percentage * 6.28318; // 2 * pi

      final paint = Paint()
        ..color = colors[i % colors.length]
        ..style = PaintingStyle.fill;

      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        startAngle,
        sweepAngle,
        true,
        paint,
      );

      startAngle += sweepAngle;
    }
  }

  @override
  bool shouldRepaint(PieChartPainter oldDelegate) => false;
}

class LineChartPainter extends CustomPainter {
  final List<dynamic> data;

  LineChartPainter(this.data);

  @override
  void paint(Canvas canvas, Size size) {
    if (data.isEmpty) return;

    final paintLine = Paint()
      ..color = const Color(0xFF7C3AED)
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    final maxValue = data.fold<int>(
        0, (max, item) => item.cumulativeCount > max ? item.cumulativeCount : max);

    if (maxValue == 0) return;

    final padding = 40.0;
    final graphWidth = size.width - (padding * 2);
    final graphHeight = size.height - (padding * 2);

    final points = <Offset>[];

    for (int i = 0; i < data.length; i++) {
      final item = data[i];
      final x = padding + (i / (data.length - 1)) * graphWidth;
      final y =
          size.height - padding - (item.cumulativeCount / maxValue) * graphHeight;
      points.add(Offset(x, y));
    }

    // Draw line
    for (int i = 0; i < points.length - 1; i++) {
      canvas.drawLine(points[i], points[i + 1], paintLine);
    }

    // Draw points
    final pointPaint = Paint()
      ..color = const Color(0xFF06B6D4)
      ..style = PaintingStyle.fill;

    for (final point in points) {
      canvas.drawCircle(point, 4, pointPaint);
    }

    // Draw axes
    final axisPaint = Paint()
      ..color = NebulaColors.textSecondary.withOpacity(0.2)
      ..strokeWidth = 1;

    canvas.drawLine(
      Offset(padding, size.height - padding),
      Offset(size.width - padding, size.height - padding),
      axisPaint,
    );

    canvas.drawLine(
      Offset(padding, padding),
      Offset(padding, size.height - padding),
      axisPaint,
    );
  }

  @override
  bool shouldRepaint(LineChartPainter oldDelegate) => false;
}
