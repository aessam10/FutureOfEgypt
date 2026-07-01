import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/network/api_client.dart';
import '../admin/admin_block_page.dart';
import '../device/device_access_service.dart';
import '../device/device_validation_service.dart';
import '../engineer/device_pending_page.dart';
import '../engineer/engineer_home.dart';
import '../tracking/tracking_config_service.dart';
import '../tracking/tracking_session_guard.dart';
import '../tracking/offline_queue_helper.dart';
import 'auth_service.dart';
import 'package:future_of_egypt_mobile/features/auth/forgot_password_page.dart';

class LoginPage extends StatefulWidget {
  final String? initialMessage;
  const LoginPage({super.key, this.initialMessage});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final TextEditingController usernameController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();

  bool loading = false;
  String? errorMessage;
  bool _obscurePassword = true;

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
      final oldTrackingData = await TrackingConfigService.getTrackingData();
      final storedEngineerPublicIdBeforeOverwrite = oldTrackingData['engineerPublicId'] as String? ?? '';

      await AuthService.signOut();
      final result = await AuthService.login(
        usernameController.text.trim(),
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

      if (kDebugMode) {
        debugPrint('[LOGIN_DEBUG] Logged-in username: ${usernameController.text.trim()}');
        debugPrint('[LOGIN_DEBUG] Fresh engineerPublicId from login: $engineerPublicId');
        debugPrint('[LOGIN_DEBUG] Stored engineerPublicId before overwrite: $storedEngineerPublicIdBeforeOverwrite');
      }

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

    if (kDebugMode) {
      debugPrint('[LOGIN_DEBUG] Calling device gate. installationId: $installationId');
    }

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

    if (kDebugMode) {
      debugPrint('[LOGIN_DEBUG] Gate response status: ${validation.status}');
      debugPrint('[LOGIN_DEBUG] DevicePublicId returned: ${validation.devicePublicId}');
    }

    if (!mounted) return;

    switch (validation.status) {
      // ── success ──────────────────────────────────────────────────────────
      case DeviceValidationStatus.valid:
        final devicePublicId = validation.devicePublicId ?? '';
        await TrackingConfigService.saveDevicePublicId(devicePublicId);
        await TrackingSessionGuard.markGateApproved();
        if (!mounted) return;
        _navigateTo(EngineerHome(
          engineerId: engineerPublicId,
          deviceId: devicePublicId,
          token: token,
        ));
        break;

      // ── already waiting for approval ─────────────────────────────────────
      case DeviceValidationStatus.pendingApproval:
        await TrackingSessionGuard.markGateNotApproved('Device access request is pending.');
        await OfflineQueueHelper().clearQueue();
        _navigateTo(DevicePendingPage(
          engineerId: engineerPublicId,
          token: token,
        ));
        break;

      // ── device not yet assigned — ask if engineer wants to request ────────
      case DeviceValidationStatus.deviceNotAssigned:
        await TrackingSessionGuard.markGateNotApproved('Device is not assigned.');
        await OfflineQueueHelper().clearQueue();
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
    await AuthService.signOut();
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
    usernameController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F8),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Container(
              constraints: const BoxConstraints(maxWidth: 400),
              padding: const EdgeInsets.all(32.0),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'foe-Constructions',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 32),
                  const Text(
                    'Welcome Back',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Sign in to continue to foe-Constructions',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 15,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  const SizedBox(height: 32),
                  TextField(
                    controller: usernameController,
                    keyboardType: TextInputType.text,
                    textInputAction: TextInputAction.next,
                    decoration: InputDecoration(
                      labelText: 'Username',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: passwordController,
                    obscureText: _obscurePassword,
                    textInputAction: TextInputAction.done,
                    onSubmitted: (_) => loading ? null : login(),
                    decoration: InputDecoration(
                      labelText: 'Password',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword ? Icons.visibility_off : Icons.visibility,
                          color: const Color(0xFF94A3B8),
                        ),
                        onPressed: () {
                          setState(() {
                            _obscurePassword = !_obscurePassword;
                          });
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const ForgotPasswordPage()),
                        );
                      },
                      style: TextButton.styleFrom(
                        padding: EdgeInsets.zero,
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      child: const Text('Forgot password?', style: TextStyle(color: Color(0xFF2563EB))),
                    ),
                  ),
                  const SizedBox(height: 24),
                  if (errorMessage != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
                      ),
                      child: const Text(
                        'Invalid username or password.',
                        style: TextStyle(color: Colors.red, fontSize: 13),
                        textAlign: TextAlign.center,
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                  ElevatedButton(
                    onPressed: loading ? null : login,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      elevation: 0,
                    ),
                    child: loading
                        ? const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              ),
                              SizedBox(width: 12),
                              Text('Signing in...', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                            ],
                          )
                        : const Text('Sign In', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}