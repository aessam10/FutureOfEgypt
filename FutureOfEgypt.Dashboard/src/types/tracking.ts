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
}