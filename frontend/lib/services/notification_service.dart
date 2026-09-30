import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest.dart' as tz_data;

/// Notificaciones LOCALES (no push): se programan directo en el celular,
/// no requieren Firebase, servidor, ni ningún costo. Perfecto para
/// recordatorios como "te toca pagar hoy".
class NotificationService {
  static final _plugin = FlutterLocalNotificationsPlugin();
  static const _idRecordatorioPago = 1001;

  static Future<void> init() async {
    tz_data.initializeTimeZones();
    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const initSettings = InitializationSettings(android: androidInit);
    await _plugin.initialize(initSettings);
  }

  /// Programa un recordatorio diario a las 6:00pm si hay un crédito activo.
  static Future<void> programarRecordatorioDiario() async {
    final ahora = tz.TZDateTime.now(tz.local);
    var fecha = tz.TZDateTime(tz.local, ahora.year, ahora.month, ahora.day, 18, 0);
    if (fecha.isBefore(ahora)) fecha = fecha.add(const Duration(days: 1));

    await _plugin.zonedSchedule(
      _idRecordatorioPago,
      'MoviCash — Recordatorio de pago',
      'No olvides registrar tu pago diario para seguir subiendo tu MoviScore 📈',
      fecha,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'pagos_diarios_v2',
          'Recordatorios de pago',
          channelDescription: 'Avisos para pagar tu crédito diario',
          importance: Importance.high,
          priority: Priority.high,
          playSound: true,
          sound: RawResourceAndroidNotificationSound('notificacion_pago'),
        ),
      ),
      uiLocalNotificationDateInterpretation: UILocalNotificationDateInterpretation.absoluteTime,
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      matchDateTimeComponents: DateTimeComponents.time,
    );
  }

  static Future<void> cancelarRecordatorios() async {
    await _plugin.cancel(_idRecordatorioPago);
  }
}
