export interface LatestLocationResponse {
  engineerPublicId: string;
  engineerName: string;
  devicePublicId: string;
  deviceName: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  recordedAt: string;
  receivedAt: string;
  isMocked?: boolean;
  isHidden?: boolean;
  hiddenAt?: string | null;
  hiddenByUserId?: string | null;
  hiddenReason?: string | null;
  isOnline: boolean;
  profilePhotoUrl?: string;
  engineerPhoneNumber?: string;
  isAuthorized?: boolean;
  trackingStatusReason?: string;
  lastHealthReportAt?: string;
}

export interface LocationReceivedEvent {
  engineerPublicId: string;
  engineerName: string;
  devicePublicId: string;
  deviceName: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  recordedAt: string;
  receivedAt: string;
  isMocked?: boolean;
  isOnline: boolean;
}

export interface EngineerStatusChangedEvent {
  engineerPublicId: string;
  devicePublicId: string;
  isOnline: boolean;
  reason?: string;
  onlineCount: number;
  offlineCount: number;
}