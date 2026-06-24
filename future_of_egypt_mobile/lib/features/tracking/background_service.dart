import 'dart:async';
import 'dart:ui';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:geolocator/geolocator.dart';

import '../../core/network/api_client.dart';
import 'tracking_intervals.dart';
import 'tracking_config_service.dart';
import 'device_health_service.dart';

class BackgroundTrackingService {
  static Future<void> initialize() async {
    debugPrint('[FOE_BACKGROUND] initializeBackgroundService() called');
    final service = FlutterBackgroundService();

    const AndroidNotificationChannel channel = AndroidNotificationChannel(
      'future_of_egypt_tracking', // id
      'Tracking Service', // name
      description: 'This channel is used for tracking service notifications.', // description
      importance: Importance.low, // importance must be at least LOW for foreground service
    );

    final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
        FlutterLocalNotificationsPlugin();

    final androidImplementation = flutterLocalNotificationsPlugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();

    await androidImplementation?.requestNotificationsPermission();
    await androidImplementation?.createNotificationChannel(channel);
    print('[FOE_BACKGROUND] Foreground notification created.');

    await service.configure(
      androidConfiguration: AndroidConfiguration(
        onStart: onStart,
        autoStart: false,
        isForegroundMode: true,
        notificationChannelId: 'future_of_egypt_tracking',
        initialNotificationTitle: 'Future Of Egypt',
        initialNotificationContent: 'Tracking service is running',
        foregroundServiceNotificationId: 888,
      ),
      iosConfiguration: IosConfiguration(
        autoStart: false,
        onForeground: onStart,
      ),
    );
    debugPrint('[FOE_BACKGROUND] background service configured');
    debugPrint('[FOE_BACKGROUND] Android service configured with stopWithTask=false');
    debugPrint('[FOE_BACKGROUND] foreground notification displayed');
  }

  static Future<void> startTracking({
    required String token,
    required String devicePublicId,
    required String installationId,
  }) async {
    debugPrint('[FOE_BACKGROUND] startTracking called');
    final service = FlutterBackgroundService();

    final isRunning = await service.isRunning();
    if (isRunning) {
      debugPrint('[FOE_BACKGROUND] service already running; skip startService');
    } else {
      final lifecycleState = WidgetsBinding.instance.lifecycleState;
      if (lifecycleState == AppLifecycleState.resumed) {
        debugPrint('[FOE_BACKGROUND] startService requested from foreground');
        await service.startService();
      } else {
        debugPrint('[FOE_BACKGROUND] app not foreground; skip startService');
      }
    }

    debugPrint('[FOE_BACKGROUND] startTracking command sent to background isolate');
    service.invoke('startTracking', {
      'token': token,
      'devicePublicId': devicePublicId,
      'installationId': installationId,
    });
  }

  static Future<void> stopTracking() async {
    final service = FlutterBackgroundService();
    service.invoke('stopTracking');
  }
}

int _backgroundTickCount = 0;
Timer? _backgroundTimer;

@pragma('vm:entry-point')
void onStart(ServiceInstance service) async {
  DartPluginRegistrant.ensureInitialized();
  debugPrint('[FOE_BACKGROUND] onStart entered');
  
  service.on('startTracking').listen((event) async {
    debugPrint('[FOE_BACKGROUND] startTracking command received in background isolate');
    print('[FOE_BACKGROUND] Payload: $event');
    await _handleStartTracking(service, event);
  });

  service.on('stopTracking').listen((event) {
    debugPrint('[FOE_BACKGROUND] stopTracking command received.');
    _backgroundTimer?.cancel();
    _backgroundTimer = null;
    service.stopSelf();
  });

  debugPrint('[FOE_BACKGROUND] listeners registered');

  if (service is AndroidServiceInstance) {
    service.setAsForegroundService();
    debugPrint('[FOE_BACKGROUND] service is foreground');
  }
  
  await ApiClient.init();
  debugPrint('[FOE_BACKGROUND] Service started.');

  // Auto-start from config if possible
  if (_backgroundTimer == null) {
    debugPrint('[FOE_BACKGROUND] Checking for saved config to auto-start tracking...');
    try {
      final savedConfig = await TrackingConfigService.getTrackingData();
      final token = savedConfig['token'] as String?;
      final devicePublicId = savedConfig['devicePublicId'] as String?;
      final installationId = savedConfig['installationId'] as String?;

      if (token != null && token.isNotEmpty &&
          devicePublicId != null && devicePublicId.isNotEmpty &&
          installationId != null && installationId.isNotEmpty) {
        debugPrint('[FOE_BACKGROUND] Auto-starting tracking from saved config.');
        await _handleStartTracking(service, {
          'token': token,
          'devicePublicId': devicePublicId,
          'installationId': installationId,
        });
      } else {
        debugPrint('[FOE_BACKGROUND] Saved config incomplete, cannot auto-start.');
      }
    } catch (e) {
      debugPrint('[FOE_BACKGROUND] Failed to auto-start from config: $e');
    }
  }
}

Future<void> _handleStartTracking(ServiceInstance service, Map<String, dynamic>? event) async {
  final token = event?['token']?.toString() ?? '';
  final devicePublicId = event?['devicePublicId']?.toString() ?? '';
  final installationId = event?['installationId']?.toString() ?? '';

  if (token.isEmpty || devicePublicId.isEmpty || installationId.isEmpty) {
    debugPrint('[FOE_BACKGROUND] Missing config. Token: ${token.isNotEmpty}, Device: ${devicePublicId.isNotEmpty}, Install: ${installationId.isNotEmpty}');
    return;
  }

  debugPrint('[FOE_BACKGROUND] tracking config loaded');
  print('================ FOE BACKGROUND TRACKING ================');
  print('[FOE_BACKGROUND] DevicePublicId: $devicePublicId');
  print('[FOE_BACKGROUND] InstallationId: $installationId');
  print('[FOE_BACKGROUND] Interval: ${TrackingIntervals.label}');
  print('=========================================================');

  if (_backgroundTimer != null) {
    debugPrint('[FOE_BACKGROUND] tracking timer already running; skipping duplicate timer');
    return;
  }

  // Fire one immediate tick now
  await _sendLocation(
    service: service,
    token: token,
    devicePublicId: devicePublicId,
    installationId: installationId,
  );

  // Start the Timer.periodic
  _backgroundTimer = Timer.periodic(TrackingIntervals.locationUpdateInterval, (_) async {
    debugPrint('[FOE_BACKGROUND] background isolate still alive');
    await _sendLocation(
      service: service,
      token: token,
      devicePublicId: devicePublicId,
      installationId: installationId,
    );
  });
}

Future<void> _sendLocation({
  required ServiceInstance service,
  required String token,
  required String devicePublicId,
  required String installationId,
}) async {
  _backgroundTickCount++;
  final timestamp = DateTime.now().toUtc().toIso8601String();
  debugPrint('[FOE_BACKGROUND] Tick #$_backgroundTickCount at $timestamp');

  if (token.isEmpty || devicePublicId.isEmpty || installationId.isEmpty) {
    print('[FOE_BACKGROUND] Tracking skipped: missing token/device/installation.');
    return;
  }

  // We need engineerPublicId to report health safely
  String? engineerPublicId;
  try {
    final configData = await TrackingConfigService.getTrackingData();
    engineerPublicId = configData["engineerPublicId"] as String?;
  } catch (e) {
    print('[FOE_BACKGROUND] Error reading tracking config for health: $e');
  }

  print('[FOE_BACKGROUND] engineerPublicId exists: ${engineerPublicId != null && engineerPublicId.isNotEmpty}');

  if (engineerPublicId == null || engineerPublicId.isEmpty) {
    print('[FOE_BACKGROUND] Health POST skipped: missing engineerPublicId');
  } else {
    try {
      print('[FOE_BACKGROUND] Health POST attempted.');
      final statusCode = await DeviceHealthService.reportHealth(
        token: token,
        engineerPublicId: engineerPublicId,
        devicePublicId: devicePublicId,
      );
      print('[FOE_BACKGROUND] Health POST response code: $statusCode');
    } catch (e) {
      print('[FOE_BACKGROUND] Health POST response code: Error');
      print('[FOE_BACKGROUND] Health POST exception: $e');
      print('[FOE_BACKGROUND] Health POST endpoint: Tracking/device-health');
      print('[FOE_BACKGROUND] Health POST payload summary: devicePublicId=$devicePublicId, engineerPublicId=$engineerPublicId');
    }
  }

  final serviceEnabled = await Geolocator.isLocationServiceEnabled();
  final permission = await Geolocator.checkPermission();
  
  if (!serviceEnabled) {
    print('[FOE_BACKGROUND] Location POST skipped: LocationServiceDisabled (GPS off)');
    return;
  }

  if (permission == LocationPermission.denied ||
      permission == LocationPermission.deniedForever ||
      permission == LocationPermission.unableToDetermine) {
    print('[FOE_BACKGROUND] Location POST skipped: LocationPermissionDenied ($permission)');
    return;
  }

  try {
    final position = await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );

    final body = {
      'devicePublicId': devicePublicId,
      'installationId': installationId,
      'latitude': position.latitude,
      'longitude': position.longitude,
      'accuracy': position.accuracy,
      'speed': position.speed,
      'isMocked': position.isMocked,
      'recordedAt': DateTime.now().toUtc().toIso8601String(),
    };

    print('[FOE_BACKGROUND] Location POST attempted.');
    final response = await ApiClient.postWithToken('Tracking/location', body, token);
    print('[FOE_BACKGROUND] Location POST response code: ${response.statusCode}');

  } catch (e) {
    if (e.toString().contains("426 Upgrade Required")) {
      print('[FOE_BACKGROUND] 426 Upgrade Required caught! Stopping tracking service.');
      service.stopSelf();
    } else {
      print('[FOE_BACKGROUND] Location POST error: $e');
    }
  }
}
