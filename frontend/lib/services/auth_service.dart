import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/supabase_config.dart';

/// Autenticación por DNI + contraseña.
///
/// Supabase Auth solo soporta identificarse con correo o teléfono, no con
/// un documento de identidad directamente. Para no depender de un
/// proveedor de SMS de pago (Twilio) y para que el DNI sea lo único que
/// el usuario necesita recordar, generamos internamente un correo
/// "sintético" a partir del DNI (`<dni>@movicash.com`) y lo usamos
/// como identificador técnico dentro de Supabase. El usuario nunca ve
/// ni escribe ese correo: solo ingresa su DNI y su contraseña.
class AuthService {
  static const _dominioSintetico = 'movicash.com';

  static String correoDesdeDni(String dni) => '$dni@$_dominioSintetico';

  /// Registra una cuenta nueva. [nombreCompleto] viene de la consulta a
  /// RENIEC. [telefono] y [correo] son datos de contacto del usuario
  /// (no se usan para iniciar sesión, solo para poder contactarlo).
  /// Todo se guarda como metadata del usuario para poder prellenar la
  /// pantalla de "Completar perfil" incluso si el usuario cierra la
  /// app antes de terminar el registro.
  static Future<AuthResponse> registrarse({
    required String dni,
    required String password,
    required String nombreCompleto,
    required String telefono,
    required String correo,
  }) {
    return supabase.auth.signUp(
      email: correoDesdeDni(dni),
      password: password,
      data: {
        'dni': dni,
        'nombre_completo': nombreCompleto,
        'telefono': telefono,
        'correo_contacto': correo,
      },
    );
  }

  static Future<AuthResponse> iniciarSesion(String dni, String password) {
    return supabase.auth.signInWithPassword(
      email: correoDesdeDni(dni),
      password: password,
    );
  }

  static bool get estaAutenticado => supabase.auth.currentSession != null;

  static Future<void> cerrarSesion() => supabase.auth.signOut();

  /// El DNI y nombre guardados al registrarse (metadata del usuario de
  /// Supabase), disponibles para prellenar pantallas posteriores.
  static String? get dniActual => supabase.auth.currentUser?.userMetadata?['dni'] as String?;
  static String? get nombreActual =>
      supabase.auth.currentUser?.userMetadata?['nombre_completo'] as String?;
  static String? get telefonoActual => supabase.auth.currentUser?.userMetadata?['telefono'] as String?;
  static String? get correoActual =>
      supabase.auth.currentUser?.userMetadata?['correo_contacto'] as String?;
}