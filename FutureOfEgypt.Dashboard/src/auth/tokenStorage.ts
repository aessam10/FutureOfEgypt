import type { AuthUser } from '../types/auth';

const ACCESS_TOKEN_KEY = 'futureofegypt_access_token';
const REFRESH_TOKEN_KEY = 'futureofegypt_refresh_token';
const USER_KEY = 'futureofegypt_user';

export function saveAccessToken(token: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function saveRefreshToken(token: string) {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function saveUser(user: AuthUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getSavedUser() {
  const value = localStorage.getItem(USER_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as AuthUser;
  } catch {
    return null;
  }
}

export function saveAuthData(accessToken: string, refreshToken: string, user: AuthUser) {
  saveAccessToken(accessToken);
  saveRefreshToken(refreshToken);
  saveUser(user);
}

export function clearAuthStorage() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}