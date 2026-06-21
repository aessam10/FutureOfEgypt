import 'dart:async';

import 'package:flutter/material.dart';

import '../device/device_access_service.dart';
import '../tracking/tracking_config_service.dart';
import 'engineer_home.dart';

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
  Timer? pollingTimer;

  bool loading = true;
  bool sendingRequest = false;

  String title = "Device Approval";
  String message = "Checking your device approval status...";

  @override
  void initState() {
    super.initState();
    _prepareDeviceAccess();
  }

  Future<void> _prepareDeviceAccess() async {
    setState(() {
      loading = true;
      message = "Checking your device approval status...";
    });

    try {
      final latestRequest = await DeviceAccessService.getMyLatestRequest(
        token: widget.token,
      );

      if (DeviceAccessService.isApproved(latestRequest)) {
        await _openEngineerHomeIfApproved(latestRequest);
        return;
      }

      if (DeviceAccessService.isPending(latestRequest)) {
        setState(() {
          loading = false;
          title = "Waiting For Admin Approval";
          message =
              "Your device request is pending.\nPlease wait for admin approval.";
        });

        _startPolling();
        return;
      }

      await _sendNewDeviceRequest();
    } catch (_) {
      setState(() {
        loading = false;
        title = "Device Approval";
        message =
            "Could not check device approval.\nPlease make sure the backend is running and try again.";
      });
    }
  }

  Future<void> _sendNewDeviceRequest() async {
    setState(() {
      sendingRequest = true;
      message = "Sending device approval request...";
    });

    try {
      final createdRequest = await DeviceAccessService.createRequest(
        token: widget.token,
      );

      if (DeviceAccessService.isApproved(createdRequest)) {
        await _openEngineerHomeIfApproved(createdRequest);
        return;
      }

      setState(() {
        loading = false;
        sendingRequest = false;
        title = "Waiting For Admin Approval";
        message =
            "Your device request has been sent.\nPlease wait for admin approval.";
      });

      _startPolling();
    } catch (_) {
      setState(() {
        loading = false;
        sendingRequest = false;
        title = "Device Request Failed";
        message =
            "Could not send device approval request.\nPlease try again.";
      });
    }
  }

  void _startPolling() {
    pollingTimer?.cancel();

    pollingTimer = Timer.periodic(const Duration(seconds: 15), (_) async {
      await _checkApprovalStatusSilently();
    });
  }

  Future<void> _checkApprovalStatusSilently() async {
    try {
      final latestRequest = await DeviceAccessService.getMyLatestRequest(
        token: widget.token,
      );

      if (DeviceAccessService.isApproved(latestRequest)) {
        await _openEngineerHomeIfApproved(latestRequest);
      }

      if (DeviceAccessService.isRejected(latestRequest)) {
        setState(() {
          title = "Device Request Rejected";
          message =
              "Your device request was rejected.\nPlease contact the admin.";
        });

        pollingTimer?.cancel();
      }
    } catch (_) {
      // Keep page calm and continue polling.
    }
  }

  Future<void> _openEngineerHomeIfApproved(
    Map<String, dynamic>? request,
  ) async {
    final devicePublicId = DeviceAccessService.getCreatedDevicePublicId(
      request,
    );

    if (devicePublicId.isEmpty) {
      return;
    }

    pollingTimer?.cancel();

    await TrackingConfigService.saveDevicePublicId(devicePublicId);

    if (!mounted) {
      return;
    }

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
    pollingTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final showLoader = loading || sendingRequest;

    return Scaffold(
      appBar: AppBar(
        title: Text(title),
      ),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (showLoader) ...[
                const CircularProgressIndicator(),
                const SizedBox(height: 20),
              ],
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 20),
              ),
              const SizedBox(height: 24),
              if (!showLoader)
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _prepareDeviceAccess,
                    child: const Text("Check Again"),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}