import 'dart:convert';
import '../../core/network/api_client.dart';

enum DeviceValidationStatus {
  valid,
  engineerInactive,
  deviceNotRegistered,
  deviceBlocked,
  deviceInactive,
  deviceAssignedToOther,
  pendingApproval,
  rejected,
  deviceNotAssigned,
}

class DeviceValidationResult {
  final DeviceValidationStatus status;
  final String? devicePublicId;
  final String? deviceName;
  final String? reviewNote;

  const DeviceValidationResult({
    required this.status,
    this.devicePublicId,
    this.deviceName,
    this.reviewNote,
  });
}

class DeviceValidationService {
  static DeviceValidationStatus _parseStatus(String raw) {
    switch (raw) {
      case 'Valid':
        return DeviceValidationStatus.valid;
      case 'EngineerInactive':
        return DeviceValidationStatus.engineerInactive;
      case 'DeviceNotRegistered':
        return DeviceValidationStatus.deviceNotRegistered;
      case 'DeviceBlocked':
        return DeviceValidationStatus.deviceBlocked;
      case 'DeviceInactive':
        return DeviceValidationStatus.deviceInactive;
      case 'DeviceAssignedToOther':
        return DeviceValidationStatus.deviceAssignedToOther;
      case 'PendingApproval':
        return DeviceValidationStatus.pendingApproval;
      case 'Rejected':
        return DeviceValidationStatus.rejected;
      case 'DeviceNotAssigned':
      default:
        return DeviceValidationStatus.deviceNotAssigned;
    }
  }

  static Future<DeviceValidationResult> validate({
    required String token,
    required String installationId,
  }) async {
    final response = await ApiClient.postWithToken(
      'Tracking/validate-device',
      {'installationId': installationId},
      token,
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        'Device validation failed: ${response.statusCode}\n${response.body}',
      );
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;

    final statusRaw = decoded['status']?.toString() ?? '';

    return DeviceValidationResult(
      status: _parseStatus(statusRaw),
      devicePublicId: decoded['devicePublicId']?.toString(),
      deviceName: decoded['deviceName']?.toString(),
      reviewNote: decoded['reviewNote']?.toString(),
    );
  }
}
