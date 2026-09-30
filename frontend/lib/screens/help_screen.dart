import 'package:flutter/material.dart';
import '../config/theme.dart';

class HelpScreen extends StatelessWidget {
  const HelpScreen({super.key});

  static const faqs = [
    {
      'pregunta': '¿Cómo solicito un crédito?',
      'respuesta':
          'Ve a Inicio > Solicitar crédito, elige el monto entre S/50 y S/500, el plazo de pago, indica para qué lo usarás, y confirma. El dinero queda disponible según tu MoviScore.'
    },
    {
      'pregunta': '¿Qué pasa si un día no puedo pagar la cuota?',
      'respuesta':
          'No hay penalidad inmediata: puedes pagar menos o nada ese día. Eso sí, pagar seguido y a tiempo es lo que hace subir tu MoviScore.'
    },
    {
      'pregunta': '¿Cómo funciona un círculo de ahorro?',
      'respuesta':
          'Un grupo de personas aporta un monto fijo por turno. Cada cierto tiempo, uno de los miembros recibe el total ahorrado. Aportar a tiempo también sube tu MoviScore.'
    },
    {
      'pregunta': '¿Qué es el MoviScore?',
      'respuesta':
          'Es tu historial crediticio dentro de MoviCash (va de 300 a 850). Sube con pagos puntuales, créditos completados y aportes a círculos. Entre más alto, mejores condiciones de crédito tienes.'
    },
    {
      'pregunta': '¿Para qué sirve el Marketplace?',
      'respuesta':
          'Cuando tu MoviScore es alto, puedes usarlo para solicitar créditos más grandes directamente con cajas municipales y cooperativas aliadas.'
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Ayuda')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [MoviCashColors.lilaInnovacion, Color(0xFF5B21B6)],
              ),
              borderRadius: BorderRadius.circular(22),
              boxShadow: [
                BoxShadow(color: MoviCashColors.lilaInnovacion.withOpacity(0.25), blurRadius: 18, offset: const Offset(0, 8)),
              ],
            ),
            child: const Row(
              children: [
                Icon(Icons.support_agent_outlined, color: Colors.white, size: 30),
                SizedBox(width: 12),
                Expanded(
                  child: Text('¿En qué te podemos ayudar?',
                      style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 22),
          const Text('Preguntas frecuentes', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
          const SizedBox(height: 12),
          ...faqs.map((f) => Container(
                margin: const EdgeInsets.only(bottom: 10),
                decoration: BoxDecoration(
                  color: MoviCashColors.superficieBlanca,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(color: MoviCashColors.textoOscuro.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4)),
                  ],
                ),
                child: Theme(
                  data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                  child: ExpansionTile(
                    shape: const RoundedRectangleBorder(side: BorderSide.none),
                    leading: Container(
                      width: 36,
                      height: 36,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(color: MoviCashColors.lilaInnovacion.withOpacity(0.1), shape: BoxShape.circle),
                      child: const Icon(Icons.help_outline, size: 18, color: MoviCashColors.lilaInnovacion),
                    ),
                    title: Text(f['pregunta']!, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    children: [
                      Text(f['respuesta']!, style: const TextStyle(color: MoviCashColors.textoGris, fontSize: 13)),
                    ],
                  ),
                ),
              )),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: MoviCashColors.celesteClaro,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: MoviCashColors.celesteSeguridad.withOpacity(0.2)),
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(color: MoviCashColors.celesteSeguridad.withOpacity(0.14), shape: BoxShape.circle),
                  child: const Icon(Icons.mail_outline, color: MoviCashColors.celesteSeguridad, size: 20),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('¿No encontraste tu respuesta?', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                      SizedBox(height: 2),
                      Text('Escríbenos a soporte@movicash.pe y te ayudamos.',
                          style: TextStyle(color: MoviCashColors.textoGris, fontSize: 12)),
                    ],
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
