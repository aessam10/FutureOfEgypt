import '../tracking/tracking_config_service.dart';

class DeviceInfoService {
  static Future<Map<String, dynamic>> buildAccessRequestBody() async {
    final installationId = await TrackingConfigService.getInstallationId();

    return {
      "deviceName": "Future Of Egypt Android Device",
      "serialNumber": "APP-$installationId",
      "imei": null,
      "installationId": installationId,
      "platform": 0,
    };
  }
}