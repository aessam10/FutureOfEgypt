import { useState, useEffect } from 'react';
import { Box, Button, CircularProgress, Container, Paper, TextField, Typography, Alert } from '@mui/material';
import { resetPassword } from '../api/authApi';
import { Link, useSearchParams } from 'react-router-dom';
import { routes } from '../app/routes';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const qUsername = searchParams.get('username');
    const qToken = searchParams.get('token');
    if (qUsername) setUsername(qUsername);
    if (qToken) setToken(qToken);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!username || !token) {
      setError('Invalid reset link. Missing username or token.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await resetPassword({ username, token, newPassword });
      setSuccess(result.message || 'Password has been reset successfully.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Password reset failed.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={4} sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }} gutterBottom>
          Set New Password
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

        {!success && (
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="New Password"
              type="password"
              variant="outlined"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              sx={{ mb: 3 }}
            />
            <TextField
              fullWidth
              label="Confirm New Password"
              type="password"
              variant="outlined"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              sx={{ mb: 3 }}
            />
            <Button
              fullWidth
              variant="contained"
              size="large"
              type="submit"
              disabled={isLoading}
              sx={{ py: 1.5, fontWeight: 'bold' }}
            >
              {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Reset Password'}
            </Button>
          </Box>
        )}

        <Box sx={{ mt: 4 }}>
          <Button component={Link} to={routes.login} variant="text">
            Back to Login
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
