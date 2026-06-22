export const AppUpdateLevel = {
    Optional: 1,
    Recommended: 2,
    Required: 3,
    Mandatory: 4
} as const;

export type AppUpdateLevel = typeof AppUpdateLevel[keyof typeof AppUpdateLevel];

export const AppUpdateStatus = {
    Unknown: 0,
    UpToDate: 1,
    UpdateAvailable: 2,
    UpdateRecommended: 3,
    UpdateRequired: 4,
    MandatoryUpdateRequired: 5,
    UpdateStarted: 6,
    UpdateFailed: 7
} as const;

export type AppUpdateStatus = typeof AppUpdateStatus[keyof typeof AppUpdateStatus];

export interface AppReleaseResponse {
    publicId: string;
    platform: string;
    versionName: string;
    versionCode: number;
    minimumRecommendedVersionCode?: number;
    minimumRequiredVersionCode?: number;
    minimumMandatoryVersionCode?: number;
    updateLevel?: AppUpdateLevel;
    isActive: boolean;
    apkFileName: string;
    apkDownloadUrl: string;
    apkSha256: string;
    fileSizeBytes: number;
    releaseNotes?: string;
    publishedAt: string;
    updatedAt?: string;
}

export interface CreateAppReleaseRequest {
    platform: string;
    versionName: string;
    versionCode: number;
    minimumRecommendedVersionCode?: number;
    minimumRequiredVersionCode?: number;
    minimumMandatoryVersionCode?: number;
    releaseNotes?: string;
}

export interface DeviceAppStatusResponse {
    publicId: string;
    engineerName: string;
    deviceName: string;
    installationId: string;
    platform: string;
    appVersionName: string;
    appVersionCode: number;
    latestVersionCode: number;
    minimumMandatoryVersionCode?: number;
    updateLevel: AppUpdateLevel;
    status: AppUpdateStatus;
    lastCheckedAt: string;
    lastReportedAt?: string;
    lastUpdateStartedAt?: string;
    lastUpdateFailedAt?: string;
    lastError?: string;
}
