import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive/hive.dart';

/// Name of the Hive box opened in `main()` before `runApp`.
const String kUserPrefsBoxName = 'user_prefs';

/// Key the selected theme mode is persisted under.
const String kThemeModeKey = 'theme_mode';

/// Mode used when nothing has been persisted yet.
///
/// Deliberately [ThemeMode.dark] rather than [ThemeMode.system]: most screens
/// still paint themselves with the hard-coded dark `NebulaColors` tokens, so a
/// device in light mode would otherwise show white-on-white until those screens
/// are migrated to `Theme.of(context)`. Flip this to [ThemeMode.system] once
/// the feature screens read their colours from the theme.
const ThemeMode kDefaultThemeMode = ThemeMode.dark;

/// Persisted app theme mode.
///
/// Stored in the already-open `user_prefs` Hive box as one of the strings
/// `'light'`, `'dark'` or `'system'` — the same vocabulary the Settings screen
/// dropdown already uses, so it can hand its value straight through to
/// [ThemeModeNotifier.setFromString].
class ThemeModeNotifier extends Notifier<ThemeMode> {
  @override
  ThemeMode build() => _read();

  /// Sets and persists the theme mode.
  void setThemeMode(ThemeMode mode) {
    if (state == mode) return;
    state = mode;
    _write(mode);
  }

  /// Convenience entry point for UI that models the choice as a string
  /// (`'light'` / `'dark'` / `'system'`). Unknown values fall back to system.
  void setFromString(String value) => setThemeMode(themeModeFromString(value));

  /// Cycles light -> dark -> system -> light. Handy for a quick toggle button.
  void cycle() {
    if (state == ThemeMode.light) {
      setThemeMode(ThemeMode.dark);
    } else if (state == ThemeMode.dark) {
      setThemeMode(ThemeMode.system);
    } else {
      setThemeMode(ThemeMode.light);
    }
  }

  static Box<dynamic>? _box() {
    if (!Hive.isBoxOpen(kUserPrefsBoxName)) return null;
    return Hive.box(kUserPrefsBoxName);
  }

  static ThemeMode _read() {
    try {
      final Box<dynamic>? box = _box();
      if (box == null) return kDefaultThemeMode;
      final Object? raw = box.get(kThemeModeKey);
      if (raw is String) return themeModeFromString(raw);
      return kDefaultThemeMode;
    } catch (_) {
      // Never let a storage problem stop the app from rendering.
      return kDefaultThemeMode;
    }
  }

  static void _write(ThemeMode mode) {
    try {
      _box()?.put(kThemeModeKey, themeModeToString(mode));
    } catch (_) {
      // Persisting is best-effort; the in-memory state is still correct.
    }
  }
}

/// The app-wide theme mode. Watch this in `MaterialApp.router(themeMode: ...)`.
final NotifierProvider<ThemeModeNotifier, ThemeMode> themeModeProvider =
    NotifierProvider<ThemeModeNotifier, ThemeMode>(ThemeModeNotifier.new);

/// String form of the current theme mode, for dropdowns/radio lists that model
/// the choice as `'light' | 'dark' | 'system'`.
final Provider<String> themeModeStringProvider = Provider<String>((ref) {
  return themeModeToString(ref.watch(themeModeProvider));
});

ThemeMode themeModeFromString(String? value) {
  if (value == 'light') return ThemeMode.light;
  if (value == 'dark') return ThemeMode.dark;
  return ThemeMode.system;
}

String themeModeToString(ThemeMode mode) {
  if (mode == ThemeMode.light) return 'light';
  if (mode == ThemeMode.dark) return 'dark';
  return 'system';
}
