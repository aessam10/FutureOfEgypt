export interface EngineerResponse {
  publicId: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  status: number;
  createdAt: string;
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