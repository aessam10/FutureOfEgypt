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
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  Menu,
  MenuItem,
  Paper,
  Select,
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
  type SelectChangeEvent,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../components/common/PageHeader';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { EngineerStatusChip } from '../components/status/EngineerStatusChip';
import { getEngineers, updateEngineerStatus } from '../api/engineersApi';
import { registerEngineerComplete } from '../api/authApi';
import type { EngineerResponse, RegisterEngineerCompleteRequest } from '../types/engineers';
import { AvatarPreviewModal } from '../components/profile/AvatarPreviewModal';
import { AuthorizedAvatar } from '../components/common/AuthorizedAvatar';

const ACTIVE_STATUS = 1;
const INACTIVE_STATUS = 2;

interface EngineerFormState {
  fullName: string;
  phoneNumber: string;
  email: string;
  username: string;
  status: number;
  password?: string;
}
const initialFormState: EngineerFormState = {
  fullName: '', phoneNumber: '', email: '', username: '', status: ACTIVE_STATUS, password: '',
};

export function EngineersPage() {
  const queryClient = useQueryClient();

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formState, setFormState] = useState<EngineerFormState>(initialFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [selectedEngineer, setSelectedEngineer] = useState<EngineerResponse | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<{ url: string, name: string, fallbackText?: string } | null>(null);

  const queryParams = useMemo(
    () => ({ pageNumber, pageSize, search: search.trim() || undefined }),
    [pageNumber, pageSize, search],
  );

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['engineers', queryParams],
    queryFn: () => getEngineers(queryParams),
  });

  const [isEditMode, setIsEditMode] = useState(false);

  const createMutation = useMutation({
    mutationFn: (req: RegisterEngineerCompleteRequest) => registerEngineerComplete(req),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['engineers'] });
      setIsCreateDialogOpen(false);
      setFormState(initialFormState);
      setFormError(null);
    },
    onError: (e: any) => setFormError(e?.response?.data?.message || 'Failed to create engineer.'),
  });

  const updateMutation = useMutation({
    mutationFn: (req: import('../types/engineers').UpdateEngineerRequest) => {
      return import('../api/engineersApi').then(m => m.updateEngineer(selectedEngineer!.publicId, req));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['engineers'] });
      setIsCreateDialogOpen(false);
      setFormState(initialFormState);
      setFormError(null);
      setSelectedEngineer(null);
    },
    onError: () => setFormError('Failed to update engineer.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => import('../api/engineersApi').then(m => m.deleteEngineer(publicId)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['engineers'] });
      await queryClient.invalidateQueries({ queryKey: ['devices'] });
      await queryClient.invalidateQueries({ queryKey: ['active-assignments'] });
      await queryClient.invalidateQueries({ queryKey: ['latest-locations'] });
      await queryClient.invalidateQueries({ queryKey: ['hidden-locations'] });
      await queryClient.invalidateQueries({ queryKey: ['deviceAppStatuses'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['engineers-status'] });
      await queryClient.invalidateQueries({ queryKey: ['device-requests'] });
      setMenuAnchor(null);
      setSelectedEngineer(null);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ engineerPublicId, status }: { engineerPublicId: string; status: number }) =>
      updateEngineerStatus(engineerPublicId, { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['engineers'] });
      setMenuAnchor(null);
      setSelectedEngineer(null);
    },
  });

  function handleCreateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formState.fullName.trim() || !formState.phoneNumber.trim() || !formState.email.trim() || (!isEditMode && !formState.username.trim())) {
      setFormError('Please fill all required fields.');
      return;
    }
    if (!isEditMode && !formState.password?.trim()) {
      setFormError('Password is required.');
      return;
    }
    setFormError(null);

    if (isEditMode && selectedEngineer) {
      updateMutation.mutate({
        fullName: formState.fullName.trim(),
        phoneNumber: formState.phoneNumber.trim(),
        email: formState.email.trim(),
      });
    } else {
      createMutation.mutate({
        fullName: formState.fullName.trim(),
        phoneNumber: formState.phoneNumber.trim(),
        email: formState.email.trim(),
        username: formState.username.trim(),
        password: formState.password?.trim(),
        status: formState.status,
      });
    }
  }

  return (
    <>
      <PageHeader
        title="Engineers"
        subtitle="Manage engineer accounts and tracking status."
        actionLabel="Add Engineer"
        actionIcon={<AddIcon />}
        onActionClick={() => {
          setFormState(initialFormState);
          setFormError(null);
          setIsCreateDialogOpen(true);
        }}
      />

      {/* Search bar */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}>
          <TextField
            placeholder="Search engineers by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPageNumber(1); }}
            sx={{ maxWidth: { xs: 'none', sm: 400 }, flex: 1 }}
            aria-label="Search engineers"
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
                aria-label="Refresh engineers list"
              >
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Paper>

      {isLoading && <LoadingState variant="table" />}
      {isError && (
        <ErrorState message="Failed to load engineers." onRetry={() => { void refetch(); }} />
      )}
      {!isLoading && !isError && data && data.items.length === 0 && (
        <EmptyState title="No engineers found" description="Try changing your search filters or add a new engineer." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: '100%', overflowX: 'auto' }}>
            <Table aria-label="Engineers table" sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell scope="col">Profile</TableCell>
                  <TableCell scope="col">Engineer</TableCell>
                  <TableCell scope="col">Email</TableCell>
                  <TableCell scope="col">Phone</TableCell>
                  <TableCell scope="col">Status</TableCell>
                  <TableCell scope="col">Created</TableCell>
                  <TableCell scope="col" align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((engineer) => (
                  <TableRow key={engineer.publicId} hover>
                    <TableCell>
                       <AuthorizedAvatar 
                         srcUrl={engineer.profilePhotoUrl} 
                         alt={engineer.fullName}
                         fallbackText={engineer.fullName?.charAt(0) || engineer.email?.charAt(0) || 'U'}
                         sx={{ cursor: 'pointer', width: 40, height: 40 }}
                         onClick={() => {
                             setPreviewAvatar({ 
                                 url: engineer.profilePhotoUrl || '', 
                                 name: engineer.fullName,
                                 fallbackText: engineer.fullName?.charAt(0) || engineer.email?.charAt(0) || 'U'
                             });
                         }}
                       />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        {engineer.fullName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace' }}>
                        {engineer.publicId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <span>{engineer.email}</span>
                        {engineer.username && (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>@{engineer.username}</Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{engineer.phoneNumber}</TableCell>
                    <TableCell><EngineerStatusChip status={engineer.status} /></TableCell>
                    <TableCell>{new Date(engineer.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Options">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            setMenuAnchor(e.currentTarget);
                            setSelectedEngineer(engineer);
                          }}
                          aria-label={`Options for ${engineer.fullName}`}
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
            aria-label="Engineers pagination"
          />
        </Paper>
      )}

      {/* Actions menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => { setMenuAnchor(null); setSelectedEngineer(null); }}
        aria-label="Engineer actions"
      >
        <MenuItem
          onClick={() => {
            if (selectedEngineer) {
              setIsEditMode(true);
              setFormState({
                fullName: selectedEngineer.fullName,
                email: selectedEngineer.email,
                username: selectedEngineer.username || '',
                phoneNumber: selectedEngineer.phoneNumber,
                status: selectedEngineer.status,
              });
              setFormError(null);
              setIsCreateDialogOpen(true);
              setMenuAnchor(null);
            }
          }}
        >
          Edit Engineer
        </MenuItem>
        <MenuItem
          disabled={selectedEngineer?.status === ACTIVE_STATUS || updateStatusMutation.isPending}
          onClick={() => {
            if (selectedEngineer) {
              updateStatusMutation.mutate({ engineerPublicId: selectedEngineer.publicId, status: ACTIVE_STATUS });
            }
          }}
        >
          Mark as Active
        </MenuItem>
        <MenuItem
          disabled={selectedEngineer?.status === INACTIVE_STATUS || updateStatusMutation.isPending}
          onClick={() => {
            if (selectedEngineer) {
              updateStatusMutation.mutate({ engineerPublicId: selectedEngineer.publicId, status: INACTIVE_STATUS });
            }
          }}
        >
          Mark as Inactive
        </MenuItem>
        <MenuItem
          sx={{ color: 'error.main' }}
          onClick={() => {
            if (selectedEngineer) {
              if (window.confirm(`Are you sure you want to delete ${selectedEngineer.fullName}?`)) {
                deleteMutation.mutate(selectedEngineer.publicId);
              }
            }
          }}
        >
          Delete
        </MenuItem>
      </Menu>

      {/* Create dialog */}
      <Dialog
        open={isCreateDialogOpen}
        onClose={() => { if (!createMutation.isPending && !updateMutation.isPending) { setIsCreateDialogOpen(false); setFormError(null); } }}
        fullWidth maxWidth="sm"
        aria-labelledby="create-engineer-title"
      >
        <Box component="form" onSubmit={handleCreateSubmit}>
          <DialogTitle id="create-engineer-title">{isEditMode ? 'Edit Engineer' : 'Add Engineer'}</DialogTitle>
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
              fullWidth label="Phone Number" required
              value={formState.phoneNumber}
              onChange={(e) => setFormState((s) => ({ ...s, phoneNumber: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth label="Email" type="email" required
              value={formState.email}
              onChange={(e) => setFormState((s) => ({ ...s, email: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth label="Username" required={!isEditMode}
              value={formState.username}
              onChange={(e) => setFormState((s) => ({ ...s, username: e.target.value }))}
              sx={{ mb: 2 }}
              disabled={isEditMode}
            />
            {!isEditMode && (
              <>
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    label="Status"
                    value={formState.status}
                    onChange={(e: SelectChangeEvent<number>) =>
                      setFormState((s) => ({ ...s, status: Number(e.target.value) }))
                    }
                  >
                    <MenuItem value={ACTIVE_STATUS}>Active</MenuItem>
                    <MenuItem value={INACTIVE_STATUS}>Inactive</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth label="Password" type="password" required
                  value={formState.password || ''}
                  onChange={(e) => setFormState((s) => ({ ...s, password: e.target.value }))}
                  sx={{ mb: 2 }}
                />
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setIsCreateDialogOpen(false); setFormError(null); }} disabled={createMutation.isPending || updateMutation.isPending}>Cancel</Button>
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