import 'dart:async';
import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';
import 'login_screen.dart';
import 'complete_profile_screen.dart';
import 'home_screen.dart';

/// Pantalla de carga (splash) real de MoviCash.
/// Reemplaza al antiguo `AuthGate`: mientras se muestra, decide a dónde
/// mandar al usuario:
/// - Sin sesión -> Login
/// - Con sesión pero sin perfil en la tabla "usuarios" -> Completar perfil
/// - Con sesión y perfil completo -> Home
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with TickerProviderStateMixin {
  late final AnimationController _fadeController;
  late final AnimationController _progressController;
  late final Animation<double> _fadeAnimation;

  final List<String> _loadingMessages = const [
    'Conectando con tu comunidad...',
    'Supervisado y protegido en Perú',
  ];
  int _messageIndex = 0;
  Timer? _messageTimer;

  bool _cargando = true;
  Widget _destino = const LoginScreen();

  @override
  void initState() {
    super.initState();

    _fadeController = AnimationController(vsync: this, duration: const Duration(milliseconds: 700))
      ..forward();
    _fadeAnimation = CurvedAnimation(parent: _fadeController, curve: Curves.easeOut);

    _progressController = AnimationController(vsync: this, duration: const Duration(seconds: 2))
      ..repeat();

    _messageTimer = Timer.periodic(const Duration(milliseconds: 1600), (_) {
      if (!mounted) return;
      setState(() => _messageIndex = (_messageIndex + 1) % _loadingMessages.length);
    });

    _decidir();
  }

  Future<void> _decidir() async {
    // Duración mínima para que el splash no "parpadee" aunque la
    // verificación de sesión/perfil sea instantánea.
    final minDuration = Future.delayed(const Duration(milliseconds: 1400));

    Widget destino;
    if (!AuthService.estaAutenticado) {
      destino = const LoginScreen();
    } else {
      try {
        final perfil = await ApiService.obtenerPerfil();
        destino = perfil == null ? const CompleteProfileScreen() : const HomeScreen();
      } catch (_) {
        destino = const HomeScreen();
      }
    }

    await minDuration;
    if (!mounted) return;
    setState(() {
      _destino = destino;
      _cargando = false;
    });
  }

  @override
  void dispose() {
    _fadeController.dispose();
    _progressController.dispose();
    _messageTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_cargando) return _destino;

    return Scaffold(
      backgroundColor: MoviCashColors.fondoClaro,
      body: SafeArea(
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              children: [
                const SizedBox(height: 24),
                _buildLogo(),
                const SizedBox(height: 28),
                Expanded(child: _buildIllustrationCard()),
                const SizedBox(height: 20),
                _buildBenefitsRow(),
                const SizedBox(height: 24),
                _buildProgressBar(),
                const SizedBox(height: 16),
                _buildLoadingMessage(),
                const SizedBox(height: 8),
                _buildSecurityFootnote(),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLogo() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Image.asset('assets/images/wallet_icon.png', height: 40),
        const SizedBox(width: 10),
        RichText(
          text: TextSpan(
            style: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.w800,
              fontFamily: Theme.of(context).textTheme.headlineLarge?.fontFamily,
            ),
            children: const [
              TextSpan(text: 'Movi', style: TextStyle(color: MoviCashColors.lilaInnovacion)),
              TextSpan(text: 'Cash', style: TextStyle(color: MoviCashColors.verdeMenta)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildIllustrationCard() {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: MoviCashColors.superficieBlanca,
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(color: MoviCashColors.textoOscuro.withOpacity(0.06), blurRadius: 24, offset: const Offset(0, 12)),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Tu dinero, a tu ritmo',
              style: TextStyle(fontSize: 14, color: MoviCashColors.textoGris, fontWeight: FontWeight.w500)),
          const SizedBox(height: 12),
          Expanded(
            child: Stack(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(20),
                  child: SizedBox(
                    width: double.infinity,
                    child: Image.asset('assets/images/mototaxi_illustration.png', fit: BoxFit.cover),
                  ),
                ),
                Positioned(
                  top: 12,
                  right: 12,
                  child: _buildPill(icon: Icons.location_on, label: 'Tingo María'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: MoviCashColors.verdeMentaClaro.withOpacity(0.18), borderRadius: BorderRadius.circular(12)),
                child: const Icon(Icons.bar_chart_rounded, color: MoviCashColors.verdeMenta),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Ruta Segura', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                    Text('Impulso diario para conductores', style: TextStyle(color: MoviCashColors.textoGris, fontSize: 12)),
                  ],
                ),
              ),
              Container(width: 8, height: 8, decoration: const BoxDecoration(color: MoviCashColors.verdeMenta, shape: BoxShape.circle)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPill({required IconData icon, required String label}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: MoviCashColors.superficieBlanca,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: MoviCashColors.textoOscuro.withOpacity(0.08), blurRadius: 8, offset: const Offset(0, 3))],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: MoviCashColors.verdeMenta),
          const SizedBox(width: 4),
          Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: MoviCashColors.textoOscuro)),
        ],
      ),
    );
  }

  Widget _buildBenefitsRow() {
    final items = [
      (Icons.bolt_rounded, 'Al instante'),
      (Icons.groups_rounded, 'Juntas'),
      (Icons.verified_user_rounded, '100% Seguro'),
    ];
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: items.map((item) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(item.$1, size: 18, color: MoviCashColors.lilaInnovacion),
            const SizedBox(width: 6),
            Text(item.$2, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: MoviCashColors.textoOscuro)),
          ],
        );
      }).toList(),
    );
  }

  Widget _buildProgressBar() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: SizedBox(
        height: 6,
        width: double.infinity,
        child: AnimatedBuilder(
          animation: _progressController,
          builder: (context, _) {
            return Stack(
              children: [
                Container(color: MoviCashColors.fondoSecundario),
                Align(
                  alignment: Alignment(-1 + 2 * _progressController.value, 0),
                  child: FractionallySizedBox(
                    widthFactor: 0.45,
                    child: Container(
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(colors: [MoviCashColors.verdeMenta, MoviCashColors.lilaInnovacion]),
                      ),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildLoadingMessage() {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 400),
      child: Text(
        _loadingMessages[_messageIndex],
        key: ValueKey(_messageIndex),
        style: const TextStyle(fontSize: 13, color: MoviCashColors.lilaInnovacion, fontWeight: FontWeight.w500),
      ),
    );
  }

  Widget _buildSecurityFootnote() {
    return const Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(Icons.shield_outlined, size: 14, color: MoviCashColors.textoGris),
        SizedBox(width: 6),
        Text('Supervisado y protegido en Perú', style: TextStyle(fontSize: 11, color: MoviCashColors.textoGris)),
      ],
    );
  }
}
