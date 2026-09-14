import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'nebula_colors.dart';

/// Dayline type.
///
/// Two families, each with a job:
///
///  * **Archivo** carries the interface. It is a grotesque with real presence
///    at display sizes and tightens well (-0.03em and beyond), which suits an
///    app whose headings are mostly short nouns.
///  * **JetBrains Mono** carries every *figure* — money, durations, dates,
///    employee ids, invoice numbers. Always with [FontFeature.tabularFigures]
///    so columns line up and a number that changes does not reflow the row.
///
/// The split is not decorative. In an operations tool most of the screen is
/// numbers that get compared to other numbers, and proportional digits make
/// that measurably harder.
class NebulaTypography {
  const NebulaTypography._();

  /// Figures. Use this for anything the user reads as a quantity.
  static TextStyle mono({
    double fontSize = 13,
    FontWeight fontWeight = FontWeight.w500,
    Color? color,
    double letterSpacing = 0,
    double? height,
  }) {
    return GoogleFonts.jetBrainsMono(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      letterSpacing: letterSpacing,
      height: height,
      fontFeatures: const [FontFeature.tabularFigures()],
    );
  }

  /// Small uppercase mono label — section headers, axis ticks, metadata.
  static TextStyle monoLabel({Color? color, double fontSize = 10}) {
    return GoogleFonts.jetBrainsMono(
      fontSize: fontSize,
      fontWeight: FontWeight.w500,
      color: color,
      letterSpacing: 1.4,
    );
  }

  static TextTheme get textTheme => _build(
        ThemeData.dark().textTheme,
        primary: NebulaColors.textPrimary,
        secondary: NebulaColors.textSecondary,
      );

  static TextTheme get lightTextTheme => _build(
        ThemeData.light().textTheme,
        primary: NebulaColors.textPrimaryLight,
        secondary: NebulaColors.textSecondaryLight,
      );

  static TextTheme _build(
    TextTheme base, {
    required Color primary,
    required Color secondary,
  }) {
    TextStyle sans(
      double size,
      FontWeight weight,
      Color color, {
      double tracking = 0,
      double? height,
    }) {
      return GoogleFonts.archivo(
        fontSize: size,
        fontWeight: weight,
        color: color,
        letterSpacing: tracking,
        height: height,
      );
    }

    return GoogleFonts.archivoTextTheme(base).copyWith(
      // Display — screen titles. Tight tracking is the point; Archivo is drawn
      // for it and looks slack without.
      displayLarge: sans(34, FontWeight.w700, primary, tracking: -1.2, height: 1.05),
      displayMedium: sans(27, FontWeight.w700, primary, tracking: -0.85, height: 1.1),
      displaySmall: sans(23, FontWeight.w600, primary, tracking: -0.7, height: 1.15),

      headlineMedium: sans(20, FontWeight.w600, primary, tracking: -0.5),
      headlineSmall: sans(18, FontWeight.w600, primary, tracking: -0.4),

      titleLarge: sans(17, FontWeight.w600, primary, tracking: -0.35),
      titleMedium: sans(15, FontWeight.w600, primary, tracking: -0.25),
      titleSmall: sans(13.5, FontWeight.w600, primary, tracking: -0.15),

      bodyLarge: sans(15, FontWeight.w400, primary, height: 1.5),
      bodyMedium: sans(13.5, FontWeight.w400, secondary, height: 1.5),
      bodySmall: sans(12, FontWeight.w400, secondary, height: 1.45),

      // Labels are mono: they are almost always a section header, a unit, or a
      // piece of metadata sitting next to a figure.
      labelLarge: sans(14, FontWeight.w600, primary, tracking: 0.1),
      labelMedium: monoLabel(color: secondary, fontSize: 10.5),
      labelSmall: monoLabel(color: secondary, fontSize: 9.5),
    );
  }

  // ── Legacy shortcuts ─────────────────────────────────────────────────────
  //
  // Dark-only and frozen. They exist so screens that have not been migrated
  // still compile; every one of them is a bug in light mode. Prefer
  // `Theme.of(context).textTheme.*`.

  @Deprecated('Use Theme.of(context).textTheme.displayLarge')
  static TextStyle get heading1 => GoogleFonts.archivo(
        fontSize: 34,
        fontWeight: FontWeight.w700,
        color: NebulaColors.textPrimary,
        letterSpacing: -1.2,
      );

  @Deprecated('Use Theme.of(context).textTheme.displayMedium')
  static TextStyle get heading2 => GoogleFonts.archivo(
        fontSize: 27,
        fontWeight: FontWeight.w700,
        color: NebulaColors.textPrimary,
        letterSpacing: -0.85,
      );

  @Deprecated('Use Theme.of(context).textTheme.bodyLarge')
  static TextStyle get body1 => GoogleFonts.archivo(
        fontSize: 15,
        fontWeight: FontWeight.w400,
        color: NebulaColors.textPrimary,
      );

  @Deprecated('Use Theme.of(context).textTheme.bodyMedium')
  static TextStyle get body2 => GoogleFonts.archivo(
        fontSize: 13.5,
        fontWeight: FontWeight.w400,
        color: NebulaColors.textPrimary,
      );

  @Deprecated('Use Theme.of(context).textTheme.bodySmall')
  static TextStyle get caption => GoogleFonts.archivo(
        fontSize: 12,
        fontWeight: FontWeight.w400,
        color: NebulaColors.textSecondary,
      );
}
