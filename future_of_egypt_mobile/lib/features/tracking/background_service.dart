import 'dart:async';
import 'dart:ui';

import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:geolocator/geolocator.dart';

import '../../core/network/api_client.dart';
import 'tracking_intervals.dart';

class BackgroundTrackingService {
  static Future<void> initialize() async {
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
  }

  static Future<void> startTracking({
    required String token,
    required String devicePublicId,
    required String installationId,
  }) async {
    final service = FlutterBackgroundService();

    final isRunning = await service.isRunning();
    if (!isRunning) {
      await service.startService();
    }

    service.invoke('trackingConfig', {
      'token': token,
      'devicePublicId': devicePublicId,
      'installationId': installationId,
    });
  }

  static Future<void> stopTracking() async {
    final service = FlutterBackgroundService();
    service.invoke('stopService');
  }
}

@pragma('vm:entry-point')
void onStart(ServiceInstance service) async {
  DartPluginRegistrant.ensureInitialized();
  
  await ApiClient.init();

  String token = '';
  String devicePublicId = '';
  String installationId = '';

  Timer? timer;

  // Notification is handled by the initial configuration. 
  // Do not use flutter_background_service_android specific APIs here.

  service.on('trackingConfig').listen((event) async {
    token = event?['token']?.toString() ?? '';
    devicePublicId = event?['devicePublicId']?.toString() ?? '';
    installationId = event?['installationId']?.toString() ?? '';

    print('================ FOE BACKGROUND TRACKING ================');
    print('[FOE_BACKGROUND] DevicePublicId: $devicePublicId');
    print('[FOE_BACKGROUND] InstallationId: $installationId');
    print('[FOE_BACKGROUND] Interval: ${TrackingIntervals.label}');
    print('=========================================================');

    await _sendLocation(
      token: token,
      devicePublicId: devicePublicId,
      installationId: installationId,
    );

    timer?.cancel();
    timer = Timer.periodic(TrackingIntervals.locationUpdateInterval, (_) async {
      await _sendLocation(
        token: token,
        devicePublicId: devicePublicId,
        installationId: installationId,
      );
    });
  });

  service.on('stopService').listen((event) {
    timer?.cancel();
    service.stopSelf();
  });
}

Future<void> _sendLocation({
  required String token,
  required String devicePublicId,
  required String installationId,
}) async {
  if (token.isEmpty || devicePublicId.isEmpty || installationId.isEmpty) {
    print(
      '[FOE_BACKGROUND] Tracking skipped: missing token/device/installation.',
    );
    return;
  }

  final serviceEnabled = await Geolocator.isLocationServiceEnabled();
  if (!serviceEnabled) {
    print('[FOE_BACKGROUND] Tracking skipped: location service is OFF.');
    return;
  }

  final permission = await Geolocator.checkPermission();

  if (permission == LocationPermission.denied ||
      permission == LocationPermission.deniedForever ||
      permission == LocationPermission.unableToDetermine) {
    print(
      '[FOE_BACKGROUND] Tracking skipped: location permission is $permission.',
    );
    return;
  }

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

  print('[FOE_BACKGROUND] Sending location...');
  print('[FOE_BACKGROUND] DevicePublicId: $devicePublicId');
  print('[FOE_BACKGROUND] InstallationId: $installationId');
  print('[FOE_BACKGROUND] Latitude: ${position.latitude}');
  print('[FOE_BACKGROUND] Longitude: ${position.longitude}');

  try {
    await ApiClient.postWithToken('Tracking/location', body, token);
  } catch (e) {
    if (e.toString().contains("426 Upgrade Required")) {
      print('[FOE_BACKGROUND] 426 Upgrade Required caught! Stopping tracking service.');
      final service = FlutterBackgroundService();
      service.invoke('stopService');
    } else {
      print('[FOE_BACKGROUND] Error sending location: $e');
    }
  }
}
