import React, { useState, useEffect } from 'react';
import { Avatar } from '@mui/material';
import type { AvatarProps } from '@mui/material';
import { axiosClient } from '../../api/axiosClient';

interface AuthorizedAvatarProps extends AvatarProps {
  srcUrl?: string | null;
  fallbackText?: string;
  refreshKey?: number | string;
}

export const AuthorizedAvatar: React.FC<AuthorizedAvatarProps> = ({ srcUrl, fallbackText, refreshKey, ...props }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let isMounted = true;

    const fetchImage = async () => {
      if (!srcUrl) {
        setBlobUrl(null);
        return;
      }
      try {
        const response = await axiosClient.get(srcUrl, { responseType: 'blob' });
        const blob = response.data;
        if (isMounted) {
          objectUrl = URL.createObjectURL(blob);
          setBlobUrl(objectUrl);
        }
      } catch (error) {
        console.error('Failed to load avatar:', error);
      }
    };

    void fetchImage();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [srcUrl, refreshKey]);

  return (
    <Avatar {...props}>
      {blobUrl ? (
        <img 
          src={blobUrl} 
          alt={fallbackText || "Avatar"} 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
      ) : (
        fallbackText
      )}
    </Avatar>
  );
};
