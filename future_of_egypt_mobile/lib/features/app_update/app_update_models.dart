enum AppUpdateLevel {
  none,
  optional,
  required,
  mandatory,
  unknown
}

enum AppUpdateStatus {
  unknown,
  upToDate,
  updateAvailable,
  updateRecommended,
  updateRequired,
  mandatoryUpdateRequired,
  updateStarted,
  updateFailed
}

class AppUpdateCheckResponse {
  final bool isUpdateAvailable;
  final AppUpdateLevel updateLevel;
  final bool isBlocking;
  final String? latestVersionName;
  final int latestVersionCode;
  final int? minimumRecommendedVersionCode;
  final int? minimumRequiredVersionCode;
  final int? minimumMandatoryVersionCode;
  final String? downloadUrl;
  final String? apkSha256;
  final int fileSizeBytes;
  final String? releaseNotes;

  AppUpdateCheckResponse({
    required this.isUpdateAvailable,
    required this.updateLevel,
    required this.isBlocking,
    this.latestVersionName,
    required this.latestVersionCode,
    this.minimumRecommendedVersionCode,
    this.minimumRequiredVersionCode,
    this.minimumMandatoryVersionCode,
    this.downloadUrl,
    this.apkSha256,
    required this.fileSizeBytes,
    this.releaseNotes,
  });

  factory AppUpdateCheckResponse.fromJson(Map<String, dynamic> json) {
    AppUpdateLevel parsedLevel;
    
    // Helper to get case-insensitive key
    dynamic getValue(String key) {
      if (json.containsKey(key)) return json[key];
      final pascalKey = key.substring(0, 1).toUpperCase() + key.substring(1);
      if (json.containsKey(pascalKey)) return json[pascalKey];
      return null;
    }
    
    // Handle string or numeric enum parsing
    var rawLevel = getValue('updateLevel');
    if (rawLevel is int) {
      switch (rawLevel) {
        case 0: parsedLevel = AppUpdateLevel.none; break;
        case 1: parsedLevel = AppUpdateLevel.optional; break;
        case 2: parsedLevel = AppUpdateLevel.required; break;
        case 3: parsedLevel = AppUpdateLevel.mandatory; break;
        default: parsedLevel = AppUpdateLevel.unknown; break;
      }
    } else if (rawLevel is String) {
      switch (rawLevel.toLowerCase()) {
        case 'none': parsedLevel = AppUpdateLevel.none; break;
        case 'optional': parsedLevel = AppUpdateLevel.optional; break;
        case 'required': parsedLevel = AppUpdateLevel.required; break;
        case 'mandatory': parsedLevel = AppUpdateLevel.mandatory; break;
        default: parsedLevel = AppUpdateLevel.unknown; break;
      }
    } else {
      parsedLevel = AppUpdateLevel.unknown;
    }

    bool updateAvailable = getValue('isUpdateAvailable') ?? getValue('isUpdateRequired') ?? false;

    return AppUpdateCheckResponse(
      isUpdateAvailable: updateAvailable,
      updateLevel: parsedLevel,
      isBlocking: getValue('isBlocking') ?? false,
      latestVersionName: getValue('latestVersionName'),
      latestVersionCode: getValue('latestVersionCode') ?? 0,
      minimumRecommendedVersionCode: getValue('minimumRecommendedVersionCode'),
      minimumRequiredVersionCode: getValue('minimumRequiredVersionCode'),
      minimumMandatoryVersionCode: getValue('minimumMandatoryVersionCode'),
      downloadUrl: getValue('downloadUrl'),
      apkSha256: getValue('apkSha256'),
      fileSizeBytes: getValue('fileSizeBytes') ?? 0,
      releaseNotes: getValue('releaseNotes'),
    );
  }
}
