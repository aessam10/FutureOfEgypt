export interface DeviceResponse {
  publicId: string;
  deviceName: string;
  serialNumber: string;
  imei: string;
  installationId?: string;
  assignedEngineerName?: string | null;
  status: number;
  createdAt: string;
}

export interface CreateDeviceRequest {
  deviceName: string;
  serialNumber: string;
  imei: string;
  installationId: string;
  status: number;
}

export interface UpdateDeviceStatusRequest {
  status: number;
}