import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../services/api_service.dart';

class CirclesScreen extends StatefulWidget {
  const CirclesScreen({super.key});

  @override
  State<CirclesScreen> createState() => _CirclesScreenState();
}

class _CirclesScreenState extends State<CirclesScreen> {
  List<dynamic> _misCirculos = [];
  List<dynamic> _disponibles = [];
  bool _cargando = true;

  final _disponiblesKey = GlobalKey();

  // Paleta que rota por tarjeta, para que cada círculo se distinga
  // visualmente sin depender de datos que no tenemos (como una foto).
  static const _paleta = [
    MoviCashColors.verdeMenta,
    MoviCashColors.amarilloPastel,
    MoviCashColors.lilaInnovacion,
    MoviCashColors.rosaComunidad,
    MoviCashColors.celesteSeguridad,
  ];

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    setState(() => _cargando = true);
    try {
      final mios = await ApiService.misCirculos();
      final disponibles = await ApiService.circulosDisponibles();
      setState(() {
        _misCirculos = mios as List<dynamic>;
        _disponibles = disponibles as List<dynamic>;
      });
    } catch (_) {
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  Future<void> _crearCirculo() async {
    final nombreCtrl = TextEditingController();
    final gremioCtrl = TextEditingController();
    final montoCtrl = TextEditingController(text: '50');

    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Crear círculo de ahorro'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                controller: nombreCtrl,
                decoration: const InputDecoration(
                  labelText: 'Nombre del círculo',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: gremioCtrl,
                decoration: const InputDecoration(
                  labelText: 'Gremio (ej. Mototaxistas)',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: montoCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Monto por turno (S/)',
                  prefixText: 'S/ ',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: MoviCashColors.lilaInnovacion,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Crear'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    if (nombreCtrl.text.isEmpty || gremioCtrl.text.isEmpty) return;

    try {
      await ApiService.crearCirculo(nombreCtrl.text, gremioCtrl.text, double.parse(montoCtrl.text));
      _cargar();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('¡Círculo creado!')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _unirse(String circuloId) async {
    try {
      await ApiService.unirseACirculo(circuloId);
      _cargar();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('¡Te uniste al círculo!')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _aportar(String circuloId) async {
    final montoCtrl = TextEditingController(text: '20');
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Aportar al círculo'),
        content: TextField(
          controller: montoCtrl,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: 'Monto a aportar (S/)',
            prefixText: 'S/ ',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: MoviCashColors.verdeMenta,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Aportar'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ApiService.aportarACirculo(circuloId, double.parse(montoCtrl.text));
      _cargar();
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('¡Aporte registrado! Tu MoviScore sube 📈')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  int _conteoMiembros(dynamic circulo) {
    final lista = circulo?['miembros_circulo'] as List<dynamic>?;
    if (lista == null || lista.isEmpty) return 0;
    return (lista.first['count'] as num?)?.toInt() ?? 0;
  }

  @override
  Widget build(BuildContext context) {
    final idsUnidos = _misCirculos.map((m) => m['circulo_id']).toSet();
    final disponiblesFiltrados = _disponibles.where((c) => !idsUnidos.contains(c['id'])).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Círculos de ahorro')),
      body: _cargando
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _cargar,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
                children: [
                  _buildHero(),
                  const SizedBox(height: 16),
                  _ilustracionJuntaDigital(),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      const Text('Mis círculos', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                      const SizedBox(width: 8),
                      if (_misCirculos.isNotEmpty)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: MoviCashColors.lilaInnovacion.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text('${_misCirculos.length}',
                              style: const TextStyle(
                                  color: MoviCashColors.lilaInnovacion, fontWeight: FontWeight.w700, fontSize: 12)),
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (_misCirculos.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 6),
                      child: Text('Aún no perteneces a ningún círculo.',
                          style: TextStyle(color: MoviCashColors.textoGris)),
                    ),
                  ..._misCirculos.asMap().entries.map((entry) {
                    final i = entry.key;
                    final m = entry.value;
                    final circulo = m['circulos_ahorro'];
                    final color = _paleta[i % _paleta.length];
                    return _tarjetaMiCirculo(circulo, color, m['orden_turno'] as int?);
                  }),
                  const SizedBox(height: 28),
                  Text('Círculos disponibles',
                      key: _disponiblesKey,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                  const SizedBox(height: 12),
                  if (disponiblesFiltrados.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 6),
                      child: Text('No hay más círculos disponibles por ahora.',
                          style: TextStyle(color: MoviCashColors.textoGris)),
                    ),
                  ...disponiblesFiltrados.asMap().entries.map((entry) {
                    final i = entry.key;
                    final c = entry.value;
                    final color = _paleta[(i + 1) % _paleta.length];
                    return _tarjetaDisponible(c, color);
                  }),
                  const SizedBox(height: 24),
                  _tarjetaConfianza(),
                ],
              ),
            ),
    );
  }

  Widget _buildHero() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [MoviCashColors.lilaInnovacion, Color(0xFF5B21B6)],
        ),
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(color: MoviCashColors.lilaInnovacion.withOpacity(0.28), blurRadius: 22, offset: const Offset(0, 10)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.18),
              borderRadius: BorderRadius.circular(999),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.groups_2_rounded, size: 14, color: Colors.white),
                SizedBox(width: 6),
                Text('Junta Digital',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12)),
              ],
            ),
          ),
          const SizedBox(height: 14),
          const Text('Ahorra en\ncomunidad',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Colors.white, height: 1.2)),
          const SizedBox(height: 8),
          const Text(
            'Haz crecer tus oportunidades y fortalece tu crédito colaborando con tu gremio.',
            style: TextStyle(color: Colors.white70, fontSize: 13, height: 1.4),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: MoviCashColors.lilaInnovacion,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                  ),
                  onPressed: () {
                    final ctx = _disponiblesKey.currentContext;
                    if (ctx != null) {
                      Scrollable.ensureVisible(ctx, duration: const Duration(milliseconds: 350), curve: Curves.easeInOut);
                    }
                  },
                  child: const Text('Unirme a un círculo', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
              const SizedBox(width: 10),
              Container(
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.18),
                  shape: BoxShape.circle,
                ),
                child: IconButton(
                  onPressed: _crearCirculo,
                  icon: const Icon(Icons.add, color: Colors.white),
                  tooltip: 'Crear círculo',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _ilustracionJuntaDigital() {
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
            child: Image.asset('assets/images/junta_digital.png', width: 96, height: 78, fit: BoxFit.cover),
          ),
          const SizedBox(width: 14),
          const Expanded(
            child: Text(
              'Un asesor de tu gremio te guía para armar tu junta digital en minutos.',
              style: TextStyle(fontSize: 13, color: MoviCashColors.textoGris, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }

  IconData _iconoPorGremio(String? gremio) {
    final g = (gremio ?? '').toLowerCase();
    if (g.contains('moto') || g.contains('taxi')) return Icons.two_wheeler_rounded;
    if (g.contains('delivery') || g.contains('repart')) return Icons.delivery_dining_rounded;
    if (g.contains('comerc') || g.contains('mercado') || g.contains('abarrote')) return Icons.storefront_rounded;
    if (g.contains('textil') || g.contains('costur') || g.contains('confec')) return Icons.checkroom_rounded;
    if (g.contains('constru')) return Icons.construction_rounded;
    if (g.contains('hogar') || g.contains('domést')) return Icons.home_work_rounded;
    return Icons.groups_rounded;
  }

  Widget _tarjetaMiCirculo(dynamic circulo, Color color, int? miOrden) {
    final nombre = circulo?['nombre'] ?? 'Círculo';
    final gremio = circulo?['gremio'] as String?;
    final montoPorTurno = (circulo?['monto_por_turno'] as num?)?.toDouble() ?? 0;
    final maxMiembros = (circulo?['max_miembros'] as num?)?.toInt() ?? 0;
    final turnoActual = (circulo?['turno_actual'] as num?)?.toInt() ?? 1;
    final estado = (circulo?['estado'] as String?) ?? 'activo';
    final miembros = _conteoMiembros(circulo);
    final pozoTotal = montoPorTurno * (maxMiembros == 0 ? miembros : maxMiembros);
    final progreso = maxMiembros == 0 ? 0.0 : (turnoActual / maxMiembros).clamp(0.0, 1.0);
    final esMiTurno = miOrden != null && miOrden == turnoActual;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: MoviCashColors.superficieBlanca,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: MoviCashColors.textoOscuro.withOpacity(0.05), blurRadius: 14, offset: const Offset(0, 6)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: color.withOpacity(0.14), borderRadius: BorderRadius.circular(14)),
                child: Icon(_iconoPorGremio(gremio), color: color, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(nombre,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                    const SizedBox(height: 3),
                    Text(
                      maxMiembros > 0
                          ? '$miembros miembros  ·  Turno $turnoActual de $maxMiembros'
                          : '$miembros miembros',
                      style: const TextStyle(color: MoviCashColors.textoGris, fontSize: 12),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text('S/ ${pozoTotal.toStringAsFixed(0)}',
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: (estado == 'activo' ? MoviCashColors.verdeMenta : MoviCashColors.textoGrisClaro)
                          .withOpacity(0.12),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: BoxDecoration(
                            color: estado == 'activo' ? MoviCashColors.verdeMenta : MoviCashColors.textoGrisClaro,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 5),
                        Text(estado == 'activo' ? 'Activo' : estado,
                            style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: estado == 'activo' ? MoviCashColors.verdeMenta : MoviCashColors.textoGris)),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: progreso,
              minHeight: 6,
              backgroundColor: color.withOpacity(0.12),
              valueColor: AlwaysStoppedAnimation(color),
            ),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  esMiTurno ? '¡Es tu turno de cobrar! 🎉' : 'S/ ${montoPorTurno.toStringAsFixed(0)} por turno',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: esMiTurno ? FontWeight.w700 : FontWeight.w500,
                    color: esMiTurno ? MoviCashColors.verdeMenta : MoviCashColors.textoGris,
                  ),
                ),
              ),
              TextButton(
                onPressed: () => _aportar(circulo['id']),
                child: const Text('Aportar'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _tarjetaDisponible(dynamic c, Color color) {
    final miembros = _conteoMiembros(c);
    final maxMiembros = (c['max_miembros'] as num?)?.toInt();
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: MoviCashColors.superficieBlanca,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: color.withOpacity(0.14), borderRadius: BorderRadius.circular(14)),
            child: Icon(_iconoPorGremio(c['gremio'] as String?), color: color, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(c['nombre'] ?? '',
                    maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 3),
                Text(
                  '${c['gremio'] ?? ''} · S/ ${c['monto_por_turno']} por turno'
                  '${maxMiembros != null ? ' · $miembros/$maxMiembros' : ''}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: MoviCashColors.textoGris, fontSize: 12),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          OutlinedButton(
            style: OutlinedButton.styleFrom(
              foregroundColor: color,
              side: BorderSide(color: color),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
            ),
            onPressed: () => _unirse(c['id']),
            child: const Text('Unirme'),
          ),
        ],
      ),
    );
  }

  Widget _tarjetaConfianza() {
    return Container(
      decoration: BoxDecoration(
        color: MoviCashColors.verdeMenta.withOpacity(0.06),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: MoviCashColors.verdeMenta.withOpacity(0.15)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Image.asset('assets/images/circulos_ahorro.png', height: 120, fit: BoxFit.cover),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 34,
                  height: 34,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(color: MoviCashColors.verdeMenta.withOpacity(0.14), shape: BoxShape.circle),
                  child: const Icon(Icons.shield_outlined, color: MoviCashColors.verdeMenta, size: 18),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Text(
                    'Respaldado por MoviCash. Tus aportes mejoran directamente tu MoviScore y desbloquean límites de crédito diario mayores.',
                    style: TextStyle(fontSize: 12.5, color: MoviCashColors.textoGris, height: 1.4),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
