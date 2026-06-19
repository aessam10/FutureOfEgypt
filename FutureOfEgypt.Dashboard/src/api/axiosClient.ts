import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { refreshToken as refreshTokenApi } from './authApi';
import {
  clearAuthStorage,
  getAccessToken,
  getRefreshToken,
  saveAuthData,
} from '../auth/tokenStorage';

const baseURL = import.meta.env.VITE_API_BASE_URL as string | undefined;

if (!baseURL) {
  throw new Error('VITE_API_BASE_URL is missing.');
}
export const axiosClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let isRefreshing = false;
let pendingRequests: Array<(token: string | null) => void> = [];

function notifyPendingRequests(token: string | null) {
  pendingRequests.forEach((callback) => callback(token));
  pendingRequests = [];
}

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const storedRefreshToken = getRefreshToken();

    if (!storedRefreshToken) {
      clearAuthStorage();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push((newAccessToken) => {
          if (!newAccessToken) {
            reject(error);
            return;
          }

          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          resolve(axiosClient(originalRequest));
        });
      });
    }

    isRefreshing = true;

    try {
      const response = await refreshTokenApi({
        refreshToken: storedRefreshToken,
      });

const user = {
  userId: response.userId,
  email: response.email,
  fullName: response.fullName,
  roles: response.roles,
  engineerPublicId: response.engineerPublicId,
};

saveAuthData(response.token, response.refreshToken, user);

notifyPendingRequests(response.token);

originalRequest.headers.Authorization = `Bearer ${response.token}`;

      return axiosClient(originalRequest);
    } catch (refreshError) {
      clearAuthStorage();
      notifyPendingRequests(null);

      window.location.href = '/login';

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);