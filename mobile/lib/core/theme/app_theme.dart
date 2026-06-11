import 'package:flutter/material.dart';
import 'nebula_colors.dart';
import 'nebula_typography.dart';

class AppTheme {
  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: NebulaColors.background,
      colorScheme: const ColorScheme.dark(
        primary: NebulaColors.primary,
        secondary: NebulaColors.highlight,
        surface: NebulaColors.surface,
        background: NebulaColors.background,
        error: NebulaColors.critical,
      ),
      textTheme: NebulaTypography.textTheme,

      dividerTheme: DividerThemeData(
        color: Colors.white.withOpacity(0.05),
        thickness: 1,
      ),
      useMaterial3: true,
    );
  }
}
