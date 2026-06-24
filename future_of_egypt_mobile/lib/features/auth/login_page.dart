import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/network/api_client.dart';
import '../admin/admin_block_page.dart';
import '../device/device_access_service.dart';
import '../device/device_validation_service.dart';
import '../engineer/device_pending_page.dart';
import '../engineer/engineer_home.dart';
import '../tracking/tracking_config_service.dart';
import 'auth_service.dart';

class LoginPage extends StatefulWidget {
  final String? initialMessage;
  const LoginPage({super.key, this.initialMessage});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();

  bool loading = false;
  String? errorMessage;

  @override
  void initState() {
    super.initState();
    errorMessage = widget.initialMessage;
  }

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

      // --- extract login response fields ---
      final token = result['token']?.toString() ?? '';
      final refreshToken = result['refreshToken']?.toString() ?? '';
      final roles = List<String>.from(result['roles'] ?? []);
      final engineerPublicId = result['engineerPublicId']?.toString() ?? '';

      if (token.isEmpty) {
        throw Exception('Token is missing from login response');
      }

      ApiClient.setToken(token);

      // save base login data (devicePublicId left empty until validation completes)
      await TrackingConfigService.saveLoginData(
        token: token,
        refreshToken: refreshToken,
        engineerPublicId: engineerPublicId,
        devicePublicId: '',
        roles: roles,
      );

      if (!mounted) return;

      // --- non-engineer roles go directly to block page ---
      if (roles.contains('Admin') || roles.contains('Manager')) {
        _navigateTo(const AdminBlockPage());
        return;
      }

      // --- engineer: validate device before entering the app ---
      if (engineerPublicId.isEmpty) {
        throw Exception('Engineer identity is missing from login response');
      }

      await _validateEngineerDevice(token: token, engineerPublicId: engineerPublicId);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        errorMessage = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          loading = false;
        });
      }
    }
  }

  Future<void> _validateEngineerDevice({
    required String token,
    required String engineerPublicId,
  }) async {
    final installationId = await TrackingConfigService.getInstallationId();

    DeviceValidationResult validation;
    try {
      validation = await DeviceValidationService.validate(
        token: token,
        installationId: installationId,
      );
    } catch (_) {
      if (!mounted) return;
      setState(() {
        errorMessage = 'Could not validate device. Please try again.';
      });
      return;
    }

    if (!mounted) return;

    switch (validation.status) {
      // ── success ──────────────────────────────────────────────────────────
      case DeviceValidationStatus.valid:
        final devicePublicId = validation.devicePublicId ?? '';
        await TrackingConfigService.saveDevicePublicId(devicePublicId);
        if (!mounted) return;
        _navigateTo(EngineerHome(
          engineerId: engineerPublicId,
          deviceId: devicePublicId,
          token: token,
        ));
        break;

      // ── already waiting for approval ─────────────────────────────────────
      case DeviceValidationStatus.pendingApproval:
        _navigateTo(DevicePendingPage(
          engineerId: engineerPublicId,
          token: token,
        ));
        break;

      // ── device not yet assigned — ask if engineer wants to request ────────
      case DeviceValidationStatus.deviceNotAssigned:
        _showRequestDialog(
          token: token,
          engineerPublicId: engineerPublicId,
        );
        break;

      // ── rejected — show note and sign out ────────────────────────────────
      case DeviceValidationStatus.rejected:
        final note = (validation.reviewNote?.isNotEmpty ?? false)
            ? '\n\nReason: ${validation.reviewNote}'
            : '';
        _showBlockingAlert(
          title: 'Request Rejected',
          message: 'Your device access request was rejected.$note\n\nPlease contact the administration.',
        );
        break;

      // ── engineer account not active ──────────────────────────────────────
      case DeviceValidationStatus.engineerInactive:
        _showBlockingAlert(
          title: 'Account Not Active',
          message: 'Your account is not active. Please contact the administration.',
        );
        break;

      // ── device not registered in the system ──────────────────────────────
      case DeviceValidationStatus.deviceNotRegistered:
        _showDeviceNotRegisteredAlert(installationId);
        break;

      // ── device blocked ───────────────────────────────────────────────────
      case DeviceValidationStatus.deviceBlocked:
        _showBlockingAlert(
          title: 'Device Blocked',
          message: 'This device is blocked. Please contact the administration.',
        );
        break;

      // ── device inactive ──────────────────────────────────────────────────
      case DeviceValidationStatus.deviceInactive:
        _showBlockingAlert(
          title: 'Device Not Active',
          message: 'This device is not active. Please contact the administration.',
        );
        break;

      // ── device assigned to another engineer ──────────────────────────────
      case DeviceValidationStatus.deviceAssignedToOther:
        _showBlockingAlert(
          title: 'Device Assigned to Another Engineer',
          message:
              'This device is currently assigned to another engineer. Please contact the administration.',
        );
        break;
    }
  }

  /// Shows a dialog asking the engineer if they want to send a device access request.
  void _showRequestDialog({
    required String token,
    required String engineerPublicId,
  }) {
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Text('Device Not Assigned'),
        content: const Text(
          'This device is not assigned to your account.\n\n'
          'Would you like to send a request to the administration?',
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              _signOut();
            },
            child: const Text('Sign Out'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              await _submitRequestAndNavigate(
                token: token,
                engineerPublicId: engineerPublicId,
              );
            },
            child: const Text('Yes, Send Request'),
          ),
        ],
      ),
    );
  }

  /// Submits the device access request then navigates to the pending page.
  Future<void> _submitRequestAndNavigate({
    required String token,
    required String engineerPublicId,
  }) async {
    setState(() => loading = true);
    try {
      await DeviceAccessService.createRequest(token: token);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        loading = false;
        errorMessage = 'Failed to send device request. Please try again.';
      });
      return;
    }
    if (!mounted) return;
    setState(() => loading = false);
    _navigateTo(DevicePendingPage(engineerId: engineerPublicId, token: token));
  }

  /// Shows an alert with the installation ID so admins can easily copy it for manual registration.
  void _showDeviceNotRegisteredAlert(String installationId) {
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Text('Device Not Registered'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('This device is not registered in the system.'),
            const SizedBox(height: 16),
            const Text('Installation ID:', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            SelectableText(installationId),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () {
                Clipboard.setData(ClipboardData(text: installationId));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Installation ID copied to clipboard!')),
                );
              },
              icon: const Icon(Icons.copy, size: 18),
              label: const Text('Copy ID'),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              _signOut();
            },
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }

  /// Shows a blocking alert with a single Sign Out button that clears the session.
  void _showBlockingAlert({required String title, required String message}) {
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          ElevatedButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              _signOut();
            },
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }

  /// Clears the session and returns to the login screen.
  Future<void> _signOut() async {
    await TrackingConfigService.clear();
    ApiClient.setToken('');
    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => const LoginPage()),
    );
  }

  void _navigateTo(Widget page) {
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => page),
    );
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
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'Future Of Egypt',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 30),
              TextField(
                controller: emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: passwordController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Password',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 20),
              if (errorMessage != null) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red),
                  ),
                  child: Text(
                    errorMessage!,
                    style: const TextStyle(color: Colors.red, fontSize: 13),
                  ),
                ),
                const SizedBox(height: 12),
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
                      : const Text('Login'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}