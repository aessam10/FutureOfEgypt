import { axiosClient } from './axiosClient';
import type { PagedResponse } from '../types/common';
import type { AuditLogResponse } from '../types/auditLogs';

export interface GetAuditLogsParams {
  pageNumber: number;
  pageSize: number;
  search?: string;
}

export async function getAuditLogs(params: GetAuditLogsParams) {
  const response = await axiosClient.get<PagedResponse<AuditLogResponse>>(
    '/api/AuditLogs',
    {
      params,
    },
  );

  return response.data;
}