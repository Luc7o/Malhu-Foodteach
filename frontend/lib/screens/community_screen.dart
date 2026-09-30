import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../services/api_service.dart';
import 'circles_screen.dart';
import 'marketplace_screen.dart';

class CommunityScreen extends StatefulWidget {
  const CommunityScreen({super.key});

  @override
  State<CommunityScreen> createState() => _CommunityScreenState();
}

class _CommunityScreenState extends State<CommunityScreen> {
  List<dynamic> _misCirculos = [];
  double _totalAportado = 0;
  bool _cargando = true;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    setState(() => _cargando = true);
    try {
      final mios = await ApiService.misCirculos();
      final aportes = await ApiService.misAportes();
      final total = (aportes as List<dynamic>)
          .fold<double>(0, (acc, a) => acc + ((a['monto'] as num?)?.toDouble() ?? 0));
      if (mounted) {
        setState(() {
          _misCirculos = mios as List<dynamic>;
          _totalAportado = total;
        });
      }
    } catch (_) {
      // La pantalla igual funciona como landing sin datos personalizados.
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tieneCirculos = _misCirculos.isNotEmpty;

    return Scaffold(
      appBar: AppBar(title: const Text('Comunidad')),
      body: RefreshIndicator(
        onRefresh: _cargar,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            _buildHero(tieneCirculos),
            const SizedBox(height: 16),
            _ilustracionComunidad(),
            const SizedBox(height: 24),
            const Text('Beneficios de tu comunidad', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: _beneficio(
                    context,
                    Icons.account_balance_wallet_outlined,
                    'Acceso a\ncréditos',
                    MoviCashColors.verdeMenta,
                    () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MarketplaceScreen())),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _beneficio(
                    context,
                    Icons.groups_outlined,
                    'Mejores\ncondiciones',
                    MoviCashColors.lilaInnovacion,
                    () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CirclesScreen())),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _beneficio(
                    context,
                    Icons.verified_outlined,
                    'Más\nconfianza',
                    MoviCashColors.celesteSeguridad,
                    () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MarketplaceScreen())),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            if (!_cargando && tieneCirculos) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Tus círculos', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                  TextButton(
                    onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CirclesScreen())),
                    child: const Text('Ver todos'),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              ..._misCirculos.take(2).map((m) {
                final circulo = m['circulos_ahorro'];
                return GestureDetector(
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CirclesScreen())),
                  child: Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: MoviCashColors.superficieBlanca,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(color: MoviCashColors.textoOscuro.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4)),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: MoviCashColors.verdeMenta.withOpacity(0.13),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.groups_outlined, color: MoviCashColors.verdeMenta, size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(circulo?['nombre'] ?? 'Círculo', style: const TextStyle(fontWeight: FontWeight.w600)),
                            Text('S/ ${circulo?['monto_por_turno'] ?? '-'} por turno',
                                style: const TextStyle(color: MoviCashColors.textoGris, fontSize: 12)),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right, color: MoviCashColors.textoGris),
                    ],
                  ),
                  ),
                );
              }),
              const SizedBox(height: 10),
            ],
            Container(
              decoration: BoxDecoration(
                color: MoviCashColors.rosaClaro,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: MoviCashColors.rosaComunidad.withOpacity(0.18)),
              ),
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    tieneCirculos ? 'Sigue construyendo con tu comunidad' : 'Tu comunidad también es tu fuerza',
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Los círculos de ahorro te ayudan a construir historial y a no estar solo en los momentos difíciles.',
                    style: TextStyle(color: MoviCashColors.textoGris),
                  ),
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: MoviCashColors.rosaComunidad),
                      onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CirclesScreen())),
                      child: Text(tieneCirculos ? 'Ver mis círculos' : 'Explorar círculos de ahorro'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHero(bool tieneCirculos) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [MoviCashColors.rosaComunidad, Color(0xFF9D174D)],
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(color: MoviCashColors.rosaComunidad.withOpacity(0.28), blurRadius: 20, offset: const Offset(0, 8)),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -16,
            top: -16,
            child: Icon(Icons.groups_2_rounded, size: 100, color: Colors.white.withOpacity(0.10)),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Juntos construimos\nun mejor futuro',
                    style: TextStyle(fontSize: 21, fontWeight: FontWeight.bold, color: Colors.white, height: 1.25)),
                const SizedBox(height: 14),
                if (!_cargando && tieneCirculos)
                  Row(
                    children: [
                      _statChip('${_misCirculos.length}', _misCirculos.length == 1 ? 'círculo activo' : 'círculos activos'),
                      const SizedBox(width: 10),
                      _statChip('S/ ${_totalAportado.toStringAsFixed(0)}', 'aportado en total'),
                    ],
                  )
                else if (!_cargando)
                  const Text('Únete a un círculo y empieza a construir tu historial en comunidad',
                      style: TextStyle(color: Colors.white70, fontSize: 13)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _ilustracionComunidad() {
    return Container(
      decoration: BoxDecoration(
        color: MoviCashColors.superficieBlanca,
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(color: MoviCashColors.textoOscuro.withOpacity(0.05), blurRadius: 14, offset: const Offset(0, 6)),
        ],
      ),
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Image.asset('assets/images/comunidad.png', width: 96, height: 78, fit: BoxFit.cover),
          ),
          const SizedBox(width: 14),
          const Expanded(
            child: Text(
              'Cientos de trabajadores como tú ya se apoyan entre sí para crecer.',
              style: TextStyle(fontSize: 13, color: MoviCashColors.textoGris, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }

  Widget _statChip(String valor, String label) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.16),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(valor, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16)),
            Text(label, style: const TextStyle(color: Colors.white70, fontSize: 11)),
          ],
        ),
      ),
    );
  }

  Widget _beneficio(BuildContext context, IconData icon, String label, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: color.withOpacity(0.18)),
        ),
        child: Column(
          children: [
            Container(
              width: 40,
              height: 40,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: color.withOpacity(0.14), shape: BoxShape.circle),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(height: 8),
            Text(label, textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}
