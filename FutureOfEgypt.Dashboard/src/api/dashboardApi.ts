import { axiosClient } from './axiosClient';
import type { DashboardSummaryResponse } from '../types/dashboard';

export interface EngineersStatusResponse {
  totalCount: number;
  onlineCount: number;
  offlineCount: number;
  neverConnectedCount: number;
}

export async function getDashboardSummary(): Promise<DashboardSummaryResponse> {
  const response = await axiosClient.get<DashboardSummaryResponse>('/api/Dashboard/summary');
  return response.data;
}

export async function getEngineersStatus(): Promise<EngineersStatusResponse> {
  const response = await axiosClient.get<any[]>('/api/Dashboard/engineers-status');
  
  const data = response.data;
  let onlineCount = 0;
  let offlineCount = 0;
  let neverConnectedCount = 0;
  
  for (const eng of data) {
    if (eng.isOnline) {
      onlineCount++;
    } else if (eng.lastSeenAtUtc) {
      offlineCount++;
    } else {
      neverConnectedCount++;
    }
  }

  return {
    totalCount: data.length,
    onlineCount,
    offlineCount,
    neverConnectedCount
  };
}