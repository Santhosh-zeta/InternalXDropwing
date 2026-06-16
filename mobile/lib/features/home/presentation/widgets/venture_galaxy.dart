import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:math' as math;
import '../../../../core/theme/nebula_colors.dart';
import '../../data/models/home_models.dart';

class VentureGalaxy extends StatefulWidget {
  final HomeData data;
  const VentureGalaxy({Key? key, required this.data}) : super(key: key);

  @override
  State<VentureGalaxy> createState() => _VentureGalaxyState();
}

class _VentureGalaxyState extends State<VentureGalaxy> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late List<Map<String, dynamic>> ventures;

  @override
  void initState() {
    super.initState();
    ventures = widget.data.analytics.userDistribution.map((v) {
      Color c = Colors.blue;
      try {
        if (v.colorHex.isNotEmpty) {
          c = Color(int.parse(v.colorHex.replaceFirst('#', '0xff')));
        }
      } catch (_) {}
      return {
        'name': v.name,
        'health': v.value > 0 ? (v.value * 10) % 100 : 80,
        'color': c,
      };
    }).toList();

    if (ventures.isEmpty) {
      ventures = [
        {'name': 'Dropwing', 'health': 98, 'color': Colors.blue},
      ];
    }

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 40),
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
        Text(
          'VENTURE GALAXY',
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: NebulaColors.textSecondary,
            letterSpacing: 1.5,
          ),
        ),
        const SizedBox(height: 24),
        SizedBox(
          height: 300,
          width: double.infinity,
          child: AnimatedBuilder(
            animation: _controller,
            builder: (context, child) {
              return Stack(
                alignment: Alignment.center,
                children: [
                  // Draw orbits and connections
                  CustomPaint(
                    size: const Size(double.infinity, 300),
                    painter: _GalaxyPainter(_controller.value),
                  ),
                  
                  // Center Node (Dropwing Group)
                  _CenterNode(),
                  
                  // Orbiting Nodes
                  ...List.generate(ventures.length, (index) {
                    final angle = (index * math.pi / 2) + (_controller.value * 2 * math.pi);
                    final radiusX = 120.0;
                    final radiusY = 80.0;
                    
                    final x = math.cos(angle) * radiusX;
                    final y = math.sin(angle) * radiusY;
                    
                    return Transform.translate(
                      offset: Offset(x, y),
                      child: _OrbitNode(venture: ventures[index]),
                    );
                  }),
                ],
              );
            },
          ),
        ),
      ],
    );
  }
}

class _GalaxyPainter extends CustomPainter {
  final double progress;

  _GalaxyPainter(this.progress);

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    
    // Draw elliptical orbit
    final orbitPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..color = Colors.white.withOpacity(0.05);
      
    final rect = Rect.fromCenter(center: center, width: 240, height: 160);
    canvas.drawOval(rect, orbitPaint);

    // Draw connecting lines to center (pulsing)
    final linePaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..color = NebulaColors.highlight.withOpacity(0.1 + (math.sin(progress * math.pi * 4).abs() * 0.1));

    for (int i = 0; i < 4; i++) {
      final angle = (i * math.pi / 2) + (progress * 2 * math.pi);
      final x = center.dx + math.cos(angle) * 120;
      final y = center.dy + math.sin(angle) * 80;
      canvas.drawLine(center, Offset(x, y), linePaint);
    }
  }

  @override
  bool shouldRepaint(covariant _GalaxyPainter oldDelegate) => true;
}

class _CenterNode extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 80,
      height: 80,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: NebulaColors.surfaceCard,
        border: Border.all(color: NebulaColors.primary.withOpacity(0.5), width: 2),
        boxShadow: [
          BoxShadow(
            color: NebulaColors.primary.withOpacity(0.3),
            blurRadius: 20,
            spreadRadius: 2,
          )
        ],
      ),
      child: const Center(
        child: Text(
          'DGOS\nCore',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 12,
          ),
        ),
      ),
    );
  }
}

class _OrbitNode extends StatefulWidget {
  final Map<String, dynamic> venture;

  const _OrbitNode({required this.venture});

  @override
  State<_OrbitNode> createState() => _OrbitNodeState();
}

class _OrbitNodeState extends State<_OrbitNode> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    final color = widget.venture['color'] as Color;
    
    return GestureDetector(
      onTapDown: (_) {
        HapticFeedback.selectionClick();
        setState(() => _isHovered = true);
      },
      onTapUp: (_) {
        setState(() => _isHovered = false);
      },
      onTapCancel: () {
        setState(() => _isHovered = false);
      },
      child: AnimatedScale(
        scale: _isHovered ? 1.1 : 1.0,
        duration: const Duration(milliseconds: 150),
        child: Container(
          width: 50,
          height: 50,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: NebulaColors.surfaceCard,
            border: Border.all(color: color.withOpacity(0.8), width: 1.5),
            boxShadow: [
              BoxShadow(
                color: color.withOpacity(0.2),
                blurRadius: 10,
              )
            ],
          ),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  widget.venture['name'].toString().substring(0, 1),
                  style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                Text(
                  '${widget.venture['health']}%',
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 8,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
