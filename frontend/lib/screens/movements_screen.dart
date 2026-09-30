import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../services/api_service.dart';

class MovementsScreen extends StatefulWidget {
  const MovementsScreen({super.key});

  @override
  State<MovementsScreen> createState() => _MovementsScreenState();
}

class _MovementsScreenState extends State<MovementsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<dynamic> _creditos = [];
  List<dynamic> _aportes = [];
  bool _cargando = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _cargar();
  }

  Future<void> _cargar() async {
    setState(() => _cargando = true);
    try {
      final creditos = await ApiService.historialCreditos();
      final aportes = await ApiService.misAportes();
      setState(() {
        _creditos = creditos as List<dynamic>;
        _aportes = aportes as List<dynamic>;
      });
    } catch (_) {
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Movimientos'),
        bottom: TabBar(
          controller: _tabController,
          labelColor: MoviCashColors.lilaInnovacion,
          unselectedLabelColor: MoviCashColors.textoGris,
          indicatorColor: MoviCashColors.lilaInnovacion,
          tabs: const [Tab(text: 'Créditos'), Tab(text: 'Ahorros')],
        ),
      ),
      body: _cargando
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _cargar,
              child: TabBarView(
                controller: _tabController,
                children: [_listaCreditos(), _listaAportes()],
              ),
            ),
    );
  }

  Widget _estadoVacio(IconData icon, String texto) {
    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 60, horizontal: 30),
          child: Column(
            children: [
              Icon(icon, size: 42, color: MoviCashColors.textoGrisClaro),
              const SizedBox(height: 14),
              Text(texto, textAlign: TextAlign.center, style: const TextStyle(color: MoviCashColors.textoGris)),
            ],
          ),
        ),
      ],
    );
  }

  ({Color color, String label}) _estiloEstado(String? estado) {
    switch (estado) {
      case 'activo':
        return (color: MoviCashColors.amarilloPastel, label: 'Activo');
      case 'completado':
        return (color: MoviCashColors.verdeMenta, label: 'Completado');
      case 'moroso':
        return (color: Colors.redAccent, label: 'Atrasado');
      default:
        return (color: MoviCashColors.textoGris, label: estado ?? '—');
    }
  }

  String _fechaCorta(String? iso) {
    if (iso == null) return '';
    final fecha = DateTime.tryParse(iso);
    if (fecha == null) return '';
    return '${fecha.day.toString().padLeft(2, '0')}/${fecha.month.toString().padLeft(2, '0')}/${fecha.year}';
  }

  Widget _listaCreditos() {
    if (_creditos.isEmpty) {
      return _estadoVacio(Icons.receipt_long_outlined, 'Sin movimientos de crédito todavía.');
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _creditos.length,
      itemBuilder: (context, i) {
        final c = _creditos[i];
        final pagos = (c['pagos'] as List<dynamic>? ?? []);
        final estado = _estiloEstado(c['estado'] as String?);
        final total = c['total_a_pagar'] ?? c['monto'];

        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: MoviCashColors.superficieBlanca,
            borderRadius: BorderRadius.circular(18),
            boxShadow: [
              BoxShadow(color: MoviCashColors.textoOscuro.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4)),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: MoviCashColors.lilaInnovacion.withOpacity(0.12), shape: BoxShape.circle),
                child: const Icon(Icons.account_balance_wallet_outlined, color: MoviCashColors.lilaInnovacion),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Crédito S/ $total', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                    const SizedBox(height: 2),
                    Text('${pagos.length} pagos · ${_fechaCorta(c['fecha_inicio'] as String?)}',
                        style: const TextStyle(color: MoviCashColors.textoGrisClaro, fontSize: 12)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(color: estado.color.withOpacity(0.13), borderRadius: BorderRadius.circular(999)),
                child: Text(estado.label, style: TextStyle(color: estado.color, fontSize: 11, fontWeight: FontWeight.w700)),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _listaAportes() {
    if (_aportes.isEmpty) {
      return _estadoVacio(Icons.savings_outlined, 'Aún no tienes aportes registrados a círculos de ahorro.');
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _aportes.length,
      itemBuilder: (context, i) {
        final a = _aportes[i];
        final circulo = a['circulos_ahorro'];

        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: MoviCashColors.superficieBlanca,
            borderRadius: BorderRadius.circular(18),
            boxShadow: [
              BoxShadow(color: MoviCashColors.textoOscuro.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4)),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: MoviCashColors.verdeMenta.withOpacity(0.12), shape: BoxShape.circle),
                child: const Icon(Icons.savings_outlined, color: MoviCashColors.verdeMenta),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(circulo?['nombre'] ?? 'Círculo de ahorro', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                    const SizedBox(height: 2),
                    Text('Turno ${a['turno']} · ${_fechaCorta(a['fecha'] as String?)}',
                        style: const TextStyle(color: MoviCashColors.textoGrisClaro, fontSize: 12)),
                  ],
                ),
              ),
              Text('+ S/ ${a['monto']}',
                  style: const TextStyle(color: MoviCashColors.verdeMenta, fontWeight: FontWeight.w800, fontSize: 14)),
            ],
          ),
        );
      },
    );
  }
}
