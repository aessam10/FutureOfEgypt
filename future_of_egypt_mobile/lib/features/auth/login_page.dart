import 'package:flutter/material.dart';

import '../../core/network/api_client.dart';
import '../admin/admin_home.dart';
import '../engineer/device_pending_page.dart';
import '../engineer/engineer_home.dart';
import '../manager/manager_home.dart';
import '../tracking/tracking_config_service.dart';
import 'auth_service.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();

  bool loading = false;
  String? errorMessage;

  Future<void> login() async {
    setState(() {
      loading = true;
      errorMessage = null;
    });

    try {
      final result = await AuthService.login(
        emailController.text.trim(),
        passwordController.text,
      );

      final token = result["token"]?.toString() ?? "";
      final roles = List<String>.from(result["roles"] ?? []);

      final engineerPublicId = result["engineerPublicId"]?.toString() ?? "";
      final devicePublicId = result["devicePublicId"]?.toString() ?? "";

      if (token.isEmpty) {
        throw Exception("Token is missing from login response");
      }

      ApiClient.setToken(token);

      await TrackingConfigService.saveLoginData(
        token: token,
        engineerPublicId: engineerPublicId,
        devicePublicId: devicePublicId,
      );

      if (!mounted) {
        return;
      }

      Widget nextPage;

      if (roles.contains("Admin")) {
        nextPage = const AdminHome();
      } else if (roles.contains("Manager")) {
        nextPage = const ManagerHome();
      } else {
        if (engineerPublicId.isEmpty) {
          throw Exception("Engineer identity is missing from login response");
        }

        if (devicePublicId.isEmpty) {
          nextPage = DevicePendingPage(
            engineerId: engineerPublicId,
            token: token,
          );
        } else {
          nextPage = EngineerHome(
            engineerId: engineerPublicId,
            deviceId: devicePublicId,
            token: token,
          );
        }
      }

      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => nextPage),
      );
    } catch (_) {
      if (!mounted) {
        return;
      }

      setState(() {
        errorMessage = "Login failed";
      });
    } finally {
      if (mounted) {
        setState(() {
          loading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    emailController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              TextField(
                controller: emailController,
                decoration: const InputDecoration(
                  labelText: "Email",
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: passwordController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: "Password",
                ),
              ),
              const SizedBox(height: 20),
              if (errorMessage != null) ...[
                Text(
                  errorMessage!,
                  style: const TextStyle(color: Colors.red),
                ),
                const SizedBox(height: 10),
              ],
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: loading ? null : login,
                  child: loading
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text("Login"),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}