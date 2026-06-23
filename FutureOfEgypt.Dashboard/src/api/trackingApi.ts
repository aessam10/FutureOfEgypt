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

export interface LocationHistoryItem {
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
  timestampLocal?: string;
  receivedAt: string;
}

export async function getEngineerLocationHistoryByDate(engineerPublicId: string, date: string, maxPoints: number = 150): Promise<LocationHistoryItem[]> {
  const response = await axiosClient.get<LocationHistoryItem[]>(`/api/Tracking/history/engineer/${engineerPublicId}`, {
    params: { date, maxPoints }
  });
  return response.data;
}


export async function hideLatestLocation(devicePublicId: string): Promise<void> {
  await axiosClient.patch(`/api/Tracking/latest/${devicePublicId}/hide`);
}

export async function unhideLatestLocation(devicePublicId: string): Promise<void> {
  await axiosClient.patch(`/api/Tracking/latest/${devicePublicId}/unhide`);
}

export interface DailyAnalysisResponse {
  engineerPublicId: string;
  date: string;
  analysisWindowStartLocal: string;
  analysisWindowEndLocal: string;
  onlineDurationMinutes: number;
  offlineDurationMinutes: number;
  onlineDisplay: string;
  offlineDisplay: string;
  hasData: boolean;
  isPartialData: boolean;
}

export async function getDailyAnalysis(engineerPublicId: string, date: string): Promise<DailyAnalysisResponse> {
  const response = await axiosClient.get<DailyAnalysisResponse>(`/api/Tracking/analysis/engineer/${engineerPublicId}`, {
    params: { date }
  });
  return response.data;
}