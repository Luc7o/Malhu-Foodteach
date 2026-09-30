class Credito {
  final String id;
  final double monto;
  final double saldoPendiente;
  final double pagoDiarioSugerido;
  final int diasTotales;
  final int diasRestantes;
  final String estado;
  final String? motivo;
  final double? interes;
  final double? totalAPagar;

  Credito({
    required this.id,
    required this.monto,
    required this.saldoPendiente,
    required this.pagoDiarioSugerido,
    required this.diasTotales,
    required this.diasRestantes,
    required this.estado,
    this.motivo,
    this.interes,
    this.totalAPagar,
  });

  factory Credito.fromJson(Map<String, dynamic> json) {
    return Credito(
      id: json['id'],
      monto: (json['monto'] as num).toDouble(),
      saldoPendiente: (json['saldo_pendiente'] as num).toDouble(),
      pagoDiarioSugerido: (json['pago_diario_sugerido'] as num).toDouble(),
      diasTotales: json['dias_totales'] ?? 0,
      diasRestantes: json['dias_restantes'] ?? 0,
      estado: json['estado'] ?? 'activo',
      motivo: json['motivo'],
      interes: (json['interes'] as num?)?.toDouble(),
      totalAPagar: (json['total_a_pagar'] as num?)?.toDouble(),
    );
  }

  int get diasPagados => diasTotales - diasRestantes;
  double get progreso => diasTotales == 0 ? 0 : diasPagados / diasTotales;
}
