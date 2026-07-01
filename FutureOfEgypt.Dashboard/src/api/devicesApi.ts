import { axiosClient } from './axiosClient';
import type { PagedResponse } from '../types/common';
import type {
  CreateDeviceRequest,
  DeviceResponse,
  UpdateDeviceStatusRequest,
} from '../types/devices';

export interface GetDevicesParams {
  pageNumber: number;
  pageSize: number;
  search?: string;
}

export async function getDevices(params: GetDevicesParams) {
  const response = await axiosClient.get<PagedResponse<DeviceResponse>>('/api/Devices', {
    params,
  });

  return response.data;
}

export async function createDevice(request: CreateDeviceRequest) {
  const response = await axiosClient.post<DeviceResponse>('/api/Devices', request);
  return response.data;
}

export async function updateDeviceStatus(
  devicePublicId: string,
  request: UpdateDeviceStatusRequest,
) {
  await axiosClient.patch(`/api/Devices/${devicePublicId}/status`, request);
}

export async function deleteDevice(devicePublicId: string) {
  await axiosClient.delete(`/api/Devices/${devicePublicId}`);
}