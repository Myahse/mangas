import 'package:flutter/material.dart';

/// Aligned with front/src/styles/global.css
abstract final class AppColors {
  static const Color primary = Color(0xFFFF6A00);
  static const Color primaryDark = Color(0xFFE63946);
  static const Color primaryLight = Color(0xFFFFB26B);
  static const Color bgLight = Color(0xFFF4F4F6);
  static const Color bgWhite = Color(0xFFFFFFFF);
  static const Color textDark = Color(0xFF111111);
  static const Color textMuted = Color(0xFF888888);
  static const Color textSecondary = Color(0xFF555555);
  static const Color border = Color(0xFFE0E0E0);
  static const Color rating = Color(0xFFF5A623);
  static const Color readerBg = Color(0xFF111111);
}

ThemeData buildLightTheme() {
  final base = ThemeData(
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      primary: AppColors.primary,
      surface: AppColors.bgWhite,
      brightness: Brightness.light,
    ),
    useMaterial3: true,
  );
  return base.copyWith(
    scaffoldBackgroundColor: AppColors.bgLight,
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.bgWhite,
      foregroundColor: AppColors.textDark,
      elevation: 0,
      scrolledUnderElevation: 0.5,
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: AppColors.bgWhite,
      indicatorColor: AppColors.primary.withValues(alpha: 0.12),
      labelTextStyle: WidgetStateProperty.resolveWith(
        (s) => TextStyle(
          fontWeight: s.contains(WidgetState.selected) ? FontWeight.w700 : FontWeight.w500,
          fontSize: 12,
        ),
      ),
    ),
  );
}
