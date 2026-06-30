import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/network/api_client.dart';

class DeviceHealthService {
  static Future<int?> reportHealth({
    required String token,
    required String engineerPublicId,
    required String devicePublicId,
    bool? backgroundServiceAlive,
    DateTime? lastTickAtUtc,
    String? lastError,
    String? fallbackReason,
    int? trackingIntervalMs,
  }) async {
    if (kIsWeb) return null;

    // 1. Location and Background Permission Check using Geolocator (Safe in background isolates)
    final permission = await Geolocator.checkPermission();
    
    // 2. Location Service Check (GPS)
    bool hasGps = false;
    try {
      hasGps = await Geolocator.isLocationServiceEnabled();
    } catch (_) {
      hasGps = false;
    }

    // Map permissions explicitly
    String locPermission = 'denied';
    String bgPermission = 'denied';
    String reason = 'Valid';

    if (permission == LocationPermission.always) {
      locPermission = 'always';
      bgPermission = 'granted';
    } else if (permission == LocationPermission.whileInUse) {
      locPermission = 'whileInUse';
      bgPermission = 'denied';
    } else {
      locPermission = permission.name; // 'denied', 'deniedForever', 'unableToDetermine'
      bgPermission = 'denied';
    }

    // Precedence:
    // 1. LocationPermissionDenied
    // 2. BackgroundPermissionMissing
    // 3. LocationServiceDisabled
    // 4. fallbackReason
    // 5. Valid
    if (permission != LocationPermission.always && permission != LocationPermission.whileInUse) {
      reason = 'LocationPermissionDenied';
    } else if (permission == LocationPermission.whileInUse) {
      reason = 'BackgroundPermissionMissing';
    } else if (!hasGps) {
      reason = 'LocationServiceDisabled';
    } else {
      reason = fallbackReason ?? 'Valid';
    }

    // 3. Battery Optimization Check (safe in background)
    bool? batteryOptIgnored;
    if (Platform.isAndroid) {
      try {
        batteryOptIgnored = await Permission.ignoreBatteryOptimizations.isGranted;
      } catch (_) {
        batteryOptIgnored = null;
      }
    }

    // 4. Read last tick and last error if not provided
    String? finalLastTickStr;
    if (lastTickAtUtc != null) {
      finalLastTickStr = lastTickAtUtc.toIso8601String();
    } else {
      try {
        final prefs = await SharedPreferences.getInstance();
        finalLastTickStr = prefs.getString('last_tick_at_utc');
      } catch (_) {}
    }

    String? finalLastError = lastError;
    if (finalLastError == null) {
      try {
        final prefs = await SharedPreferences.getInstance();
        finalLastError = prefs.getString('last_tracking_error') ?? '';
      } catch (_) {}
    }

    final payload = {
      "devicePublicId": devicePublicId,
      "engineerPublicId": engineerPublicId,
      "locationPermission": locPermission,
      "locationServiceEnabled": hasGps,
      "batteryOptimizationIgnored": batteryOptIgnored,
      "internetAvailable": true, // If this request succeeds, it means true
      "authState": "valid",
      "backgroundPermission": bgPermission,
      "reason": reason,
      "reportedAtUtc": DateTime.now().toUtc().toIso8601String(),
      "backgroundServiceAlive": backgroundServiceAlive ?? false,
      "lastTickAtUtc": finalLastTickStr,
      "lastError": finalLastError,
      "trackingIntervalMs": trackingIntervalMs,
    };

    debugPrint("[DeviceHealthService] reporting reason=$reason");
    debugPrint("[DeviceHealthService] locationPermission=$locPermission");
    debugPrint("[DeviceHealthService] backgroundPermission=$bgPermission");
    debugPrint("[DeviceHealthService] locationServiceEnabled=$hasGps");
    debugPrint("[DeviceHealthService] backgroundServiceAlive=${backgroundServiceAlive ?? false}");
    debugPrint("[DeviceHealthService] lastTickAtUtc=$finalLastTickStr");
    debugPrint("[DeviceHealthService] lastError=$finalLastError");

    final response = await ApiClient.postWithToken(
      "Tracking/device-health",
      payload,
      token,
    );

    debugPrint("[DeviceHealthService] Successfully reported health status. Response code: ${response.statusCode}");
    return response.statusCode;
  }

  static Future<void> reportRecoveryEvent({
    required String token,
    required String engineerPublicId,
    required String devicePublicId,
    required String recoveryReason,
    String? lastError,
  }) async {
    final payload = {
      "engineerPublicId": engineerPublicId,
      "devicePublicId": devicePublicId,
      "recoveryReason": recoveryReason,
      if (lastError != null) "lastError": lastError,
    };

    try {
      debugPrint("[DeviceHealthService] Reporting recovery event: $recoveryReason");
      final response = await ApiClient.postWithToken(
        "Tracking/recovery-event",
        payload,
        token,
      ).timeout(const Duration(seconds: 15));
      debugPrint("[DeviceHealthService] Recovery event reported. Status code: ${response.statusCode}");
    } catch (e) {
      debugPrint("[DeviceHealthService] Failed to report recovery event: $e");
    }
  }
}
