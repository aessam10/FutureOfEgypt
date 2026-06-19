import { Box, Button, Paper, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { routes } from '../app/routes';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 420 }}>
        <Typography variant="h4" gutterBottom>
          404
        </Typography>

        <Typography variant="h6" gutterBottom>
          Page not found
        </Typography>

        <Typography color="text.secondary" sx={{ mb: 3 }}>
          The page you are looking for does not exist.
        </Typography>

        <Button variant="contained" onClick={() => navigate(routes.dashboard)}>
          Back to Dashboard
        </Button>
      </Paper>
    </Box>
  );
}