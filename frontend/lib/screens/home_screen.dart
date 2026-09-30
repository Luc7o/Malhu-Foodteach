import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../config/supabase_config.dart';
import '../services/api_service.dart';
import '../widgets/bottom_nav.dart';
import 'request_credit_screen.dart';
import 'circles_screen.dart';
import 'moviscore_screen.dart';
import 'movements_screen.dart';
import 'profile_screen.dart';
import 'my_credit_screen.dart';
import 'community_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _tab = 0;
  Map<String, dynamic>? _moviscore;
  Map<String, dynamic>? _creditoActivo;
  Map<String, dynamic>? _perfil;
  bool _cargando = true;
  String? _error;

  String? get _fotoPerfilUrl {
    final path = _perfil?['foto_perfil_path'] as String?;
    if (path == null) return null;
    return supabase.storage.from('avatars').getPublicUrl(path);
  }

  @override
  void initState() {
    super.initState();
    _cargarDatos();
  }

  Future<void> _cargarDatos() async {
    setState(() {
      _cargando = true;
      _error = null;
    });
    try {
      final perfil = await ApiService.obtenerPerfil();
      final score = await ApiService.obtenerMoviscore();
      final credito = await ApiService.creditoActivo();
      if (!mounted) return;
      setState(() {
        _perfil = perfil;
        _moviscore = score;
        _creditoActivo = credito;
      });
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final pantallas = [
      _buildHome(),
      const MovementsScreen(),
      const CommunityScreen(),
      const ProfileScreen(),
    ];

    return Scaffold(
      body: SafeArea(child: pantallas[_tab]),
      bottomNavigationBar: MoviCashBottomNav(
        currentIndex: _tab,
        onTap: (i) => setState(() => _tab = i),
      ),
    );
  }

  Widget _buildHome() {
    if (_cargando) return const Center(child: CircularProgressIndicator());

    if (_error != null && _moviscore == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off_rounded, size: 40, color: MoviCashColors.textoGris),
              const SizedBox(height: 12),
              const Text('No pudimos conectar con MoviCash', textAlign: TextAlign.center),
              const SizedBox(height: 6),
              Text(_error!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: MoviCashColors.textoGris, fontSize: 12)),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: _cargarDatos, child: const Text('Reintentar')),
            ],
          ),
        ),
      );
    }

    final nombre = (_perfil?['nombre'] as String?)?.split(' ').first ?? 'ahí';
    final score = _moviscore?['moviscore_actual'] ?? 500;
    final nivel = _moviscore?['nivel_moviscore'] ?? 'Nuevo';
    final credMin = (_moviscore?['credito_disponible_min'] ?? 50).toString();
    final credMax = (_moviscore?['credito_disponible_max'] ?? 200).toString();

    return RefreshIndicator(
      onRefresh: _cargarDatos,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  GestureDetector(
                    onTap: () => setState(() => _tab = 3),
                    child: CircleAvatar(
                      radius: 22,
                      backgroundColor: MoviCashColors.lilaInnovacion.withOpacity(0.14),
                      backgroundImage: _fotoPerfilUrl != null ? NetworkImage(_fotoPerfilUrl!) : null,
                      child: _fotoPerfilUrl == null
                          ? Text(
                              nombre.isNotEmpty ? nombre[0].toUpperCase() : '?',
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 16,
                                color: MoviCashColors.lilaInnovacion,
                              ),
                            )
                          : null,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Hola, $nombre 👋',
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                      const Text('¡Qué bueno verte de nuevo!',
                          style: TextStyle(color: MoviCashColors.textoGris, fontSize: 12)),
                    ],
                  ),
                ],
              ),
              Container(
                decoration: BoxDecoration(
                  color: MoviCashColors.fondoSecundario,
                  shape: BoxShape.circle,
                ),
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    IconButton(
                      onPressed: () {},
                      icon: const Icon(Icons.notifications_none, color: MoviCashColors.textoOscuro),
                    ),
                    Positioned(
                      top: 10,
                      right: 10,
                      child: Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: MoviCashColors.rosaComunidad,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 22),

          GestureDetector(
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MoviscoreScreen())),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Row(
                  children: [
                    SizedBox(
                      width: 54,
                      height: 54,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          SizedBox(
                            width: 54,
                            height: 54,
                            child: CircularProgressIndicator(
                              value: (((score as num).toDouble() - 300) / (850 - 300)).clamp(0.05, 1.0),
                              strokeWidth: 4.5,
                              backgroundColor: MoviCashColors.lilaInnovacion.withOpacity(0.12),
                              valueColor:
                                  const AlwaysStoppedAnimation(MoviCashColors.lilaInnovacion),
                            ),
                          ),
                          const Icon(Icons.verified_outlined,
                              color: MoviCashColors.lilaInnovacion, size: 22),
                        ],
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('MoviScore', style: TextStyle(color: MoviCashColors.textoGris)),
                          Text('$score',
                              style: const TextStyle(fontSize: 30, fontWeight: FontWeight.bold)),
                          Text(nivel, style: const TextStyle(color: MoviCashColors.verdeMenta)),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right, color: MoviCashColors.textoGris),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),

          Container(
            decoration: BoxDecoration(
              gradient: _creditoActivo == null
                  ? const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [MoviCashColors.verdeMenta, Color(0xFF047857)],
                    )
                  : null,
              color: _creditoActivo == null ? null : Colors.white,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: (_creditoActivo == null ? MoviCashColors.verdeMenta : MoviCashColors.textoOscuro)
                      .withOpacity(_creditoActivo == null ? 0.28 : 0.05),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Stack(
              children: [
                if (_creditoActivo == null)
                  Positioned(
                    right: -18,
                    top: -18,
                    child: Icon(Icons.bolt_rounded, size: 110, color: Colors.white.withOpacity(0.10)),
                  ),
                Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (_creditoActivo == null) ...[
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Crédito disponible', style: TextStyle(color: Colors.white70)),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.18),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: const Text('Desembolso ya',
                                  style: TextStyle(
                                      fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text('S/ $credMin – S/ $credMax',
                            style: displayCurrency(size: 30).copyWith(color: Colors.white)),
                        const SizedBox(height: 14),
                        SizedBox(
                          width: double.infinity,
                          height: 52,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.white,
                              foregroundColor: MoviCashColors.verdeMenta,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                            ),
                            onPressed: () async {
                              await Navigator.push(context,
                                  MaterialPageRoute(builder: (_) => const RequestCreditScreen()));
                              _cargarDatos();
                            },
                            child: const Text('Solicitar crédito  →', style: TextStyle(fontWeight: FontWeight.w700)),
                          ),
                        ),
                      ] else ...[
                        const Text('Crédito activo', style: TextStyle(color: MoviCashColors.textoGris)),
                        Text('S/ ${_creditoActivo!['saldo_pendiente']} pendiente', style: displayCurrency(size: 24)),
                        const SizedBox(height: 4),
                        Text('Pago diario sugerido: S/ ${_creditoActivo!['pago_diario_sugerido']}',
                            style: const TextStyle(color: MoviCashColors.textoGris)),
                        const SizedBox(height: 12),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: LinearProgressIndicator(
                            value: _progresoCredito(),
                            minHeight: 6,
                            backgroundColor: MoviCashColors.lilaInnovacion.withOpacity(0.12),
                            valueColor: const AlwaysStoppedAnimation(MoviCashColors.lilaInnovacion),
                          ),
                        ),
                      ]
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _accesoRapido(Icons.account_balance_wallet_outlined, 'Mi crédito', MoviCashColors.verdeMenta, () async {
                await Navigator.push(context, MaterialPageRoute(builder: (_) => const MyCreditScreen()));
                _cargarDatos();
              }),
              _accesoRapido(Icons.groups_outlined, 'Círculos de\nahorro', MoviCashColors.lilaInnovacion,
                  () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CirclesScreen()))),
              _accesoRapido(Icons.speed_outlined, 'MoviScore', MoviCashColors.amarilloPastel,
                  () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MoviscoreScreen()))),
            ],
          ),

          if (_creditoActivo != null) ...[
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: MoviCashColors.amarilloClaro,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: MoviCashColors.amarilloPastel.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: MoviCashColors.amarilloPastel.withOpacity(0.4),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.calendar_today_outlined, size: 18, color: MoviCashColors.textoOscuro),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Próximo pago', style: TextStyle(color: MoviCashColors.textoGris)),
                      Text('S/ ${_creditoActivo!['pago_diario_sugerido']}',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: () async {
                      await Navigator.push(
                          context, MaterialPageRoute(builder: (_) => const MyCreditScreen()));
                      _cargarDatos();
                    },
                    child: const Text('Pagar ahora'),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  double _progresoCredito() {
    if (_creditoActivo == null) return 0;
    final total = (_creditoActivo!['dias_totales'] as num?)?.toDouble() ?? 0;
    final restantes = (_creditoActivo!['dias_restantes'] as num?)?.toDouble() ?? 0;
    if (total == 0) return 0;
    return ((total - restantes) / total).clamp(0, 1);
  }

  Widget _accesoRapido(IconData icon, String label, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              shape: BoxShape.circle,
              boxShadow: [BoxShadow(color: color.withOpacity(0.15), blurRadius: 10, offset: const Offset(0, 4))],
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(height: 8),
          Text(label, textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
