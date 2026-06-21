import { Alert, Box, Button, Typography } from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = 'Something went wrong. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: 8,
        px: 3,
        gap: 2,
      }}
      role="alert"
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          backgroundColor: 'rgba(239,68,68,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-hidden="true"
      >
        <ErrorIcon sx={{ fontSize: '2rem', color: 'error.main' }} />
      </Box>

      <Typography
        variant="h6"
        sx={{ fontWeight: 700, color: 'text.primary', fontSize: '1rem' }}
      >
        Failed to Load
      </Typography>

      <Alert
        severity="error"
        sx={{
          maxWidth: 420,
          width: '100%',
          fontSize: '0.875rem',
        }}
      >
        {message}
      </Alert>

      {onRetry && (
        <Button
          variant="outlined"
          color="primary"
          startIcon={<RefreshIcon />}
          onClick={onRetry}
          aria-label="Retry loading"
          sx={{ mt: 1 }}
        >
          Try Again
        </Button>
      )}
    </Box>
  );
}