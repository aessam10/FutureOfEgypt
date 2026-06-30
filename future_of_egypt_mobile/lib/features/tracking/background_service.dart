import 'dart:async';
import 'dart:ui';
import 'dart:io';
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
import 'package:uuid/uuid.dart';
import 'offline_queue_helper.dart';

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

      final permission = await Geolocator.checkPermission();

      if (!isRunning || isStale) {
        debugPrint('[FOE_WATCHDOG] Background service is stopped or stale (isRunning=$isRunning). Recovering...');
        
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
            backgroundServiceAlive: isRunning,
            lastError: isRunning ? null : 'BackgroundServiceStopped',
            fallbackReason: reason,
            trackingIntervalMs: TrackingIntervals.locationUpdateInterval.inMilliseconds,
          ).timeout(const Duration(seconds: 15));
        } catch (he) {
          debugPrint('[FOE_WATCHDOG] Watchdog health report failed: $he');
        }

        if (permission == LocationPermission.always) {
          await service.startService();
          service.invoke('startTracking', {
            'token': token,
            'devicePublicId': deviceId,
            'installationId': installationId,
          });
          debugPrint('[FOE_WATCHDOG] Service restart triggered successfully. Sending watchdog recovery event.');
          try {
            await DeviceHealthService.reportRecoveryEvent(
              token: token,
              engineerPublicId: engineerId,
              devicePublicId: deviceId,
              recoveryReason: 'RecoveredByWatchdog',
              lastError: 'BackgroundServiceStopped',
            );
          } catch (re) {
            debugPrint('[FOE_WATCHDOG] Failed to report watchdog recovery event: $re');
          }
        } else {
          debugPrint('[FOE_WATCHDOG] Service restart skipped: Location permission is not Always ($permission).');
        }
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

  try {
    final uptime = await _getSystemUptime();
    if (uptime != null && uptime < 300) {
      debugPrint('[FOE_BACKGROUND] System uptime is ${uptime.toStringAsFixed(1)}s. Detecting device reboot!');
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('is_reboot_recovery', true);
    }
  } catch (e) {
    debugPrint('[FOE_BACKGROUND] Error checking uptime: $e');
  }

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

  try {
    final prefs = await SharedPreferences.getInstance();
    final isReboot = prefs.getBool('is_reboot_recovery') ?? false;
    if (isReboot) {
      await prefs.setBool('is_reboot_recovery', false);
      final config = await TrackingConfigService.getTrackingData();
      final engineerId = config['engineerPublicId'] as String?;
      if (engineerId != null) {
        print('[FOE_BACKGROUND] Reporting RecoveredAfterBoot recovery event.');
        await DeviceHealthService.reportRecoveryEvent(
          token: token,
          engineerPublicId: engineerId,
          devicePublicId: devicePublicId,
          recoveryReason: 'RecoveredAfterBoot',
          lastError: 'DeviceRebooted',
        );
      }
    }
  } catch (e) {
    debugPrint('[FOE_BACKGROUND] Failed to report boot recovery event: $e');
  }

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

      if (position != null && engineerPublicId != null) {
        final recordedAt = position.timestamp?.toUtc() ?? DateTime.now().toUtc();
        final dayKey = recordedAt.toIso8601String().substring(0, 10);

        final point = OfflineLocationPoint(
          localId: const Uuid().v4(),
          engineerPublicId: engineerPublicId,
          devicePublicId: devicePublicId,
          dayKey: dayKey,
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: position.accuracy,
          speed: position.speed,
          isMocked: position.isMocked,
          recordedAtUtc: recordedAt,
          createdAtUtc: DateTime.now().toUtc(),
        );

        print('[FOE_BACKGROUND] Saving acquired position to local queue. dayKey: $dayKey');
        final saved = await OfflineQueueHelper().insertPoint(point);
        if (!saved) {
          if (prefs != null) {
            final dropped = prefs.getInt('dropped_points_count') ?? 0;
            await prefs.setInt('dropped_points_count', dropped + 1);
          }
        }
      }

      if (engineerPublicId != null) {
        await _flushPendingLocationQueue(token, engineerPublicId, devicePublicId, installationId, prefs);
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
          trackingIntervalMs: TrackingIntervals.locationUpdateInterval.inMilliseconds,
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

Future<void> _flushPendingLocationQueue(
  String token,
  String engineerPublicId,
  String devicePublicId,
  String installationId,
  SharedPreferences? prefs,
) async {
  final queueHelper = OfflineQueueHelper();
  
  for (int i = 0; i < 3; i++) {
    final dayKeys = await queueHelper.getDistinctDayKeys();
    if (dayKeys.isEmpty) break;

    final targetDayKey = dayKeys.first; // Oldest dayKey
    final pendingPoints = await queueHelper.getPointsForDayKey(targetDayKey, 200);
    if (pendingPoints.isEmpty) break;

    // Check if this is a network recovery batch
    final hasNetworkFailure = prefs?.getBool('has_network_failure') ?? false;
    
    // Oldest point is older than 2 * trackingInterval
    final oldestRecordedAt = pendingPoints.first.recordedAtUtc;
    final timeDiff = DateTime.now().toUtc().difference(oldestRecordedAt);
    final isAccumulated = timeDiff > (TrackingIntervals.locationUpdateInterval * 2);

    Map<String, dynamic>? diagnostics;
    if (hasNetworkFailure || isAccumulated) {
      final droppedCount = prefs?.getInt('dropped_points_count') ?? 0;
      diagnostics = {
        'recoveryReason': 'RecoveredAfterNetworkLoss',
        'offlineFromUtc': oldestRecordedAt.toIso8601String(),
        'offlineToUtc': pendingPoints.last.recordedAtUtc.toIso8601String(),
        'uploadedOfflinePointsCount': pendingPoints.length,
        'droppedPointsCount': droppedCount,
      };
    }

    final body = {
      'engineerPublicId': engineerPublicId,
      'devicePublicId': devicePublicId,
      'installationId': installationId,
      'dayKey': targetDayKey,
      'points': pendingPoints.map((p) => {
        'localId': p.localId,
        'latitude': p.latitude,
        'longitude': p.longitude,
        'accuracy': p.accuracy,
        'speed': p.speed,
        'isMocked': p.isMocked,
        'recordedAtUtc': p.recordedAtUtc.toIso8601String(),
      }).toList(),
      if (diagnostics != null) 'diagnostics': diagnostics,
    };

    try {
      print('[FOE_BACKGROUND] Location batch POST attempted for dayKey: $targetDayKey, count: ${pendingPoints.length}');
      final response = await ApiClient.postWithToken('Tracking/locations/batch', body, token)
          .timeout(const Duration(seconds: 20));
      print('[FOE_BACKGROUND] Location batch POST response code: ${response.statusCode}');

      if (response.statusCode == 200) {
        // Clear network failure flag and reset dropped points
        if (prefs != null) {
          await prefs.setBool('has_network_failure', false);
          if (diagnostics != null) {
            await prefs.setInt('dropped_points_count', 0);
          }
          await prefs.setString('last_tracking_error', '');
        }

        final List<String> acceptedIds = pendingPoints.map((p) => p.localId).toList();
        await queueHelper.deletePoints(acceptedIds);
      } else {
        // Set network failure flag
        if (prefs != null) {
          await prefs.setBool('has_network_failure', true);
          await prefs.setString('last_tracking_error', 'Server returned status code: ${response.statusCode}');
        }
        break; // Stop flushing on failure
      }
    } catch (e) {
      print('[FOE_BACKGROUND] Batch upload failed: $e');
      if (prefs != null) {
        await prefs.setBool('has_network_failure', true);
        await prefs.setString('last_tracking_error', e.toString());
      }
      break; // Stop flushing on failure
    }
  }
}

Future<double?> _getSystemUptime() async {
  if (!kIsWeb && Platform.isAndroid) {
    try {
      final file = File('/proc/uptime');
      if (await file.exists()) {
        final contents = await file.readAsString();
        final parts = contents.trim().split(' ');
        if (parts.isNotEmpty) {
          return double.tryParse(parts[0]);
        }
      }
    } catch (_) {}
  }
  return null;
}
