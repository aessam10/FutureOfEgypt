import 'dart:convert';

import '../../core/network/api_client.dart';
import 'device_info_service.dart';

class DeviceAccessService {
  static Future<Map<String, dynamic>?> getMyLatestRequest({
    required String token,
  }) async {
    final response = await ApiClient.getWithToken(
      "DeviceAccessRequests/my-latest",
      token,
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception("Failed to get latest device access request");
    }

    if (response.body.trim().isEmpty || response.body.trim() == "null") {
      return null;
    }

    final decoded = jsonDecode(response.body);

    if (decoded == null) {
      return null;
    }

    return Map<String, dynamic>.from(decoded);
  }

  static Future<Map<String, dynamic>> createRequest({
    required String token,
  }) async {
    final body = await DeviceInfoService.buildAccessRequestBody();

    final response = await ApiClient.postWithToken(
      "DeviceAccessRequests/request",
      body,
      token,
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception("Failed to create device access request");
    }

    final decoded = jsonDecode(response.body);

    return Map<String, dynamic>.from(decoded);
  }

  static String _getStatusString(dynamic status) {
    if (status == null) throw Exception("Status is null");

    final statusText = status.toString().toLowerCase();

    if (statusText == "pending" || statusText == "1") return "pending";
    if (statusText == "approved" || statusText == "2") return "approved";
    if (statusText == "rejected" || statusText == "3") return "rejected";
    if (statusText == "cancelled" || statusText == "4") return "cancelled";

    throw Exception('Unknown device access request status: $statusText');
  }

  static bool isApproved(Map<String, dynamic>? request) {
    if (request == null) return false;
    return _getStatusString(request["status"]) == "approved";
  }

  static bool isPending(Map<String, dynamic>? request) {
    if (request == null) return false;
    return _getStatusString(request["status"]) == "pending";
  }

  static bool isRejected(Map<String, dynamic>? request) {
    if (request == null) return false;
    return _getStatusString(request["status"]) == "rejected";
  }

  static String getCreatedDevicePublicId(Map<String, dynamic>? request) {
    if (request == null) {
      return "";
    }

    return request["createdDevicePublicId"]?.toString() ?? "";
  }
}