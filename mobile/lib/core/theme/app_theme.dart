import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'nebula_colors.dart';
import 'nebula_spacing.dart';
import 'nebula_typography.dart';

/// Central Nebula theme definition.
///
/// Everything here is derived from the existing Nebula tokens
/// (`NebulaColors`, `NebulaSpacing`, `NebulaTypography`) so that screens can
/// inherit styling instead of re-declaring `AppBar`s, buttons and inputs by
/// hand.
///
/// Two themes are exposed:
///  * [AppTheme.darkTheme] — the original Nebula look (unchanged palette).
///  * [AppTheme.lightTheme] — same structure, light surfaces.
class AppTheme {
  const AppTheme._();

  // ---------------------------------------------------------------------------
  // Shared geometry tokens
  // ---------------------------------------------------------------------------
  static const double _buttonRadius = NebulaSpacing.radiusSm;
  static const double _inputRadius = NebulaSpacing.radiusSm;
  static const double _cardRadius = NebulaSpacing.radiusMd;
  static const double _sheetRadius = NebulaSpacing.radiusLg;

  static const EdgeInsets _buttonPadding = EdgeInsets.symmetric(
    horizontal: NebulaSpacing.lg,
    vertical: 14,
  );

  static const Size _buttonMinSize = Size(64, 48);

  // ---------------------------------------------------------------------------
  // Public themes
  // ---------------------------------------------------------------------------
  static ThemeData get darkTheme => _build(Brightness.dark);

  static ThemeData get lightTheme => _build(Brightness.light);

  // ---------------------------------------------------------------------------
  // Colour schemes
  //
  // Seeded from the Nebula purple so that every Material widget that derives
  // colours from the ColorScheme (menus, pickers, banners, ...) lands somewhere
  // sensible, then the brand-critical roles are pinned explicitly.
  // ---------------------------------------------------------------------------
  static ColorScheme get _darkScheme {
    return ColorScheme.fromSeed(
      seedColor: NebulaColors.primary,
      brightness: Brightness.dark,
    ).copyWith(
      primary: NebulaColors.primary,
      onPrimary: Colors.white,
      secondary: NebulaColors.highlight,
      onSecondary: const Color(0xFF04202A),
      tertiary: NebulaColors.success,
      onTertiary: const Color(0xFF00210B),
      error: NebulaColors.critical,
      onError: Colors.white,
      surface: NebulaColors.surface,
      onSurface: NebulaColors.textPrimary,
      onSurfaceVariant: NebulaColors.textSecondary,
      // Pinned: ColorScheme.fromSeed derives a purple-tinted grey ramp, but
      // the widget kit paints every card from surfaceContainerHighest and
      // must land on the Dayline token exactly.
      surfaceContainerLowest: NebulaColors.background,
      surfaceContainerLow: NebulaColors.surface,
      surfaceContainer: NebulaColors.surface,
      surfaceContainerHigh: NebulaColors.surfaceCard,
      surfaceContainerHighest: NebulaColors.surfaceCard,
      outline: const Color(0xFF3A3F4B),
      outlineVariant: const Color(0xFF262B35),
      shadow: Colors.black,
      surfaceTint: Colors.transparent,
    );
  }

  static ColorScheme get _lightScheme {
    return ColorScheme.fromSeed(
      seedColor: NebulaColors.primary,
      brightness: Brightness.light,
    ).copyWith(
      primary: NebulaColors.primaryLight,
      onPrimary: Colors.white,
      secondary: NebulaColors.highlightLight,
      onSecondary: Colors.white,
      tertiary: NebulaColors.successLight,
      onTertiary: Colors.white,
      error: NebulaColors.criticalLight,
      onError: Colors.white,
      surface: NebulaColors.surfaceLight,
      onSurface: NebulaColors.textPrimaryLight,
      onSurfaceVariant: NebulaColors.textSecondaryLight,
      surfaceContainerLowest: Colors.white,
      surfaceContainerLow: NebulaColors.surfaceLight,
      surfaceContainer: NebulaColors.surfaceLight,
      surfaceContainerHigh: NebulaColors.surfaceCardLight,
      surfaceContainerHighest: NebulaColors.surfaceCardLight,
      outline: const Color(0xFFCBD5E1),
      outlineVariant: NebulaColors.borderLight,
      shadow: Colors.black,
      surfaceTint: Colors.transparent,
    );
  }

  // ---------------------------------------------------------------------------
  // Builder
  // ---------------------------------------------------------------------------
  static ThemeData _build(Brightness brightness) {
    final bool isDark = brightness == Brightness.dark;

    final ColorScheme scheme = isDark ? _darkScheme : _lightScheme;
    final TextTheme text =
        isDark ? NebulaTypography.textTheme : NebulaTypography.lightTextTheme;

    // Resolved token aliases for this brightness.
    final Color background =
        isDark ? NebulaColors.background : NebulaColors.backgroundLight;
    final Color surface =
        isDark ? NebulaColors.surface : NebulaColors.surfaceLight;
    final Color card =
        isDark ? NebulaColors.surfaceCard : NebulaColors.surfaceCardLight;
    final Color muted =
        isDark ? NebulaColors.surface : NebulaColors.surfaceMutedLight;
    final Color textPrimary =
        isDark ? NebulaColors.textPrimary : NebulaColors.textPrimaryLight;
    final Color textSecondary =
        isDark ? NebulaColors.textSecondary : NebulaColors.textSecondaryLight;
    final Color border =
        isDark ? NebulaColors.borderDark : NebulaColors.borderLight;
    final Color accent =
        isDark ? NebulaColors.primary : NebulaColors.primaryLight;
    final Color highlight =
        isDark ? NebulaColors.highlight : NebulaColors.highlightLight;
    final Color danger =
        isDark ? NebulaColors.critical : NebulaColors.criticalLight;
    final Color disabled = textSecondary.withValues(alpha: 0.38);
    final Color disabledSurface = textSecondary.withValues(alpha: 0.12);

    final BorderRadius buttonShapeRadius =
        BorderRadius.circular(_buttonRadius);
    final BorderRadius inputShapeRadius = BorderRadius.circular(_inputRadius);

    OutlineInputBorder inputBorder(Color color, [double width = 1]) {
      return OutlineInputBorder(
        borderRadius: inputShapeRadius,
        borderSide: BorderSide(color: color, width: width),
      );
    }

    // Base ThemeData: only the top-level, always-stable knobs. Sub-themes are
    // layered on with copyWith below.
    final ThemeData base = ThemeData(
      brightness: brightness,
      useMaterial3: true,
      colorScheme: scheme,
      textTheme: text,
      // Dayline tokens the ColorScheme has no slot for — time luminance,
      // hairlines, the raised surface. Read via `context.dl`.
      extensions: <ThemeExtension<dynamic>>[
        brightness == Brightness.dark ? DaylineTokens.dark : DaylineTokens.light,
      ],
      primaryColor: accent,
      scaffoldBackgroundColor: background,
      canvasColor: surface,
      dividerColor: border,
      disabledColor: disabled,
      shadowColor: Colors.black,
      splashColor: accent.withValues(alpha: 0.10),
      highlightColor: accent.withValues(alpha: 0.06),
      hoverColor: accent.withValues(alpha: 0.04),
      focusColor: accent.withValues(alpha: 0.12),
      visualDensity: VisualDensity.adaptivePlatformDensity,
    );

    return base.copyWith(
      // -----------------------------------------------------------------------
      // App bar — replaces the hand-rolled
      // `backgroundColor: NebulaColors.surfaceCard` block repeated per screen.
      // -----------------------------------------------------------------------
      appBarTheme: base.appBarTheme.copyWith(
        backgroundColor: card,
        foregroundColor: textPrimary,
        surfaceTintColor: Colors.transparent,
        shadowColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleSpacing: NebulaSpacing.md,
        toolbarHeight: 56,
        iconTheme: IconThemeData(color: textPrimary, size: 22),
        actionsIconTheme: IconThemeData(color: textSecondary, size: 22),
        titleTextStyle: text.titleLarge,
        toolbarTextStyle: text.bodyMedium,
        systemOverlayStyle: isDark
            ? SystemUiOverlayStyle.light
            : SystemUiOverlayStyle.dark,
      ),

      // -----------------------------------------------------------------------
      // Surfaces
      //
      // NOTE: `cardTheme` / `dialogTheme` / `tabBarTheme` / `inputDecorationTheme`
      // changed their declared type across Flutter versions
      // (CardTheme -> CardThemeData, DialogTheme -> DialogThemeData, ...).
      // Copying the base instance keeps this file compiling on either side of
      // that migration without naming the class at all.
      // -----------------------------------------------------------------------
      cardTheme: base.cardTheme.copyWith(
        color: card,
        surfaceTintColor: Colors.transparent,
        shadowColor: Colors.black.withValues(alpha: isDark ? 0.5 : 0.08),
        elevation: isDark ? 0 : 1,
        clipBehavior: Clip.antiAlias,
        margin: const EdgeInsets.symmetric(
          horizontal: NebulaSpacing.md,
          vertical: NebulaSpacing.sm,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(_cardRadius),
          side: BorderSide(color: border),
        ),
      ),

      dialogTheme: base.dialogTheme.copyWith(
        backgroundColor: card,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        titleTextStyle: text.titleLarge,
        contentTextStyle: text.bodyMedium,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(_cardRadius),
          side: BorderSide(color: border),
        ),
      ),

      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: card,
        modalBackgroundColor: card,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        modalElevation: 0,
        showDragHandle: true,
        dragHandleColor: textSecondary.withValues(alpha: 0.4),
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(_sheetRadius),
          ),
        ),
      ),

      drawerTheme: DrawerThemeData(
        backgroundColor: surface,
        surfaceTintColor: Colors.transparent,
        scrimColor: Colors.black.withValues(alpha: 0.6),
        elevation: 0,
      ),

      popupMenuTheme: PopupMenuThemeData(
        color: card,
        surfaceTintColor: Colors.transparent,
        elevation: 4,
        textStyle: text.bodyMedium?.copyWith(color: textPrimary),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(NebulaSpacing.radiusSm),
          side: BorderSide(color: border),
        ),
      ),

      // -----------------------------------------------------------------------
      // Buttons
      // -----------------------------------------------------------------------
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: accent,
          foregroundColor: Colors.white,
          disabledBackgroundColor: disabledSurface,
          disabledForegroundColor: disabled,
          elevation: 0,
          shadowColor: Colors.transparent,
          padding: _buttonPadding,
          minimumSize: _buttonMinSize,
          textStyle: text.labelLarge,
          shape: RoundedRectangleBorder(borderRadius: buttonShapeRadius),
        ),
      ),

      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: accent,
          foregroundColor: Colors.white,
          disabledBackgroundColor: disabledSurface,
          disabledForegroundColor: disabled,
          elevation: 0,
          padding: _buttonPadding,
          minimumSize: _buttonMinSize,
          textStyle: text.labelLarge,
          shape: RoundedRectangleBorder(borderRadius: buttonShapeRadius),
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: accent,
          disabledForegroundColor: disabled,
          backgroundColor: Colors.transparent,
          padding: _buttonPadding,
          minimumSize: _buttonMinSize,
          textStyle: text.labelLarge,
          side: BorderSide(color: accent.withValues(alpha: 0.5)),
          shape: RoundedRectangleBorder(borderRadius: buttonShapeRadius),
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: accent,
          disabledForegroundColor: disabled,
          padding: const EdgeInsets.symmetric(
            horizontal: NebulaSpacing.md,
            vertical: NebulaSpacing.sm,
          ),
          minimumSize: const Size(48, 40),
          textStyle: text.labelLarge,
          shape: RoundedRectangleBorder(borderRadius: buttonShapeRadius),
        ),
      ),

      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(
          foregroundColor: textSecondary,
          disabledForegroundColor: disabled,
          highlightColor: accent.withValues(alpha: 0.12),
        ),
      ),

      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: accent,
        foregroundColor: Colors.white,
        elevation: 0,
        focusElevation: 0,
        hoverElevation: 0,
        highlightElevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(_cardRadius),
        ),
      ),

      // -----------------------------------------------------------------------
      // Inputs
      // -----------------------------------------------------------------------
      inputDecorationTheme: base.inputDecorationTheme.copyWith(
        filled: true,
        fillColor: isDark ? NebulaColors.surfaceCard : muted,
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: NebulaSpacing.md,
          vertical: NebulaSpacing.md,
        ),
        hintStyle: text.bodyMedium?.copyWith(
          color: textSecondary.withValues(alpha: 0.7),
        ),
        labelStyle: text.bodyMedium?.copyWith(color: textSecondary),
        floatingLabelStyle: text.bodyMedium?.copyWith(color: accent),
        helperStyle: text.bodySmall?.copyWith(color: textSecondary),
        errorStyle: text.bodySmall?.copyWith(color: danger),
        prefixIconColor: textSecondary,
        suffixIconColor: textSecondary,
        border: inputBorder(border),
        enabledBorder: inputBorder(border),
        focusedBorder: inputBorder(accent, 1.5),
        disabledBorder: inputBorder(border.withValues(alpha: 0.5)),
        errorBorder: inputBorder(danger),
        focusedErrorBorder: inputBorder(danger, 1.5),
      ),

      textSelectionTheme: TextSelectionThemeData(
        cursorColor: accent,
        selectionColor: accent.withValues(alpha: 0.3),
        selectionHandleColor: accent,
      ),

      // -----------------------------------------------------------------------
      // Navigation
      // -----------------------------------------------------------------------
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: card,
        surfaceTintColor: Colors.transparent,
        indicatorColor: accent.withValues(alpha: 0.18),
        elevation: 0,
        height: 68,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        indicatorShape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(NebulaSpacing.radiusFull),
        ),
        iconTheme: WidgetStateProperty.resolveWith<IconThemeData>((states) {
          final bool selected = states.contains(WidgetState.selected);
          return IconThemeData(
            size: 22,
            color: selected ? accent : textSecondary,
          );
        }),
        labelTextStyle: WidgetStateProperty.resolveWith<TextStyle>((states) {
          final bool selected = states.contains(WidgetState.selected);
          final TextStyle style = text.labelSmall ?? const TextStyle();
          return style.copyWith(color: selected ? accent : textSecondary);
        }),
      ),

      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: card,
        selectedItemColor: accent,
        unselectedItemColor: textSecondary,
        selectedLabelStyle: text.labelSmall,
        unselectedLabelStyle: text.labelSmall,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
        showSelectedLabels: true,
        showUnselectedLabels: true,
      ),

      navigationRailTheme: NavigationRailThemeData(
        backgroundColor: card,
        indicatorColor: accent.withValues(alpha: 0.18),
        selectedIconTheme: IconThemeData(color: accent, size: 22),
        unselectedIconTheme: IconThemeData(color: textSecondary, size: 22),
        selectedLabelTextStyle: text.labelSmall?.copyWith(color: accent),
        unselectedLabelTextStyle:
            text.labelSmall?.copyWith(color: textSecondary),
        elevation: 0,
      ),

      tabBarTheme: base.tabBarTheme.copyWith(
        labelColor: accent,
        unselectedLabelColor: textSecondary,
        labelStyle: text.labelLarge,
        unselectedLabelStyle: text.labelLarge?.copyWith(
          fontWeight: FontWeight.w500,
        ),
        indicatorColor: accent,
        indicatorSize: TabBarIndicatorSize.label,
        dividerColor: Colors.transparent,
      ),

      // -----------------------------------------------------------------------
      // Small components
      // -----------------------------------------------------------------------
      chipTheme: ChipThemeData(
        backgroundColor: isDark ? NebulaColors.surfaceCard : muted,
        selectedColor: accent.withValues(alpha: 0.2),
        disabledColor: disabledSurface,
        checkmarkColor: accent,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        pressElevation: 0,
        showCheckmark: false,
        labelStyle: text.labelSmall?.copyWith(color: textPrimary),
        secondaryLabelStyle: text.labelSmall?.copyWith(color: accent),
        padding: const EdgeInsets.symmetric(
          horizontal: NebulaSpacing.sm,
          vertical: NebulaSpacing.xs,
        ),
        side: BorderSide(color: border),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(NebulaSpacing.radiusFull),
        ),
      ),

      // Kept identical to the original theme (colour + thickness only) so
      // existing `Divider()` layouts do not shift.
      dividerTheme: DividerThemeData(
        color: border,
        thickness: 1,
      ),

      listTileTheme: ListTileThemeData(
        tileColor: Colors.transparent,
        selectedTileColor: accent.withValues(alpha: 0.10),
        selectedColor: accent,
        iconColor: textSecondary,
        textColor: textPrimary,
        titleTextStyle: text.titleMedium,
        subtitleTextStyle: text.bodySmall,
        leadingAndTrailingTextStyle: text.labelSmall,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: NebulaSpacing.md,
          vertical: NebulaSpacing.xs,
        ),
        horizontalTitleGap: NebulaSpacing.md,
        minLeadingWidth: 24,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(NebulaSpacing.radiusSm),
        ),
      ),

      snackBarTheme: SnackBarThemeData(
        backgroundColor: isDark ? NebulaColors.surfaceCard : const Color(0xFF1F2937),
        contentTextStyle: text.bodyMedium?.copyWith(
          color: NebulaColors.textPrimary,
        ),
        actionTextColor: highlight,
        behavior: SnackBarBehavior.floating,
        elevation: 4,
        insetPadding: const EdgeInsets.all(NebulaSpacing.md),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(NebulaSpacing.radiusSm),
        ),
      ),

      tooltipTheme: TooltipThemeData(
        decoration: BoxDecoration(
          color: isDark ? NebulaColors.surfaceCard : const Color(0xFF1F2937),
          borderRadius: BorderRadius.circular(NebulaSpacing.radiusSm),
          border: Border.all(color: border),
        ),
        textStyle: text.bodySmall?.copyWith(color: NebulaColors.textPrimary),
        padding: const EdgeInsets.symmetric(
          horizontal: NebulaSpacing.sm,
          vertical: NebulaSpacing.xs,
        ),
      ),

      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: accent,
        linearTrackColor: accent.withValues(alpha: 0.15),
        circularTrackColor: Colors.transparent,
        refreshBackgroundColor: card,
      ),

      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith<Color>((states) {
          if (states.contains(WidgetState.disabled)) return disabled;
          if (states.contains(WidgetState.selected)) return Colors.white;
          return textSecondary;
        }),
        trackColor: WidgetStateProperty.resolveWith<Color>((states) {
          if (states.contains(WidgetState.disabled)) return disabledSurface;
          if (states.contains(WidgetState.selected)) return accent;
          return isDark ? NebulaColors.surface : muted;
        }),
        trackOutlineColor: WidgetStateProperty.resolveWith<Color>((states) {
          if (states.contains(WidgetState.selected)) return Colors.transparent;
          return border;
        }),
      ),

      checkboxTheme: CheckboxThemeData(
        fillColor: WidgetStateProperty.resolveWith<Color>((states) {
          if (states.contains(WidgetState.disabled)) return disabledSurface;
          if (states.contains(WidgetState.selected)) return accent;
          return Colors.transparent;
        }),
        checkColor: WidgetStateProperty.all<Color>(Colors.white),
        side: BorderSide(color: textSecondary.withValues(alpha: 0.6), width: 1.5),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(NebulaSpacing.xs),
        ),
      ),

      radioTheme: RadioThemeData(
        fillColor: WidgetStateProperty.resolveWith<Color>((states) {
          if (states.contains(WidgetState.disabled)) return disabled;
          if (states.contains(WidgetState.selected)) return accent;
          return textSecondary;
        }),
      ),

      sliderTheme: SliderThemeData(
        activeTrackColor: accent,
        inactiveTrackColor: accent.withValues(alpha: 0.2),
        thumbColor: accent,
        overlayColor: accent.withValues(alpha: 0.12),
      ),

      iconTheme: IconThemeData(color: textSecondary, size: 22),
      primaryIconTheme: IconThemeData(color: textPrimary, size: 22),

      pageTransitionsTheme: const PageTransitionsTheme(
        builders: <TargetPlatform, PageTransitionsBuilder>{
          TargetPlatform.android: ZoomPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.macOS: CupertinoPageTransitionsBuilder(),
        },
      ),
    );
  }
}
