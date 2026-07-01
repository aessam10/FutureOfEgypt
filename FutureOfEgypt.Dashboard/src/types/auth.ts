export interface LoginRequest {
  username: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthUser {
  userId: string;
  email: string;
  fullName: string;
  roles: string[];
  engineerPublicId?: string | null;
  profilePhotoUrl?: string | null;
  avatarRefreshKey?: number;
}

export interface AuthResponse {
  userId: string;
  engineerPublicId?: string | null;
  profilePhotoUrl?: string | null;
  fullName: string;
  email: string;
  roles: string[];
  token: string;
  expiresAtUtc: string;
  refreshToken: string;
  refreshTokenExpiresAtUtc: string;
}