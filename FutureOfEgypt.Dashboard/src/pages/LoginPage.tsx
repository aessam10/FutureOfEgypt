import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Tooltip,
  Typography,
  keyframes,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useAuth } from '../auth/AuthContext';
import { useThemeMode } from '../app/ThemeContext';
import { routes } from '../app/routes';

// Deluxe Background animation
const slowPan = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const pulseGlow = keyframes`
  0% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
  100% { opacity: 0.4; transform: scale(1); }
`;

const goldPulse = keyframes`
  0% { filter: brightness(1) drop-shadow(0 0 0px rgba(212,175,55,0)); }
  50% { filter: brightness(1.3) drop-shadow(0 0 15px rgba(212,175,55,0.6)); }
  100% { filter: brightness(1) drop-shadow(0 0 0px rgba(212,175,55,0)); }
`;

const borderPulse = keyframes`
  0% { opacity: 0.4; filter: brightness(1) drop-shadow(0 0 0px rgba(212,175,55,0)); }
  50% { opacity: 1; filter: brightness(1.6) drop-shadow(0 0 12px rgba(255,215,0,0.8)); }
  100% { opacity: 0.4; filter: brightness(1) drop-shadow(0 0 0px rgba(212,175,55,0)); }
`;

const inputPulse = keyframes`
  0% { box-shadow: 0 0 4px rgba(212,175,55,0.2); }
  50% { box-shadow: 0 0 20px rgba(212,175,55,0.5); }
  100% { box-shadow: 0 0 4px rgba(212,175,55,0.2); }
`;

const fieldsetPulse = keyframes`
  0% { border-color: rgba(212,175,55,0.5); }
  50% { border-color: rgba(212,175,55,1); }
  100% { border-color: rgba(212,175,55,0.5); }
`;

const labelPulse = keyframes`
  0% { color: rgba(212,175,55,0.8); text-shadow: 0 0 0px rgba(212,175,55,0); }
  50% { color: rgba(212,175,55,1); text-shadow: 0 0 8px rgba(212,175,55,0.5); }
  100% { color: rgba(212,175,55,0.8); text-shadow: 0 0 0px rgba(212,175,55,0); }
`;

// Card entrance animation
const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const { toggleMode, isDark } = useThemeMode();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      await login({ email, password });
      navigate(routes.dashboard, { replace: true });
    } catch (err: any) {
      if (err instanceof Error && err.message === 'DASHBOARD_ACCESS_DENIED') {
        setError('هذه اللوحة للمديرين والمشرفين فقط. يرجى استخدام تطبيق الجوال.');
      } else if (err?.code === 'ERR_NETWORK' || err?.message === 'Network Error') {
        setError('Error: Disconnected from the Auth Server. Maintenance in progress.');
      } else {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
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
        position: 'relative',
        overflow: 'hidden',
        p: 2,
        background: isDark
          ? 'linear-gradient(-45deg, #0a0804, #120e06, #1c150b, #0f0c05)'
          : 'linear-gradient(-45deg, #fdfbf7, #f6f0e3, #e8dcc4, #f8f5ee)',
        backgroundSize: '400% 400%',
        animation: `${slowPan} 20s ease infinite`,
      }}
    >
      {/* Background Watermark Logo */}
      <Box
        sx={{
          display: isDark ? 'flex' : 'none',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.04,
          pointerEvents: 'none',
          zIndex: 0,
          width: '90vw',
          maxWidth: '900px',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <img
          src="/logo.png"
          alt=""
          style={{
            width: '100%',
            height: 'auto',
            mixBlendMode: isDark ? 'screen' : 'multiply',
            filter: isDark ? 'none' : 'invert(1) grayscale(100%) opacity(0.6)'
          }}
        />
      </Box>

      {/* Decorative ambient glowing orbs */}
      <Box
        sx={{
          display: isDark ? 'block' : 'none',
          position: 'absolute',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 60%)',
          top: '-15%',
          left: '-10%',
          zIndex: 1,
          animation: `${pulseGlow} 8s ease-in-out infinite`,
        }}
      />
      <Box
        sx={{
          display: isDark ? 'block' : 'none',
          position: 'absolute',
          width: '700px',
          height: '700px',
          background: 'radial-gradient(circle, rgba(184,134,11,0.06) 0%, transparent 60%)',
          bottom: '-25%',
          right: '-15%',
          zIndex: 1,
          animation: `${pulseGlow} 12s ease-in-out infinite reverse`,
        }}
      />

      {/* Theme toggle */}
      <Box sx={{ position: 'absolute', top: 32, right: 32, zIndex: 10 }}>
        <Tooltip title={isDark ? 'Light Mode' : 'Dark Mode'}>
          <IconButton
            onClick={toggleMode}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            sx={{
              color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)',
              backdropFilter: 'blur(12px)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
              borderRadius: '14px',
              p: 1.5,
              '&:hover': {
                backgroundColor: isDark ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255,255,255,0.9)',
                color: isDark ? '#00F0FF' : '#2563EB',
                boxShadow: isDark ? '0 0 15px rgba(0,240,255,0.3)' : '0 4px 12px rgba(0,0,0,0.1)',
                transform: 'scale(1.05)'
              },
            }}
          >
            {isDark ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Center login card — Deluxe Glassmorphism */}
      <Paper
        component="form"
        onSubmit={handleSubmit}
        elevation={0}
        sx={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: 460,
          p: { xs: 4, sm: 6 },
          borderRadius: '28px',
          // Core Deluxe Glass styles
          backgroundColor: isDark ? 'rgba(15, 12, 8, 0.5)' : 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          border: `1px solid ${isDark ? 'rgba(212, 175, 55, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          boxShadow: isDark
            ? '0 30px 60px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(212, 175, 55, 0.08)'
            : '0 20px 40px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
          animation: `${fadeInUp} 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards`,
          '&::before': isDark ? {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '10%',
            right: '10%',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(212,175,55,1), transparent)',
            animation: `${borderPulse} 6s ease-in-out infinite`,
          } : {},
        }}
      >
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 800,
              mb: 1.5,
              letterSpacing: '-0.02em',
              background: isDark
                ? 'linear-gradient(to right, #F5D061, #D4AF37)'
                : undefined,
              WebkitBackgroundClip: isDark ? 'text' : undefined,
              WebkitTextFillColor: isDark ? 'transparent' : 'inherit',
              animation: isDark ? `${goldPulse} 6s ease-in-out infinite` : 'none',
            }}
          >
            Welcome Back
          </Typography>
          <Typography
            variant="h5"
            component="h1"
            sx={{
              fontWeight: 900,
              mb: 1.5,
              letterSpacing: '-0.02em',
              background: isDark
                ? 'linear-gradient(to right, #F5D061, #D4AF37)'
                : undefined,
              WebkitBackgroundClip: isDark ? 'text' : undefined,
              WebkitTextFillColor: isDark ? 'transparent' : 'inherit',
              animation: isDark ? `${goldPulse} 6s ease-in-out infinite` : 'none',
            }}
          >
            Eng: Ahmed S. El-Mansy
          </Typography>
        </Box>

        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 4,
              borderRadius: '12px',
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
              border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'}`,
              color: isDark ? '#fca5a5' : '#b91c1c'
            }}
            role="alert"
          >
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            fullWidth
            id="login-email"
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
            required
            slotProps={{ htmlInput: { 'aria-label': 'Email address', 'aria-required': 'true' } }}
            sx={{
              '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus, & input:-webkit-autofill:active, & input:-internal-autofill-previewed, & input:-internal-autofill-selected': {
                transition: 'background-color 5000s ease-in-out 0s !important',
                WebkitTextFillColor: isDark ? '#fff !important' : undefined,
              },
              '& label': {
                color: isDark ? 'rgba(212,175,55,0.8)' : undefined,
                animation: isDark ? `${labelPulse} 6s ease-in-out infinite` : 'none',
              },
              '& label.Mui-focused': {
                color: isDark ? '#D4AF37 !important' : undefined,
                textShadow: isDark ? '0 0 10px rgba(212,175,55,0.8) !important' : undefined,
              },
              '& .MuiOutlinedInput-root': {
                backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.6)',
                backdropFilter: 'blur(10px)',
                animation: isDark ? `${inputPulse} 6s ease-in-out infinite` : 'none',
                '&.Mui-focused': {
                  boxShadow: isDark ? '0 0 25px rgba(212,175,55,0.6) !important' : undefined,
                },
                '& fieldset': {
                  borderColor: isDark ? 'rgba(212,175,55,0.5)' : undefined,
                  animation: isDark ? `${fieldsetPulse} 6s ease-in-out infinite` : 'none',
                },
                '&:hover fieldset': {
                  borderColor: isDark ? 'rgba(212,175,55,0.7) !important' : undefined,
                },
                '&.Mui-focused fieldset': {
                  borderColor: isDark ? '#D4AF37 !important' : undefined,
                },
              }
            }}
          />

          <TextField
            fullWidth
            id="login-password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            slotProps={{
              htmlInput: { 'aria-label': 'Password', 'aria-required': 'true' },
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? (
                        <VisibilityOffIcon fontSize="small" />
                      ) : (
                        <VisibilityIcon fontSize="small" />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus, & input:-webkit-autofill:active, & input:-internal-autofill-previewed, & input:-internal-autofill-selected': {
                transition: 'background-color 5000s ease-in-out 0s !important',
                WebkitTextFillColor: isDark ? '#fff !important' : undefined,
              },
              '& label': {
                color: isDark ? 'rgba(212,175,55,0.8)' : undefined,
                animation: isDark ? `${labelPulse} 6s ease-in-out infinite` : 'none',
              },
              '& label.Mui-focused': {
                color: isDark ? '#D4AF37 !important' : undefined,
                textShadow: isDark ? '0 0 10px rgba(212,175,55,0.8) !important' : undefined,
              },
              '& .MuiOutlinedInput-root': {
                backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.6)',
                backdropFilter: 'blur(10px)',
                animation: isDark ? `${inputPulse} 6s ease-in-out infinite` : 'none',
                '&.Mui-focused': {
                  boxShadow: isDark ? '0 0 25px rgba(212,175,55,0.6) !important' : undefined,
                },
                '& fieldset': {
                  borderColor: isDark ? 'rgba(212,175,55,0.5)' : undefined,
                  animation: isDark ? `${fieldsetPulse} 6s ease-in-out infinite` : 'none',
                },
                '&:hover fieldset': {
                  borderColor: isDark ? 'rgba(212,175,55,0.7) !important' : undefined,
                },
                '&.Mui-focused fieldset': {
                  borderColor: isDark ? '#D4AF37 !important' : undefined,
                },
              }
            }}
          />

          <Button
            fullWidth
            variant="contained"
            size="large"
            type="submit"
            disabled={isLoading || !email || !password}
            aria-label={isLoading ? 'Signing in...' : 'Sign in'}
            sx={{
              mt: 2,
              py: 1.8,
              fontSize: '1.05rem',
              fontWeight: 700,
              borderRadius: '14px',
              backgroundColor: isDark ? '#D4AF37' : undefined,
              color: isDark ? '#000' : undefined,
              animation: isDark ? `${goldPulse} 6s ease-in-out infinite` : 'none',
              '&:hover': {
                backgroundColor: isDark ? '#F5D061' : undefined,
                boxShadow: isDark ? `0 8px 20px rgba(212, 175, 55, 0.3)` : undefined
              },
              '&.Mui-disabled': {
                backgroundColor: isDark ? 'rgba(212,175,55,0.2)' : undefined,
                color: isDark ? 'rgba(255,255,255,0.3)' : undefined
              }
            }}
          >
            {isLoading ? <CircularProgress size={26} color="inherit" /> : 'Sign In'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}