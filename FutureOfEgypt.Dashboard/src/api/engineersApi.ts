import { axiosClient } from './axiosClient';
import type { PagedResponse } from '../types/common';
import type {
  CreateEngineerRequest,
  EngineerResponse,
  UpdateEngineerStatusRequest,
} from '../types/engineers';

export interface GetEngineersParams {
  pageNumber: number;
  pageSize: number;
  search?: string;
}

export async function getEngineers(params: GetEngineersParams) {
  const response = await axiosClient.get<PagedResponse<EngineerResponse>>('/api/Engineers', {
    params,
  });

  return response.data;
}

export async function createEngineer(request: CreateEngineerRequest) {
  const response = await axiosClient.post<EngineerResponse>('/api/Engineers', request);
  return response.data;
}

export async function updateEngineerStatus(
  engineerPublicId: string,
  request: UpdateEngineerStatusRequest,
) {
  await axiosClient.patch(`/api/Engineers/${engineerPublicId}/status`, request);
}

export async function updateEngineer(
  engineerPublicId: string,
  request: import('../types/engineers').UpdateEngineerRequest,
) {
  const response = await axiosClient.patch<EngineerResponse>(`/api/Engineers/${engineerPublicId}`, request);
  return response.data;
}

export async function deleteEngineer(engineerPublicId: string) {
  await axiosClient.delete(`/api/Engineers/${engineerPublicId}`);
}