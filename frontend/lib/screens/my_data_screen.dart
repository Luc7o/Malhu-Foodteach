import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../config/theme.dart';
import '../config/supabase_config.dart';
import '../services/api_service.dart';

class MyDataScreen extends StatefulWidget {
  const MyDataScreen({super.key});

  @override
  State<MyDataScreen> createState() => _MyDataScreenState();
}

class _MyDataScreenState extends State<MyDataScreen> {
  final _nombreCtrl = TextEditingController();
  final _ubicacionCtrl = TextEditingController();
  final _ocupacionCtrl = TextEditingController();
  final _dniCtrl = TextEditingController();
  final _telefonoCtrl = TextEditingController();
  final _correoCtrl = TextEditingController();
  bool _cargando = true;
  bool _guardando = false;
  String? _dniFotoPath;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    try {
      final perfil = await ApiService.obtenerPerfil();
      _nombreCtrl.text = perfil['nombre'] ?? '';
      _ubicacionCtrl.text = perfil['ubicacion'] ?? '';
      _ocupacionCtrl.text = perfil['ocupacion'] ?? '';
      _dniCtrl.text = perfil['dni'] ?? '';
      _telefonoCtrl.text = perfil['telefono'] ?? '';
      _correoCtrl.text = perfil['email'] ?? '';
      _dniFotoPath = perfil['dni_foto_path'];
    } catch (_) {
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  Future<void> _guardar() async {
    setState(() => _guardando = true);
    try {
      // El nombre y el DNI no se editan aquí: el nombre viene verificado
      // junto con el DNI contra RENIEC durante el registro, así que ambos
      // quedan fijos para mantener la identidad verificada.
      await ApiService.actualizarPerfil({
        'ubicacion': _ubicacionCtrl.text,
        'ocupacion': _ocupacionCtrl.text,
        'telefono': _telefonoCtrl.text,
        'correo': _correoCtrl.text,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Datos guardados ✓')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _guardando = false);
    }
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

  /// Sube la foto del DNI a Supabase Storage (bucket privado "kyc-documents")
  /// y guarda solo la referencia en el backend. Base sencilla de KYC.
  Future<void> _subirFotoDni() async {
    final fuente = await _elegirFuenteImagen();
    if (fuente == null) return;

    final picker = ImagePicker();
    final foto = await picker.pickImage(source: fuente, imageQuality: 70);
    if (foto == null) return;

    setState(() => _guardando = true);
    try {
      final userId = supabase.auth.currentUser!.id;
      final path = '$userId/dni_${DateTime.now().millisecondsSinceEpoch}.jpg';
      await supabase.storage.from('kyc-documents').upload(path, File(foto.path));
      await ApiService.guardarFotoDni(path);
      setState(() => _dniFotoPath = path);
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Foto de DNI subida correctamente ✓')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _guardando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_cargando) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    return Scaffold(
      appBar: AppBar(title: const Text('Mis datos')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        children: [
          _seccionTitulo('Identidad verificada'),
          _card(
            child: Column(
              children: [
                Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(color: MoviCashColors.verdeMenta.withOpacity(0.13), shape: BoxShape.circle),
                      child: const Icon(Icons.verified_user_outlined, color: MoviCashColors.verdeMenta, size: 20),
                    ),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Text('Estos datos vienen verificados con RENIEC y no se pueden editar',
                          style: TextStyle(fontSize: 12, color: MoviCashColors.textoGris)),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: _nombreCtrl,
                  enabled: false,
                  decoration: const InputDecoration(
                    labelText: 'Nombre completo',
                    suffixIcon: Icon(Icons.lock_outline, size: 18),
                  ),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: _dniCtrl,
                  enabled: false,
                  decoration: const InputDecoration(
                    labelText: 'DNI',
                    suffixIcon: Icon(Icons.lock_outline, size: 18),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 22),
          _seccionTitulo('Contacto'),
          _card(
            child: Column(
              children: [
                TextField(
                  controller: _telefonoCtrl,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(labelText: 'Número de celular'),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: _correoCtrl,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Correo electrónico'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 22),
          _seccionTitulo('Trabajo'),
          _card(
            child: Column(
              children: [
                TextField(controller: _ubicacionCtrl, decoration: const InputDecoration(labelText: 'Ubicación')),
                const SizedBox(height: 14),
                TextField(
                  controller: _ocupacionCtrl,
                  decoration: const InputDecoration(labelText: 'Ocupación (ej. mototaxista, delivery)'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 22),
          _seccionTitulo('Verificación de identidad'),
          Container(
            decoration: BoxDecoration(
              color: _dniFotoPath != null
                  ? MoviCashColors.verdeMenta.withOpacity(0.08)
                  : MoviCashColors.amarilloClaro,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: (_dniFotoPath != null ? MoviCashColors.verdeMenta : MoviCashColors.amarilloPastel)
                    .withOpacity(0.25),
              ),
            ),
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: (_dniFotoPath != null ? MoviCashColors.verdeMenta : MoviCashColors.amarilloPastel)
                        .withOpacity(0.16),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    _dniFotoPath != null ? Icons.check_circle : Icons.camera_alt_outlined,
                    color: _dniFotoPath != null ? MoviCashColors.verdeMenta : MoviCashColors.textoOscuro,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_dniFotoPath != null ? 'Foto de DNI subida' : 'Sube una foto de tu DNI',
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                      const Text('Ayuda a que tu solicitud de crédito se procese más rápido',
                          style: TextStyle(fontSize: 11, color: MoviCashColors.textoGris)),
                    ],
                  ),
                ),
                TextButton(onPressed: _subirFotoDni, child: const Text('Subir')),
              ],
            ),
          ),
          const SizedBox(height: 26),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: _guardando ? null : _guardar,
              child: _guardando
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white))
                  : const Text('Guardar cambios'),
            ),
          ),
        ],
      ),
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
