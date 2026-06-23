import { useMemo, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Chip,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../components/common/PageHeader';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { getManagers, updateManager, suspendManager, activateManager, deleteManager, type ManagerResponse } from '../api/managersApi';
import { registerManager } from '../api/authApi';
import { AvatarPreviewModal } from '../components/profile/AvatarPreviewModal';
import { AuthorizedAvatar } from '../components/common/AuthorizedAvatar';
import { useAuth } from '../auth/AuthContext';

interface ManagerFormState {
  fullName: string;
  email: string;
  phoneNumber: string;
  password?: string;
}
const initialFormState: ManagerFormState = {
  fullName: '', email: '', phoneNumber: '', password: '',
};

export function ManagersPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formState, setFormState] = useState<ManagerFormState>(initialFormState);
  const [formError, setFormError] = useState<string | null>(null);
  
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [selectedManager, setSelectedManager] = useState<ManagerResponse | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<{ url: string, name: string, fallbackText?: string } | null>(null);

  const queryParams = useMemo(
    () => ({ pageNumber, pageSize, search: search.trim() || undefined }),
    [pageNumber, pageSize, search],
  );

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['managers', queryParams],
    queryFn: () => getManagers(queryParams.pageNumber, queryParams.pageSize, queryParams.search),
  });

  const createMutation = useMutation({
    mutationFn: registerManager,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['managers'] });
      setIsDialogOpen(false);
      setFormState(initialFormState);
      setFormError(null);
    },
    onError: (e: any) => setFormError(e?.response?.data?.message || 'Failed to create manager.'),
  });

  const updateMutation = useMutation({
    mutationFn: (req: ManagerFormState) => updateManager(selectedManager!.id, req),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['managers'] });
      setIsDialogOpen(false);
      setFormState(initialFormState);
      setFormError(null);
    },
    onError: (e: any) => setFormError(e?.response?.data?.message || 'Failed to update manager.'),
  });

  const suspendMutation = useMutation({
    mutationFn: suspendManager,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['managers'] });
      setMenuAnchor(null);
    },
  });

  const activateMutation = useMutation({
    mutationFn: activateManager,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['managers'] });
      setMenuAnchor(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteManager,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['managers'] });
      setMenuAnchor(null);
    },
  });

  function handleOpenCreate() {
    setIsEditMode(false);
    setFormState(initialFormState);
    setFormError(null);
    setIsDialogOpen(true);
  }

  function handleOpenEdit(manager: ManagerResponse) {
    setIsEditMode(true);
    setSelectedManager(manager);
    setFormState({
      fullName: manager.fullName,
      email: manager.email,
      phoneNumber: manager.phoneNumber || '',
    });
    setFormError(null);
    setIsDialogOpen(true);
    setMenuAnchor(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const req = {
      fullName: formState.fullName.trim(),
      email: formState.email.trim(),
      phoneNumber: formState.phoneNumber.trim(),
      password: formState.password,
    };

    if (!req.fullName || !req.email) {
      setFormError('Full name and email are required.');
      return;
    }

    if (isEditMode) {
      updateMutation.mutate(req);
    } else {
      if (!req.password) {
        setFormError('Password is required for new managers.');
        return;
      }
      createMutation.mutate(req as any);
    }
  }

  return (
    <>
      <PageHeader
        title="Managers"
        subtitle="Manage admin and manager accounts."
        actionLabel="Add Manager"
        actionIcon={<AddIcon />}
        onActionClick={handleOpenCreate}
      />

      {/* Search bar */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}>
          <TextField
            placeholder="Search managers by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPageNumber(1); }}
            sx={{ maxWidth: { xs: 'none', sm: 400 }, flex: 1 }}
            aria-label="Search managers"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Tooltip title="Refresh">
            <span>
              <IconButton
                onClick={() => void refetch()}
                disabled={isFetching}
                aria-label="Refresh managers list"
              >
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Paper>

      {isLoading && <LoadingState variant="table" />}
      {isError && (
        <ErrorState message="Failed to load managers." onRetry={() => { void refetch(); }} />
      )}
      {!isLoading && !isError && data && data.items.length === 0 && (
        <EmptyState title="No managers found" description="Try changing your search filters or add a new manager." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: '100%', overflowX: 'auto' }}>
            <Table aria-label="Managers table" sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell scope="col">Profile</TableCell>
                  <TableCell scope="col">Name</TableCell>
                  <TableCell scope="col">Email</TableCell>
                  <TableCell scope="col">Phone</TableCell>
                  <TableCell scope="col">Status</TableCell>
                  <TableCell scope="col" align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((manager: ManagerResponse) => (
                  <TableRow key={manager.id} hover>
                    <TableCell>
                       <AuthorizedAvatar 
                         srcUrl={manager.profilePhotoUrl} 
                         alt={manager.fullName}
                         fallbackText={manager.fullName?.charAt(0) || manager.email?.charAt(0) || 'U'}
                         sx={{ cursor: 'pointer', width: 40, height: 40 }}
                         onClick={() => {
                             setPreviewAvatar({ 
                                 url: manager.profilePhotoUrl || '', 
                                 name: manager.fullName,
                                 fallbackText: manager.fullName?.charAt(0) || manager.email?.charAt(0) || 'U'
                             });
                         }}
                       />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        {manager.fullName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        {manager.role}
                      </Typography>
                    </TableCell>
                    <TableCell>{manager.email}</TableCell>
                    <TableCell>{manager.phoneNumber}</TableCell>
                    <TableCell>
                        <Chip 
                          label={manager.isSuspended ? 'Suspended' : 'Active'} 
                          color={manager.isSuspended ? 'error' : 'success'} 
                          size="small" 
                        />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Options">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            setMenuAnchor(e.currentTarget);
                            setSelectedManager(manager);
                          }}
                          aria-label={`Options for ${manager.fullName}`}
                          aria-haspopup="menu"
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={data.totalCount}
            page={pageNumber - 1}
            rowsPerPage={pageSize}
            rowsPerPageOptions={[5, 10, 25, 50]}
            onPageChange={(_, p) => setPageNumber(p + 1)}
            onRowsPerPageChange={(e) => { setPageSize(Number(e.target.value)); setPageNumber(1); }}
            aria-label="Managers pagination"
          />
        </Paper>
      )}

      {/* Actions menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => { setMenuAnchor(null); setSelectedManager(null); }}
        aria-label="Manager actions"
      >
        <MenuItem
          onClick={() => {
            if (selectedManager) {
              handleOpenEdit(selectedManager);
            }
          }}
        >
          Edit Manager
        </MenuItem>
        {selectedManager?.id !== user?.userId && !selectedManager?.isSuspended && (
           <MenuItem
            onClick={() => {
                if (selectedManager) {
                suspendMutation.mutate(selectedManager.id);
                }
            }}
            >
            Suspend
            </MenuItem>
        )}
        {selectedManager?.id !== user?.userId && selectedManager?.isSuspended && (
           <MenuItem
            onClick={() => {
                if (selectedManager) {
                activateMutation.mutate(selectedManager.id);
                }
            }}
            >
            Activate
            </MenuItem>
        )}
        {selectedManager?.id !== user?.userId && (
           <MenuItem
             sx={{ color: 'error.main' }}
             onClick={() => {
                if (selectedManager) {
                    if (window.confirm(`Are you sure you want to delete ${selectedManager.fullName}?`)) {
                        deleteMutation.mutate(selectedManager.id);
                    }
                }
             }}
            >
            Delete
            </MenuItem>
        )}
      </Menu>

      {/* Create/Edit dialog */}
      <Dialog
        open={isDialogOpen}
        onClose={() => { if (!createMutation.isPending && !updateMutation.isPending) { setIsDialogOpen(false); setFormError(null); } }}
        fullWidth maxWidth="sm"
      >
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>{isEditMode ? 'Edit Manager' : 'Add Manager'}</DialogTitle>
          <DialogContent>
            {formError && (
              <Typography color="error" sx={{ mb: 2, fontSize: '0.875rem' }}>{formError}</Typography>
            )}
            <TextField
              fullWidth label="Full Name" required
              value={formState.fullName}
              onChange={(e) => setFormState((s) => ({ ...s, fullName: e.target.value }))}
              sx={{ mt: 1, mb: 2 }}
            />
            <TextField
              fullWidth label="Email" type="email" required
              value={formState.email}
              onChange={(e) => setFormState((s) => ({ ...s, email: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth label="Phone Number"
              value={formState.phoneNumber}
              onChange={(e) => setFormState((s) => ({ ...s, phoneNumber: e.target.value }))}
              sx={{ mb: 2 }}
            />
            {!isEditMode && (
              <TextField
                fullWidth label="Password" type="password" required
                value={formState.password}
                onChange={(e) => setFormState((s) => ({ ...s, password: e.target.value }))}
                sx={{ mb: 2 }}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setIsDialogOpen(false); setFormError(null); }} disabled={createMutation.isPending || updateMutation.isPending}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Avatar Preview */}
      {previewAvatar && (
        <AvatarPreviewModal
           open={!!previewAvatar}
           onClose={() => setPreviewAvatar(null)}
           imageUrl={previewAvatar.url}
           altText={previewAvatar.name}
           fallbackText={previewAvatar.fallbackText}
        />
      )}
    </>
  );
}
