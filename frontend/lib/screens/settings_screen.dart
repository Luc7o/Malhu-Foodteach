import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../services/notification_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _recordatoriosPago = true;
  bool _notificacionesCirculos = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Configuración')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        children: [
          _seccionTitulo('Notificaciones'),
          _card(
            child: Column(
              children: [
                _switchTile(
                  icon: Icons.notifications_active_outlined,
                  color: MoviCashColors.amarilloPastel,
                  title: 'Recordatorio de pago diario',
                  subtitle: 'Te avisamos cada día antes de las 6pm si tienes un pago pendiente',
                  value: _recordatoriosPago,
                  onChanged: (v) async {
                    setState(() => _recordatoriosPago = v);
                    if (v) {
                      await NotificationService.programarRecordatorioDiario();
                    } else {
                      await NotificationService.cancelarRecordatorios();
                    }
                  },
                ),
                const Divider(height: 24),
                _switchTile(
                  icon: Icons.groups_outlined,
                  color: MoviCashColors.rosaComunidad,
                  title: 'Avisos de círculos de ahorro',
                  subtitle: 'Cuando te toque tu turno o alguien aporte a tu círculo',
                  value: _notificacionesCirculos,
                  onChanged: (v) => setState(() => _notificacionesCirculos = v),
                ),
              ],
            ),
          ),
          const SizedBox(height: 22),
          _seccionTitulo('Acerca de'),
          _card(
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(color: MoviCashColors.lilaInnovacion.withOpacity(0.12), shape: BoxShape.circle),
                  child: const Icon(Icons.info_outline, color: MoviCashColors.lilaInnovacion, size: 20),
                ),
                const SizedBox(width: 12),
                const Expanded(child: Text('Versión de la app', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
                const Text('1.0.0', style: TextStyle(color: MoviCashColors.textoGris)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _switchTile({
    required IconData icon,
    required Color color,
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 40,
          height: 40,
          alignment: Alignment.center,
          decoration: BoxDecoration(color: color.withOpacity(0.12), shape: BoxShape.circle),
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 2),
              Text(subtitle, style: const TextStyle(fontSize: 11, color: MoviCashColors.textoGris)),
            ],
          ),
        ),
        Switch(activeThumbColor: MoviCashColors.lilaInnovacion, value: value, onChanged: onChanged),
      ],
    );
  }

  Widget _seccionTitulo(String texto) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(texto, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
    );
  }

  Widget _card({required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: MoviCashColors.superficieBlanca,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(color: MoviCashColors.textoOscuro.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: child,
    );
  }
}
