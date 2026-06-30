import { axiosClient } from './axiosClient';
import type { PagedResponse } from '../types/common';
import type {
  AssignDeviceRequest,
  EngineerDeviceAssignmentResponse,
} from '../types/assignments';

export interface GetAssignmentsParams {
  pageNumber: number;
  pageSize: number;
  search?: string;
}

export async function getAssignments(params: GetAssignmentsParams) {
  const response = await axiosClient.get<PagedResponse<EngineerDeviceAssignmentResponse>>(
    '/api/EngineerDevices',
    {
      params,
    },
  );

  return response.data;
}

export async function getActiveAssignments(params: GetAssignmentsParams) {
  const response = await axiosClient.get<PagedResponse<EngineerDeviceAssignmentResponse>>(
    '/api/EngineerDevices/active',
    {
      params,
    },
  );

  return response.data;
}

export async function assignDevice(request: AssignDeviceRequest) {
  const response = await axiosClient.post<EngineerDeviceAssignmentResponse>(
    '/api/EngineerDevices/assign',
    request,
  );

  return response.data;
}

export async function unassignDevice(assignmentPublicId: string) {
  await axiosClient.post(`/api/EngineerDevices/${assignmentPublicId}/unassign`);
}