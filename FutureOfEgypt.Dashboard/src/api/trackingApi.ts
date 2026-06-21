import { axiosClient } from './axiosClient';
import type { LatestLocationResponse } from '../types/tracking';

export interface LocationHistoryParams {
  startDate?: string; // ISO string
  endDate?: string;   // ISO string
}

export interface LocationHistoryResponse {
  devicePublicId: string;
  history: Array<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    batteryLevel?: number;
    isMocked: boolean;
    timestampUtc: string;
  }>;
}

export async function getLatestLocations(): Promise<LatestLocationResponse[]> {
  const response = await axiosClient.get<LatestLocationResponse[]>('/api/Tracking/latest');
  return response.data;
}

export async function getDeviceLocationHistory(devicePublicId: string, params?: LocationHistoryParams): Promise<LocationHistoryResponse> {
  const response = await axiosClient.get<LocationHistoryResponse>(`/api/Tracking/history/${devicePublicId}`, { params });
  return response.data;
}