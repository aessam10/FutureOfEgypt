import { useEffect, useState } from 'react';
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

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
    '2xl': 'w-32 h-32 text-2xl',
  };

  const containerClass = `relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 ${sizeClasses[size]} ${className}`;

  if (!url || hasError || !imgSrc) {
    return (
      <div 
        className={`${containerClass} bg-indigo-100 text-indigo-600 font-semibold cursor-pointer`}
        onClick={onClick}
        title={name}
      >
        {initials}
      </div>
    );
  }

  return (
    <div 
      className={`${containerClass} cursor-pointer bg-gray-100`}
      onClick={onClick}
      title={name}
    >
      <img src={imgSrc} alt={name} className="w-full h-full object-cover" />
    </div>
  );
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
