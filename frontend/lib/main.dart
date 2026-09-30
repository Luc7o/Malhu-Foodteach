import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'config/supabase_config.dart';
import 'config/theme.dart';
import 'services/notification_service.dart';
import 'screens/splash_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: '.env');
  await SupabaseConfig.init();
  await NotificationService.init();
  runApp(const MoviCashApp());
}

class MoviCashApp extends StatelessWidget {
  const MoviCashApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MoviCash',
      debugShowCheckedModeBanner: false,
      theme: moviCashTheme,
      home: const SplashScreen(),
    );
  }
}
