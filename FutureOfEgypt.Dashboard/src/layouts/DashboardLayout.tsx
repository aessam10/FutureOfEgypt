import { useState, useEffect } from 'react';
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
  AppBar,
  Toolbar,
  Badge,
  Popover,
} from '@mui/material';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useThemeMode } from '../app/ThemeContext';
import { routes } from '../app/routes';
import { CommandPalette } from '../components/common/CommandPalette';
import { createNotificationHubConnection } from '../signalr/notificationHub';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { getNotifications, getUnreadCount, markAllAsRead } from '../api/notificationsApi';
import { AuthorizedAvatar } from '../components/common/AuthorizedAvatar';

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
import MenuIcon from '@mui/icons-material/Menu';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';

// ─── Constants ───────────────────────────────────────────────────────────────
const DRAWER_WIDTH = 260;

const NAV_ITEMS = [
  { label: 'نظرة عامة', labelEn: 'Overview', path: routes.dashboard, icon: <DashboardIcon fontSize="small" /> },
  { label: 'المهندسون', labelEn: 'Engineers', path: routes.engineers, icon: <EngineeringIcon fontSize="small" /> },
  { label: 'المديرون', labelEn: 'Managers', path: routes.managers, icon: <SupervisorAccountIcon fontSize="small" />, roles: ['Admin'] },
  { label: 'الأجهزة', labelEn: 'Devices', path: routes.devices, icon: <DevicesIcon fontSize="small" /> },
  { label: 'تحديثات التطبيق', labelEn: 'App Updates', path: routes.appUpdates, icon: <SystemUpdateAltIcon fontSize="small" /> },
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
  const [notificationsAnchor, setNotificationsAnchor] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: getUnreadCount,
    refetchInterval: 60000,
  });

  const [localUnreadCount, setLocalUnreadCount] = useState(0);

  useEffect(() => {
    if (unreadData !== undefined) {
      setLocalUnreadCount(unreadData);
    }
  }, [unreadData]);

  // Fetch full profile (including photo) and sync with AuthContext
  const { updateUser: syncUser } = useAuth();
  useQuery({
    queryKey: ['myProfile'],
    queryFn: async () => {
        const { profileApi } = await import('../api/profileApi');
        const profile = await profileApi.getMyProfile();
        syncUser({
            fullName: profile.fullName,
            email: profile.email,
            profilePhotoUrl: profile.profilePhotoUrl
        });
        return profile;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const {
    data: notifData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchNotifs,
    isLoading: isLoadingNotifs
  } = useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: ({ pageParam = 1 }) => getNotifications(pageParam as number, 10),
    getNextPageParam: (lastPage) => {
      return (lastPage.pageNumber * lastPage.pageSize < lastPage.totalCount)
        ? lastPage.pageNumber + 1
        : undefined;
    },
    initialPageParam: 1,
  });

  useEffect(() => {
    const connection = createNotificationHubConnection(
      (newNotification) => {
        queryClient.setQueryData(['notifications'], (oldData: any) => {
          if (!oldData || !oldData.pages) return oldData;
          const newPages = [...oldData.pages];
          if (newPages.length > 0) {
            newPages[0] = {
              ...newPages[0],
              items: [newNotification, ...newPages[0].items]
            };
          }
          return { ...oldData, pages: newPages };
        });
        setLocalUnreadCount((prev) => prev + 1);
      },
      () => localStorage.getItem('access_token') || ''
    );

    void connection.start().catch(err => console.error('NotificationHub connection error:', err));
    return () => { void connection.stop(); };
  }, [queryClient]);

  const handleOpenNotifications = async (e: React.MouseEvent<HTMLElement>) => {
    setNotificationsAnchor(e.currentTarget);
    if (localUnreadCount > 0) {
      setLocalUnreadCount(0);
      try {
        await markAllAsRead();
        void refetchNotifs();
      } catch (err) {
        console.error('Failed to mark notifications as read', err);
      }
    }
  };

  const allNotifications = notifData ? notifData.pages.flatMap(p => p.items) : [];

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



  const drawerContent = (
    <>
      <Box
          sx={{
            px: 2.5,
            py: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            background: 'linear-gradient(to bottom, rgba(0, 240, 255, 0.05), transparent)',
          }}
        >
          <img 
            src="https://foe.gov.eg/wp-content/uploads/elementor/thumbs/logo-copy-1-qmt34vs13ki4mzgtw9e10dwdcrr44a4wz2ps1aj1a4.png" 
            alt="Logo" 
            style={{ 
              width: '42px', 
              height: 'auto',
              filter: isDark ? 'brightness(0) invert(1) drop-shadow(0 0 6px rgba(0, 240, 255, 0.5))' : 'none'
            }}
          />
          <Box sx={{ textAlign: 'left' }}>
            <Typography
              sx={(theme) => ({
                color: 'primary.main',
                fontWeight: 800,
                fontSize: '0.9rem',
                lineHeight: 1.2,
                letterSpacing: '0.02em',
                textShadow: theme.palette.mode === 'dark' ? '0 0 10px rgba(0, 240, 255, 0.3)' : 'none',
              })}
            >
              Future of Egypt
            </Typography>
            <Typography
              sx={(theme) => ({
                color: theme.palette.mode === 'dark' ? 'rgba(0, 240, 255, 0.6)' : 'text.secondary',
                fontSize: '0.7rem',
                lineHeight: 1.2,
                fontWeight: 500,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              })}
            >
              Workspace
            </Typography>
          </Box>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1.5, px: 1.5 }}>
          <Typography
            sx={(theme) => ({
              color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.25)' : 'text.secondary',
              fontSize: '0.65rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              px: 1,
              mb: 1,
            })}
          >
            القائمة الرئيسية
          </Typography>

          <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {NAV_ITEMS.filter(item => !item.roles || (user?.roles && item.roles.some(r => user.roles.includes(r)))).map((item) => {
              const isActive = location.pathname === item.path;

              return (
                <Tooltip title={item.labelEn} placement="right" key={item.path}>
                  <ListItemButton
                    selected={isActive}
                    onClick={() => { navigate(item.path); setMobileOpen(false); }}
                    aria-label={item.labelEn}
                    aria-current={isActive ? 'page' : undefined}
                    sx={(theme) => ({
                      position: 'relative',
                      borderRadius: '8px',
                      px: 1.5,
                      py: 1,
                      minHeight: 42,
                      backgroundColor: isActive
                        ? (theme.palette.mode === 'dark' ? 'rgba(0, 240, 255, 0.1)' : 'rgba(24, 119, 242, 0.08)')
                        : 'transparent',
                      '&:hover': {
                        backgroundColor: isActive
                          ? (theme.palette.mode === 'dark' ? 'rgba(0, 240, 255, 0.15)' : 'rgba(24, 119, 242, 0.12)')
                          : (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                      },
                      '&.Mui-selected': {
                        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 240, 255, 0.1)' : 'rgba(24, 119, 242, 0.08)',
                      },
                      '&.Mui-selected:hover': {
                        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 240, 255, 0.15)' : 'rgba(24, 119, 242, 0.12)',
                      },
                      '&::before': isActive ? {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: '15%',
                        height: '70%',
                        width: 4,
                        backgroundColor: theme.palette.mode === 'dark' ? '#00F0FF' : 'primary.main',
                        borderRadius: '0 4px 4px 0',
                        boxShadow: theme.palette.mode === 'dark' ? '0 0 10px rgba(0,240,255,0.5)' : 'none',
                      } : {},
                    })}
                  >
                    <ListItemIcon
                      sx={(theme) => ({
                        minWidth: 36,
                        color: isActive ? 'primary.main' : (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'text.secondary'),
                        transition: 'all 0.3s ease',
                        filter: isActive && theme.palette.mode === 'dark' ? 'drop-shadow(0 0 5px rgba(0, 240, 255, 0.5))' : 'none',
                        '& svg': { fontSize: '1.15rem' },
                      })}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      disableTypography
                      primary={
                        <Typography
                          sx={(theme) => ({
                            fontSize: '0.875rem',
                            fontWeight: isActive ? 600 : 400,
                            color: isActive ? (theme.palette.mode === 'dark' ? '#fff' : 'primary.main') : (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.6)' : 'text.primary'),
                            transition: 'color 0.2s ease',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          })}
                        >
                          {item.labelEn}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </Tooltip>
              );
            })}
          </List>
        </Box>

        <Box
          sx={{
            borderTop: '1px solid rgba(255,255,255,0.07)',
            p: 1.5,
          }}
        >
          <Box
            onClick={() => { navigate(routes.profile); setMobileOpen(false); }}
            sx={(theme) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1,
              borderRadius: '8px',
              cursor: 'pointer',
              '&:hover': { backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
              transition: 'background-color 0.2s ease',
            })}
          >
            {user?.profilePhotoUrl ? (
              <AuthorizedAvatar
                srcUrl={user.profilePhotoUrl}
                refreshKey={user?.avatarRefreshKey}
                alt={user?.fullName || user?.email || 'User'}
                sx={(theme) => ({
                  width: 34,
                  height: 34,
                  boxShadow: theme.palette.mode === 'dark' ? '0 0 15px rgba(0, 240, 255, 0.4)' : '0 1px 3px rgba(0,0,0,0.1)',
                  flexShrink: 0,
                })}
              />
            ) : (
              <Avatar
                sx={(theme) => ({
                  width: 34,
                  height: 34,
                  bgcolor: 'primary.main',
                  color: theme.palette.mode === 'dark' ? '#000' : '#fff',
                  boxShadow: theme.palette.mode === 'dark' ? '0 0 15px rgba(0, 240, 255, 0.4)' : 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  flexShrink: 0,
                })}
                aria-label={`User: ${user?.fullName || user?.email}`}
              >
                {initials}
              </Avatar>
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                noWrap
                sx={(theme) => ({
                  color: theme.palette.mode === 'dark' ? '#fff' : 'text.primary',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  lineHeight: 1.2,
                })}
              >
                {user?.fullName || 'Admin'}
              </Typography>
              <Typography
                noWrap
                sx={(theme) => ({
                  color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'text.secondary',
                  fontSize: '0.7rem',
                })}
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
                sx={(theme) => ({
                  color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'text.secondary',
                  '&:hover': { color: '#ef4444', backgroundColor: theme.palette.mode === 'dark' ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)' },
                  transition: 'all 0.2s ease',
                })}
              >
                <LogoutIcon sx={{ fontSize: '1rem' }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
    </>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', maxWidth: '100vw', overflowX: 'hidden' }}>
      
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={(theme) => ({
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: DRAWER_WIDTH,
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(5, 11, 20, 0.85)' : '#FFFFFF',
            backdropFilter: theme.palette.mode === 'dark' ? 'blur(20px)' : 'none',
            WebkitBackdropFilter: theme.palette.mode === 'dark' ? 'blur(20px)' : 'none',
            borderRight: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            overflowX: 'hidden',
          },
        })}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={(theme) => ({
          display: { xs: 'none', md: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: DRAWER_WIDTH,
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(5, 11, 20, 0.85)' : '#FFFFFF',
            backdropFilter: theme.palette.mode === 'dark' ? 'blur(20px)' : 'none',
            WebkitBackdropFilter: theme.palette.mode === 'dark' ? 'blur(20px)' : 'none',
            borderRight: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            overflowX: 'hidden',
          },
        })}
        open
      >
        {drawerContent}
      </Drawer>

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
        <AppBar
          position="sticky"
          elevation={0}
          sx={(theme) => ({
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(10, 15, 26, 0.65)' : 'background.paper',
            backdropFilter: theme.palette.mode === 'dark' ? 'blur(20px)' : 'none',
            WebkitBackdropFilter: theme.palette.mode === 'dark' ? 'blur(20px)' : 'none',
            borderBottom: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)',
            color: 'text.primary',
            zIndex: theme.zIndex.drawer - 1,
            transition: theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
          })}
        >
          <Toolbar sx={{ minHeight: '60px !important', gap: { xs: 1, sm: 2 } }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: { xs: 1, sm: 2 }, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="subtitle1"
                noWrap
                sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1 }}
              >
                {currentNavItem?.labelEn ?? 'Dashboard'}
              </Typography>
              {currentNavItem && (
                <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>
                  {currentNavItem.label}
                </Typography>
              )}
            </Box>

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

            <Tooltip title="Notifications">
              <IconButton
                onClick={handleOpenNotifications}
                size="small"
                aria-label="Notifications"
                sx={(theme) => ({
                  color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                  '&:hover': { color: 'primary.main', background: theme.palette.mode === 'dark' ? 'rgba(0, 240, 255, 0.1)' : 'rgba(24, 119, 242, 0.08)' },
                  width: 36,
                  height: 36,
                })}
              >
                <Badge badgeContent={localUnreadCount} color="error">
                  <NotificationsNoneIcon sx={{ fontSize: '1.1rem' }} />
                </Badge>
              </IconButton>
            </Tooltip>

          </Toolbar>
        </AppBar>

        <Popover
          open={Boolean(notificationsAnchor)}
          anchorEl={notificationsAnchor}
          onClose={() => setNotificationsAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{
            paper: {
              sx: (theme) => ({
                mt: 1.5,
                width: 320,
                maxHeight: 400,
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(10, 15, 26, 0.95)' : 'background.paper',
                backdropFilter: theme.palette.mode === 'dark' ? 'blur(20px)' : 'none',
                border: theme.palette.mode === 'dark' ? '1px solid rgba(0, 240, 255, 0.2)' : '1px solid rgba(0,0,0,0.1)',
                boxShadow: theme.palette.mode === 'dark' ? '0 8px 32px rgba(0, 0, 0, 0.5)' : '0 8px 32px rgba(0, 0, 0, 0.1)',
                borderRadius: 2,
              })
            }
          }}
        >
          <Box sx={(theme) => ({ p: 2, borderBottom: theme.palette.mode === 'dark' ? '1px solid rgba(0, 240, 255, 0.1)' : '1px solid rgba(0,0,0,0.05)' })}>
            <Typography sx={(theme) => ({ color: theme.palette.mode === 'dark' ? '#fff' : '#000', fontWeight: 600 })}>Notifications</Typography>
          </Box>
          <List sx={(theme) => ({ p: 0, overflowY: 'auto', flex: 1, '&::-webkit-scrollbar': { width: '6px' }, '&::-webkit-scrollbar-thumb': { background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', borderRadius: '10px' } })}>
            {isLoadingNotifs ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" sx={(theme) => ({ color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' })}>Loading...</Typography>
              </Box>
            ) : allNotifications.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" sx={(theme) => ({ color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' })}>No new notifications</Typography>
              </Box>
            ) : (
              <>
                {allNotifications.map((notif) => (
                  <ListItemButton key={notif.id} sx={(theme) => ({ borderBottom: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)', display: 'block', py: 1.5 })}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={(theme) => ({ color: theme.palette.mode === 'dark' ? 'primary.main' : 'primary.dark', fontWeight: 600, fontSize: '0.85rem' })}>
                        {notif.title}
                      </Typography>
                      <Typography variant="caption" sx={(theme) => ({ color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', fontSize: '0.7rem' })}>
                        {new Date(notif.createdAtUtc).toLocaleTimeString()}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={(theme) => ({ color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontSize: '0.8rem', lineHeight: 1.4 })}>
                      {notif.message}
                    </Typography>
                  </ListItemButton>
                ))}
                {hasNextPage && (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography
                      component="div"
                      sx={{
                        color: 'primary.main',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        fontWeight: 600,
                        '&:hover': { textDecoration: 'underline' }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        void fetchNextPage();
                      }}
                    >
                      {isFetchingNextPage ? 'Loading...' : 'Load older notifications'}
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </List>
        </Popover>

          <Box
          component="main"
          id="main-content"
          tabIndex={-1}
          sx={{
            flex: 1,
            p: { xs: 2, md: 3 },
            overflow: 'auto',
            width: '100%',
          }}
        >
          <Outlet />
        </Box>
      </Box>

      {/* Global Command Palette */}
      <CommandPalette />
    </Box>
  );
}