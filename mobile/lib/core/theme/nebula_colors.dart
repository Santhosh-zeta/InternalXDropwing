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

  // ---------------------------------------------------------------------------
  // Borders / hairlines
  // ---------------------------------------------------------------------------
  /// 5% white — matches the historical `Colors.white.withValues(alpha: 0.05)` divider.
  static const Color borderDark = Color(0x0DFFFFFF);
  static const Color borderLight = Color(0xFFE2E8F0);

  // ---------------------------------------------------------------------------
  // Light mode palette
  //
  // NOTE: every dark token above is intentionally left untouched — hundreds of
  // widgets reference them directly. These are additive counterparts used by
  // `AppTheme.lightTheme`.
  // ---------------------------------------------------------------------------

  // Core Background & Surfaces (light)
  static const Color backgroundLight = Color(0xFFF6F7FB);
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color surfaceCardLight = Color(0xFFFFFFFF);
  /// Slightly tinted surface for chips / inputs on light backgrounds.
  static const Color surfaceMutedLight = Color(0xFFEEF1F7);

  // Accents (light) — a touch darker so they stay legible on white.
  static const Color primaryLight = Color(0xFF6D28D9);
  static const Color highlightLight = Color(0xFF0891B2);

  // Status Colors (light)
  static const Color successLight = Color(0xFF16A34A);
  static const Color warningLight = Color(0xFFD97706);
  static const Color criticalLight = Color(0xFFDC2626);

  // Text Colors (light)
  static const Color textPrimaryLight = Color(0xFF0B1220);
  static const Color textSecondaryLight = Color(0xFF52607A);

  // Gradients for Dynamic Background (light)
  static const List<Color> nebulaGradientLight = [
    Color(0xFFF6F7FB),
    Color(0xFFEDE7FB), // Soft purple tint
    Color(0xFFE3F1F7), // Soft cyan tint
    Color(0xFFF6F7FB),
  ];
}
