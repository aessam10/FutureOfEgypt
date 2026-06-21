import { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
  IconButton,
  Avatar,
  Divider,
  AppBar,
  Toolbar,
  Badge,
} from '@mui/material';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useThemeMode } from '../app/ThemeContext';
import { routes } from '../app/routes';
import { BRAND_GOLD, SIDEBAR_BACKGROUND } from '../app/theme';

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import EngineeringIcon from '@mui/icons-material/Engineering';
import DevicesIcon from '@mui/icons-material/Devices';
import AssignmentIcon from '@mui/icons-material/Assignment';
import MapIcon from '@mui/icons-material/Map';
import ChatIcon from '@mui/icons-material/Chat';
import HistoryIcon from '@mui/icons-material/History';
import EmailIcon from '@mui/icons-material/Email';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';

// ─── Constants ───────────────────────────────────────────────────────────────
const DRAWER_WIDTH = 260;

const NAV_ITEMS = [
  { label: 'نظرة عامة', labelEn: 'Overview', path: routes.dashboard, icon: <DashboardIcon fontSize="small" /> },
  { label: 'المهندسون', labelEn: 'Engineers', path: routes.engineers, icon: <EngineeringIcon fontSize="small" /> },
  { label: 'الأجهزة', labelEn: 'Devices', path: routes.devices, icon: <DevicesIcon fontSize="small" /> },
  { label: 'التكليفات', labelEn: 'Assignments', path: routes.assignments, icon: <AssignmentIcon fontSize="small" /> },
  { label: 'طلبات الأجهزة', labelEn: 'Device Requests', path: routes.deviceRequests, icon: <PhoneAndroidIcon fontSize="small" /> },
  { label: 'الخريطة المباشرة', labelEn: 'Live Map', path: routes.liveMap, icon: <MapIcon fontSize="small" /> },
  { label: 'المحادثات', labelEn: 'Chat', path: routes.chat, icon: <ChatIcon fontSize="small" /> },
  { label: 'البريد الإلكتروني', labelEn: 'Emails', path: routes.emails, icon: <EmailIcon fontSize="small" /> },
  { label: 'سجل الأحداث', labelEn: 'Audit Logs', path: routes.auditLogs, icon: <HistoryIcon fontSize="small" /> },
];

// ─── User Avatar ─────────────────────────────────────────────────────────────
function getInitials(fullName?: string, email?: string): string {
  const name = fullName || email || 'A';
  const parts = name.split(/[\s@]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// ─── Component ───────────────────────────────────────────────────────────────
export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { mode, toggleMode, isDark } = useThemeMode();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const currentNavItem = NAV_ITEMS.find((item) => item.path === location.pathname);
  const initials = getInitials(user?.fullName, user?.email);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate(routes.login, { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  }

  const sidebarBg = SIDEBAR_BACKGROUND; // Always dark navy

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <Drawer
        variant="permanent"
        aria-label="Main navigation"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            backgroundColor: sidebarBg,
            borderRight: 'none',
            display: 'flex',
            flexDirection: 'column',
            overflowX: 'hidden',
          },
        }}
      >
        {/* Logo area */}
        <Box
          sx={{
            px: 2.5,
            py: 2.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {/* Logo image — place logo.png in src/assets/ */}
          <Box
            component="img"
            src="/logo.png"
            alt="جهاز مستقبل مصر"
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              e.currentTarget.style.display = 'none';
            }}
            sx={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }}
          />
          <Box>
            <Typography
              sx={{
                color: BRAND_GOLD,
                fontWeight: 700,
                fontSize: '0.85rem',
                lineHeight: 1.2,
                letterSpacing: '0.01em',
              }}
            >
              جهاز مستقبل مصر
            </Typography>
            <Typography
              sx={{
                color: 'rgba(255,255,255,0.45)',
                fontSize: '0.7rem',
                lineHeight: 1.2,
                fontWeight: 400,
              }}
            >
              للتنمية المستدامة
            </Typography>
          </Box>
        </Box>

        {/* Navigation */}
        <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1.5, px: 1.5 }}>
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.25)',
              fontSize: '0.65rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              px: 1,
              mb: 1,
            }}
          >
            القائمة الرئيسية
          </Typography>

          <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path;

              return (
                <Tooltip title={item.labelEn} placement="right" key={item.path}>
                  <ListItemButton
                    selected={isActive}
                    onClick={() => navigate(item.path)}
                    aria-label={item.labelEn}
                    aria-current={isActive ? 'page' : undefined}
                    sx={{
                      position: 'relative',
                      borderRadius: '8px',
                      px: 1.5,
                      py: 1,
                      minHeight: 42,
                      backgroundColor: isActive
                        ? 'rgba(201,168,76,0.12)'
                        : 'transparent',
                      '&:hover': {
                        backgroundColor: isActive
                          ? 'rgba(201,168,76,0.16)'
                          : 'rgba(255,255,255,0.06)',
                      },
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(201,168,76,0.12)',
                      },
                      '&.Mui-selected:hover': {
                        backgroundColor: 'rgba(201,168,76,0.16)',
                      },
                      // Active left border indicator
                      '&::before': isActive ? {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: '20%',
                        height: '60%',
                        width: 3,
                        backgroundColor: BRAND_GOLD,
                        borderRadius: '0 3px 3px 0',
                      } : {},
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 36,
                        color: isActive ? BRAND_GOLD : 'rgba(255,255,255,0.5)',
                        transition: 'color 0.2s ease',
                        '& svg': { fontSize: '1.15rem' },
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.labelEn}
                      slotProps={{
                        primary: {
                          style: {
                            fontSize: '0.875rem',
                            fontWeight: isActive ? 600 : 400,
                            color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                            transition: 'color 0.2s ease',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          },
                        },
                      }}
                    />
                  </ListItemButton>
                </Tooltip>
              );
            })}
          </List>
        </Box>

        {/* User info + logout at bottom */}
        <Box
          sx={{
            borderTop: '1px solid rgba(255,255,255,0.07)',
            p: 1.5,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1,
              borderRadius: '8px',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' },
              transition: 'background-color 0.2s ease',
            }}
          >
            <Avatar
              sx={{
                width: 34,
                height: 34,
                bgcolor: BRAND_GOLD,
                color: '#0f1923',
                fontSize: '0.8rem',
                fontWeight: 700,
                flexShrink: 0,
              }}
              aria-label={`User: ${user?.fullName || user?.email}`}
            >
              {initials}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                noWrap
                sx={{
                  color: '#fff',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  lineHeight: 1.2,
                }}
              >
                {user?.fullName || 'Admin'}
              </Typography>
              <Typography
                noWrap
                sx={{
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '0.7rem',
                }}
              >
                {user?.roles?.[0] || 'Administrator'}
              </Typography>
            </Box>
            <Tooltip title="Logout" placement="right">
              <IconButton
                size="small"
                onClick={() => void handleLogout()}
                disabled={isLoggingOut}
                aria-label="Logout"
                sx={{
                  color: 'rgba(255,255,255,0.4)',
                  '&:hover': { color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)' },
                  transition: 'all 0.2s ease',
                }}
              >
                <LogoutIcon sx={{ fontSize: '1rem' }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Drawer>

      {/* ── Main content area ────────────────────────────────────── */}
      <Box
        component="div"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          backgroundColor: 'background.default',
          transition: 'background-color 0.25s ease',
        }}
      >
        {/* TopBar */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            backgroundColor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
            color: 'text.primary',
            zIndex: (theme) => theme.zIndex.drawer - 1,
          }}
        >
          <Toolbar sx={{ minHeight: '60px !important', gap: 2 }}>
            {/* Page title */}
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1 }}
              >
                {currentNavItem?.labelEn ?? 'Dashboard'}
              </Typography>
              {currentNavItem && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {currentNavItem.label}
                </Typography>
              )}
            </Box>

            {/* Dark mode toggle */}
            <Tooltip title={mode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}>
              <IconButton
                onClick={toggleMode}
                aria-label={mode === 'light' ? 'Enable dark mode' : 'Enable light mode'}
                size="small"
                sx={{
                  color: 'text.secondary',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '8px',
                  width: 36,
                  height: 36,
                }}
              >
                {isDark ? (
                  <LightModeIcon sx={{ fontSize: '1.1rem' }} />
                ) : (
                  <DarkModeIcon sx={{ fontSize: '1.1rem' }} />
                )}
              </IconButton>
            </Tooltip>

            {/* Notifications (UI only) */}
            <Tooltip title="Notifications">
              <IconButton
                size="small"
                aria-label="Notifications"
                sx={{
                  color: 'text.secondary',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '8px',
                  width: 36,
                  height: 36,
                }}
              >
                <Badge badgeContent={0} color="error">
                  <NotificationsNoneIcon sx={{ fontSize: '1.1rem' }} />
                </Badge>
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 24, alignSelf: 'center' }} />

            {/* User avatar */}
            <Avatar
              sx={{
                width: 34,
                height: 34,
                bgcolor: 'primary.main',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'default',
              }}
              aria-label={`Logged in as ${user?.fullName || user?.email}`}
            >
              {initials}
            </Avatar>
          </Toolbar>
        </AppBar>

        {/* Page content */}
        <Box
          component="main"
          id="main-content"
          tabIndex={-1}
          sx={{
            flex: 1,
            p: 3,
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}