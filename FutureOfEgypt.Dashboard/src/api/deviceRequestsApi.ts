import { axiosClient } from './axiosClient';
import type { PagedResponse } from '../types/common';
import type {
  ApproveDeviceAccessRequest,
  DeviceAccessRequestResponse,
  RejectDeviceAccessRequest,
} from '../types/deviceRequests';

export interface GetDeviceRequestsParams {
  pageNumber: number;
  pageSize: number;
  search?: string;
}

export async function getDeviceRequests(params: GetDeviceRequestsParams) {
  const response = await axiosClient.get<PagedResponse<DeviceAccessRequestResponse>>(
    '/api/DeviceAccessRequests',
    {
      params,
    },
  );

  return response.data;
}

export async function getPendingDeviceRequests(params: GetDeviceRequestsParams) {
  const response = await axiosClient.get<PagedResponse<DeviceAccessRequestResponse>>(
    '/api/DeviceAccessRequests/pending',
    {
      params,
    },
  );

  return response.data;
}

export async function approveDeviceRequest(
  requestPublicId: string,
  request: ApproveDeviceAccessRequest,
) {
  await axiosClient.post(`/api/DeviceAccessRequests/${requestPublicId}/approve`, request);
}

export async function rejectDeviceRequest(
  requestPublicId: string,
  request: RejectDeviceAccessRequest,
) {
  await axiosClient.post(`/api/DeviceAccessRequests/${requestPublicId}/reject`, request);
}