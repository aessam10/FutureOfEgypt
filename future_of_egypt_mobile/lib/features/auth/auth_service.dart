import 'dart:convert';
import 'package:flutter/foundation.dart';

import '../../core/network/api_client.dart';
import '../tracking/background_service.dart';
import '../tracking/tracking_config_service.dart';
import '../tracking/tracking_session_guard.dart';
import '../tracking/offline_queue_helper.dart';

class AuthService {
  static Future<Map<String, dynamic>> login(
    String username,
    String password,
  ) async {
    final response = await ApiClient.post(
      "Auth/login",
      {
        "username": username,
        "password": password,
      },
      includeAuth: false,
    );

    final body = response.body;

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        "Login failed: ${response.statusCode}\n$body",
      );
    }

    if (body.trim().isEmpty) {
      throw Exception("Login failed: empty response from server");
    }

    final decoded = jsonDecode(body);

    if (decoded is! Map<String, dynamic>) {
      throw Exception("Login failed: invalid response format");
    }

    return decoded;
  }

  static Future<Map<String, dynamic>> refresh(
    String token,
    String refreshToken,
  ) async {
    final response = await ApiClient.post(
      "Auth/refresh",
      {
        "token": token,
        "refreshToken": refreshToken,
      },
      includeAuth: false,
    );

    final body = response.body;

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception("Refresh failed: ${response.statusCode}");
    }

    if (body.trim().isEmpty) {
      throw Exception("Refresh failed: empty response from server");
    }

    final decoded = jsonDecode(body);

    if (decoded is! Map<String, dynamic>) {
      throw Exception("Refresh failed: invalid response format");
    }

    return decoded;
  }

  static Future<void> signOut() async {
    try {
      await BackgroundTrackingService.stopTracking();
    } catch (e) {
      debugPrint('[AuthService] Error stopping tracking on sign out: $e');
    }
    await TrackingConfigService.clear();
    await TrackingSessionGuard.markGateNotApproved('User signed out.');
    await TrackingSessionGuard.clearBlockedSession();
    await OfflineQueueHelper().clearQueue();
    ApiClient.setToken('');
  }

  static Future<void> forgotPassword(String username, String email) async {
    final response = await ApiClient.post(
      "Auth/forgot-password",
      {"username": username, "email": email},
      includeAuth: false,
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception("Failed to send password reset link: ${response.statusCode}\n${response.body}");
    }
  }
}