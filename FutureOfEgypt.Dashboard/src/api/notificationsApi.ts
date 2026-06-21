import { axiosClient } from './axiosClient';
import type { AppNotification } from '../signalr/notificationHub';

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export async function getNotifications(page: number = 1, pageSize: number = 10): Promise<PaginatedResponse<AppNotification>> {
  const response = await axiosClient.get<PaginatedResponse<AppNotification>>('/api/Notifications', {
    params: { page, pageSize }
  });
  return response.data;
}

export async function getUnreadCount(): Promise<number> {
  const response = await axiosClient.get<number>('/api/Notifications/unread-count');
  return response.data;
}

export async function markAsRead(id: string): Promise<void> {
  await axiosClient.put(`/api/Notifications/${id}/read`);
}

export async function markAllAsRead(): Promise<void> {
  await axiosClient.put('/api/Notifications/read-all');
}
