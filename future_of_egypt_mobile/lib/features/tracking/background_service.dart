import 'dart:async';
import 'dart:ui';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:workmanager/workmanager.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../core/network/api_client.dart';
import 'tracking_intervals.dart';
import 'tracking_config_service.dart';
import 'device_health_service.dart';

@pragma('vm:entry-point')
void callbackDispatcher() {
  Workmanager().executeTask((taskName, inputData) async {
    debugPrint('[FOE_WATCHDOG] Watchdog task executed: $taskName');
    
    try {
      WidgetsFlutterBinding.ensureInitialized();
      await ApiClient.init();

      final shouldTrack = await TrackingConfigService.isTrackingShouldBeActive();
      if (!shouldTrack) {
        debugPrint('[FOE_WATCHDOG] Tracking is not marked as active; exiting.');
        return true;
      }

      final config = await TrackingConfigService.getTrackingData();
      final token = config['token'] as String?;
      final deviceId = config['devicePublicId'] as String?;
      final engineerId = config['engineerPublicId'] as String?;
      final installationId = config['installationId'] as String?;

      if (token == null || token.isEmpty ||
          deviceId == null || deviceId.isEmpty ||
          engineerId == null || engineerId.isEmpty ||
          installationId == null || installationId.isEmpty) {
        debugPrint('[FOE_WATCHDOG] Missing tracking configuration; exiting.');
        return true;
      }

      final service = FlutterBackgroundService();
      final isRunning = await service.isRunning();

      bool isStale = true;
      try {
        final prefs = await SharedPreferences.getInstance();
        final lastTickStr = prefs.getString('last_tick_at_utc');
        if (lastTickStr != null) {
          final lastTick = DateTime.parse(lastTickStr);
          final diff = DateTime.now().toUtc().difference(lastTick);
          final threshold = TrackingIntervals.locationUpdateInterval * 2;
          final maxStale = threshold < const Duration(minutes: 15) ? threshold : const Duration(minutes: 15);
          isStale = diff > maxStale;
        }
      } catch (e) {
        debugPrint('[FOE_WATCHDOG] Error checking last tick: $e');
      }

      if (!isRunning || isStale) {
        debugPrint('[FOE_WATCHDOG] Background service is stopped or stale. Recovering...');
        
        try {
          bool? batteryOptIgnored;
          try {
            batteryOptIgnored = await Permission.ignoreBatteryOptimizations.isGranted;
          } catch (_) {}

          String reason = 'BackgroundServiceStopped';
          if (batteryOptIgnored == false) {
            reason = 'PossibleBatteryOptimizationOrOsKill';
          }

          await DeviceHealthService.reportHealth(
            token: token,
            engineerPublicId: engineerId,
            devicePublicId: deviceId,
            backgroundServiceAlive: false,
            lastError: 'BackgroundServiceStopped',
            fallbackReason: reason,
          ).timeout(const Duration(seconds: 15));
        } catch (he) {
          debugPrint('[FOE_WATCHDOG] Watchdog health report failed: $he');
        }

        await service.startService();
        service.invoke('startTracking', {
          'token': token,
          'devicePublicId': deviceId,
          'installationId': installationId,
        });
        debugPrint('[FOE_WATCHDOG] Service restart triggered successfully.');
      } else {
        debugPrint('[FOE_WATCHDOG] Service is running and healthy.');
      }
    } catch (e) {
      debugPrint('[FOE_WATCHDOG] Watchdog task failed with error: $e');
    }

    return true;
  });
}

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
        autoStart: true, // Enable starting on boot
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

    // Initialize WorkManager
    try {
      await Workmanager().initialize(
        callbackDispatcher,
        isInDebugMode: kDebugMode,
      );
      await Workmanager().registerPeriodicTask(
        "foe_tracking_watchdog",
        "foe_tracking_watchdog_task",
        frequency: const Duration(minutes: 15),
        existingWorkPolicy: ExistingWorkPolicy.keep,
        constraints: Constraints(
          networkType: NetworkType.connected,
        ),
      );
      debugPrint('[FOE_BACKGROUND] WorkManager initialized and watchdog registered.');
    } catch (e) {
      debugPrint('[FOE_BACKGROUND] WorkManager initialization failed: $e');
    }
  }

  static Future<void> startTracking({
    required String token,
    required String devicePublicId,
    required String installationId,
  }) async {
    debugPrint('[FOE_BACKGROUND] startTracking called');
    
    // Set active flag to true
    await TrackingConfigService.setTrackingShouldBeActive(true);

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
    // Set active flag to false
    await TrackingConfigService.setTrackingShouldBeActive(false);

    final service = FlutterBackgroundService();
    service.invoke('stopTracking');
  }
}

int _backgroundTickCount = 0;
Timer? _backgroundTimer;
bool _isTickRunning = false;

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
      final shouldTrack = await TrackingConfigService.isTrackingShouldBeActive();
      if (!shouldTrack) {
        debugPrint('[FOE_BACKGROUND] Auto-start aborted: tracking_should_be_active is false.');
        return;
      }

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
  _isTickRunning = true;
  try {
    await _runTick(
      service: service,
      token: token,
      devicePublicId: devicePublicId,
      installationId: installationId,
    );
  } finally {
    _isTickRunning = false;
  }

  // Start the Timer.periodic
  _backgroundTimer = Timer.periodic(TrackingIntervals.locationUpdateInterval, (_) async {
    if (_isTickRunning) {
      debugPrint('[FOE_BACKGROUND] Tick overlapped; skipping.');
      return;
    }
    _isTickRunning = true;
    try {
      await _runTick(
        service: service,
        token: token,
        devicePublicId: devicePublicId,
        installationId: installationId,
      );
    } finally {
      _isTickRunning = false;
    }
  });
}

Future<void> _runTick({
  required ServiceInstance service,
  required String token,
  required String devicePublicId,
  required String installationId,
}) async {
  _backgroundTickCount++;
  final tickTime = DateTime.now().toUtc();
  debugPrint('[FOE_BACKGROUND] Tick #$_backgroundTickCount at ${tickTime.toIso8601String()}');

  if (token.isEmpty || devicePublicId.isEmpty || installationId.isEmpty) {
    print('[FOE_BACKGROUND] Tracking skipped: missing token/device/installation.');
    return;
  }

  SharedPreferences? prefs;
  try {
    prefs = await SharedPreferences.getInstance();
    await prefs.setString('last_tick_at_utc', tickTime.toIso8601String());
  } catch (e) {
    print('[FOE_BACKGROUND] SharedPreferences error: $e');
  }

  // We need engineerPublicId to report health safely
  String? engineerPublicId;
  try {
    final configData = await TrackingConfigService.getTrackingData();
    engineerPublicId = configData["engineerPublicId"] as String?;
  } catch (e) {
    print('[FOE_BACKGROUND] Error reading tracking config: $e');
  }

  String? lastError;
  String reason = 'Valid';

  try {
    // 1. Check GPS & Permissions
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    final permission = await Geolocator.checkPermission();

    if (permission == LocationPermission.always) {
      reason = 'Valid';
    } else if (permission == LocationPermission.whileInUse) {
      reason = 'BackgroundPermissionMissing';
      lastError = 'Background location permission is missing (set to whileInUse).';
    } else {
      reason = 'LocationPermissionDenied';
      lastError = 'Location permission is denied ($permission).';
    }

    if (!serviceEnabled) {
      reason = 'LocationServiceDisabled';
      lastError = 'Location service (GPS) is disabled.';
    }

    // 2. If valid, try to acquire location
    if (reason == 'Valid') {
      Position? position;
      try {
        position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
          timeLimit: const Duration(seconds: 15),
        );
      } catch (e) {
        print('[FOE_BACKGROUND] getCurrentPosition failed/timed out: $e. Trying last known.');
        try {
          position = await Geolocator.getLastKnownPosition();
          if (position == null) {
            lastError = 'GPS timeout/error and no last known position available: $e';
          }
        } catch (le) {
          lastError = 'GPS timeout/error and last known check failed: $le';
        }
      }

      if (position != null) {
        final body = {
          'devicePublicId': devicePublicId,
          'installationId': installationId,
          'latitude': position.latitude,
          'longitude': position.longitude,
          'accuracy': position.accuracy,
          'speed': position.speed,
          'isMocked': position.isMocked,
          'recordedAt': position.timestamp?.toUtc().toIso8601String() ?? DateTime.now().toUtc().toIso8601String(),
        };

        print('[FOE_BACKGROUND] Location POST attempted.');
        final response = await ApiClient.postWithToken('Tracking/location', body, token)
            .timeout(const Duration(seconds: 15));
        print('[FOE_BACKGROUND] Location POST response code: ${response.statusCode}');

        if (response.statusCode == 200) {
          // Success, clear error
          lastError = '';
          if (prefs != null) {
            await prefs.setString('last_tracking_error', '');
          }
        } else {
          lastError = 'Server returned status code: ${response.statusCode}';
        }
      }
    }
  } catch (e) {
    if (e.toString().contains("426 Upgrade Required")) {
      print('[FOE_BACKGROUND] 426 Upgrade Required caught! Stopping tracking service.');
      service.stopSelf();
    } else {
      print('[FOE_BACKGROUND] Tick error: $e');
      lastError = e.toString();
    }
  } finally {
    // Save last error if any
    if (lastError != null && lastError.isNotEmpty) {
      if (prefs != null) {
        await prefs.setString('last_tracking_error', lastError);
      }
    }

    // Always send health in a safe try-catch with timeout
    if (engineerPublicId != null && engineerPublicId.isNotEmpty) {
      try {
        print('[FOE_BACKGROUND] Health POST attempted.');
        final statusCode = await DeviceHealthService.reportHealth(
          token: token,
          engineerPublicId: engineerPublicId,
          devicePublicId: devicePublicId,
          backgroundServiceAlive: true,
          lastTickAtUtc: tickTime,
          lastError: lastError,
          fallbackReason: reason,
        ).timeout(const Duration(seconds: 15));
        print('[FOE_BACKGROUND] Health POST response code: $statusCode');
      } catch (he) {
        print('[FOE_BACKGROUND] Health POST failed: $he');
      }
    } else {
      print('[FOE_BACKGROUND] Health POST skipped: missing engineerPublicId');
    }
  }
}
