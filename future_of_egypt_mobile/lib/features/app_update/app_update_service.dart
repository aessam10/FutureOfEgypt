import 'dart:convert';
import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:future_of_egypt_mobile/features/app_update/app_update_models.dart';
import 'package:future_of_egypt_mobile/features/tracking/tracking_config_service.dart';

class AppUpdateService {
  static const String baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://localhost:5151/api');

  static Future<AppUpdateCheckResponse?> checkUpdate() async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final versionCode = int.tryParse(packageInfo.buildNumber) ?? 1;

      // Ensure platform string is Android
      final platformStr = Platform.isAndroid ? 'android' : Platform.operatingSystem.toLowerCase();

      final url = Uri.parse('$baseUrl/app-updates/$platformStr/check?versionCode=$versionCode');
      print('[FOE_APP_UPDATE_DEBUG] API_BASE_URL: $baseUrl');
      print('[FOE_APP_UPDATE_DEBUG] update check URL: $url');
      
      final response = await http.get(url, headers: {
        'Accept': 'application/json',
      });

      if (response.statusCode == 200) {
        print('[FOE_APP_UPDATE_DEBUG] raw response JSON: ${response.body}');
        final jsonResponse = jsonDecode(response.body);
        return AppUpdateCheckResponse.fromJson(jsonResponse);
      } else {
        print('[FOE_APP_UPDATE] Update check failed with status: ${response.statusCode}');
        return null;
      }
    } catch (e) {
      print('[FOE_APP_UPDATE] Update check error: $e');
      return null;
    }
  }

  static Future<void> reportAppStatus() async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      
      // TEMPORARY LOCAL TESTING OVERRIDE:
      final versionCode = 999; // int.tryParse(packageInfo.buildNumber) ?? 1;
      final versionName = packageInfo.version;
      final platformStr = Platform.isAndroid ? 'Android' : 'Unknown';

      final installationId = await TrackingConfigService.getInstallationId();
      if (installationId.isEmpty) return;

      // Fetch the devicePublicId if logged in (from config storage)
      final devicePublicId = await TrackingConfigService.getDevicePublicId();

      final url = Uri.parse('$baseUrl/devices/app-status');
      final body = jsonEncode({
        'platform': platformStr,
        'appVersionName': versionName,
        'appVersionCode': versionCode,
        'installationId': installationId,
        'devicePublicId': devicePublicId, // can be null
      });

      // Status report doesn't absolutely require auth token since it handles anonymous installationId well
      final token = await TrackingConfigService.getToken();
      final headers = {
        'Content-Type': 'application/json',
      };
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }

      final response = await http.post(url, headers: headers, body: body);

      if (response.statusCode != 200) {
        print('[FOE_APP_UPDATE] Report app status failed: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      print('[FOE_APP_UPDATE] Report app status error: $e');
    }
  }

  static Future<String?> downloadApk({
    required String downloadUrl,
    required String expectedSha256,
    required void Function(double progress) onProgress,
  }) async {
    try {
      // 1. Report UpdateStarted
      await _reportStatusUpdate(AppUpdateStatus.updateStarted);

      // 2. Prepare path
      final dir = await getTemporaryDirectory();
      final apkPath = '${dir.path}/app_update.apk';

      // 3. Download using Dio
      final dio = Dio();
      await dio.download(
        downloadUrl,
        apkPath,
        onReceiveProgress: (received, total) {
          if (total != -1) {
            onProgress(received / total);
          }
        },
      );

      // 4. Verify checksum
      final file = File(apkPath);
      if (!await file.exists()) {
        throw Exception("Downloaded file not found.");
      }

      final bytes = await file.readAsBytes();
      final digest = sha256.convert(bytes);
      final actualSha256 = digest.toString().toUpperCase();

      if (actualSha256 != expectedSha256.toUpperCase()) {
        await file.delete();
        throw Exception("Checksum mismatch. Expected: $expectedSha256, Got: $actualSha256");
      }

      return apkPath;
    } catch (e) {
      print('[FOE_APP_UPDATE] Download APK error: $e');
      // Report UpdateFailed
      await _reportStatusUpdate(AppUpdateStatus.updateFailed, error: e.toString());
      return null;
    }
  }

  static Future<void> _reportStatusUpdate(AppUpdateStatus status, {String? error}) async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final versionCode = int.tryParse(packageInfo.buildNumber) ?? 1;
      final versionName = packageInfo.version;
      final platformStr = Platform.isAndroid ? 'Android' : 'Unknown';

      final installationId = await TrackingConfigService.getInstallationId();
      if (installationId.isEmpty) return;

      final devicePublicId = await TrackingConfigService.getDevicePublicId();

      final url = Uri.parse('$baseUrl/devices/app-status');
      final body = jsonEncode({
        'platform': platformStr,
        'appVersionName': versionName,
        'appVersionCode': versionCode,
        'installationId': installationId,
        'devicePublicId': devicePublicId,
        'clientStatus': status.index,
        'lastError': error,
      });

      final token = await TrackingConfigService.getToken();
      final headers = {
        'Content-Type': 'application/json',
      };
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }

      await http.post(url, headers: headers, body: body);
    } catch (e) {
      print('[FOE_APP_UPDATE] _reportStatusUpdate error: $e');
    }
  }
}
