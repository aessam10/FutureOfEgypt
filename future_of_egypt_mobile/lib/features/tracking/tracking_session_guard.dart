import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import '../tracking/tracking_config_service.dart';
import '../tracking/offline_queue_helper.dart';

enum TrackingIneligibilityReason {
  none,
  signedOut,
  tokenMissing,
  rolesInvalid,
  engineerPublicIdMissing,
  devicePublicIdMissing,
  trackingDisabled,
  deviceGateNotApproved,
  sessionBlocked,
}

class TrackingEligibilityResult {
  final bool allowed;
  final TrackingIneligibilityReason reason;
  final String description;
  final bool shouldSignOut;
  final bool shouldClearQueue;

  const TrackingEligibilityResult({
    required this.allowed,
    required this.reason,
    required this.description,
    required this.shouldSignOut,
    required this.shouldClearQueue,
  });
}

class TrackingSessionGuard {
  static const String _deviceGateApprovedKey = "device_gate_approved";
  static const String _sessionBlockedKey = "is_session_blocked";
  static const String _sessionBlockedReasonKey = "session_blocked_reason";

  static Future<void> markGateApproved() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_deviceGateApprovedKey, true);
    await prefs.setBool(_sessionBlockedKey, false);
    await prefs.remove(_sessionBlockedReasonKey);
  }

  static Future<void> markGateNotApproved(String reason) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_deviceGateApprovedKey, false);
    await prefs.setBool(_sessionBlockedKey, true);
    await prefs.setString(_sessionBlockedReasonKey, reason);
  }

  static Future<void> clearBlockedSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_sessionBlockedKey, false);
    await prefs.remove(_sessionBlockedReasonKey);
  }

  static Future<bool> isDeviceGateApproved() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_deviceGateApprovedKey) ?? false;
  }

  static Future<bool> isSessionBlocked() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_sessionBlockedKey) ?? false;
  }

  static Future<String?> getSessionBlockedReason() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_sessionBlockedReasonKey);
  }

  static Future<TrackingEligibilityResult> check() async {
    try {
      final config = await TrackingConfigService.getTrackingData();
      final token = config['token'] as String?;
      final engineerPublicId = config['engineerPublicId'] as String?;
      final devicePublicId = config['devicePublicId'] as String?;
      final roles = config['roles'] as List<String>? ?? [];

      final shouldTrack = await TrackingConfigService.isTrackingShouldBeActive();
      final gateApproved = await isDeviceGateApproved();
      final blocked = await isSessionBlocked();

      if (token == null || token.isEmpty) {
        return const TrackingEligibilityResult(
          allowed: false,
          reason: TrackingIneligibilityReason.tokenMissing,
          description: "Auth token is missing.",
          shouldSignOut: true,
          shouldClearQueue: true,
        );
      }

      if (engineerPublicId == null || engineerPublicId.isEmpty) {
        return const TrackingEligibilityResult(
          allowed: false,
          reason: TrackingIneligibilityReason.engineerPublicIdMissing,
          description: "Engineer ID is missing.",
          shouldSignOut: true,
          shouldClearQueue: true,
        );
      }

      if (devicePublicId == null || devicePublicId.isEmpty) {
        return const TrackingEligibilityResult(
          allowed: false,
          reason: TrackingIneligibilityReason.devicePublicIdMissing,
          description: "Device ID is missing.",
          shouldSignOut: false,
          shouldClearQueue: true,
        );
      }

      if (!roles.contains('Engineer')) {
        return const TrackingEligibilityResult(
          allowed: false,
          reason: TrackingIneligibilityReason.rolesInvalid,
          description: "User is not an Engineer.",
          shouldSignOut: true,
          shouldClearQueue: true,
        );
      }

      if (!shouldTrack) {
        return const TrackingEligibilityResult(
          allowed: false,
          reason: TrackingIneligibilityReason.trackingDisabled,
          description: "Tracking has been disabled.",
          shouldSignOut: false,
          shouldClearQueue: false,
        );
      }

      if (blocked) {
        final reasonStr = await getSessionBlockedReason() ?? "Unknown";
        return TrackingEligibilityResult(
          allowed: false,
          reason: TrackingIneligibilityReason.sessionBlocked,
          description: "Session is blocked: $reasonStr",
          shouldSignOut: reasonStr.contains("suspended") || reasonStr.contains("deleted"),
          shouldClearQueue: true,
        );
      }

      if (!gateApproved) {
        return const TrackingEligibilityResult(
          allowed: false,
          reason: TrackingIneligibilityReason.deviceGateNotApproved,
          description: "Device gate is not approved.",
          shouldSignOut: false,
          shouldClearQueue: true,
        );
      }

      return const TrackingEligibilityResult(
        allowed: true,
        reason: TrackingIneligibilityReason.none,
        description: "Eligible to track.",
        shouldSignOut: false,
        shouldClearQueue: false,
      );
    } catch (e) {
      return TrackingEligibilityResult(
        allowed: false,
        reason: TrackingIneligibilityReason.sessionBlocked,
        description: "Error checking guard: $e",
        shouldSignOut: false,
        shouldClearQueue: false,
      );
    }
  }

  static Future<bool> canTrackNow() async {
    final result = await check();
    if (kDebugMode) {
      debugPrint('[TrackingSessionGuard] canTrackNow: ${result.allowed} (${result.description})');
    }
    return result.allowed;
  }

  static Future<void> stopTrackingAndClearQueue(String reason) async {
    debugPrint('[TrackingSessionGuard] stopTrackingAndClearQueue: $reason');
    
    // Stop background service
    try {
      final service = FlutterBackgroundService();
      service.invoke('stopTracking');
    } catch (e) {
      debugPrint('[TrackingSessionGuard] Error invoking stopTracking: $e');
    }

    // Set config flags
    await TrackingConfigService.setTrackingShouldBeActive(false);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_deviceGateApprovedKey, false);
    await prefs.setBool(_sessionBlockedKey, true);
    await prefs.setString(_sessionBlockedReasonKey, reason);

    // Clear queue
    await clearQueueForInvalidSession(reason);
  }

  static Future<void> clearQueueForInvalidSession(String reason) async {
    debugPrint('[TrackingSessionGuard] Purging queue. Reason: $reason');
    await OfflineQueueHelper().clearQueue();
  }

  static bool isInvalidSessionResponse(int statusCode, String responseBody) {
    if (statusCode == 401 || statusCode == 403) {
      return true;
    }
    if (statusCode == 400) {
      final bodyLower = responseBody.toLowerCase();
      return bodyLower.contains('exist') ||
          bodyLower.contains('active') ||
          bodyLower.contains('assign') ||
          bodyLower.contains('installation') ||
          bodyLower.contains('unauthorized') ||
          bodyLower.contains('forbidden') ||
          bodyLower.contains('blocked') ||
          bodyLower.contains('suspended') ||
          bodyLower.contains('deleted') ||
          bodyLower.contains('revoked');
    }
    return false;
  }
}
