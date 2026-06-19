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