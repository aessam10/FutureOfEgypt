import { axiosClient } from './axiosClient';
import type { LatestLocationResponse } from '../types/tracking';

export interface LocationHistoryParams {
  fromUtc?: string; // ISO string
  toUtc?: string;   // ISO string
  pageNumber?: number;
  pageSize?: number;
}

export interface LocationHistoryResponse {
  items: Array<{
    publicId: string;
    engineerPublicId: string;
    engineerName: string;
    devicePublicId: string;
    deviceName: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    isMocked: boolean;
    recordedAt: string;
    receivedAt: string;
  }>;
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export async function getLatestLocations(): Promise<LatestLocationResponse[]> {
  const response = await axiosClient.get<LatestLocationResponse[]>('/api/Tracking/latest');
  return response.data;
}

export async function getHiddenLatestLocations(): Promise<LatestLocationResponse[]> {
  const response = await axiosClient.get<LatestLocationResponse[]>('/api/Tracking/latest/hidden');
  return response.data;
}

export async function getDeviceLocationHistory(devicePublicId: string, params?: LocationHistoryParams): Promise<LocationHistoryResponse> {
  const response = await axiosClient.get<LocationHistoryResponse>(`/api/Tracking/history/${devicePublicId}`, { params });
  return response.data;
}


export async function hideLatestLocation(devicePublicId: string): Promise<void> {
  await axiosClient.patch(`/api/Tracking/latest/${devicePublicId}/hide`);
}

export async function unhideLatestLocation(devicePublicId: string): Promise<void> {
  await axiosClient.patch(`/api/Tracking/latest/${devicePublicId}/unhide`);
}