import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/theme.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';
import 'home_screen.dart';
import 'complete_profile_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _formKeyLogin = GlobalKey<FormState>();
  final _formKeyRegistro = GlobalKey<FormState>();

  final _dniLoginCtrl = TextEditingController();
  final _passLoginCtrl = TextEditingController();

  final _dniRegistroCtrl = TextEditingController();
  final _passRegistroCtrl = TextEditingController();
  final _passConfirmarCtrl = TextEditingController();
  final _telefonoRegistroCtrl = TextEditingController();
  final _correoRegistroCtrl = TextEditingController();

  bool _cargando = false;
  bool _verPassword = false;
  String? _error;

  // ---- Estado de la verificación por DNI (RENIEC) ----
  bool _consultandoDni = false;
  String? _nombreEncontrado;
  String? _errorDni;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() => setState(() => _error = null));
  }

  @override
  void dispose() {
    _tabController.dispose();
    _dniLoginCtrl.dispose();
    _passLoginCtrl.dispose();
    _dniRegistroCtrl.dispose();
    _passRegistroCtrl.dispose();
    _passConfirmarCtrl.dispose();
    _telefonoRegistroCtrl.dispose();
    _correoRegistroCtrl.dispose();
    super.dispose();
  }

  Future<void> _buscarEnReniec(String dni) async {
    if (dni.length != 8) {
      setState(() {
        _nombreEncontrado = null;
        _errorDni = null;
      });
      return;
    }
    setState(() {
      _consultandoDni = true;
      _nombreEncontrado = null;
      _errorDni = null;
    });
    try {
      final datos = await ApiService.consultarDni(dni);
      if (!mounted || _dniRegistroCtrl.text.trim() != dni) return;
      setState(() => _nombreEncontrado = datos['nombreCompleto'] as String?);
    } catch (e) {
      if (!mounted || _dniRegistroCtrl.text.trim() != dni) return;
      setState(() => _errorDni = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _consultandoDni = false);
    }
  }

  Future<void> _iniciarSesion() async {
    setState(() => _error = null);
    if (!_formKeyLogin.currentState!.validate()) return;

    setState(() => _cargando = true);
    try {
      await AuthService.iniciarSesion(_dniLoginCtrl.text.trim(), _passLoginCtrl.text);
      await _irALaPantallaCorrecta();
    } on AuthException catch (e) {
      setState(() => _error = _traducirError(e.message));
    } catch (e) {
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  Future<void> _crearCuenta() async {
    setState(() => _error = null);
    if (!_formKeyRegistro.currentState!.validate()) return;

    if (_nombreEncontrado == null) {
      setState(() => _error = 'Espera a que verifiquemos tu DNI con RENIEC antes de continuar.');
      return;
    }

    setState(() => _cargando = true);
    try {
      final dni = _dniRegistroCtrl.text.trim();
      final res = await AuthService.registrarse(
        dni: dni,
        password: _passRegistroCtrl.text,
        nombreCompleto: _nombreEncontrado!,
        telefono: _telefonoRegistroCtrl.text.trim(),
        correo: _correoRegistroCtrl.text.trim(),
      );
      if (res.session == null) {
        setState(() {
          _error = 'No pudimos crear tu sesión automáticamente. Intenta iniciar sesión con tu DNI.';
          _cargando = false;
        });
        return;
      }
      await _irALaPantallaCorrecta();
    } on AuthException catch (e) {
      setState(() => _error = _traducirError(e.message));
    } catch (e) {
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  String _traducirError(String msg) {
    if (msg.contains('Invalid login credentials')) return 'DNI o contraseña incorrectos.';
    if (msg.contains('User already registered')) {
      return 'Ya existe una cuenta con ese DNI. Inicia sesión.';
    }
    if (msg.contains('Password should be')) return 'La contraseña debe tener al menos 6 caracteres.';
    return msg;
  }

  Future<void> _irALaPantallaCorrecta() async {
    try {
      final perfil = await ApiService.obtenerPerfil();
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => perfil == null ? const CompleteProfileScreen() : const HomeScreen()),
        (route) => false,
      );
    } catch (_) {
      if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const CompleteProfileScreen()),
          (route) => false,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: MoviCashColors.fondoClaro,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 8),
                  Center(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(28),
                      child: Image.asset('assets/logo/movicash_logo.png', height: 108, width: 108, fit: BoxFit.cover),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    'MoviCash',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineLarge,
                  ),
                  Text(
                    'Tu dinero, a tu ritmo',
                    textAlign: TextAlign.center,
                    style: Theme.of(context)
                        .textTheme
                        .bodyMedium
                        ?.copyWith(color: MoviCashColors.textoGris),
                  ),
                  const SizedBox(height: 24),
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(28),
                      boxShadow: [
                        BoxShadow(
                          color: MoviCashColors.textoOscuro.withOpacity(0.06),
                          blurRadius: 24,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: Column(
                      children: [
                        Container(
                          color: MoviCashColors.fondoSecundario,
                          child: TabBar(
                            controller: _tabController,
                            labelColor: MoviCashColors.verdeMenta,
                            unselectedLabelColor: MoviCashColors.textoGris,
                            indicatorColor: MoviCashColors.verdeMenta,
                            indicatorWeight: 3,
                            labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                            tabs: const [
                              Tab(text: 'Iniciar sesión'),
                              Tab(text: 'Crear cuenta'),
                            ],
                          ),
                        ),
                        AnimatedSize(
                          duration: const Duration(milliseconds: 220),
                          curve: Curves.easeInOut,
                          alignment: Alignment.topCenter,
                          child: Padding(
                            padding: const EdgeInsets.all(22),
                            child: AnimatedSwitcher(
                              duration: const Duration(milliseconds: 180),
                              child: _tabController.index == 0
                                  ? _formularioLogin()
                                  : _formularioRegistro(),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.shield_outlined, size: 16, color: MoviCashColors.textoGrisClaro),
                      const SizedBox(width: 6),
                      Text('Supervisado y protegido en Perú',
                          style: TextStyle(color: MoviCashColors.textoGrisClaro, fontSize: 12)),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _campoDni({required TextEditingController controller, ValueChanged<String>? onChanged}) {
    return TextFormField(
      controller: controller,
      keyboardType: TextInputType.number,
      inputFormatters: [
        FilteringTextInputFormatter.digitsOnly,
        LengthLimitingTextInputFormatter(8),
      ],
      onChanged: onChanged,
      decoration: const InputDecoration(
        labelText: 'DNI',
        hintText: '8 dígitos',
        prefixIcon: Icon(Icons.badge_outlined),
      ),
      validator: (v) {
        if (v == null || v.trim().isEmpty) return 'Ingresa tu DNI';
        if (v.trim().length != 8) return 'El DNI debe tener 8 dígitos';
        return null;
      },
    );
  }

  Widget _formularioLogin() {
    return KeyedSubtree(
      key: const ValueKey('form-login'),
      child: Form(
      key: _formKeyLogin,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          _campoDni(controller: _dniLoginCtrl),
          const SizedBox(height: 14),
          TextFormField(
            controller: _passLoginCtrl,
            obscureText: !_verPassword,
            decoration: InputDecoration(
              labelText: 'Contraseña',
              prefixIcon: const Icon(Icons.lock_outline),
              suffixIcon: IconButton(
                icon: Icon(_verPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined),
                onPressed: () => setState(() => _verPassword = !_verPassword),
              ),
            ),
            validator: (v) => (v == null || v.isEmpty) ? 'Ingresa tu contraseña' : null,
          ),
          const SizedBox(height: 4),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (_) => AlertDialog(
                    title: const Text('¿Olvidaste tu contraseña?'),
                    content: const Text(
                        'Escríbenos por WhatsApp o al soporte de MoviCash con tu DNI para verificar tu identidad y restablecerla.'),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(context), child: const Text('Entendido')),
                    ],
                  ),
                );
              },
              child: const Text('¿Olvidaste tu contraseña?', style: TextStyle(fontSize: 12)),
            ),
          ),
          if (_error != null) _mensajeError(),
          const SizedBox(height: 8),
          _botonPrincipal('Iniciar sesión', _cargando ? null : _iniciarSesion),
        ],
      ),
      ),
    );
  }

  Widget _formularioRegistro() {
    return KeyedSubtree(
      key: const ValueKey('form-registro'),
      child: Form(
      key: _formKeyRegistro,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          _campoDni(
            controller: _dniRegistroCtrl,
            onChanged: (v) {
              _debounceReniec?.cancel();
              _debounceReniec = Timer(const Duration(milliseconds: 500), () => _buscarEnReniec(v.trim()));
            },
          ),
          const SizedBox(height: 8),
          _estadoVerificacionDni(),
          const SizedBox(height: 14),
          TextFormField(
            controller: _telefonoRegistroCtrl,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              labelText: 'Teléfono de contacto',
              prefixIcon: Icon(Icons.phone_outlined),
            ),
            validator: (v) => (v == null || v.trim().isEmpty) ? 'Ingresa tu teléfono' : null,
          ),
          const SizedBox(height: 14),
          TextFormField(
            controller: _correoRegistroCtrl,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(
              labelText: 'Correo de contacto',
              prefixIcon: Icon(Icons.email_outlined),
            ),
            validator: (v) => (v == null || !v.contains('@')) ? 'Ingresa un correo válido' : null,
          ),
          const SizedBox(height: 14),
          TextFormField(
            controller: _passRegistroCtrl,
            obscureText: !_verPassword,
            decoration: InputDecoration(
              labelText: 'Contraseña',
              prefixIcon: const Icon(Icons.lock_outline),
              suffixIcon: IconButton(
                icon: Icon(_verPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined),
                onPressed: () => setState(() => _verPassword = !_verPassword),
              ),
            ),
            validator: (v) => (v == null || v.length < 6) ? 'Mínimo 6 caracteres' : null,
          ),
          const SizedBox(height: 14),
          TextFormField(
            controller: _passConfirmarCtrl,
            obscureText: !_verPassword,
            decoration: const InputDecoration(
                labelText: 'Confirmar contraseña', prefixIcon: Icon(Icons.lock_outline)),
            validator: (v) => (v != _passRegistroCtrl.text) ? 'Las contraseñas no coinciden' : null,
          ),
          if (_error != null) _mensajeError(),
          const SizedBox(height: 14),
          _botonPrincipal('Crear cuenta', _cargando ? null : _crearCuenta),
        ],
      ),
      ),
    );
  }

  Timer? _debounceReniec;

  Widget _estadoVerificacionDni() {
    if (_consultandoDni) {
      return Row(
        children: const [
          SizedBox(
              width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: MoviCashColors.lilaInnovacion)),
          SizedBox(width: 8),
          Text('Verificando con RENIEC…', style: TextStyle(fontSize: 12, color: MoviCashColors.textoGris)),
        ],
      );
    }
    if (_nombreEncontrado != null) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: MoviCashColors.verdeMenta.withOpacity(0.08),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            const Icon(Icons.check_circle, size: 16, color: MoviCashColors.verdeMenta),
            const SizedBox(width: 8),
            Expanded(
              child: Text(_nombreEncontrado!,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: MoviCashColors.verdeMenta)),
            ),
          ],
        ),
      );
    }
    if (_errorDni != null) {
      return Row(
        children: [
          const Icon(Icons.error_outline, size: 14, color: MoviCashColors.error),
          const SizedBox(width: 6),
          Expanded(child: Text(_errorDni!, style: const TextStyle(fontSize: 12, color: MoviCashColors.error))),
        ],
      );
    }
    return const Text(
      'Escribe tu DNI y confirmaremos tu nombre automáticamente con RENIEC.',
      style: TextStyle(fontSize: 12, color: MoviCashColors.textoGrisClaro),
    );
  }

  Widget _mensajeError() {
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: MoviCashColors.error.withOpacity(0.08), borderRadius: BorderRadius.circular(10)),
        child: Row(
          children: [
            const Icon(Icons.error_outline, color: MoviCashColors.error, size: 16),
            const SizedBox(width: 8),
            Expanded(child: Text(_error!, style: const TextStyle(color: MoviCashColors.error, fontSize: 12))),
          ],
        ),
      ),
    );
  }

  Widget _botonPrincipal(String texto, VoidCallback? onPressed) {
    return SizedBox(
      height: 52,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: MoviCashColors.verdeMenta,
          foregroundColor: Colors.white,
          disabledBackgroundColor: MoviCashColors.verdeMenta.withOpacity(0.5),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
        onPressed: onPressed,
        child: _cargando
            ? const SizedBox(
                height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.4))
            : Text(texto, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
      ),
    );
  }
}