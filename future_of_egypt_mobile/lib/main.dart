import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import 'features/auth/auth_gate.dart';
import 'features/tracking/background_service.dart';
import 'features/app_update/update_gate.dart';
import 'core/network/api_client.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  debugPrint('[FOE_BACKGROUND] main() started');
  
  await ApiClient.init();

  if (!kIsWeb) {
    await BackgroundTrackingService.initialize();
  }

  runApp(const MyApp());
}

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: navigatorKey,
      debugShowCheckedModeBanner: false,
      home: const UpdateGate(child: AuthGate()),
    );
  }
}