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
    String reason = fallbackReason ?? 'Valid';

    if (permission == LocationPermission.always) {
      locPermission = 'always';
      bgPermission = 'granted';
    } else if (permission == LocationPermission.whileInUse) {
      locPermission = 'whileInUse';
      bgPermission = 'denied';
      if (reason == 'Valid') {
        reason = 'BackgroundPermissionMissing';
      }
    } else {
      locPermission = permission.name; // 'denied', 'deniedForever', 'unableToDetermine'
      bgPermission = 'denied';
      if (reason == 'Valid') {
        reason = 'LocationPermissionDenied';
      }
    }

    if (!hasGps && reason == 'Valid') {
      reason = 'LocationServiceDisabled';
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
}
