import { Box, CircularProgress, Skeleton, Typography } from '@mui/material';

interface LoadingStateProps {
  message?: string;
  /** Use 'table' to show skeleton rows instead of a spinner */
  variant?: 'spinner' | 'table' | 'cards';
  rows?: number;
}

export function LoadingState({
  message = 'Loading...',
  variant = 'spinner',
  rows = 5,
}: LoadingStateProps) {
  if (variant === 'table') {
    return (
      <Box sx={{ p: 2 }} role="status" aria-label="Loading data...">
        {Array.from({ length: rows }).map((_, i) => (
          <Box
            key={i}
            sx={{
              display: 'flex',
              gap: 2,
              py: 1.5,
              px: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
              '&:last-child': { borderBottom: 'none' },
            }}
          >
            <Skeleton variant="circular" width={32} height={32} sx={{ flexShrink: 0, my: 'auto' }} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" height={18} width="40%" sx={{ mb: 0.5 }} />
              <Skeleton variant="text" height={14} width="25%" />
            </Box>
            <Skeleton variant="text" height={18} width="15%" sx={{ my: 'auto' }} />
            <Skeleton variant="rounded" height={26} width={70} sx={{ borderRadius: '6px', my: 'auto' }} />
          </Box>
        ))}
      </Box>
    );
  }

  if (variant === 'cards') {
    return (
      <Box 
        sx={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 2.5,
          mt: 2,
        }} 
        role="status" 
        aria-label="Loading cards..."
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <Box
            key={i}
            sx={{
              p: 3,
              borderRadius: 2,
              backgroundColor: 'background.paper',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 2,
              height: 110,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
            }}
          >
            <Skeleton variant="rounded" width={48} height={48} sx={{ borderRadius: '12px' }} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" height={16} width="60%" sx={{ mb: 1 }} />
              <Skeleton variant="text" height={32} width="40%" sx={{ mb: 1 }} />
              <Skeleton variant="text" height={14} width="80%" />
            </Box>
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        gap: 2,
      }}
      role="status"
      aria-label={message}
    >
      <CircularProgress size={40} thickness={4} color="primary" />
      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
        {message}
      </Typography>
    </Box>
  );
}