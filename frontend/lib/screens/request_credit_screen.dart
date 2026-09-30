import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../services/api_service.dart';
import 'my_credit_screen.dart';

class RequestCreditScreen extends StatefulWidget {
  const RequestCreditScreen({super.key});

  @override
  State<RequestCreditScreen> createState() => _RequestCreditScreenState();
}

class _RequestCreditScreenState extends State<RequestCreditScreen> {
  // Tasa fija del resumen (ver también backend/src/services/credits.service.ts,
  // que debe usar el mismo valor para que el resumen coincida con lo aprobado).
  static const double _tasaInteres = 0.10;

  double _monto = 200;
  int _plazoDias = 30;
  String? _motivoSeleccionado;
  bool _enviando = false;
  bool _aprobado = false;

  final motivos = const [
    {'icon': Icons.local_gas_station_outlined, 'label': 'Combustible'},
    {'icon': Icons.build_outlined, 'label': 'Repuestos'},
    {'icon': Icons.shopping_bag_outlined, 'label': 'Mercadería'},
    {'icon': Icons.more_horiz, 'label': 'Otros'},
  ];

  final plazos = const [7, 10, 15, 30];

  double get _interes => _monto * _tasaInteres;
  double get _totalAPagar => _monto + _interes;
  double get _pagoDiario => _totalAPagar / _plazoDias;

  Future<void> _continuar() async {
    if (_motivoSeleccionado == null) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Elige para qué usarás el crédito')));
      return;
    }
    setState(() => _enviando = true);
    try {
      await ApiService.solicitarCredito(_monto, _motivoSeleccionado!, _plazoDias);
      if (mounted) setState(() => _aprobado = true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _enviando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Solicitar crédito'), leading: const BackButton()),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildMontoSection(),
              const SizedBox(height: 26),
              _buildPlazoSection(),
              const SizedBox(height: 24),
              _buildMotivoSection(),
              const SizedBox(height: 24),
              _buildResumenCard(),
              const SizedBox(height: 20),
              if (_aprobado) _buildAprobadoCard() else _buildContinuarButton(),
              const SizedBox(height: 12),
              _buildSeguridadFootnote(),
            ],
          ),
        ),
      ),
    );
  }

  // ---------------- Monto ----------------

  Widget _buildMontoSection() {
    return Column(
      children: [
        Text('¿Cuánto necesitas?',
            style: Theme.of(context).textTheme.bodyMedium, textAlign: TextAlign.center),
        const SizedBox(height: 2),
        Text('S/ ${_monto.round()}', style: displayCurrency()),
        Slider(
          value: _monto,
          min: 50,
          max: 500,
          divisions: 45,
          activeColor: MoviCashColors.verdeMenta,
          onChanged: _aprobado ? null : (v) => setState(() => _monto = v),
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('S/ 50', style: Theme.of(context).textTheme.bodySmall),
            Text('S/ 500', style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      ],
    );
  }

  // ---------------- Plazo de pago ----------------

  Widget _buildPlazoSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Plazo de pago', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 10),
        Row(
          children: plazos.map((dias) {
            final seleccionado = dias == _plazoDias;
            return Expanded(
              child: Padding(
                padding: EdgeInsets.only(right: dias == plazos.last ? 0 : 8),
                child: GestureDetector(
                  onTap: _aprobado ? null : () => setState(() => _plazoDias = dias),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: seleccionado
                          ? MoviCashColors.verdeMenta
                          : MoviCashColors.fondoSecundario,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: seleccionado
                            ? MoviCashColors.verdeMenta
                            : const Color(0xFFE2E8F0),
                      ),
                    ),
                    child: Text(
                      '$dias días',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                        color: seleccionado ? Colors.white : MoviCashColors.textoGris,
                      ),
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  // ---------------- Motivo ----------------

  Widget _buildMotivoSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('¿Para qué lo usarás?', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 10),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: motivos.map((m) {
            final seleccionado = _motivoSeleccionado == m['label'];
            return GestureDetector(
              onTap: _aprobado
                  ? null
                  : () => setState(() => _motivoSeleccionado = m['label'] as String),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: seleccionado
                      ? MoviCashColors.lilaClaro
                      : MoviCashColors.fondoSecundario,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: seleccionado
                        ? MoviCashColors.lilaInnovacion
                        : const Color(0xFFE2E8F0),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(m['icon'] as IconData,
                        size: 18,
                        color: seleccionado
                            ? MoviCashColors.lilaInnovacion
                            : MoviCashColors.textoGris),
                    const SizedBox(width: 6),
                    Text(m['label'] as String,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: seleccionado
                              ? MoviCashColors.lilaInnovacion
                              : MoviCashColors.textoGris,
                        )),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  // ---------------- Resumen ----------------

  Widget _buildResumenCard() {
    return _DashedBorderBox(
      color: const Color(0xFFCBD5E1),
      radius: 20,
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('RESUMEN DE LA SOLICITUD', style: Theme.of(context).textTheme.labelSmall),
            const SizedBox(height: 14),
            _resumenFila('Monto solicitado', 'S/ ${_monto.round()}'),
            const SizedBox(height: 10),
            _resumenFila('Interés (${(_tasaInteres * 100).round()}%)',
                'S/ ${_interes.toStringAsFixed(1)}'),
            const SizedBox(height: 10),
            _resumenFila('Total a pagar', 'S/ ${_totalAPagar.toStringAsFixed(1)}'),
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Divider(height: 1, color: Color(0xFFE2E8F0)),
            ),
            _resumenFila('Pago diario', 'S/ ${_pagoDiario.toStringAsFixed(1)}', destacado: true),
          ],
        ),
      ),
    );
  }

  Widget _resumenFila(String label, String valor, {bool destacado = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style: TextStyle(
              fontSize: destacado ? 15 : 13,
              fontWeight: destacado ? FontWeight.w700 : FontWeight.w500,
              color: destacado ? MoviCashColors.textoOscuro : MoviCashColors.textoGris,
            )),
        Text(valor,
            style: TextStyle(
              fontSize: destacado ? 18 : 14,
              fontWeight: FontWeight.w800,
              color: destacado ? MoviCashColors.verdeMenta : MoviCashColors.textoOscuro,
            )),
      ],
    );
  }

  // ---------------- Acción ----------------

  Widget _buildContinuarButton() {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: _enviando ? null : _continuar,
        child: _enviando
            ? const SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
            : const Text('Continuar'),
      ),
    );
  }

  Widget _buildAprobadoCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: MoviCashColors.verdeMenta.withOpacity(0.08),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: MoviCashColors.verdeMenta.withOpacity(0.4)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              const Icon(Icons.check_circle, color: MoviCashColors.verdeMenta),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Crédito aprobado. El dinero llega a tu billetera en minutos.',
                  style: TextStyle(
                      fontWeight: FontWeight.w600, color: MoviCashColors.textoOscuro),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              style: OutlinedButton.styleFrom(
                foregroundColor: MoviCashColors.verdeMenta,
                side: const BorderSide(color: MoviCashColors.verdeMenta),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              onPressed: () {
                Navigator.pushReplacement(
                    context, MaterialPageRoute(builder: (_) => const MyCreditScreen()));
              },
              child: const Text('Ver cronograma de pagos'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSeguridadFootnote() {
    return Center(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.shield_outlined, size: 16, color: MoviCashColors.textoGris),
          const SizedBox(width: 6),
          Text('Tu información está segura', style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}

/// Caja con borde punteado (sin depender de paquetes externos), usada para
/// el card "RESUMEN DE LA SOLICITUD".
class _DashedBorderBox extends StatelessWidget {
  final Widget child;
  final Color color;
  final double radius;

  const _DashedBorderBox({required this.child, required this.color, this.radius = 16});

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _DashedRRectPainter(color: color, radius: radius),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: Container(color: MoviCashColors.superficieBlanca, child: child),
      ),
    );
  }
}

class _DashedRRectPainter extends CustomPainter {
  final Color color;
  final double radius;
  final double dashWidth;
  final double dashSpace;

  _DashedRRectPainter({
    required this.color,
    required this.radius,
    this.dashWidth = 6,
    this.dashSpace = 4,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4;

    final rrect = RRect.fromRectAndRadius(
      Rect.fromLTWH(0.7, 0.7, size.width - 1.4, size.height - 1.4),
      Radius.circular(radius),
    );
    final path = Path()..addRRect(rrect);

    for (final metric in path.computeMetrics()) {
      double distance = 0;
      while (distance < metric.length) {
        final next = distance + dashWidth;
        canvas.drawPath(metric.extractPath(distance, next.clamp(0, metric.length)), paint);
        distance = next + dashSpace;
      }
    }
  }

  @override
  bool shouldRepaint(covariant _DashedRRectPainter oldDelegate) =>
      oldDelegate.color != color || oldDelegate.radius != radius;
}
