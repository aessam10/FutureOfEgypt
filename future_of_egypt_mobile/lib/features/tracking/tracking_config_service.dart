import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

class TrackingConfigService {
  static const String _tokenKey = "auth_token";
  static const String _engineerPublicIdKey = "engineer_public_id";
  static const String _devicePublicIdKey = "device_public_id";
  static const String _installationIdKey = "installation_id";
  static const String _rolesKey = "user_roles";

  static Future<void> saveLoginData({
    required String token,
    required String engineerPublicId,
    required String devicePublicId,
    required List<String> roles,
  }) async {
    final prefs = await SharedPreferences.getInstance();

    await prefs.setString(_tokenKey, token);
    await prefs.setString(_engineerPublicIdKey, engineerPublicId);
    await prefs.setString(_devicePublicIdKey, devicePublicId);
    await prefs.setStringList(_rolesKey, roles);
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

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  static Future<String?> getDevicePublicId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_devicePublicIdKey);
  }

  static Future<List<String>> getRoles() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getStringList(_rolesKey) ?? [];
  }

  static Future<Map<String, dynamic>> getTrackingData() async {
    final prefs = await SharedPreferences.getInstance();

    final installationId = await getInstallationId();

    return {
      "token": prefs.getString(_tokenKey) ?? "",
      "engineerPublicId": prefs.getString(_engineerPublicIdKey) ?? "",
      "devicePublicId": prefs.getString(_devicePublicIdKey) ?? "",
      "installationId": installationId,
      "roles": prefs.getStringList(_rolesKey) ?? [],
    };
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();

    await prefs.remove(_tokenKey);
    await prefs.remove(_engineerPublicIdKey);
    await prefs.remove(_devicePublicIdKey);
    await prefs.remove(_rolesKey);
  }
}