import 'package:flutter/foundation.dart';

class TrackingIntervals {
  static const Duration locationUpdateInterval = kReleaseMode ? Duration(minutes: 10) : Duration(minutes: 1);
  static const String label = kReleaseMode ? '10 minutes' : '1 minute';
}
