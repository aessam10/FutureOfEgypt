import { axiosClient } from './axiosClient';

export interface ProfileResponse {
    id: string;
    fullName: string;
    email?: string;
    phoneNumber?: string;
    role: string;
    profilePhotoUrl?: string;
}

export interface ProfilePhotoResponse {
    profilePhotoUrl: string;
}

export interface UpdateProfileRequest {
    fullName: string;
    email: string;
    phoneNumber?: string;
}

export const profileApi = {
    getMyProfile: async (): Promise<ProfileResponse> => {
        const response = await axiosClient.get<ProfileResponse>('/api/profile/me');
        return response.data;
    },
    updateProfile: async (request: UpdateProfileRequest): Promise<ProfileResponse> => {
        const response = await axiosClient.patch<ProfileResponse>('/api/profile/me', request);
        return response.data;
    },
    uploadProfilePhoto: async (file: File): Promise<ProfilePhotoResponse> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axiosClient.post<ProfilePhotoResponse>('/api/profile/me/photo', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },
    removeProfilePhoto: async (): Promise<void> => {
        await axiosClient.delete('/api/profile/me/photo');
    }
};
