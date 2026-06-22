import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:future_of_egypt_mobile/features/tracking/tracking_config_service.dart';
import 'package:future_of_egypt_mobile/features/app_update/app_update_models.dart';
import 'package:future_of_egypt_mobile/features/app_update/forced_update_page.dart';
import 'package:future_of_egypt_mobile/main.dart';

class ApiClient {
  static const String _defaultBaseUrl = "https://localhost:7029/api";

  static const String _definedBaseUrl = String.fromEnvironment(
    "API_BASE_URL",
    defaultValue: _defaultBaseUrl,
  );

  static String get baseUrl => _definedBaseUrl;

  static String? token;
  
  static String _appPlatform = 'Unknown';
  static String _appVersionCode = '1';
  static String _appVersionName = '1.0.0';
  static String _installationId = '';

  static bool _isHandlingUpgradeRequired = false;

  static Future<void> init() async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      _appVersionCode = packageInfo.buildNumber;
      _appVersionName = packageInfo.version;
      _appPlatform = Platform.isAndroid ? 'Android' : Platform.operatingSystem;
      _installationId = await TrackingConfigService.getInstallationId();
    } catch (e) {
      debugPrint('[ApiClient] init error: $e');
    }
  }

  static void setToken(String t) {
    token = t;
  }

  static Map<String, String> _headers({String? bearerToken}) {
    final activeToken = bearerToken ?? token;

    return {
      "Content-Type": "application/json",
      if (activeToken != null && activeToken.isNotEmpty)
        "Authorization": "Bearer $activeToken",
      "X-App-Platform": _appPlatform,
      "X-App-Version-Code": _appVersionCode,
      "X-App-Version-Name": _appVersionName,
      "X-Installation-Id": _installationId,
    };
  }

  static Future<void> _handleResponse(http.Response response) async {
    if (response.statusCode == 426) {
      if (_isHandlingUpgradeRequired) throw Exception("426 Upgrade Required");
      _isHandlingUpgradeRequired = true;

      try {
        final Map<String, dynamic> body = jsonDecode(response.body);
        final updateInfo = AppUpdateCheckResponse.fromJson(body);

        final context = navigatorKey.currentContext;
        if (context != null) {
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (_) => ForcedUpdatePage(updateInfo: updateInfo)),
            (route) => false,
          );
        } else {
          // If no context, background service caught it. 
          // Handled externally by stopping tracking.
        }
      } catch (e) {
        debugPrint('[ApiClient] 426 parse error: $e');
      } 
      
      throw Exception("426 Upgrade Required");
    }
  }

  static Future<http.Response> post(
    String endpoint,
    Map<String, dynamic> body,
  ) async {
    final response = await http.post(
      Uri.parse("$baseUrl/$endpoint"),
      headers: _headers(),
      body: jsonEncode(body),
    );
    await _handleResponse(response);
    return response;
  }

  static Future<http.Response> postWithToken(
    String endpoint,
    Map<String, dynamic> body,
    String bearerToken,
  ) async {
    final response = await http.post(
      Uri.parse("$baseUrl/$endpoint"),
      headers: _headers(bearerToken: bearerToken),
      body: jsonEncode(body),
    );
    await _handleResponse(response);
    return response;
  }

  static Future<http.Response> get(String endpoint) async {
    final response = await http.get(
      Uri.parse("$baseUrl/$endpoint"),
      headers: _headers(),
    );
    await _handleResponse(response);
    return response;
  }

  static Future<http.Response> getWithToken(
    String endpoint,
    String bearerToken,
  ) async {
    final response = await http.get(
      Uri.parse("$baseUrl/$endpoint"),
      headers: _headers(bearerToken: bearerToken),
    );
    await _handleResponse(response);
    return response;
  }
}