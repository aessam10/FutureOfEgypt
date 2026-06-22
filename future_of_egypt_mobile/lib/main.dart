import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import 'features/auth/auth_gate.dart';
import 'features/tracking/background_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  if (!kIsWeb) {
    await BackgroundTrackingService.initialize();
  }

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      debugShowCheckedModeBanner: false,
      home: const AuthGate(),
    );
  }
}