import 'package:flutter/material.dart';

/// Dayline palette.
///
/// Two rules govern every colour in this app:
///
///  1. **Brightness encodes time.** What already happened is dim, what is
///     happening *now* is the highest-contrast thing on screen, what is coming
///     is in between. See [DaylineTokens.timePast] / [timeNow] / [timeNext] —
///     those are theme-aware, because "brightest" means white on dark and
///     near-black on light.
///  2. **Hue only ever encodes which venture.** Because brightness carries
///     time, colour is freed to mean exactly one thing. [primary] is the only
///     interactive accent and [critical] the only alarm; nothing else is
///     coloured for decoration.
///
/// Every token name that existed before is still here, so the screens that
/// have not yet been migrated to `Theme.of(context)` keep compiling — they
/// simply inherit the new values.
class NebulaColors {
  const NebulaColors._();

  // ── Core surfaces (dark) ─────────────────────────────────────────────────
  /// Scaffold ground. Cool-biased near-black rather than flat #000 so the
  /// surfaces above it read as lifted rather than outlined.
  static const Color background = Color(0xFF08090C);
  static const Color surface = Color(0xFF101218);
  static const Color surfaceCard = Color(0xFF171A22);

  /// One step above [surfaceCard] — chips, inputs, pressed states.
  static const Color surfaceRaised = Color(0xFF1E222C);

  // ── Accents ──────────────────────────────────────────────────────────────
  /// The only interactive accent in the app.
  static const Color primary = Color(0xFF8B5CF6);
  static const Color highlight = Color(0xFF06B6D4);

  // ── Status ───────────────────────────────────────────────────────────────
  static const Color success = Color(0xFF34D399);
  static const Color warning = Color(0xFFFBBF24);
  static const Color critical = Color(0xFFF87171);

  // ── Text (dark) ──────────────────────────────────────────────────────────
  /// Deliberately NOT pure white: #FFFFFF is reserved for "now", so ordinary
  /// body text must sit a step below it or the luminance system collapses.
  static const Color textPrimary = Color(0xFFE8EAF0);
  static const Color textSecondary = Color(0xFF8B92A3);
  static const Color textTertiary = Color(0xFF555C6B);

  // ── Time luminance (dark) ────────────────────────────────────────────────
  static const Color timeNowDark = Color(0xFFFFFFFF);
  static const Color timeNextDark = Color(0xFFE8EAF0);
  static const Color timePastDark = Color(0xFF3C424E);

  // ── Borders (dark) ───────────────────────────────────────────────────────
  /// Solid hairline rather than the old 5%-white wash, which disappeared
  /// entirely on anything but the darkest surface.
  static const Color borderDark = Color(0xFF232732);
  static const Color borderStrongDark = Color(0xFF2E3340);

  // ── Ventures ─────────────────────────────────────────────────────────────
  /// Matches `deployment/postgres/init/03_seed.sql`. The API sends these as
  /// hex on each record; these are the fallbacks and the legend order.
  static const Color ventureDropwing = Color(0xFF8B5CF6);
  static const Color ventureFenixa = Color(0xFF06B6D4);
  static const Color venturePerSyniX = Color(0xFFF59E0B);
  static const Color ventureGrovia = Color(0xFF10B981);

  static const List<Color> ventureFallbacks = [
    ventureDropwing,
    ventureFenixa,
    venturePerSyniX,
    ventureGrovia,
  ];

  /// Parses the `#RRGGBB` / `#AARRGGBB` string the API returns on venture and
  /// project records. Returns [fallback] on anything malformed rather than
  /// throwing, because this runs inside build methods.
  static Color parseHex(String? hex, {Color fallback = primary}) {
    if (hex == null) return fallback;
    var v = hex.trim().replaceFirst('#', '');
    if (v.length == 6) v = 'FF$v';
    if (v.length != 8) return fallback;
    final n = int.tryParse(v, radix: 16);
    return n == null ? fallback : Color(n);
  }

  /// Stable colour for a venture id when the record carries no hex.
  static Color forVentureId(int? id) {
    if (id == null) return textTertiary;
    return ventureFallbacks[(id - 1) % ventureFallbacks.length];
  }

  // ── Light mode ───────────────────────────────────────────────────────────
  //
  // The time system inverts here: "now" becomes the DARKEST value, not the
  // lightest. The rule is contrast, not literal brightness.

  static const Color backgroundLight = Color(0xFFF4F5F8);
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color surfaceCardLight = Color(0xFFFFFFFF);
  static const Color surfaceMutedLight = Color(0xFFEDEFF4);
  static const Color surfaceRaisedLight = Color(0xFFE6E9F0);

  static const Color primaryLight = Color(0xFF6D28D9);
  static const Color highlightLight = Color(0xFF0891B2);

  static const Color successLight = Color(0xFF059669);
  static const Color warningLight = Color(0xFFD97706);
  static const Color criticalLight = Color(0xFFDC2626);

  static const Color textPrimaryLight = Color(0xFF1A1D26);
  static const Color textSecondaryLight = Color(0xFF575F70);
  static const Color textTertiaryLight = Color(0xFF858C9C);

  static const Color timeNowLight = Color(0xFF000000);
  static const Color timeNextLight = Color(0xFF1A1D26);
  static const Color timePastLight = Color(0xFFA8AEBC);

  static const Color borderLight = Color(0xFFE0E3EA);
  static const Color borderStrongLight = Color(0xFFCBD1DC);

  // ── Legacy gradient tokens ───────────────────────────────────────────────
  //
  // The animated radial "nebula" background these fed has been retired — it
  // cost a 20s always-running AnimationController to tint a background nobody
  // looked at. Kept only so the splash screen keeps compiling; do not use in
  // new code.
  @Deprecated('The animated nebula background was retired in the Dayline redesign.')
  static const List<Color> nebulaGradient = [
    background,
    Color(0xFF0E0B18),
    Color(0xFF08111A),
    background,
  ];

  @Deprecated('The animated nebula background was retired in the Dayline redesign.')
  static const List<Color> nebulaGradientLight = [
    backgroundLight,
    Color(0xFFEFEBFA),
    Color(0xFFE7F0F6),
    backgroundLight,
  ];
}

/// Theme-aware tokens that a [ColorScheme] has no slot for.
///
/// Read via `context.dl` (see `theme_context.dart`) so a screen never has to
/// know which brightness it is running under:
///
/// ```dart
/// Text('Standup', style: TextStyle(color: context.dl.timePast))
/// ```
@immutable
class DaylineTokens extends ThemeExtension<DaylineTokens> {
  const DaylineTokens({
    required this.timeNow,
    required this.timeNext,
    required this.timePast,
    required this.surfaceRaised,
    required this.border,
    required this.borderStrong,
    required this.textTertiary,
    required this.success,
    required this.warning,
    required this.critical,
    required this.nowGlow,
  });

  /// Highest-contrast value in the theme. Reserved for what is happening now.
  final Color timeNow;

  /// Ordinary foreground — upcoming and neutral content.
  final Color timeNext;

  /// Receded foreground — anything already done.
  final Color timePast;

  final Color surfaceRaised;
  final Color border;
  final Color borderStrong;
  final Color textTertiary;

  final Color success;
  final Color warning;
  final Color critical;

  /// The single glow in the app, applied only to the live indicator.
  final Color nowGlow;

  static const DaylineTokens dark = DaylineTokens(
    timeNow: NebulaColors.timeNowDark,
    timeNext: NebulaColors.timeNextDark,
    timePast: NebulaColors.timePastDark,
    surfaceRaised: NebulaColors.surfaceRaised,
    border: NebulaColors.borderDark,
    borderStrong: NebulaColors.borderStrongDark,
    textTertiary: NebulaColors.textTertiary,
    success: NebulaColors.success,
    warning: NebulaColors.warning,
    critical: NebulaColors.critical,
    nowGlow: Color(0x59FFFFFF),
  );

  static const DaylineTokens light = DaylineTokens(
    timeNow: NebulaColors.timeNowLight,
    timeNext: NebulaColors.timeNextLight,
    timePast: NebulaColors.timePastLight,
    surfaceRaised: NebulaColors.surfaceRaisedLight,
    border: NebulaColors.borderLight,
    borderStrong: NebulaColors.borderStrongLight,
    textTertiary: NebulaColors.textTertiaryLight,
    success: NebulaColors.successLight,
    warning: NebulaColors.warningLight,
    critical: NebulaColors.criticalLight,
    nowGlow: Color(0x2E000000),
  );

  @override
  DaylineTokens copyWith({
    Color? timeNow,
    Color? timeNext,
    Color? timePast,
    Color? surfaceRaised,
    Color? border,
    Color? borderStrong,
    Color? textTertiary,
    Color? success,
    Color? warning,
    Color? critical,
    Color? nowGlow,
  }) {
    return DaylineTokens(
      timeNow: timeNow ?? this.timeNow,
      timeNext: timeNext ?? this.timeNext,
      timePast: timePast ?? this.timePast,
      surfaceRaised: surfaceRaised ?? this.surfaceRaised,
      border: border ?? this.border,
      borderStrong: borderStrong ?? this.borderStrong,
      textTertiary: textTertiary ?? this.textTertiary,
      success: success ?? this.success,
      warning: warning ?? this.warning,
      critical: critical ?? this.critical,
      nowGlow: nowGlow ?? this.nowGlow,
    );
  }

  @override
  DaylineTokens lerp(ThemeExtension<DaylineTokens>? other, double t) {
    if (other is! DaylineTokens) return this;
    return DaylineTokens(
      timeNow: Color.lerp(timeNow, other.timeNow, t)!,
      timeNext: Color.lerp(timeNext, other.timeNext, t)!,
      timePast: Color.lerp(timePast, other.timePast, t)!,
      surfaceRaised: Color.lerp(surfaceRaised, other.surfaceRaised, t)!,
      border: Color.lerp(border, other.border, t)!,
      borderStrong: Color.lerp(borderStrong, other.borderStrong, t)!,
      textTertiary: Color.lerp(textTertiary, other.textTertiary, t)!,
      success: Color.lerp(success, other.success, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      critical: Color.lerp(critical, other.critical, t)!,
      nowGlow: Color.lerp(nowGlow, other.nowGlow, t)!,
    );
  }
}
