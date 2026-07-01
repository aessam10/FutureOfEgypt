import 'dart:async';

import 'package:flutter/material.dart';

import '../auth/login_page.dart';
import '../auth/auth_service.dart';
import '../device/device_access_service.dart';
import '../tracking/tracking_config_service.dart';
import '../tracking/tracking_session_guard.dart';
import 'engineer_home.dart';

/// Shown after the engineer has already submitted a device access request.
/// Polls the backend every 15 seconds until the request is approved or rejected.
class DevicePendingPage extends StatefulWidget {
  final String engineerId;
  final String token;

  const DevicePendingPage({
    super.key,
    required this.engineerId,
    required this.token,
  });

  @override
  State<DevicePendingPage> createState() => _DevicePendingPageState();
}

class _DevicePendingPageState extends State<DevicePendingPage> {
  Timer? _pollingTimer;

  String _title = 'Waiting For Approval';
  String _message = 'Your device request is pending.\nPlease wait for admin approval.';
  bool _rejected = false;

  @override
  void initState() {
    super.initState();
    _startPolling();
  }

  void _startPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = Timer.periodic(const Duration(seconds: 15), (_) async {
      await _checkStatusSilently();
    });
  }

  Future<void> _checkStatusSilently() async {
    try {
      final latestRequest = await DeviceAccessService.getMyLatestRequest(
        token: widget.token,
      );

      if (DeviceAccessService.isApproved(latestRequest)) {
        await _handleApproved(latestRequest);
        return;
      }

      if (DeviceAccessService.isRejected(latestRequest)) {
        _pollingTimer?.cancel();
        if (!mounted) return;
        setState(() {
          _rejected = true;
          _title = 'Request Rejected';
          _message = 'Your device request was rejected.\nPlease contact the administration.';
          
          final note = latestRequest?['reviewNote'];
          if (note != null && note.toString().trim().isNotEmpty) {
            _message += '\n\nReason: $note';
          }
        });
      }
    } catch (_) {
      // Keep page calm and continue polling silently.
    }
  }

  Future<void> _handleApproved(Map<String, dynamic>? request) async {
    final devicePublicId = DeviceAccessService.getCreatedDevicePublicId(request);

    if (devicePublicId.isEmpty) return;

    _pollingTimer?.cancel();
    await TrackingConfigService.saveDevicePublicId(devicePublicId);
    await TrackingSessionGuard.markGateApproved();

    if (!mounted) return;

    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (_) => EngineerHome(
          engineerId: widget.engineerId,
          deviceId: devicePublicId,
          token: widget.token,
        ),
      ),
    );
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_title)),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (!_rejected) ...[
                const CircularProgressIndicator(),
                const SizedBox(height: 20),
              ],
              Text(
                _message,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 20),
              ),
              const SizedBox(height: 24),
              if (_rejected)
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () async {
                      await AuthService.signOut();
                      if (!mounted) return;
                      Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(builder: (_) => const LoginPage()),
                      );
                    },
                    child: const Text('Sign Out'),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}