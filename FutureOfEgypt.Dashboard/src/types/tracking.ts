export interface LatestLocationResponse {
  engineerPublicId: string;
  engineerName: string;
  devicePublicId: string;
  deviceName: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  recordedAtUtc: string;
  isMocked?: boolean;
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
  recordedAtUtc: string;
  isMocked?: boolean;
}