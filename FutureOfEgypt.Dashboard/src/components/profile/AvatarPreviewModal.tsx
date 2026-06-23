import { Box, Dialog, IconButton, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useState, useEffect } from 'react';
import { axiosClient } from '../../api/axiosClient';

interface AvatarPreviewModalProps {
  open: boolean;
  onClose: () => void;
  imageUrl?: string | null;
  altText: string;
  fallbackText?: string;
}

export function AvatarPreviewModal({ open, onClose, imageUrl, altText, fallbackText }: AvatarPreviewModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let isMounted = true;

    const fetchImage = async () => {
      if (!imageUrl || !open) {
        setBlobUrl(null);
        return;
      }
      try {
        const response = await axiosClient.get(imageUrl, { responseType: 'blob' });
        const blob = response.data;
        if (isMounted) {
          objectUrl = URL.createObjectURL(blob);
          setBlobUrl(objectUrl);
        }
      } catch (error) {
        console.error('Failed to load avatar preview:', error);
      }
    };

    void fetchImage();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [imageUrl, open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      sx={{
        '& .MuiDialog-paper': {
          backgroundColor: 'transparent',
          boxShadow: 'none',
          overflow: 'visible',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          outline: 'none',
        },
      }}
    >
      <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Tooltip title="Close Preview">
          <IconButton
            onClick={onClose}
            sx={{
              position: 'absolute',
              top: -20,
              right: -20,
              backgroundColor: 'rgba(0,0,0,0.6)',
              color: 'white',
              zIndex: 10,
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.8)',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Tooltip>
        
        {blobUrl ? (
          <img
            src={blobUrl}
            alt={altText}
            style={{
              maxWidth: '90vw',
              maxHeight: '80vh',
              objectFit: 'contain', // Preserve full image
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderRadius: '8px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          />
        ) : (
          <Box
            sx={{
              width: 300,
              height: 300,
              borderRadius: '8px',
              backgroundColor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            <Typography variant="h1" sx={{ color: 'white', fontSize: '6rem' }}>
              {fallbackText || altText.charAt(0).toUpperCase()}
            </Typography>
          </Box>
        )}
        
        <Box
          sx={{
            mt: 2,
            px: 3,
            py: 1,
            backgroundColor: 'rgba(0,0,0,0.7)',
            borderRadius: '20px',
            backdropFilter: 'blur(4px)',
          }}
        >
          <Typography sx={{ color: 'white', fontWeight: 600, fontSize: '1.1rem' }}>
            {altText}
          </Typography>
        </Box>
      </Box>
    </Dialog>
  );
}
