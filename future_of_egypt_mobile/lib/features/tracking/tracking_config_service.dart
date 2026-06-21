import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

class TrackingConfigService {
  static const String _tokenKey = "auth_token";
  static const String _engineerPublicIdKey = "engineer_public_id";
  static const String _devicePublicIdKey = "device_public_id";
  static const String _installationIdKey = "installation_id";

  static Future<void> saveLoginData({
    required String token,
    required String engineerPublicId,
    required String devicePublicId,
  }) async {
    final prefs = await SharedPreferences.getInstance();

    await prefs.setString(_tokenKey, token);
    await prefs.setString(_engineerPublicIdKey, engineerPublicId);
    await prefs.setString(_devicePublicIdKey, devicePublicId);
  }

  static Future<void> saveDevicePublicId(String devicePublicId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_devicePublicIdKey, devicePublicId);
  }

  static Future<String> getInstallationId() async {
    final prefs = await SharedPreferences.getInstance();

    final existingId = prefs.getString(_installationIdKey);

    if (existingId != null && existingId.isNotEmpty) {
      return existingId;
    }

    final newId = const Uuid().v4();
    await prefs.setString(_installationIdKey, newId);

    return newId;
  }

  static Future<Map<String, String>> getTrackingData() async {
    final prefs = await SharedPreferences.getInstance();

    final installationId = await getInstallationId();

    return {
      "token": prefs.getString(_tokenKey) ?? "",
      "engineerPublicId": prefs.getString(_engineerPublicIdKey) ?? "",
      "devicePublicId": prefs.getString(_devicePublicIdKey) ?? "",
      "installationId": installationId,
    };
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();

    await prefs.remove(_tokenKey);
    await prefs.remove(_engineerPublicIdKey);
    await prefs.remove(_devicePublicIdKey);
  }
}