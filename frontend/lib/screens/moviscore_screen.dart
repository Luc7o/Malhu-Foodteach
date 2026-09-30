import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../services/api_service.dart';

class MoviscoreScreen extends StatefulWidget {
  const MoviscoreScreen({super.key});

  @override
  State<MoviscoreScreen> createState() => _MoviscoreScreenState();
}

class _MoviscoreScreenState extends State<MoviscoreScreen> {
  // Mismo rango y umbrales que backend/src/services/moviscore.service.ts —
  // si cambian ahí, hay que actualizar aquí también.
  static const int _scoreMin = 300;
  static const int _scoreMax = 850;

  Map<String, dynamic>? _data;
  bool _cargando = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    setState(() {
      _cargando = true;
      _error = null;
    });
    try {
      final data = await ApiService.obtenerMoviscore();
      if (mounted) setState(() => _data = data);
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  Color _colorNivel(String nivel) {
    switch (nivel) {
      case 'Excelente':
        return MoviCashColors.verdeMenta;
      case 'Buen historial':
        return MoviCashColors.celesteSeguridad;
      case 'Regular':
        return MoviCashColors.amarilloPastel;
      default:
        return MoviCashColors.lilaInnovacion;
    }
  }

  String _mensajeNivel(String nivel) {
    switch (nivel) {
      case 'Excelente':
        return '¡Excelente historial! Ya accedes a los mejores montos y condiciones de MoviCash.';
      case 'Buen historial':
        return 'Vas muy bien. Sigue pagando a tiempo para llegar a Excelente y desbloquear más crédito.';
      case 'Regular':
        return '¡Vas por buen camino! Tu historial de pagos te permite acceder a mejores condiciones.';
      default:
        return 'Estás empezando. Cada pago puntual y cada aporte a un círculo suman puntos a tu MoviScore.';
    }
  }

  /// Umbral del siguiente nivel (para mostrar "te faltan X puntos").
  int? _siguienteUmbral(int score) {
    if (score < 500) return 500;
    if (score < 650) return 650;
    if (score < 750) return 750;
    return null; // ya está en Excelente
  }

  @override
  Widget build(BuildContext context) {
    if (_cargando) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('MoviScore')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.wifi_off_rounded, size: 40, color: MoviCashColors.textoGris),
                const SizedBox(height: 12),
                const Text('No pudimos cargar tu MoviScore', textAlign: TextAlign.center),
                const SizedBox(height: 6),
                Text(_error!,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: MoviCashColors.textoGris, fontSize: 12)),
                const SizedBox(height: 16),
                ElevatedButton(onPressed: _cargar, child: const Text('Reintentar')),
              ],
            ),
          ),
        ),
      );
    }

    final score = ((_data?['moviscore_actual'] ?? 500) as num).toInt();
    final nivel = (_data?['nivel_moviscore'] ?? 'Nuevo') as String;
    final credMin = _data?['credito_disponible_min'];
    final credMax = _data?['credito_disponible_max'];
    final historial = (_data?['historial'] as List<dynamic>? ?? []);
    final color = _colorNivel(nivel);
    final siguiente = _siguienteUmbral(score);

    return Scaffold(
      appBar: AppBar(title: const Text('MoviScore')),
      body: RefreshIndicator(
        onRefresh: _cargar,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Center(
              child: Column(
                children: [
                  SizedBox(
                    width: 200,
                    height: 130,
                    child: CustomPaint(
                      painter: _ScoreGaugePainter(
                        score: score,
                        min: _scoreMin,
                        max: _scoreMax,
                        color: color,
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Text('$score',
                              style: const TextStyle(fontSize: 38, fontWeight: FontWeight.w800)),
                          const SizedBox(height: 2),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                            decoration: BoxDecoration(
                              color: color.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(nivel,
                                style: TextStyle(
                                    color: color, fontSize: 13, fontWeight: FontWeight.w700)),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 30),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('$_scoreMin', style: const TextStyle(color: MoviCashColors.textoGrisClaro, fontSize: 11)),
                        Text('$_scoreMax', style: const TextStyle(color: MoviCashColors.textoGrisClaro, fontSize: 11)),
                      ],
                    ),
                  ),
                  if (siguiente != null) ...[
                    const SizedBox(height: 6),
                    Text('Te faltan ${siguiente - score} puntos para subir de nivel',
                        style: const TextStyle(color: MoviCashColors.textoGris, fontSize: 12)),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 20),

            if (credMin != null && credMax != null) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: MoviCashColors.fondoSecundario,
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: MoviCashColors.verdeMenta.withOpacity(0.14),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.account_balance_wallet_outlined,
                          size: 18, color: MoviCashColors.verdeMenta),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Tu crédito disponible',
                              style: TextStyle(color: MoviCashColors.textoGris, fontSize: 12)),
                          Text('S/ $credMin – S/ $credMax',
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
            ],

            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: color.withOpacity(0.08),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: color.withOpacity(0.25)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.emoji_events_outlined, color: color, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(_mensajeNivel(nivel),
                        style: const TextStyle(color: MoviCashColors.textoOscuro, fontSize: 13)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            const Text('Historial reciente', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 10),
            if (historial.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Text('Aún no hay movimientos de MoviScore.',
                    style: TextStyle(color: MoviCashColors.textoGris)),
              ),
            ...historial.map((h) => _movimientoTile(h)),
          ],
        ),
      ),
    );
  }

  Widget _movimientoTile(dynamic h) {
    final variacion = (h['variacion'] ?? 0) as num;
    final positivo = variacion >= 0;
    final tileColor = positivo ? MoviCashColors.verdeMenta : Colors.redAccent;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
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
            width: 38,
            height: 38,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: tileColor.withOpacity(0.12), shape: BoxShape.circle),
            child: Icon(positivo ? Icons.trending_up : Icons.trending_down, color: tileColor, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(_etiquetaEvento(h['evento']), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                if (h['fecha'] != null)
                  Text(_fechaCorta(h['fecha']),
                      style: const TextStyle(color: MoviCashColors.textoGrisClaro, fontSize: 11)),
              ],
            ),
          ),
          Text('${positivo ? '+' : ''}$variacion',
              style: TextStyle(fontWeight: FontWeight.w700, color: tileColor)),
        ],
      ),
    );
  }

  String _fechaCorta(String isoFecha) {
    final fecha = DateTime.tryParse(isoFecha);
    if (fecha == null) return '';
    return '${fecha.day.toString().padLeft(2, '0')}/${fecha.month.toString().padLeft(2, '0')}/${fecha.year}';
  }

  String _etiquetaEvento(String? evento) {
    switch (evento) {
      case 'pago_puntual':
        return 'Pago puntual';
      case 'credito_completado':
        return 'Crédito completado';
      case 'aporte_circulo':
        return 'Aporte a círculo de ahorro';
      default:
        return evento ?? 'Movimiento';
    }
  }
}

/// Medidor semicircular (estilo velocímetro) del MoviScore, sin
/// depender de paquetes externos.
class _ScoreGaugePainter extends CustomPainter {
  final int score;
  final int min;
  final int max;
  final Color color;

  _ScoreGaugePainter({required this.score, required this.min, required this.max, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height - 10);
    final radius = math.min(size.width / 2, size.height) - 12;

    const startAngle = math.pi; // 180°
    const sweepTotal = math.pi; // semicírculo (180°)

    final fraccion = ((score - min) / (max - min)).clamp(0.0, 1.0);

    final trackPaint = Paint()
      ..color = MoviCashColors.fondoSecundario
      ..style = PaintingStyle.stroke
      ..strokeWidth = 14
      ..strokeCap = StrokeCap.round;

    final progressPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 14
      ..strokeCap = StrokeCap.round;

    final rect = Rect.fromCircle(center: center, radius: radius);

    canvas.drawArc(rect, startAngle, sweepTotal, false, trackPaint);
    canvas.drawArc(rect, startAngle, sweepTotal * fraccion, false, progressPaint);
  }

  @override
  bool shouldRepaint(covariant _ScoreGaugePainter oldDelegate) =>
      oldDelegate.score != score || oldDelegate.color != color;
}
