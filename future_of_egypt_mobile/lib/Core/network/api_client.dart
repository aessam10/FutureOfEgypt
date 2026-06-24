import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:future_of_egypt_mobile/features/tracking/tracking_config_service.dart';
import 'package:future_of_egypt_mobile/features/app_update/app_update_models.dart';
import 'package:future_of_egypt_mobile/features/app_update/forced_update_page.dart';
import 'package:future_of_egypt_mobile/features/auth/login_page.dart';
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

  static String get appVersionCode => _appVersionCode;
 static Map<String, String> getAppVersionHeaders() {
    debugPrint('[FOE_API_CLIENT] image/app version headers attached: true');
    debugPrint('[FOE_API_CLIENT] image versionCode: $_appVersionCode');
    debugPrint('[FOE_API_CLIENT] image platform: $_appPlatform');

    return {
      "X-App-Platform": _appPlatform,
      "X-App-Version-Code": _appVersionCode,
      "X-App-Version-Name": _appVersionName,
      "X-Installation-Id": _installationId,
    };
  }

  static Map<String, String> getAuthenticatedImageHeaders(String bearerToken) {
    return {
      if (bearerToken.isNotEmpty) "Authorization": "Bearer $bearerToken",
      ...getAppVersionHeaders(),
    };
  }

  static String resolveApiFileUrl(String url) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    final apiRoot = baseUrl.replaceFirst(RegExp(r'/api/?$'), '');

    if (url.startsWith('/api/')) {
      return '$apiRoot$url';
    }

    if (url.startsWith('/')) {
      return '$apiRoot$url';
    }

    return '$baseUrl/$url';
  }
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

    debugPrint('[FOE_API_CLIENT] app version headers attached: true');
    debugPrint('[FOE_API_CLIENT] versionCode: $_appVersionCode');
    debugPrint('[FOE_API_CLIENT] platform: $_appPlatform');

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

  static Future<bool> _handle401() async {
    final oldToken = await TrackingConfigService.getToken();
    final refreshToken = await TrackingConfigService.getRefreshToken();

    if (oldToken == null || refreshToken == null || oldToken.isEmpty || refreshToken.isEmpty) {
      await _forceLogout();
      return false;
    }

    try {
      final response = await http.post(
        Uri.parse("$baseUrl/Auth/refresh"),
        headers: {
          "Content-Type": "application/json",
          "X-App-Platform": _appPlatform,
          "X-App-Version-Code": _appVersionCode,
          "X-App-Version-Name": _appVersionName,
          "X-Installation-Id": _installationId,
        },
        body: jsonEncode({
          "token": oldToken,
          "refreshToken": refreshToken,
        }),
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final body = jsonDecode(response.body);
        final newToken = body['token']?.toString() ?? '';
        final newRefreshToken = body['refreshToken']?.toString() ?? '';

        if (newToken.isNotEmpty && newRefreshToken.isNotEmpty) {
          // get existing user info to maintain state
          final trackingData = await TrackingConfigService.getTrackingData();
          await TrackingConfigService.saveLoginData(
            token: newToken,
            refreshToken: newRefreshToken,
            engineerPublicId: trackingData['engineerPublicId'] ?? '',
            devicePublicId: trackingData['devicePublicId'] ?? '',
            roles: List<String>.from(trackingData['roles'] ?? []),
          );
          setToken(newToken);
          return true;
        }
      }
    } catch (e) {
      debugPrint('[ApiClient] _handle401 error: $e');
    }

    await _forceLogout();
    return false;
  }

  static Future<void> _forceLogout() async {
    await TrackingConfigService.clear();
    setToken('');
    final context = navigatorKey.currentContext;
    if (context != null) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(
          builder: (_) => const LoginPage(
            initialMessage: 'Session expired. Please sign in again.',
          ),
        ),
        (route) => false,
      );
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
    var response = await http.post(
      Uri.parse("$baseUrl/$endpoint"),
      headers: _headers(bearerToken: bearerToken),
      body: jsonEncode(body),
    );

    if (response.statusCode == 401) {
      final refreshed = await _handle401();
      if (refreshed) {
        // Retry with the newly saved token
        response = await http.post(
          Uri.parse("$baseUrl/$endpoint"),
          headers: _headers(bearerToken: token),
          body: jsonEncode(body),
        );
      }
    }

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
    var response = await http.get(
      Uri.parse("$baseUrl/$endpoint"),
      headers: _headers(bearerToken: bearerToken),
    );

    if (response.statusCode == 401) {
      final refreshed = await _handle401();
      if (refreshed) {
        // Retry with the newly saved token
        response = await http.get(
          Uri.parse("$baseUrl/$endpoint"),
          headers: _headers(bearerToken: token),
        );
      }
    }

    await _handleResponse(response);
    return response;
  }
}