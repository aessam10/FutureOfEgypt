export interface LoginRequest {
  email: string;
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
}

export interface AuthResponse {
  userId: string;
  engineerPublicId?: string | null;
  fullName: string;
  email: string;
  roles: string[];
  token: string;
  expiresAtUtc: string;
  refreshToken: string;
  refreshTokenExpiresAtUtc: string;
}