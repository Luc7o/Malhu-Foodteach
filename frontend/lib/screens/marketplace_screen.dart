import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../services/api_service.dart';

class MarketplaceScreen extends StatefulWidget {
  const MarketplaceScreen({super.key});

  @override
  State<MarketplaceScreen> createState() => _MarketplaceScreenState();
}

class _MarketplaceScreenState extends State<MarketplaceScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<dynamic> _entidades = [];
  List<dynamic> _solicitudes = [];
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
      final entidades = await ApiService.entidadesMarketplace();
      final solicitudes = await ApiService.misSolicitudesMarketplace();
      setState(() {
        _entidades = entidades as List<dynamic>;
        _solicitudes = solicitudes as List<dynamic>;
      });
    } catch (_) {
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  Future<void> _solicitar(Map entidad) async {
    final montoCtrl = TextEditingController(text: '500');
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Solicitar con ${entidad['nombre']}'),
        content: TextField(
          controller: montoCtrl,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Monto solicitado (S/)'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Enviar')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ApiService.solicitarEnMarketplace(entidad['id'], double.parse(montoCtrl.text));
      _cargar();
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Solicitud enviada. Te avisaremos cuando la revisen.')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Marketplace'),
        bottom: TabBar(
          controller: _tabController,
          labelColor: MoviCashColors.lilaInnovacion,
          unselectedLabelColor: MoviCashColors.textoGris,
          indicatorColor: MoviCashColors.lilaInnovacion,
          tabs: const [Tab(text: 'Entidades'), Tab(text: 'Mis solicitudes')],
        ),
      ),
      body: _cargando
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [_listaEntidades(), _listaSolicitudes()],
            ),
    );
  }

  Widget _hero() {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 16, 20, 8),
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [MoviCashColors.celesteSeguridad, Color(0xFF075985)],
        ),
        borderRadius: BorderRadius.circular(22),
        boxShadow: [BoxShadow(color: MoviCashColors.celesteSeguridad.withOpacity(0.25), blurRadius: 18, offset: const Offset(0, 8))],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -14,
            top: -14,
            child: Icon(Icons.account_balance_outlined, size: 90, color: Colors.white.withOpacity(0.12)),
          ),
          const Padding(
            padding: EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Créditos más grandes con nuestros aliados',
                    style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.bold, height: 1.25)),
                SizedBox(height: 6),
                Text('Con un buen MoviScore, accedes a cajas y cooperativas para montos mayores a los de MoviCash.',
                    style: TextStyle(color: Colors.white70, fontSize: 12)),
              ],
            ),
          ),
        ],
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

  Widget _listaEntidades() {
    return RefreshIndicator(
      onRefresh: _cargar,
      child: ListView(
        padding: const EdgeInsets.only(bottom: 20),
        children: [
          _hero(),
          if (_entidades.isEmpty)
            _estadoVacio(Icons.storefront_outlined, 'Todavía no hay entidades aliadas disponibles.')
          else
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                children: _entidades.map((e) {
                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(16),
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
                          width: 46,
                          height: 46,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(color: MoviCashColors.celesteSeguridad.withOpacity(0.13), shape: BoxShape.circle),
                          child: const Icon(Icons.account_balance_outlined, color: MoviCashColors.celesteSeguridad),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(e['nombre'], style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                              const SizedBox(height: 2),
                              Text(e['tipo'] ?? '', style: const TextStyle(color: MoviCashColors.textoGris, fontSize: 12)),
                            ],
                          ),
                        ),
                        OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: MoviCashColors.celesteSeguridad,
                            side: const BorderSide(color: MoviCashColors.celesteSeguridad),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                          ),
                          onPressed: () => _solicitar(e),
                          child: const Text('Solicitar'),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
        ],
      ),
    );
  }

  Widget _listaSolicitudes() {
    if (_solicitudes.isEmpty) {
      return _estadoVacio(Icons.assignment_outlined, 'Aún no has enviado solicitudes al marketplace.');
    }
    return RefreshIndicator(
      onRefresh: _cargar,
      child: ListView.builder(
        padding: const EdgeInsets.all(20),
        itemCount: _solicitudes.length,
        itemBuilder: (context, i) {
          final s = _solicitudes[i];
          final entidad = s['entidades_marketplace'];
          Color color;
          String label;
          switch (s['estado']) {
            case 'aprobada':
              color = MoviCashColors.verdeMenta;
              label = 'Aprobada';
              break;
            case 'rechazada':
              color = Colors.redAccent;
              label = 'Rechazada';
              break;
            default:
              color = MoviCashColors.amarilloPastel;
              label = 'En revisión';
          }
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
                  decoration: BoxDecoration(color: color.withOpacity(0.12), shape: BoxShape.circle),
                  child: Icon(Icons.description_outlined, color: color),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(entidad?['nombre'] ?? 'Entidad', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                      const SizedBox(height: 2),
                      Text('S/ ${s['monto_solicitado']}', style: const TextStyle(color: MoviCashColors.textoGrisClaro, fontSize: 12)),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(color: color.withOpacity(0.13), borderRadius: BorderRadius.circular(999)),
                  child: Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
