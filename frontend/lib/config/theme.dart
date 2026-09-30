import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Paleta oficial de MoviCash — alineada al nuevo diseño de marca
/// (verde esmeralda / verde menta / verde claro / azul petróleo).
class MoviCashColors {
  // Acentos de marca / funcionales
  static const verdeMenta = Color(0xFF00796B); // Principal — crédito, pagos, acción primaria
  static const verdeMentaClaro = Color(0xFFA7E3CF); // Secundario — verde menta
  static const lilaInnovacion = Color(0xFF003B46); // Azul petróleo — identidad, MoviScore, navegación
  static const lilaClaro = Color(0xFFE8F7EF); // Apoyo — verde claro
  static const amarilloPastel = Color(0xFFA7E3CF); // Progreso diario, alertas suaves (verde menta)
  static const amarilloClaro = Color(0xFFE8F7EF);
  static const celesteSeguridad = Color(0xFF003B46); // Seguridad, verificación (azul petróleo)
  static const celesteClaro = Color(0xFFE8F7EF);
  static const rosaComunidad = Color(0xFF00796B); // Círculos de ahorro / comunidad (verde esmeralda)
  static const rosaClaro = Color(0xFFE8F7EF);

  // Fondos y superficies
  static const fondoClaro = Color(0xFFF7FBFA);
  static const fondoSecundario = Color(0xFFE8F7EF);
  static const superficieBlanca = Color(0xFFFFFFFF);

  // Texto
  static const textoOscuro = Color(0xFF003B46); // Azul petróleo
  static const textoGris = Color(0xFF5B7A80);
  static const textoGrisClaro = Color(0xFF9FB8BC);

  static const error = Color(0xFFBA1A1A);
}

TextTheme _buildTextTheme(TextTheme base) {
  return GoogleFonts.plusJakartaSansTextTheme(base).copyWith(
    headlineLarge: GoogleFonts.plusJakartaSans(
        fontSize: 26, fontWeight: FontWeight.w700, color: MoviCashColors.textoOscuro),
    headlineMedium: GoogleFonts.plusJakartaSans(
        fontSize: 20, fontWeight: FontWeight.w700, color: MoviCashColors.textoOscuro),
    headlineSmall: GoogleFonts.plusJakartaSans(
        fontSize: 18, fontWeight: FontWeight.w600, color: MoviCashColors.textoOscuro),
    titleMedium: GoogleFonts.plusJakartaSans(
        fontSize: 16, fontWeight: FontWeight.w600, color: MoviCashColors.textoOscuro),
    bodyLarge: GoogleFonts.plusJakartaSans(
        fontSize: 15, fontWeight: FontWeight.w500, color: MoviCashColors.textoOscuro),
    bodyMedium: GoogleFonts.plusJakartaSans(
        fontSize: 14, fontWeight: FontWeight.w400, color: MoviCashColors.textoGris),
    bodySmall: GoogleFonts.plusJakartaSans(
        fontSize: 12, fontWeight: FontWeight.w400, color: MoviCashColors.textoGrisClaro),
    labelMedium: GoogleFonts.plusJakartaSans(
        fontSize: 13, fontWeight: FontWeight.w600, color: MoviCashColors.textoOscuro),
    labelSmall: GoogleFonts.plusJakartaSans(
        fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.2, color: MoviCashColors.textoGris),
  );
}

/// Estilo grande para montos en soles (S/), como pide el design system
/// (`display-currency`, con numerales tabulares).
TextStyle displayCurrency({double size = 38}) => GoogleFonts.plusJakartaSans(
      fontSize: size,
      fontWeight: FontWeight.w800,
      height: 1.15,
      color: MoviCashColors.textoOscuro,
      fontFeatures: const [FontFeature.tabularFigures()],
    );

final ThemeData moviCashTheme = ThemeData(
  useMaterial3: true,
  scaffoldBackgroundColor: MoviCashColors.fondoClaro,
  primaryColor: MoviCashColors.verdeMenta,
  colorScheme: ColorScheme.fromSeed(
    seedColor: MoviCashColors.verdeMenta,
    primary: MoviCashColors.verdeMenta,
    secondary: MoviCashColors.lilaInnovacion,
    tertiary: MoviCashColors.amarilloPastel,
    error: MoviCashColors.error,
    surface: MoviCashColors.superficieBlanca,
  ),
  textTheme: _buildTextTheme(ThemeData.light().textTheme),
  appBarTheme: AppBarTheme(
    backgroundColor: Colors.transparent,
    elevation: 0,
    foregroundColor: MoviCashColors.textoOscuro,
    centerTitle: false,
    titleTextStyle: GoogleFonts.plusJakartaSans(
        fontSize: 18, fontWeight: FontWeight.w700, color: MoviCashColors.textoOscuro),
  ),
  elevatedButtonTheme: ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      backgroundColor: MoviCashColors.verdeMenta,
      foregroundColor: Colors.white,
      elevation: 0,
      padding: const EdgeInsets.symmetric(vertical: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      textStyle: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w700),
    ).copyWith(
      shadowColor: WidgetStateProperty.all(MoviCashColors.verdeMenta.withOpacity(0.35)),
    ),
  ),
  textButtonTheme: TextButtonThemeData(
    style: TextButton.styleFrom(
      foregroundColor: MoviCashColors.lilaInnovacion,
      textStyle: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w600),
    ),
  ),
  cardTheme: CardThemeData(
    color: MoviCashColors.superficieBlanca,
    elevation: 0,
    surfaceTintColor: Colors.transparent,
    shadowColor: MoviCashColors.textoOscuro.withOpacity(0.06),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
    margin: EdgeInsets.zero,
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: MoviCashColors.fondoSecundario,
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    labelStyle: GoogleFonts.plusJakartaSans(color: MoviCashColors.textoGris, fontSize: 14),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(16),
      borderSide: BorderSide.none,
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(16),
      borderSide: BorderSide.none,
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(16),
      borderSide: const BorderSide(color: MoviCashColors.verdeMenta, width: 1.8),
    ),
    errorBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(16),
      borderSide: const BorderSide(color: MoviCashColors.error, width: 1.4),
    ),
  ),
  chipTheme: ChipThemeData(
    backgroundColor: MoviCashColors.fondoSecundario,
    selectedColor: MoviCashColors.verdeMenta,
    labelStyle: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w600),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(999),
      side: const BorderSide(color: Color(0xFFE2E8F0)),
    ),
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
  ),
  bottomNavigationBarTheme: BottomNavigationBarThemeData(
    backgroundColor: Colors.white,
    elevation: 12,
    selectedItemColor: MoviCashColors.lilaInnovacion,
    unselectedItemColor: MoviCashColors.textoGrisClaro,
    selectedLabelStyle: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700),
    unselectedLabelStyle: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w600),
  ),
);
