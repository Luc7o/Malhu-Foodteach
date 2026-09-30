class Usuario {
  final String id;
  final String nombre;
  final String telefono;
  final String? ubicacion;
  final int moviscoreActual;
  final String nivelMoviscore;
  final double creditoDisponibleMin;
  final double creditoDisponibleMax;

  Usuario({
    required this.id,
    required this.nombre,
    required this.telefono,
    this.ubicacion,
    required this.moviscoreActual,
    required this.nivelMoviscore,
    required this.creditoDisponibleMin,
    required this.creditoDisponibleMax,
  });

  factory Usuario.fromJson(Map<String, dynamic> json) {
    return Usuario(
      id: json['id'],
      nombre: json['nombre'] ?? '',
      telefono: json['telefono'] ?? '',
      ubicacion: json['ubicacion'],
      moviscoreActual: json['moviscore_actual'] ?? 500,
      nivelMoviscore: json['nivel_moviscore'] ?? 'Nuevo',
      creditoDisponibleMin: (json['credito_disponible_min'] ?? 50).toDouble(),
      creditoDisponibleMax: (json['credito_disponible_max'] ?? 200).toDouble(),
    );
  }
}
