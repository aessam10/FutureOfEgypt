import 'dart:async';
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
  static const String _defaultBaseUrl = "http://51.75.128.157:5151/api";

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
  static Future<bool>? _refreshInFlight;

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
      if (_isHandlingUpgradeRequired) {
        throw Exception("426 Upgrade Required");
      }

      _isHandlingUpgradeRequired = true;

      try {
        final Map<String, dynamic> body =
            jsonDecode(response.body) as Map<String, dynamic>;

        final updateInfo = AppUpdateCheckResponse.fromJson(body);

        final context = navigatorKey.currentContext;

        if (context != null) {
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(
              builder: (_) => ForcedUpdatePage(updateInfo: updateInfo),
            ),
            (route) => false,
          );
        } else {
          debugPrint('[ApiClient] 426 received without UI context');
        }
      } catch (e) {
        debugPrint('[ApiClient] 426 parse error: $e');
      }

      throw Exception("426 Upgrade Required");
    }
  }

  static Future<bool> _handle401() async {
    if (_refreshInFlight != null) {
      return await _refreshInFlight!;
    }

    _refreshInFlight = _refreshTokenInternal();

    try {
      return await _refreshInFlight!;
    } finally {
      _refreshInFlight = null;
    }
  }

  static Future<bool> _refreshTokenInternal() async {
    final oldToken = await TrackingConfigService.getToken();
    final refreshToken = await TrackingConfigService.getRefreshToken();

    if (oldToken == null ||
        refreshToken == null ||
        oldToken.isEmpty ||
        refreshToken.isEmpty) {
      debugPrint('[ApiClient] refresh skipped: missing token/refreshToken');

      // مهم:
      // ما نعملش logout هنا عشان background أو network issue ما يمسحش السيشن.
      return false;
    }

    try {
      debugPrint('[ApiClient] refresh attempted');

      final response = await http
          .post(
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
          )
          .timeout(const Duration(seconds: 30));

      debugPrint('[ApiClient] refresh response code: ${response.statusCode}');

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final Map<String, dynamic> body =
            jsonDecode(response.body) as Map<String, dynamic>;

        final newToken = body['token']?.toString() ?? '';
        final newRefreshToken = body['refreshToken']?.toString() ?? '';

        if (newToken.isEmpty || newRefreshToken.isEmpty) {
          debugPrint('[ApiClient] refresh failed: empty token returned');
          return false;
        }

        final trackingData = await TrackingConfigService.getTrackingData();

        final responseRoles = body['roles'];

        final roles = responseRoles is List
            ? responseRoles.map((x) => x.toString()).toList()
            : List<String>.from(trackingData['roles'] ?? []);

        final engineerPublicId =
            body['engineerPublicId']?.toString() ??
            trackingData['engineerPublicId']?.toString() ??
            '';

        final devicePublicId =
            body['devicePublicId']?.toString() ??
            trackingData['devicePublicId']?.toString() ??
            '';

        await TrackingConfigService.saveLoginData(
          token: newToken,
          refreshToken: newRefreshToken,
          engineerPublicId: engineerPublicId,
          devicePublicId: devicePublicId,
          roles: roles,
        );

        setToken(newToken);

        debugPrint('[ApiClient] refresh succeeded');

        return true;
      }

      if (_isRefreshTokenDefinitelyInvalid(response)) {
        debugPrint('[ApiClient] refresh token invalid/expired/revoked');

        final context = navigatorKey.currentContext;

        // Logout فقط لو التطبيق مفتوح وفيه UI.
        // لو background بعد swipe up، context غالبًا null، فمش هنمسح السيشن.
        if (context != null) {
          await _forceLogout();
        }

        return false;
      }

      // 500 / 502 / 503 / أي response مش واضح:
      // ما نعملش logout، نجرب تاني في الطلب الجاي.
      debugPrint('[ApiClient] refresh failed temporarily; session kept');

      return false;
    } on TimeoutException catch (e) {
      debugPrint('[ApiClient] refresh timeout: $e');

      // لا logout بسبب timeout.
      return false;
    } on SocketException catch (e) {
      debugPrint('[ApiClient] refresh network error: $e');

      // لا logout بسبب network error.
      return false;
    } catch (e) {
      debugPrint('[ApiClient] refresh exception: $e');

      // لا logout بسبب أي exception غير متوقعة.
      return false;
    }
  }

  static bool _isRefreshTokenDefinitelyInvalid(http.Response response) {
    if (response.statusCode != 400 && response.statusCode != 401) {
      return false;
    }

    final bodyText = response.body.toLowerCase();

    return bodyText.contains('invalid refresh token') ||
        bodyText.contains('refresh token is expired') ||
        bodyText.contains('refresh token expired') ||
        bodyText.contains('refresh token is expired or revoked') ||
        bodyText.contains('expired or revoked') ||
        bodyText.contains('revoked');
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
    // مهم للـ background:
    // لو service ماسكة token قديم، نقرأ أحدث token محفوظ الأول.
    final savedToken = await TrackingConfigService.getToken();

    final activeToken = savedToken != null && savedToken.isNotEmpty
        ? savedToken
        : bearerToken;

    var response = await http.post(
      Uri.parse("$baseUrl/$endpoint"),
      headers: _headers(bearerToken: activeToken),
      body: jsonEncode(body),
    );

    if (response.statusCode == 401) {
      debugPrint('[ApiClient] POST got 401, trying refresh');

      final refreshed = await _handle401();

      if (refreshed) {
        final latestToken = await TrackingConfigService.getToken();

        if (latestToken != null && latestToken.isNotEmpty) {
          response = await http.post(
            Uri.parse("$baseUrl/$endpoint"),
            headers: _headers(bearerToken: latestToken),
            body: jsonEncode(body),
          );
        }
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
    // مهم للـ background:
    // لو service ماسكة token قديم، نقرأ أحدث token محفوظ الأول.
    final savedToken = await TrackingConfigService.getToken();

    final activeToken = savedToken != null && savedToken.isNotEmpty
        ? savedToken
        : bearerToken;

    var response = await http.get(
      Uri.parse("$baseUrl/$endpoint"),
      headers: _headers(bearerToken: activeToken),
    );

    if (response.statusCode == 401) {
      debugPrint('[ApiClient] GET got 401, trying refresh');

      final refreshed = await _handle401();

      if (refreshed) {
        final latestToken = await TrackingConfigService.getToken();

        if (latestToken != null && latestToken.isNotEmpty) {
          response = await http.get(
            Uri.parse("$baseUrl/$endpoint"),
            headers: _headers(bearerToken: latestToken),
          );
        }
      }
    }

    await _handleResponse(response);
    return response;
  }
}