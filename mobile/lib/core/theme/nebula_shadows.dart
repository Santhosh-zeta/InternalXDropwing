import 'package:flutter/material.dart';
import 'nebula_colors.dart';

class NebulaShadows {
  static List<BoxShadow> get cardGlow => [
    BoxShadow(
      color: NebulaColors.primary.withValues(alpha: 0.1),
      blurRadius: 20,
      offset: const Offset(0, 8),
    ),
  ];

  static List<BoxShadow> get activeGlow => [
    BoxShadow(
      color: NebulaColors.primary.withValues(alpha: 0.3),
      blurRadius: 30,
      offset: const Offset(0, 0),
    ),
    BoxShadow(
      color: NebulaColors.highlight.withValues(alpha: 0.15),
      blurRadius: 15,
      offset: const Offset(0, 0),
    ),
  ];
  
  static List<BoxShadow> get subtle => [
    BoxShadow(
      color: Colors.black.withValues(alpha: 0.5),
      blurRadius: 10,
      offset: const Offset(0, 4),
    ),
  ];
}
