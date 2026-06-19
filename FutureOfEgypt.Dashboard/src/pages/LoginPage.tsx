import { routes } from '../app/routes';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('abdallahessam118@gmail.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(routes.dashboard, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setIsLoading(true);

    try {
      await login({
        email,
        password,
      });

      navigate(routes.dashboard, { replace: true });
} catch (error) {
  if (error instanceof Error && error.message === 'ADMIN_ONLY') {
    setError('This dashboard is for admins only. Please use the mobile app.');
  } else {
    setError('Invalid email or password.');
  }
} finally {
      setIsLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        background: 'linear-gradient(135deg, #0f766e 0%, #2563eb 100%)',
      }}
    >
      <Paper component="form" onSubmit={handleSubmit} sx={{ width: '100%', maxWidth: 420, p: 4 }}>
        <Typography variant="h5" gutterBottom>
          FutureOfEgypt Dashboard
        </Typography>

        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Sign in to continue
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          label="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          sx={{ mb: 2 }}
          autoComplete="email"
        />

        <TextField
          fullWidth
          label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          sx={{ mb: 3 }}
          autoComplete="current-password"
        />

        <Button fullWidth variant="contained" size="large" type="submit" disabled={isLoading}>
          {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
        </Button>
      </Paper>
    </Box>
  );
}