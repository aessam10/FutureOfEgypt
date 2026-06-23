import 'dart:async';
import 'package:geolocator/geolocator.dart';

import '../../core/network/api_client.dart';
import 'tracking_intervals.dart';
import 'dart:convert';
import 'package:flutter/foundation.dart';

class LocationService {
  static Timer? _timer;
  static final ValueNotifier<String?> backendReasonNotifier = ValueNotifier(null);

  static Future<void> start({
    required String token,
    required String devicePublicId,
    required String installationId,
  }) async {
    stop();

    if (token.isEmpty || devicePublicId.isEmpty) {
      return;
    }

    final allowed = await _ensureLocationPermission();

    if (!allowed) {
      return;
    }

    await _sendLocation(
      token: token,
      devicePublicId: devicePublicId,
      installationId: installationId,
    );

    _timer = Timer.periodic(TrackingIntervals.locationUpdateInterval, (_) async {
      await _sendLocation(
        token: token,
        devicePublicId: devicePublicId,
        installationId: installationId,
      );
    });
  }

  static Future<void> sendLocationOnce({
    required String token,
    required String devicePublicId,
    required String installationId,
  }) async {
    final allowed = await _ensureLocationPermission();

    if (!allowed) {
      throw Exception("Location permission denied.");
    }

    final position = await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );

    // Bypasses the catch block to let UI handle errors (like 429)
    final response = await ApiClient.postWithToken("Tracking/location", {
      "devicePublicId": devicePublicId,
      "installationId": installationId,
      "latitude": position.latitude,
      "longitude": position.longitude,
      "accuracy": position.accuracy,
      "speed": position.speed,
      "isMocked": position.isMocked,
      "recordedAt": DateTime.now().toUtc().toIso8601String(),
    }, token);
    
    if (response.statusCode == 200) {
      try {
        final body = jsonDecode(response.body);
        if (body['accepted'] == false) {
          backendReasonNotifier.value = body['reason'];
        } else {
          backendReasonNotifier.value = null;
        }
      } catch (_) {}
    }
  }

  static void stop() {
    _timer?.cancel();
    _timer = null;
  }

  static Future<void> _sendLocation({
    required String token,
    required String devicePublicId,
    required String installationId,
  }) async {
    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      final response = await ApiClient.postWithToken("Tracking/location", {
        "devicePublicId": devicePublicId,
        "installationId": installationId,
        "latitude": position.latitude,
        "longitude": position.longitude,
        "accuracy": position.accuracy,
        "speed": position.speed,
        "isMocked": position.isMocked,
        "recordedAt": DateTime.now().toUtc().toIso8601String(),
      }, token);

      if (response.statusCode == 200) {
        try {
          final body = jsonDecode(response.body);
          if (body['accepted'] == false) {
            backendReasonNotifier.value = body['reason'];
          } else {
            backendReasonNotifier.value = null;
          }
        } catch (_) {}
      }
    } catch (e) {
      // Hidden tracking error.
      // We will add retry queue later.
    }
  }

  static Future<bool> _ensureLocationPermission() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();

    if (!serviceEnabled) {
      return false;
    }

    LocationPermission permission = await Geolocator.checkPermission();

    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.denied) {
      return false;
    }

    if (permission == LocationPermission.deniedForever) {
      return false;
    }

    return true;
  }
}
