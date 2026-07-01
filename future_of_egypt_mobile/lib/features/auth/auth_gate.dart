import 'dart:convert';
import 'package:flutter/material.dart';

import '../../core/network/api_client.dart';
import '../admin/admin_home.dart';
import '../manager/manager_home.dart';
import '../device/device_validation_service.dart';
import '../engineer/device_pending_page.dart';
import '../engineer/engineer_home.dart';
import '../tracking/tracking_config_service.dart';
import '../tracking/tracking_session_guard.dart';
import '../tracking/offline_queue_helper.dart';
import 'login_page.dart';
import 'auth_service.dart';

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  void _navigateToLogin([String? message]) {
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => LoginPage(initialMessage: message),
      ),
    );
  }

  Future<void> _checkAuth() async {
    try {
      final data = await TrackingConfigService.getTrackingData();
      final token = data['token'] as String;
      final engineerPublicId = data['engineerPublicId'] as String;
      
      final roles = await TrackingConfigService.getRoles();

      if (token.isEmpty) {
        _navigateToLogin();
        return;
      }

      ApiClient.setToken(token);

      if (roles.contains('Admin')) {
        if (!mounted) return;
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const AdminHome()),
        );
        return;
      }

      if (roles.contains('Manager')) {
        if (!mounted) return;
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const ManagerHome()),
        );
        return;
      }

      if (engineerPublicId.isEmpty) {
        try {
          final response = await ApiClient.getWithToken('profile/me', token);
          if (response.statusCode == 200) {
            final decoded = jsonDecode(response.body) as Map<String, dynamic>;
            final freshEngineerId = decoded['engineerPublicId']?.toString() ?? '';
            if (freshEngineerId.isNotEmpty) {
              final trackingData = await TrackingConfigService.getTrackingData();
              await TrackingConfigService.saveLoginData(
                token: token,
                refreshToken: trackingData['refreshToken'] ?? '',
                engineerPublicId: freshEngineerId,
                devicePublicId: trackingData['devicePublicId'] ?? '',
                roles: roles,
              );
              // Retry checkAuth with loaded id
              _checkAuth();
              return;
            }
          }
        } catch (_) {}

        await AuthService.signOut();
        _navigateToLogin('Engineer identity missing. Please login again.');
        return;
      }

      final validation = await DeviceValidationService.validate(
        token: token,
        installationId: data['installationId'] as String,
      );

      if (!mounted) return;

      switch (validation.status) {
        case DeviceValidationStatus.valid:
          final devicePublicId = validation.devicePublicId ?? '';
          await TrackingConfigService.saveDevicePublicId(devicePublicId);
          await TrackingSessionGuard.markGateApproved();
          if (!mounted) return;
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (_) => EngineerHome(
                engineerId: engineerPublicId,
                deviceId: devicePublicId,
                token: token,
              ),
            ),
          );
          break;

        case DeviceValidationStatus.pendingApproval:
          await TrackingSessionGuard.markGateNotApproved('Device access request is pending.');
          await OfflineQueueHelper().clearQueue();
          if (!mounted) return;
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (_) => DevicePendingPage(
                engineerId: engineerPublicId,
                token: token,
              ),
            ),
          );
          break;

        case DeviceValidationStatus.deviceNotAssigned:
          await AuthService.signOut();
          _navigateToLogin('This device is not assigned to your account. Please login to request access.');
          break;

        case DeviceValidationStatus.rejected:
          final note = (validation.reviewNote?.isNotEmpty ?? false)
              ? '\nReason: ${validation.reviewNote}'
              : '';
          await AuthService.signOut();
          _navigateToLogin('Your device access request was rejected.$note');
          break;

        case DeviceValidationStatus.engineerInactive:
          await AuthService.signOut();
          _navigateToLogin('Your account is not active.');
          break;

        case DeviceValidationStatus.deviceNotRegistered:
          await AuthService.signOut();
          _navigateToLogin('Device not registered. Installation ID: ${data['installationId']}');
          break;

        case DeviceValidationStatus.deviceBlocked:
          await AuthService.signOut();
          _navigateToLogin('This device is blocked.');
          break;

        case DeviceValidationStatus.deviceInactive:
          await AuthService.signOut();
          _navigateToLogin('This device is not active.');
          break;

        case DeviceValidationStatus.deviceAssignedToOther:
          await AuthService.signOut();
          _navigateToLogin('This device is assigned to another engineer.');
          break;
      }
    } catch (e) {
      await AuthService.signOut();
      _navigateToLogin('Session expired or validation failed. Please login again.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: CircularProgressIndicator(),
      ),
    );
  }
}
