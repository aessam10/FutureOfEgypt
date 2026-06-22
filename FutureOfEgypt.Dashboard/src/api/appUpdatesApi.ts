import { axiosClient } from './axiosClient';
import type { 
    AppReleaseResponse, 
    CreateAppReleaseRequest, 
    DeviceAppStatusResponse 
} from '../types/appUpdates';

export const getAppReleases = async (): Promise<AppReleaseResponse[]> => {
    const response = await axiosClient.get('/api/app-updates/admin/releases');
    return response.data;
};

export const createAppRelease = async (request: CreateAppReleaseRequest): Promise<AppReleaseResponse> => {
    const response = await axiosClient.post('/api/app-updates/admin/releases', request);
    return response.data;
};

export const uploadReleaseApk = async (publicId: string, file: File): Promise<AppReleaseResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosClient.post(`/api/app-updates/admin/releases/${publicId}/apk`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const activateRelease = async (publicId: string): Promise<AppReleaseResponse> => {
    const response = await axiosClient.put(`/api/app-updates/admin/releases/${publicId}/activate`);
    return response.data;
};

export const getDeviceAppStatuses = async (): Promise<DeviceAppStatusResponse[]> => {
    const response = await axiosClient.get('/api/app-updates/admin/device-statuses');
    return response.data;
};
