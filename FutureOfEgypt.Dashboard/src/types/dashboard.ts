export interface DashboardSummaryResponse {
  totalEngineers: number;
  activeEngineers: number;
  totalDevices: number;
  activeDevices: number;
  activeAssignments: number;
  pendingDeviceAccessRequests: number;
  onlineEngineers: number;
  offlineEngineers: number;
}