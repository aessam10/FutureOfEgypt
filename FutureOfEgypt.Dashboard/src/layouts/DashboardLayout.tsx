import {
  AppBar,
  Box,
  Button,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import { routes } from '../app/routes';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EngineeringIcon from '@mui/icons-material/Engineering';
import DevicesIcon from '@mui/icons-material/Devices';
import AssignmentIcon from '@mui/icons-material/Assignment';
import MapIcon from '@mui/icons-material/Map';
import ChatIcon from '@mui/icons-material/Chat';
import HistoryIcon from '@mui/icons-material/History';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const drawerWidth = 260;

const menuItems = [
  { label: 'Overview', path: routes.dashboard, icon: <DashboardIcon /> },
  { label: 'Engineers', path: routes.engineers, icon: <EngineeringIcon /> },
  { label: 'Devices', path: routes.devices, icon: <DevicesIcon /> },
  { label: 'Assignments', path: routes.assignments, icon: <AssignmentIcon /> },
  { label: 'Device Requests', path: routes.deviceRequests, icon: <AssignmentIcon /> },
  { label: 'Live Map', path: routes.liveMap, icon: <MapIcon /> },
  { label: 'Chat', path: routes.chat, icon: <ChatIcon /> },
  { label: 'Audit Logs', path: routes.auditLogs, icon: <HistoryIcon /> },
];

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

async function handleLogout() {
  await logout();
navigate(routes.login, { replace: true });
}

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          <Typography variant="h6">FutureOfEgypt</Typography>

          <Box sx={{ flexGrow: 1 }} />

          <Typography sx={{ mr: 2 }}>
            {user?.fullName || user?.email || 'Admin'}
          </Typography>

          <Button color="inherit" variant="outlined" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            pt: 8,
          },
        }}
      >
        <List sx={{ px: 1 }}>
          {menuItems.map((item) => {
            const selected = location.pathname === item.path;

            return (
              <ListItemButton
                key={item.path}
                selected={selected}
                onClick={() => navigate(item.path)}
                sx={{ borderRadius: 2, mb: 0.5 }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            );
          })}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, pt: 11 }}>
        <Outlet />
      </Box>
    </Box>
  );
}