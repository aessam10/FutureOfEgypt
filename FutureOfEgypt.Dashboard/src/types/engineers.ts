export interface EngineerResponse {
  publicId: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  status: number;
  createdAt: string;
  username?: string;
  profilePhotoUrl?: string;
}

export interface CreateEngineerRequest {
  fullName: string;
  phoneNumber: string;
  email: string;
  username: string;
  status: number;
}

export interface UpdateEngineerStatusRequest {
  status: number;
}

export interface UpdateEngineerRequest {
  fullName: string;
  phoneNumber: string;
  email: string;
}

export interface RegisterEngineerCompleteRequest {
  fullName: string;
  phoneNumber: string;
  email: string;
  username: string;
  password?: string;
  status: number;
}