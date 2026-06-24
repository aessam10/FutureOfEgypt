export interface DeviceAccessRequestResponse {
  publicId: string;
  engineerPublicId: string;
  engineerName: string;
  devicePublicId?: string | null;
  requestedDeviceName: string;
  matchedDeviceName?: string | null;
  matchedDevicePublicId?: string | null;
  installationId: string;
  serialNumber?: string | null;
  imei?: string | null;
  status: number;
  requestedAtUtc: string;
  reviewedAtUtc?: string | null;
  reviewNote?: string | null;
}

export interface ApproveDeviceAccessRequest {
  reviewNote?: string;
}

export interface RejectDeviceAccessRequest {
  reviewNote: string;
}