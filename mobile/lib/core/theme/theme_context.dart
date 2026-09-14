import 'package:flutter/material.dart';

import 'nebula_colors.dart';

/// Terse, theme-safe accessors.
///
/// The old code read colours straight off `NebulaColors`, which is why 26 of
/// the 38 screens rendered white-on-white the moment light mode was enabled.
/// These getters make doing it correctly shorter than doing it wrong:
///
/// ```dart
/// color: context.dl.timePast          // not NebulaColors.textTertiary
/// style: context.text.titleMedium     // not NebulaTypography.heading2
/// ```
extension DaylineContext on BuildContext {
  ThemeData get theme => Theme.of(this);

  ColorScheme get scheme => Theme.of(this).colorScheme;

  TextTheme get text => Theme.of(this).textTheme;

  /// Dayline tokens (time luminance, borders, raised surface, status colours).
  ///
  /// Falls back to the dark set rather than throwing if the extension is
  /// somehow absent — a missing token should never be the thing that takes a
  /// screen down in front of a user.
  DaylineTokens get dl =>
      Theme.of(this).extension<DaylineTokens>() ??
      (Theme.of(this).brightness == Brightness.dark
          ? DaylineTokens.dark
          : DaylineTokens.light);

  bool get isDark => Theme.of(this).brightness == Brightness.dark;
}

/// Where a piece of content sits relative to now.
///
/// This is the app's core reading aid: callers classify content once, and the
/// widget kit renders the luminance. See [TimeStateColors.foreground].
enum TimeState {
  /// Already happened. Receded.
  past,

  /// Happening right now. The brightest thing on screen, and the only thing
  /// that is allowed to glow.
  now,

  /// Upcoming. Ordinary foreground.
  next,

  /// Upcoming and already late. Ordinary luminance, critical hue — the one
  /// case where hue is allowed to mean something other than a venture.
  overdue,
}

extension TimeStateColors on TimeState {
  /// Foreground colour for text at this time state.
  Color foreground(BuildContext context) {
    final dl = context.dl;
    switch (this) {
      case TimeState.past:
        return dl.timePast;
      case TimeState.now:
        return dl.timeNow;
      case TimeState.next:
        return dl.timeNext;
      case TimeState.overdue:
        return dl.critical;
    }
  }

  /// Weight pairing. "Now" carries extra weight as well as extra contrast so
  /// the distinction survives for colour-blind users and on poor screens.
  FontWeight get weight {
    switch (this) {
      case TimeState.past:
        return FontWeight.w400;
      case TimeState.now:
        return FontWeight.w600;
      case TimeState.next:
      case TimeState.overdue:
        return FontWeight.w500;
    }
  }

  /// Opacity applied to a whole row at this state.
  double get rowOpacity => this == TimeState.past ? 0.45 : 1.0;

  bool get isNow => this == TimeState.now;

  /// Classifies an instant against [now] (defaults to `DateTime.now()`).
  ///
  /// [liveWindow] is how close to now counts as *now* rather than next — used
  /// by the day rail so a meeting starting in two minutes reads as live.
  static TimeState of(
    DateTime when, {
    DateTime? now,
    Duration liveWindow = const Duration(minutes: 15),
    bool completed = false,
  }) {
    final ref = now ?? DateTime.now();
    if (completed) return TimeState.past;
    final delta = when.difference(ref);
    if (delta.isNegative) {
      return delta.abs() <= liveWindow ? TimeState.now : TimeState.overdue;
    }
    return delta <= liveWindow ? TimeState.now : TimeState.next;
  }
}
