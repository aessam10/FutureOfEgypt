import { axiosClient } from './axiosClient';
import type { LatestLocationResponse } from '../types/tracking';

export async function getLatestLocations(): Promise<LatestLocationResponse[]> {
  const response = await axiosClient.get<LatestLocationResponse[]>('/api/Tracking/latest');
  return response.data;
}