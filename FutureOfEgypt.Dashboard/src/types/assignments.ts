export interface EngineerDeviceAssignmentResponse {
  publicId: string;
  engineerPublicId: string;
  engineerName: string;
  devicePublicId: string;
  deviceName: string;
  assignedAtUtc: string;
  unassignedAtUtc?: string | null;
  isActive: boolean;
}

export interface AssignDeviceRequest {
  engineerPublicId: string;
  devicePublicId: string;
}