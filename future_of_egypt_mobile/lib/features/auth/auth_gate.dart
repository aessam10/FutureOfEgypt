import 'package:flutter/material.dart';

import '../../core/network/api_client.dart';
import '../admin/admin_home.dart';
import '../manager/manager_home.dart';
import '../device/device_validation_service.dart';
import '../engineer/device_pending_page.dart';
import '../engineer/engineer_home.dart';
import '../tracking/tracking_config_service.dart';
import 'login_page.dart';

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
        await TrackingConfigService.clear();
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
          await TrackingConfigService.clear();
          _navigateToLogin('This device is not assigned to your account. Please login to request access.');
          break;

        case DeviceValidationStatus.rejected:
          final note = (validation.reviewNote?.isNotEmpty ?? false)
              ? '\nReason: ${validation.reviewNote}'
              : '';
          await TrackingConfigService.clear();
          _navigateToLogin('Your device access request was rejected.$note');
          break;

        case DeviceValidationStatus.engineerInactive:
          await TrackingConfigService.clear();
          _navigateToLogin('Your account is not active.');
          break;

        case DeviceValidationStatus.deviceNotRegistered:
          await TrackingConfigService.clear();
          _navigateToLogin('Device not registered. Installation ID: ${data['installationId']}');
          break;

        case DeviceValidationStatus.deviceBlocked:
          await TrackingConfigService.clear();
          _navigateToLogin('This device is blocked.');
          break;

        case DeviceValidationStatus.deviceInactive:
          await TrackingConfigService.clear();
          _navigateToLogin('This device is not active.');
          break;

        case DeviceValidationStatus.deviceAssignedToOther:
          await TrackingConfigService.clear();
          _navigateToLogin('This device is assigned to another engineer.');
          break;
      }
    } catch (e) {
      await TrackingConfigService.clear();
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
