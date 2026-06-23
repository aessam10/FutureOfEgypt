import 'package:flutter/material.dart';
import '../auth/login_page.dart';
import '../../core/network/api_client.dart';
import '../tracking/tracking_config_service.dart';

class AdminBlockPage extends StatelessWidget {
  const AdminBlockPage({super.key});

  Future<void> _signOut(BuildContext context) async {
    await TrackingConfigService.clear();
    ApiClient.setToken('');
    if (!context.mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => const LoginPage()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Access Restricted")),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.block, size: 64, color: Colors.orange),
              const SizedBox(height: 24),
              const Text(
                "Mobile administration is under development.\nPlease use the web dashboard for now.",
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 18),
              ),
              const SizedBox(height: 48),
              ElevatedButton.icon(
                onPressed: () => _signOut(context),
                icon: const Icon(Icons.logout),
                label: const Text("Sign Out"),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
