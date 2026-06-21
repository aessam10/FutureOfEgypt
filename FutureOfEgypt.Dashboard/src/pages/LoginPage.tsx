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
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useAuth } from '../auth/AuthContext';
import { useThemeMode } from '../app/ThemeContext';
import { routes } from '../app/routes';
import { BRAND_GOLD } from '../app/theme';

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
    } catch (err) {
      if (err instanceof Error && err.message === 'DASHBOARD_ACCESS_DENIED') {
        setError('هذه اللوحة للمديرين والمشرفين فقط. يرجى استخدام تطبيق الجوال.');
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
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: isDark ? '#0d1117' : '#0f1923',
      }}
    >
      {/* Theme toggle - top right */}
      <Box sx={{ position: 'absolute', top: 16, right: 20, zIndex: 10 }}>
        <Tooltip title={isDark ? 'Light Mode' : 'Dark Mode'}>
          <IconButton
            onClick={toggleMode}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            sx={{
              color: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff' },
            }}
          >
            {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Left panel — branding */}
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          width: '45%',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          p: 6,
          background: `
            radial-gradient(ellipse at 30% 50%, rgba(201,168,76,0.08) 0%, transparent 60%),
            radial-gradient(ellipse at 70% 20%, rgba(15,118,110,0.12) 0%, transparent 50%),
            #0f1923
          `,
          '&::after': {
            content: '""',
            position: 'absolute',
            right: 0,
            top: '10%',
            height: '80%',
            width: '1px',
            background: 'linear-gradient(to bottom, transparent, rgba(201,168,76,0.3), transparent)',
          },
        }}
      >
        <Box
          component="img"
          src="/logo.png"
          alt="جهاز مستقبل مصر للتنمية المستدامة"
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.style.display = 'none';
          }}
          sx={{ width: 140, height: 140, objectFit: 'contain', mb: 4 }}
        />

        <Typography
          variant="h4"
          sx={{
            color: BRAND_GOLD,
            fontWeight: 800,
            textAlign: 'center',
            mb: 1.5,
            letterSpacing: '-0.02em',
          }}
        >
          جهاز مستقبل مصر
        </Typography>
        <Typography
          sx={{
            color: 'rgba(255,255,255,0.6)',
            textAlign: 'center',
            fontSize: '1rem',
            fontWeight: 400,
            mb: 5,
          }}
        >
          للتنمية المستدامة
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 320, width: '100%' }}>
          {[
            { icon: '📍', text: 'تتبع مواقع المهندسين في الوقت الفعلي' },
            { icon: '📱', text: 'إدارة الأجهزة والتكليفات' },
            { icon: '💬', text: 'محادثات مباشرة وجماعية' },
            { icon: '🔒', text: 'سجل كامل لجميع الأحداث' },
          ].map((item) => (
            <Box
              key={item.text}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.5,
                borderRadius: '10px',
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <Typography sx={{ fontSize: '1.2rem' }}>{item.icon}</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
                {item.text}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Right panel — login form */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
          backgroundColor: isDark ? '#0d1117' : '#f0f4f8',
        }}
      >
        <Paper
          component="form"
          onSubmit={handleSubmit}
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 420,
            p: 4,
            borderRadius: '16px',
            border: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            backgroundColor: isDark ? '#161b22' : '#ffffff',
          }}
        >
          {/* Logo visible on mobile */}
          <Box sx={{ display: { xs: 'flex', lg: 'none' }, justifyContent: 'center', mb: 3 }}>
            <Box
              component="img"
              src="/logo.png"
              alt="جهاز مستقبل مصر"
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                e.currentTarget.style.display = 'none';
              }}
              sx={{ width: 64, height: 64, objectFit: 'contain' }}
            />
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5, color: 'text.primary' }}>
            تسجيل الدخول
          </Typography>
          <Typography sx={{ color: 'text.secondary', mb: 3, fontSize: '0.9rem' }}>
            مرحباً بك في لوحة تحكم جهاز مستقبل مصر
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2.5 }} role="alert">
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            id="login-email"
            label="البريد الإلكتروني"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
            required
            slotProps={{ htmlInput: { 'aria-label': 'Email address', 'aria-required': 'true' } }}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            id="login-password"
            label="كلمة المرور"
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
            sx={{ mb: 3 }}
          />

          <Button
            fullWidth
            variant="contained"
            size="large"
            type="submit"
            disabled={isLoading || !email || !password}
            aria-label={isLoading ? 'Signing in...' : 'Sign in'}
            sx={{
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 700,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0f766e 0%, #0d6360 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)',
                boxShadow: '0 8px 24px rgba(15,118,110,0.4)',
              },
            }}
          >
            {isLoading ? <CircularProgress size={22} color="inherit" /> : 'دخول'}
          </Button>

          <Typography
            variant="caption"
            sx={{ display: 'block', textAlign: 'center', mt: 3, color: 'text.secondary' }}
          >
            لوحة التحكم مخصصة للمديرين والمشرفين فقط
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}