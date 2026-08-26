import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'nebula_colors.dart';

class NebulaTypography {
  /// Dark-mode text theme. Unchanged in output from the original implementation
  /// — it is just built through the shared [_buildTextTheme] helper now so the
  /// light variant cannot drift from it.
  static TextTheme get textTheme => _buildTextTheme(
        ThemeData.dark().textTheme,
        primary: NebulaColors.textPrimary,
        secondary: NebulaColors.textSecondary,
      );

  /// Light-mode counterpart used by `AppTheme.lightTheme`.
  static TextTheme get lightTextTheme => _buildTextTheme(
        ThemeData.light().textTheme,
        primary: NebulaColors.textPrimaryLight,
        secondary: NebulaColors.textSecondaryLight,
      );

  static TextTheme _buildTextTheme(
    TextTheme base, {
    required Color primary,
    required Color secondary,
  }) {
    return GoogleFonts.interTextTheme(base).copyWith(
      displayLarge: GoogleFonts.inter(
        fontSize: 32,
        fontWeight: FontWeight.bold,
        color: primary,
        letterSpacing: -0.5,
      ),
      displayMedium: GoogleFonts.inter(
        fontSize: 24,
        fontWeight: FontWeight.bold,
        color: primary,
        letterSpacing: -0.5,
      ),
      titleLarge: GoogleFonts.inter(
        fontSize: 20,
        fontWeight: FontWeight.w600,
        color: primary,
      ),
      titleMedium: GoogleFonts.inter(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: primary,
      ),
      titleSmall: GoogleFonts.inter(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: primary,
      ),
      bodyLarge: GoogleFonts.inter(
        fontSize: 16,
        fontWeight: FontWeight.normal,
        color: secondary,
      ),
      bodyMedium: GoogleFonts.inter(
        fontSize: 14,
        fontWeight: FontWeight.normal,
        color: secondary,
      ),
      bodySmall: GoogleFonts.inter(
        fontSize: 12,
        fontWeight: FontWeight.normal,
        color: secondary,
      ),
      labelLarge: GoogleFonts.inter(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: primary,
        letterSpacing: 0.5,
      ),
      labelMedium: GoogleFonts.inter(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: secondary,
        letterSpacing: 0.5,
      ),
      labelSmall: GoogleFonts.inter(
        fontSize: 11,
        fontWeight: FontWeight.w600,
        color: secondary,
        letterSpacing: 0.5,
      ),
    );
  }

  // Convenient shortcuts for common text styles.
  //
  // NOTE: these are static (dark-mode) styles kept for backwards compatibility
  // with the many widgets that reference them directly. Prefer
  // `Theme.of(context).textTheme.*` in new code so light mode works.
  static TextStyle get heading1 => GoogleFonts.inter(
        fontSize: 32,
        fontWeight: FontWeight.bold,
        color: NebulaColors.textPrimary,
        letterSpacing: -0.5,
      );

  static TextStyle get heading2 => GoogleFonts.inter(
        fontSize: 24,
        fontWeight: FontWeight.bold,
        color: NebulaColors.textPrimary,
        letterSpacing: -0.5,
      );

  static TextStyle get body1 => GoogleFonts.inter(
        fontSize: 16,
        fontWeight: FontWeight.normal,
        color: NebulaColors.textPrimary,
      );

  static TextStyle get body2 => GoogleFonts.inter(
        fontSize: 14,
        fontWeight: FontWeight.normal,
        color: NebulaColors.textPrimary,
      );

  static TextStyle get caption => GoogleFonts.inter(
        fontSize: 12,
        fontWeight: FontWeight.normal,
        color: NebulaColors.textSecondary,
      );
}
