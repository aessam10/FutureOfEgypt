import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../core/network/api_client.dart';

class DeviceHealthService {
  static Future<int?> reportHealth({
    required String token,
    required String engineerPublicId,
    required String devicePublicId,
    String? fallbackReason,
  }) async {
    if (kIsWeb) return null;

    // 1. Location Permission Check
    final locStatus = await Permission.location.status;
    String locPermission = locStatus.name;

    // 2. Background Location Check (Android 10+)
    String bgPermission = 'granted';
    if (Platform.isAndroid) {
      final bgStatus = await Permission.locationAlways.status;
      bgPermission = bgStatus.name;
    }

    // 3. Location Service Check (GPS)
    bool hasGps = false;
    try {
      hasGps = await Geolocator.isLocationServiceEnabled();
    } catch (_) {
      hasGps = false;
    }

    // 4. Battery Optimization Check
    String batteryOpt = 'unknown';
    if (Platform.isAndroid) {
      final isIgnored = await Permission.ignoreBatteryOptimizations.isGranted;
      batteryOpt = isIgnored ? 'ignored' : 'enabled';
    }

    // 5. Auth State Check (Assuming it's valid if we reach here)
    String authState = 'valid';

    // Determine main reason
    String reason = fallbackReason ?? 'Valid';
    if (!locStatus.isGranted && !locStatus.isLimited) {
      reason = 'LocationPermissionDenied';
    } else if (!hasGps) {
      reason = 'LocationServiceDisabled';
    } else if (Platform.isAndroid && bgPermission != 'granted') {
      reason = 'BackgroundPermissionMissing';
    }

    final payload = {
      "devicePublicId": devicePublicId,
      "engineerPublicId": engineerPublicId,
      "locationPermission": locPermission,
      "locationServiceEnabled": hasGps,
      "batteryOptimizationIgnored": batteryOpt,
      "internetAvailable": true, // If this request succeeds, it means true
      "authState": authState,
      "backgroundPermission": bgPermission,
      "reason": reason,
      "reportedAtUtc": DateTime.now().toUtc().toIso8601String(),
    };

    debugPrint("[DeviceHealthService] reporting reason=$reason");
    debugPrint("[DeviceHealthService] locationPermission=$locPermission");
    debugPrint("[DeviceHealthService] backgroundPermission=$bgPermission");
    debugPrint("[DeviceHealthService] locationServiceEnabled=$hasGps");
    debugPrint("[DeviceHealthService] batteryOptimizationIgnored=$batteryOpt");

    final response = await ApiClient.postWithToken(
      "Tracking/device-health",
      payload,
      token,
    );

    debugPrint("[DeviceHealthService] Successfully reported health status. Response code: ${response.statusCode}");
    return response.statusCode;
  }
}
