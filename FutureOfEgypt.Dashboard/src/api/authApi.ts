import { axiosClient } from './axiosClient';
import type { AuthResponse, LoginRequest, RefreshTokenRequest } from '../types/auth';

export async function login(request: LoginRequest) {
  const response = await axiosClient.post<AuthResponse>('/api/Auth/login', request);
  return response.data;
}

export async function refreshToken(request: RefreshTokenRequest) {
  const response = await axiosClient.post<AuthResponse>('/api/Auth/refresh', request);
  return response.data;
}

export async function logout(refreshToken: string) {
  await axiosClient.post('/api/Auth/logout', {
    refreshToken,
  });
}

export interface RegisterManagerRequest {
  fullName: string;
  email: string;
  password?: string;
}

export async function registerManager(request: RegisterManagerRequest) {
  const response = await axiosClient.post('/api/Auth/register-manager', request);
  return response.data;
}