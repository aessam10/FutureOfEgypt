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
import {
  createEngineer,
  getEngineers,
  updateEngineerStatus,
} from '../api/engineersApi';
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
  fullName: '',
  phoneNumber: '',
  email: '',
  status: ACTIVE_STATUS,
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
    () => ({
      pageNumber,
      pageSize,
      search: search.trim() || undefined,
    }),
    [pageNumber, pageSize, search],
  );

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['engineers', queryParams],
    queryFn: () => getEngineers(queryParams),
  });

  const createMutation = useMutation({
    mutationFn: (request: CreateEngineerRequest) => createEngineer(request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['engineers'] });
      setIsCreateDialogOpen(false);
      setFormState(initialFormState);
      setFormError(null);
    },
    onError: () => {
      setFormError('Failed to create engineer.');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      engineerPublicId,
      status,
    }: {
      engineerPublicId: string;
      status: number;
    }) =>
      updateEngineerStatus(engineerPublicId, {
        status,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['engineers'] });
      handleCloseMenu();
    },
  });

  function handleSearchChange(value: string) {
    setSearch(value);
    setPageNumber(1);
  }

  function handleOpenCreateDialog() {
    setFormState(initialFormState);
    setFormError(null);
    setIsCreateDialogOpen(true);
  }

  function handleCloseCreateDialog() {
    if (createMutation.isPending) {
      return;
    }

    setIsCreateDialogOpen(false);
    setFormError(null);
  }

  function handleStatusChange(event: SelectChangeEvent<number>) {
    setFormState((current) => ({
      ...current,
      status: Number(event.target.value),
    }));
  }

  function handleCreateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const request: CreateEngineerRequest = {
      fullName: formState.fullName.trim(),
      phoneNumber: formState.phoneNumber.trim(),
      email: formState.email.trim(),
      status: formState.status,
    };

    if (!request.fullName || !request.phoneNumber || !request.email) {
      setFormError('Please fill all required fields.');
      return;
    }

    setFormError(null);
    createMutation.mutate(request);
  }

  function handleOpenMenu(event: React.MouseEvent<HTMLElement>, engineer: EngineerResponse) {
    setMenuAnchor(event.currentTarget);
    setSelectedEngineer(engineer);
  }

  function handleCloseMenu() {
    setMenuAnchor(null);
    setSelectedEngineer(null);
  }

  function handleChangeEngineerStatus(status: number) {
    if (!selectedEngineer) {
      return;
    }

    updateStatusMutation.mutate({
      engineerPublicId: selectedEngineer.publicId,
      status,
    });
  }

  return (
    <>
      <PageHeader
        title="Engineers"
        subtitle="Manage engineers, accounts, and status."
        actionLabel="Add Engineer"
        actionIcon={<AddIcon />}
        onActionClick={handleOpenCreateDialog}
      />

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            alignItems: 'center',
            justifyContent: 'space-between',
            flexDirection: { xs: 'column', md: 'row' },
          }}
        >
          <TextField
            fullWidth
            placeholder="Search engineers..."
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            sx={{ maxWidth: { md: 420 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              },
            }}
          />

          <Tooltip title="Refresh">
            <span>
              <IconButton onClick={() => void refetch()} disabled={isFetching}>
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Paper>

      {isLoading && <LoadingState message="Loading engineers..." />}

      {isError && (
        <ErrorState
          message="Failed to load engineers."
          onRetry={() => {
            void refetch();
          }}
        />
      )}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <EmptyState
          title="No engineers found"
          description="Try changing your search filters or add a new engineer."
        />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Engineer</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created At</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {data.items.map((engineer) => (
                  <TableRow key={engineer.publicId} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>{engineer.fullName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {engineer.publicId}
                      </Typography>
                    </TableCell>

                    <TableCell>{engineer.email}</TableCell>

                    <TableCell>{engineer.phoneNumber}</TableCell>

                    <TableCell>
                      <EngineerStatusChip status={engineer.status} />
                    </TableCell>

                    <TableCell>
                      {new Date(engineer.createdAt).toLocaleDateString()}
                    </TableCell>

                    <TableCell align="right">
                      <IconButton onClick={(event) => handleOpenMenu(event, engineer)}>
                        <MoreVertIcon />
                      </IconButton>
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
            onPageChange={(_, newPage) => {
              setPageNumber(newPage + 1);
            }}
            onRowsPerPageChange={(event) => {
              setPageSize(Number(event.target.value));
              setPageNumber(1);
            }}
          />
        </Paper>
      )}

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleCloseMenu}>
        <MenuItem
          disabled={selectedEngineer?.status === ACTIVE_STATUS || updateStatusMutation.isPending}
          onClick={() => handleChangeEngineerStatus(ACTIVE_STATUS)}
        >
          Mark as Active
        </MenuItem>

        <MenuItem
          disabled={selectedEngineer?.status === INACTIVE_STATUS || updateStatusMutation.isPending}
          onClick={() => handleChangeEngineerStatus(INACTIVE_STATUS)}
        >
          Mark as Inactive
        </MenuItem>
      </Menu>

      <Dialog
        open={isCreateDialogOpen}
        onClose={handleCloseCreateDialog}
        fullWidth
        maxWidth="sm"
      >
        <Box component="form" onSubmit={handleCreateSubmit}>
          <DialogTitle>Add Engineer</DialogTitle>

          <DialogContent>
            {formError && (
              <Typography color="error" sx={{ mb: 2 }}>
                {formError}
              </Typography>
            )}

            <TextField
              fullWidth
              label="Full Name"
              value={formState.fullName}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  fullName: event.target.value,
                }))
              }
              sx={{ mt: 1, mb: 2 }}
            />

            <TextField
              fullWidth
              label="Phone Number"
              value={formState.phoneNumber}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  phoneNumber: event.target.value,
                }))
              }
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formState.email}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={formState.status}
                onChange={handleStatusChange}
              >
                <MenuItem value={ACTIVE_STATUS}>Active</MenuItem>
                <MenuItem value={INACTIVE_STATUS}>Inactive</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>

          <DialogActions>
            <Button onClick={handleCloseCreateDialog} disabled={createMutation.isPending}>
              Cancel
            </Button>

            <Button type="submit" variant="contained" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}