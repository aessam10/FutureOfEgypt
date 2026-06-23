export interface EngineerResponse {
  publicId: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  status: number;
  createdAt: string;
  profilePhotoUrl?: string;
}

export interface CreateEngineerRequest {
  fullName: string;
  phoneNumber: string;
  email: string;
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