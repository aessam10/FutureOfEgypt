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
import { createEngineer, getEngineers, updateEngineerStatus } from '../api/engineersApi';
import type { CreateEngineerRequest, EngineerResponse } from '../types/engineers';

const ACTIVE_STATUS = 1;
const INACTIVE_STATUS = 2;

interface EngineerFormState {
  fullName: string;
  phoneNumber: string;
  email: string;
  status: number;
}
const initialFormState: EngineerFormState = {
  fullName: '', phoneNumber: '', email: '', status: ACTIVE_STATUS,
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

  const queryParams = useMemo(
    () => ({ pageNumber, pageSize, search: search.trim() || undefined }),
    [pageNumber, pageSize, search],
  );

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['engineers', queryParams],
    queryFn: () => getEngineers(queryParams),
  });

  const createMutation = useMutation({
    mutationFn: (req: CreateEngineerRequest) => createEngineer(req),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['engineers'] });
      setIsCreateDialogOpen(false);
      setFormState(initialFormState);
      setFormError(null);
    },
    onError: () => setFormError('Failed to create engineer.'),
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
    const req: CreateEngineerRequest = {
      fullName: formState.fullName.trim(),
      phoneNumber: formState.phoneNumber.trim(),
      email: formState.email.trim(),
      status: formState.status,
    };
    if (!req.fullName || !req.phoneNumber || !req.email) {
      setFormError('Please fill all required fields.');
      return;
    }
    setFormError(null);
    createMutation.mutate(req);
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
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
          <TextField
            placeholder="Search engineers by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPageNumber(1); }}
            sx={{ maxWidth: 400 }}
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
        <Paper>
          <TableContainer>
            <Table aria-label="Engineers table">
              <TableHead>
                <TableRow>
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
                      <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        {engineer.fullName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace' }}>
                        {engineer.publicId}
                      </Typography>
                    </TableCell>
                    <TableCell>{engineer.email}</TableCell>
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
      </Menu>

      {/* Create dialog */}
      <Dialog
        open={isCreateDialogOpen}
        onClose={() => { if (!createMutation.isPending) { setIsCreateDialogOpen(false); setFormError(null); } }}
        fullWidth maxWidth="sm"
        aria-labelledby="create-engineer-title"
      >
        <Box component="form" onSubmit={handleCreateSubmit}>
          <DialogTitle id="create-engineer-title">Add Engineer</DialogTitle>
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
            <FormControl fullWidth size="small">
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
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setIsCreateDialogOpen(false); setFormError(null); }} disabled={createMutation.isPending}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving...' : 'Save Engineer'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}