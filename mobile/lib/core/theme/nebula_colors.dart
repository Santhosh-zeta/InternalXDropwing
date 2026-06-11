import 'package:flutter/material.dart';

class NebulaColors {
  // Core Background & Surfaces
  static const Color background = Color(0xFF0A0A0A);
  static const Color surface = Color(0xFF111827);
  static const Color surfaceCard = Color(0xFF171F2E);
  
  // Accents
  static const Color primary = Color(0xFF7C3AED);
  static const Color highlight = Color(0xFF06B6D4);
  
  // Status Colors
  static const Color success = Color(0xFF22C55E);
  static const Color warning = Color(0xFFF59E0B);
  static const Color critical = Color(0xFFEF4444);
  
  // Text Colors
  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFFA1A1AA);
  
  // Gradients for Dynamic Background
  static const List<Color> nebulaGradient = [
    Color(0xFF0A0A0A),
    Color(0xFF110729), // Deep purple tint
    Color(0xFF061429), // Deep cyan/blue tint
    Color(0xFF0A0A0A),
  ];
}
