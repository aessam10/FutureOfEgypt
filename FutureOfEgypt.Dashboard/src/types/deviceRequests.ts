export interface DeviceAccessRequestResponse {
  publicId: string;
  engineerPublicId: string;
  engineerName: string;
  devicePublicId?: string | null;
  deviceName?: string | null;
  installationId: string;
  status: number;
  requestedAtUtc: string;
  reviewedAtUtc?: string | null;
  rejectionReason?: string | null;
}

export interface ApproveDeviceAccessRequest {
  devicePublicId: string;
}

export interface RejectDeviceAccessRequest {
  rejectionReason: string;
}