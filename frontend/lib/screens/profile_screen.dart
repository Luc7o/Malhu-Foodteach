import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/theme.dart';
import '../config/supabase_config.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';
import 'login_screen.dart';
import 'my_data_screen.dart';
import 'settings_screen.dart';
import 'help_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  String? _fotoPerfilPath;
  bool _subiendoFoto = false;
  bool _cargando = true;

  @override
  void initState() {
    super.initState();
    _cargarPerfil();
  }

  Future<void> _cargarPerfil() async {
    try {
      final perfil = await ApiService.obtenerPerfil();
      if (mounted) setState(() => _fotoPerfilPath = perfil?['foto_perfil_path']);
    } catch (_) {
      // Si falla, simplemente se muestra el ícono por defecto.
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  String? get _fotoPerfilUrl {
    if (_fotoPerfilPath == null) return null;
    return supabase.storage.from('avatars').getPublicUrl(_fotoPerfilPath!);
  }

  /// Muestra una hoja simple para elegir entre tomar una foto nueva con la
  /// cámara o escoger una ya existente de la galería.
  Future<ImageSource?> _elegirFuenteImagen() {
    return showModalBottomSheet<ImageSource>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: const Text('Tomar foto'),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.image_outlined),
              title: const Text('Elegir de la galería'),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
  }

  /// Permite elegir una foto (cámara o galería) y la sube al bucket público
  /// "avatars".
  Future<void> _cambiarFotoPerfil() async {
    final fuente = await _elegirFuenteImagen();
    if (fuente == null) return;

    final picker = ImagePicker();
    final foto = await picker.pickImage(
      source: fuente,
      imageQuality: 70,
      maxWidth: 800,
    );
    if (foto == null) return;

    setState(() => _subiendoFoto = true);
    try {
      final userId = supabase.auth.currentUser!.id;
      final path = '$userId/avatar_${DateTime.now().millisecondsSinceEpoch}.jpg';
      await supabase.storage.from('avatars').upload(
            path,
            File(foto.path),
            fileOptions: const FileOptions(upsert: true),
          );
      await ApiService.guardarFotoPerfil(path);
      if (mounted) {
        setState(() => _fotoPerfilPath = path);
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Foto de perfil actualizada ✓')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _subiendoFoto = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = supabase.auth.currentUser;
    final nombreCompleto =
        AuthService.nombreActual ?? user?.userMetadata?['nombre'] ?? 'Usuario MoviCash';
    final primerNombre = nombreCompleto.trim().isNotEmpty
        ? nombreCompleto.trim().split(' ').first
        : 'Usuario';

    return Scaffold(
      appBar: AppBar(title: const Text('Mi perfil')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Column(
            children: [
              GestureDetector(
                onTap: _subiendoFoto ? null : _cambiarFotoPerfil,
                child: Stack(
                  children: [
                    CircleAvatar(
                      radius: 44,
                      backgroundColor: MoviCashColors.lilaClaro,
                      backgroundImage: _fotoPerfilUrl != null
                          ? NetworkImage(_fotoPerfilUrl!)
                          : null,
                      child: _cargando
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : (_fotoPerfilUrl == null
                              ? const Icon(Icons.person, size: 40, color: MoviCashColors.lilaInnovacion)
                              : null),
                    ),
                    Positioned(
                      right: 0,
                      bottom: 0,
                      child: Container(
                        width: 30,
                        height: 30,
                        decoration: BoxDecoration(
                          color: MoviCashColors.verdeMenta,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                        child: _subiendoFoto
                            ? const Padding(
                                padding: EdgeInsets.all(6),
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Icon(Icons.photo_camera_outlined, size: 15, color: Colors.white),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              Text('Bienvenido, $primerNombre',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text(
                AuthService.dniActual != null ? 'DNI ${AuthService.dniActual}' : '',
                style: const TextStyle(color: MoviCashColors.textoGris),
              ),
              const SizedBox(height: 6),
              TextButton.icon(
                onPressed: _subiendoFoto ? null : _cambiarFotoPerfil,
                icon: const Icon(Icons.image_outlined, size: 16),
                label: Text(_fotoPerfilUrl != null ? 'Cambiar foto' : 'Agregar foto de perfil'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(),
          const SizedBox(height: 8),
          _opcion(context, Icons.badge_outlined, 'Mis datos', () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const MyDataScreen()));
          }),
          _opcion(context, Icons.settings_outlined, 'Configuración', () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const SettingsScreen()));
          }),
          _opcion(context, Icons.help_outline, 'Ayuda', () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const HelpScreen()));
          }),
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.redAccent),
            title: const Text('Cerrar sesión', style: TextStyle(color: Colors.redAccent)),
            onTap: () async {
              await AuthService.cerrarSesion();
              if (context.mounted) {
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (route) => false,
                );
              }
            },
          ),
        ],
      ),
    );
  }

  Widget _opcion(BuildContext context, IconData icon, String label, VoidCallback onTap) {
    return ListTile(
      leading: Icon(icon, color: MoviCashColors.textoGris),
      title: Text(label),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }
}
