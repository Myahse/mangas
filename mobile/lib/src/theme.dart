import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Aligned with front/src/styles/global.css
abstract final class AppColors {
  static const Color primary = Color(0xFFFF6A00);
  static const Color primaryDark = Color(0xFFE63946);
  static const Color primaryLight = Color(0xFFFFB26B);
  static const Color accentDark = Color(0xFFC1121F);

  static const Color bgDark = Color(0xFF0D0D0D);
  static const Color bgDark2 = Color(0xFF1A1A1A);
  static const Color bgLight = Color(0xFFF4F4F6);
  static const Color bgWhite = Color(0xFFFFFFFF);

  static const Color textDark = Color(0xFF111111);
  static const Color textMuted = Color(0xFF888888);
  static const Color textSecondary = Color(0xFF555555);
  static const Color border = Color(0xFFE0E0E0);

  static const Color rating = Color(0xFFFF6A00);
  static const Color readerBg = Color(0xFF111111);

  static const Color rankGold = Color(0xFFF5C518);
  static const Color rankSilver = Color(0xFFAAAAAA);
  static const Color rankBronze = Color(0xFFCD7F32);

  static const Color infoBarStart = Color(0xFF180609);
  static const Color infoBarMid = Color(0xFF250B0F);

  static const Color navBg = Color(0xE6FFFFFF);
  static const Color navBorder = Color(0x14000000);
}

abstract final class AppRadii {
  static const double sm = 6;
  static const double md = 10;
  static const double lg = 16;
  static const double xl = 24;
}

abstract final class AppShadows {
  static List<BoxShadow> get card => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.08),
          blurRadius: 12,
          offset: const Offset(0, 2),
        ),
      ];

  static List<BoxShadow> get cardHover => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.14),
          blurRadius: 24,
          offset: const Offset(0, 8),
        ),
      ];

  static List<BoxShadow> get nav => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.08),
          blurRadius: 20,
          offset: const Offset(0, 2),
        ),
      ];
}

TextTheme _buildTextTheme(Color textColor) {
  final base = GoogleFonts.interTextTheme().apply(
    bodyColor: textColor,
    displayColor: textColor,
  );
  return base.copyWith(
    headlineLarge: base.headlineLarge?.copyWith(fontWeight: FontWeight.w900, letterSpacing: -0.02),
    headlineMedium: base.headlineMedium?.copyWith(fontWeight: FontWeight.w900, letterSpacing: -0.02),
    titleLarge: base.titleLarge?.copyWith(fontWeight: FontWeight.w800),
    titleMedium: base.titleMedium?.copyWith(fontWeight: FontWeight.w700),
    labelLarge: base.labelLarge?.copyWith(fontWeight: FontWeight.w700),
  );
}

ThemeData buildLightTheme() {
  final textTheme = _buildTextTheme(AppColors.textDark);
  final colorScheme = ColorScheme.fromSeed(
    seedColor: AppColors.primary,
    primary: AppColors.primary,
    secondary: AppColors.primaryDark,
    surface: AppColors.bgWhite,
    brightness: Brightness.light,
  );

  return ThemeData(
    colorScheme: colorScheme,
    useMaterial3: true,
    scaffoldBackgroundColor: AppColors.bgLight,
    textTheme: textTheme,
    appBarTheme: AppBarTheme(
      backgroundColor: AppColors.navBg.withValues(alpha: 0.92),
      foregroundColor: AppColors.textDark,
      elevation: 0,
      scrolledUnderElevation: 0,
      surfaceTintColor: Colors.transparent,
      titleTextStyle: textTheme.titleMedium?.copyWith(fontSize: 18),
    ),
    cardTheme: CardThemeData(
      color: AppColors.bgWhite,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadii.md),
        side: const BorderSide(color: AppColors.border),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadii.sm)),
        textStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.primary,
        side: const BorderSide(color: AppColors.primary, width: 1.5),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadii.sm)),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.bgWhite,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadii.sm),
        borderSide: const BorderSide(color: AppColors.border, width: 1.5),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadii.sm),
        borderSide: const BorderSide(color: AppColors.border, width: 1.5),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadii.sm),
        borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
      ),
      hintStyle: const TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.w500),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: AppColors.bgWhite,
      selectedColor: AppColors.primary,
      labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
      side: const BorderSide(color: AppColors.border),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      padding: const EdgeInsets.symmetric(horizontal: 4),
    ),
    dividerTheme: const DividerThemeData(color: AppColors.border, thickness: 1),
  );
}

Color rankColor(int rank) {
  if (rank == 1) return AppColors.rankGold;
  if (rank == 2) return AppColors.rankSilver;
  if (rank == 3) return AppColors.rankBronze;
  return AppColors.textMuted;
}

Color statusBadgeBg(String status) {
  final key = status.toLowerCase();
  if (key == 'completed') return const Color(0xFFFFEBEE);
  return const Color(0xFFFFF3E0);
}

Color statusBadgeFg(String status) {
  final key = status.toLowerCase();
  if (key == 'completed') return AppColors.accentDark;
  return const Color(0xFFE65100);
}
