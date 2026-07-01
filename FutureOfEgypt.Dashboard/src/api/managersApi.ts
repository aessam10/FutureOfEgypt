import { axiosClient } from './axiosClient';

export interface ManagerResponse {
  id: string;
  fullName: string;
  email: string;
  username?: string;
  phoneNumber?: string;
  role: string;
  profilePhotoUrl?: string;
  isSuspended: boolean;
}

export interface PagedManagersResponse {
  items: ManagerResponse[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface UpdateManagerRequest {
  fullName: string;
  email: string;
  phoneNumber?: string;
}

export async function getManagers(pageNumber = 1, pageSize = 10, search?: string) {
  const { data } = await axiosClient.get<PagedManagersResponse>('/api/Managers', {
    params: { pageNumber, pageSize, search },
  });
  return data;
}

export async function updateManager(id: string, request: UpdateManagerRequest) {
  const { data } = await axiosClient.patch<ManagerResponse>(`/api/Managers/${id}`, request);
  return data;
}

export async function suspendManager(id: string) {
  const { data } = await axiosClient.post<ManagerResponse>(`/api/Managers/${id}/suspend`);
  return data;
}

export async function activateManager(id: string) {
  const { data } = await axiosClient.post<ManagerResponse>(`/api/Managers/${id}/activate`);
  return data;
}

export async function deleteManager(id: string) {
  await axiosClient.delete(`/api/Managers/${id}`);
}
