import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:ui';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/nebula_colors.dart';

class CommandCenterGrid extends StatelessWidget {
  const CommandCenterGrid({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'COMMAND CENTER',
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: NebulaColors.textSecondary,
            letterSpacing: 1.5,
          ),
        ),
        const SizedBox(height: 16),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 16,
          crossAxisSpacing: 16,
          childAspectRatio: 1.2,
          children: const [
            _CommandTile(title: 'Create Task', icon: LucideIcons.plusCircle),
            _CommandTile(title: 'Projects', icon: LucideIcons.folder),
            _CommandTile(title: 'Learning', icon: LucideIcons.graduationCap),
            _CommandTile(title: 'Documents', icon: LucideIcons.fileText),
          ],
        ),
      ],
    );
  }
}

class _CommandTile extends StatefulWidget {
  final String title;
  final IconData icon;

  const _CommandTile({
    required this.title,
    required this.icon,
  });

  @override
  State<_CommandTile> createState() => _CommandTileState();
}

class _CommandTileState extends State<_CommandTile> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 150),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.95).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onTapDown(TapDownDetails details) {
    HapticFeedback.lightImpact();
    _controller.forward();
  }

  void _onTapUp(TapUpDetails details) {
    _controller.reverse();
    // Navigate or trigger action based on widget.title here later
  }

  void _onTapCancel() {
    _controller.reverse();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: _onTapDown,
      onTapUp: _onTapUp,
      onTapCancel: _onTapCancel,
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
            child: AnimatedBuilder(
              animation: _controller,
              builder: (context, child) {
                return Container(
                  decoration: BoxDecoration(
                    color: NebulaColors.surfaceCard.withOpacity(0.6),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: _controller.value > 0 
                          ? NebulaColors.highlight.withOpacity(0.5) 
                          : Colors.white.withOpacity(0.05),
                    ),
                    boxShadow: _controller.value > 0 
                        ? [BoxShadow(color: NebulaColors.highlight.withOpacity(0.2), blurRadius: 20)]
                        : [],
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        widget.icon,
                        size: 32,
                        color: _controller.value > 0 ? NebulaColors.highlight : NebulaColors.primary,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        widget.title,
                        style: TextStyle(
                          color: NebulaColors.textPrimary,
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}
