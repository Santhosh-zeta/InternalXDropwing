import 'package:flutter/material.dart';
import '../../data/models/home_models.dart';

class KPICardWidget extends StatelessWidget {
  final KPICard kpi;

  const KPICardWidget({Key? key, required this.kpi}) : super(key: key);

  Color _parseColor(String hexColor) {
    hexColor = hexColor.replaceAll('#', '');
    if (hexColor.length == 6) {
      hexColor = 'FF$hexColor';
    }
    return Color(int.tryParse(hexColor, radix: 16) ?? 0xFF8b5cf6);
  }

  IconData _getIcon(String iconName) {
    switch (iconName) {
      case 'users': return Icons.group;
      case 'clock': return Icons.access_time;
      case 'check-circle': return Icons.check_circle_outline;
      case 'activity': return Icons.local_activity;
      default: return Icons.insert_chart_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _parseColor(kpi.color);
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Theme.of(context).dividerColor.withOpacity(0.1)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  kpi.title.toUpperCase(),
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.2,
                    color: Theme.of(context).textTheme.bodySmall?.color,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(_getIcon(kpi.icon), color: color, size: 20),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            kpi.value,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: Theme.of(context).textTheme.bodyLarge?.color,
            ),
          ),
        ],
      ),
    );
  }
}
