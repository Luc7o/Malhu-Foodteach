import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../services/api_service.dart';
import 'request_credit_screen.dart';

class MyCreditScreen extends StatefulWidget {
  const MyCreditScreen({super.key});

  @override
  State<MyCreditScreen> createState() => _MyCreditScreenState();
}

class _MyCreditScreenState extends State<MyCreditScreen> {
  Map<String, dynamic>? _activo;
  List<dynamic> _historial = [];
  bool _cargando = true;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    setState(() => _cargando = true);
    try {
      final activo = await ApiService.creditoActivo();
      final historial = await ApiService.historialCreditos();
      setState(() {
        _activo = activo;
        _historial = (historial as List<dynamic>)
            .where((c) => c['estado'] != 'activo')
            .toList();
      });
    } catch (_) {
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  Future<void> _pagarHoy() async {
    if (_activo == null) return;
    try {
      await ApiService.registrarPago(
        _activo!['id'],
        (_activo!['pago_diario_sugerido'] as num).toDouble(),
      );
      _cargar();
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('¡Pago registrado! Tu MoviScore sigue subiendo 🎉')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  /// Formatea un valor numérico proveniente del backend (puede llegar
  /// como num o como String, según el driver de Supabase) a "S/ 121.0".
  String _money(dynamic value) {
    if (value == null) return 'S/ —';
    final n = value is num ? value : num.tryParse('$value') ?? 0;
    return 'S/ ${n.toStringAsFixed(n == n.roundToDouble() ? 0 : 1)}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mi crédito')),
      body: _cargando
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _cargar,
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  if (_activo != null) ...[
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(18),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.check_circle, color: MoviCashColors.verdeMenta, size: 20),
                                const SizedBox(width: 6),
                                const Text('Crédito activo', style: TextStyle(fontWeight: FontWeight.w600)),
                                const Spacer(),
                                Chip(
                                  label: const Text('En curso'),
                                  backgroundColor: MoviCashColors.amarilloPastel.withValues(alpha: 0.25),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text('S/ ${_activo!['monto']}',
                                style: const TextStyle(fontSize: 30, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 4),
                            Text(
                              'Total a pagar ${_money(_activo!['total_a_pagar'])}'
                              '${_activo!['interes'] != null ? ' (incluye ${_money(_activo!['interes'])} de interés)' : ''}',
                              style: const TextStyle(color: MoviCashColors.textoGris, fontSize: 12),
                            ),
                            const SizedBox(height: 14),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                _dato('Fecha de inicio', '${_activo!['fecha_inicio']}'),
                                _dato('Pago diario', _money(_activo!['pago_diario_sugerido'])),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              'Días restantes: ${_activo!['dias_restantes']} / ${_activo!['dias_totales']}',
                              style: const TextStyle(color: MoviCashColors.textoGris),
                            ),
                            const SizedBox(height: 8),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: LinearProgressIndicator(
                                value: _progreso(),
                                minHeight: 8,
                                backgroundColor: MoviCashColors.lilaInnovacion.withValues(alpha: 0.15),
                                valueColor: const AlwaysStoppedAnimation(MoviCashColors.lilaInnovacion),
                              ),
                            ),
                            const SizedBox(height: 16),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                onPressed: _pagarHoy,
                                style: ElevatedButton.styleFrom(backgroundColor: MoviCashColors.verdeMenta),
                                child: Text('Pagar ${_money(_activo!['pago_diario_sugerido'])} hoy'),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ] else ...[
                    Card(
                      color: MoviCashColors.verdeMenta.withValues(alpha: 0.1),
                      child: Padding(
                        padding: const EdgeInsets.all(18),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('No tienes un crédito activo',
                                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                            const SizedBox(height: 4),
                            const Text('Solicita uno para cubrir combustible, repuestos o mercadería.',
                                style: TextStyle(color: MoviCashColors.textoGris)),
                            const SizedBox(height: 12),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                onPressed: () async {
                                  await Navigator.push(context,
                                      MaterialPageRoute(builder: (_) => const RequestCreditScreen()));
                                  _cargar();
                                },
                                child: const Text('Solicitar crédito'),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                  const Text('Historial de créditos', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                  const SizedBox(height: 10),
                  if (_historial.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 16),
                      child: Text('Todavía no tienes créditos completados.',
                          style: TextStyle(color: MoviCashColors.textoGris)),
                    ),
                  ..._historial.map((c) => Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: MoviCashColors.amarilloPastel.withValues(alpha: 0.25),
                            child: const Icon(Icons.account_balance_wallet_outlined,
                                color: MoviCashColors.textoOscuro, size: 20),
                          ),
                          title: const Text('Crédito completado'),
                          subtitle: Text(
                              '${_money(c['total_a_pagar'] ?? c['monto'])}  •  ${c['fecha_inicio']}'),
                          trailing: Chip(
                            label: const Text('Pagado'),
                            backgroundColor: MoviCashColors.verdeMenta.withValues(alpha: 0.15),
                            labelStyle: const TextStyle(color: MoviCashColors.verdeMenta),
                          ),
                        ),
                      )),
                ],
              ),
            ),
    );
  }

  double _progreso() {
    if (_activo == null) return 0;
    final total = (_activo!['dias_totales'] as num).toDouble();
    final restantes = (_activo!['dias_restantes'] as num).toDouble();
    if (total == 0) return 0;
    return ((total - restantes) / total).clamp(0, 1);
  }

  Widget _dato(String label, String valor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: MoviCashColors.textoGris, fontSize: 12)),
        Text(valor, style: const TextStyle(fontWeight: FontWeight.w600)),
      ],
    );
  }
}
