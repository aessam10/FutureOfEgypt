import { useState } from 'react';
import { Box, Button, CircularProgress, Container, Paper, TextField, Typography, Alert } from '@mui/material';
import { forgotPassword } from '../api/authApi';
import { Link } from 'react-router-dom';
import { routes } from '../app/routes';

export function ForgotPasswordPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !email.trim()) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await forgotPassword(username.trim(), email.trim());
      setSuccess(result.message || 'If this account exists, a password reset link has been sent.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'An error occurred while sending the request.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={4} sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }} gutterBottom>
          Forgot Password
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Enter your email address and we'll send you a link to reset your password.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

        {!success && (
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Username"
              type="text"
              variant="outlined"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              sx={{ mb: 3 }}
            />
            <TextField
              fullWidth
              label="Registered Email"
              type="email"
              variant="outlined"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Send Reset Link'}
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
