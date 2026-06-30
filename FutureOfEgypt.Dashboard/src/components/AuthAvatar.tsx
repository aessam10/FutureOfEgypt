import { useEffect, useState } from 'react';
import { Avatar } from '@mui/material';
import { axiosClient } from '../api/axiosClient';

interface AuthAvatarProps {
  url?: string | null;
  name: string;
  className?: string;
  onClick?: (e?: any) => void;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export function AuthAvatar({ url, name, className = '', onClick, size = 'md' }: AuthAvatarProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let isMounted = true;

    async function fetchImage() {
      if (!url) return;
      try {
        const response = await axiosClient.get(url, { responseType: 'blob' });
        if (!isMounted) return;
        
        const blob = response.data;
        objectUrl = URL.createObjectURL(blob);
        setImgSrc(objectUrl);
        setHasError(false);
      } catch (err) {
        if (!isMounted) return;
        setHasError(true);
      }
    }

    fetchImage();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [url]);

  const initials = getInitials(name);

  const sizeStyles = {
    sm: { width: 32, height: 32, fontSize: '0.75rem' },
    md: { width: 40, height: 40, fontSize: '0.875rem' },
    lg: { width: 48, height: 48, fontSize: '1rem' },
    xl: { width: 64, height: 64, fontSize: '1.25rem' },
    '2xl': { width: 128, height: 128, fontSize: '2rem' },
  };

  const style = sizeStyles[size];

  if (!url || hasError || !imgSrc) {
    return (
      <Avatar
        sx={{
          ...style,
          bgcolor: 'rgba(79, 70, 229, 0.1)',
          color: 'rgb(79, 70, 229)',
          fontWeight: 600,
          cursor: 'pointer',
        }}
        className={className}
        onClick={onClick}
        title={name}
      >
        {initials}
      </Avatar>
    );
  }

  return (
    <Avatar
      sx={{
        ...style,
        bgcolor: '#f1f5f9',
        cursor: 'pointer',
      }}
      className={className}
      onClick={onClick}
      title={name}
    >
      <img
        src={imgSrc}
        alt={name}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </Avatar>
  );
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
