import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  InputAdornment,
  Box,
  Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EngineeringIcon from '@mui/icons-material/Engineering';
import DevicesIcon from '@mui/icons-material/Devices';
import MapIcon from '@mui/icons-material/Map';
import HistoryIcon from '@mui/icons-material/History';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { useNavigate } from 'react-router-dom';

const SEARCH_ROUTES = [
  { path: '/overview', name: 'Dashboard Overview', icon: <DashboardIcon /> },
  { path: '/engineers', name: 'Engineers Management', icon: <EngineeringIcon /> },
  { path: '/devices', name: 'Devices Inventory', icon: <DevicesIcon /> },
  { path: '/live-map', name: 'Live Map', icon: <MapIcon /> },
  { path: '/audit-logs', name: 'Audit Logs', icon: <HistoryIcon /> },
  { path: '/assignments', name: 'Assignments', icon: <AssignmentIcon /> },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClose = () => {
    setOpen(false);
    setSearch('');
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    handleClose();
  };

  const filteredRoutes = SEARCH_ROUTES.filter(route => 
    route.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            background: 'rgba(10, 15, 30, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            boxShadow: '0 0 40px rgba(0, 240, 255, 0.1)',
            borderRadius: 3,
          }
        }
      }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(0, 240, 255, 0.1)' }}>
        <TextField
          autoFocus
          fullWidth
          variant="standard"
          placeholder="Search pages... (e.g. Map, Engineers)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              disableUnderline: true,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#00F0FF' }} />
                </InputAdornment>
              ),
              sx: { fontSize: '1.2rem', color: '#FFF' }
            }
          }}
        />
      </Box>
      <DialogContent sx={{ p: 0, maxHeight: 300 }}>
        {filteredRoutes.length > 0 ? (
          <List sx={{ pt: 0 }}>
            {filteredRoutes.map((route, idx) => (
              <ListItemButton 
                key={idx}
                onClick={() => handleNavigate(route.path)}
                sx={{
                  '&:hover': {
                    background: 'rgba(0, 240, 255, 0.1)',
                  }
                }}
              >
                <ListItemIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  {route.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={route.name} 
                  slotProps={{ primary: { sx: { color: '#FFF', fontWeight: 500 } } }}
                />
              </ListItemButton>
            ))}
          </List>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>No results found</Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
