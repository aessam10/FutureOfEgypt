import { axiosClient } from './axiosClient';
import type { DashboardSummaryResponse } from '../types/dashboard';

export async function getDashboardSummary() {
  const response = await axiosClient.get<DashboardSummaryResponse>('/api/Dashboard/summary');
  return response.data;
}