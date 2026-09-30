import 'dart:convert';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import '../config/supabase_config.dart';

/// Todas las llamadas a la lógica de negocio (solicitar crédito,
/// registrar pago, aportar a un círculo, calcular MoviScore) pasan
/// por el backend — nunca se escriben esas tablas directo desde la
/// app, porque las políticas RLS de Supabase lo bloquean a propósito.
class ApiService {
  static String get _baseUrl => dotenv.env['API_BASE_URL']!;

  static Future<Map<String, String>> _headers() async {
    final token = supabase.auth.currentSession?.accessToken;
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static Future<dynamic> _get(String path) async {
    final res = await http.get(Uri.parse('$_baseUrl$path'), headers: await _headers());
    return _handle(res);
  }

  /// GET sin token: se usa antes de tener sesión (ej. consultar DNI en
  /// el registro).
  static Future<dynamic> _getPublico(String path) async {
    final res = await http.get(
      Uri.parse('$_baseUrl$path'),
      headers: const {'Content-Type': 'application/json'},
    );
    return _handle(res);
  }

  static Future<dynamic> _post(String path, Map<String, dynamic> body) async {
    final res = await http.post(
      Uri.parse('$_baseUrl$path'),
      headers: await _headers(),
      body: jsonEncode(body),
    );
    return _handle(res);
  }

  static Future<dynamic> _put(String path, Map<String, dynamic> body) async {
    final res = await http.put(
      Uri.parse('$_baseUrl$path'),
      headers: await _headers(),
      body: jsonEncode(body),
    );
    return _handle(res);
  }

  static dynamic _handle(http.Response res) {
    final decoded = res.body.isNotEmpty ? jsonDecode(res.body) : null;
    if (res.statusCode >= 200 && res.statusCode < 300) return decoded;
    throw Exception(decoded?['error']?.toString() ?? 'Error de red (${res.statusCode})');
  }

  // -------- Créditos --------
  static Future<dynamic> creditoActivo() => _get('/creditos/activo');
  static Future<dynamic> historialCreditos() => _get('/creditos/historial');
  static Future<dynamic> solicitarCredito(double monto, String motivo, int plazoDias) =>
      _post('/creditos', {'monto': monto, 'motivo': motivo, 'plazoDias': plazoDias});
  static Future<dynamic> registrarPago(String creditoId, double monto) =>
      _post('/creditos/pago', {'creditoId': creditoId, 'monto': monto});

  // -------- MoviScore --------
  static Future<dynamic> obtenerMoviscore() => _get('/moviscore');

  // -------- Círculos de ahorro --------
  static Future<dynamic> misCirculos() => _get('/circulos/mios');
  static Future<dynamic> misAportes() => _get('/circulos/mis-aportes');
  static Future<dynamic> circulosDisponibles() => _get('/circulos/disponibles');
  static Future<dynamic> unirseACirculo(String circuloId) =>
      _post('/circulos/$circuloId/unirse', {});
  static Future<dynamic> aportarACirculo(String circuloId, double monto) =>
      _post('/circulos/$circuloId/aportar', {'monto': monto});
  static Future<dynamic> crearCirculo(String nombre, String gremio, double montoPorTurno) =>
      _post('/circulos', {'nombre': nombre, 'gremio': gremio, 'montoPorTurno': montoPorTurno});

  // -------- Marketplace --------
  static Future<dynamic> entidadesMarketplace() => _get('/marketplace/entidades');
  static Future<dynamic> misSolicitudesMarketplace() => _get('/marketplace/mis-solicitudes');
  static Future<dynamic> solicitarEnMarketplace(String entidadId, double monto) =>
      _post('/marketplace/solicitudes', {'entidadId': entidadId, 'monto': monto});

  // -------- RENIEC (verificación/autocompletado por DNI) --------
  /// Devuelve { dni, nombres, apellidoPaterno, apellidoMaterno, nombreCompleto }
  /// o lanza una excepción con el mensaje de error del backend
  /// (ej. "No encontramos ese DNI en RENIEC").
  static Future<Map<String, dynamic>> consultarDni(String dni) async {
    final data = await _getPublico('/reniec/$dni');
    return Map<String, dynamic>.from(data as Map);
  }

  // -------- Perfil --------
  static Future<dynamic> obtenerPerfil() => _get('/perfil');
  static Future<dynamic> crearPerfil(Map<String, dynamic> campos) => _post('/perfil', campos);
  static Future<dynamic> actualizarPerfil(Map<String, dynamic> campos) => _put('/perfil', campos);
  static Future<dynamic> guardarFotoDni(String storagePath) =>
      _post('/perfil/dni', {'storagePath': storagePath});
  static Future<dynamic> guardarFotoPerfil(String storagePath) =>
      _post('/perfil/foto', {'storagePath': storagePath});
}
