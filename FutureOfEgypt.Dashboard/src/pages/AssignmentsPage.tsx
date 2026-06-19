import { useMemo, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
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
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../components/common/PageHeader';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { StatusChip } from '../components/status/StatusChip';
import { assignDevice, getActiveAssignments } from '../api/assignmentsApi';
import type { AssignDeviceRequest } from '../types/assignments';

interface AssignFormState {
  engineerPublicId: string;
  devicePublicId: string;
}

const initialFormState: AssignFormState = {
  engineerPublicId: '',
  devicePublicId: '',
};

export function AssignmentsPage() {
  const queryClient = useQueryClient();

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');

  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [formState, setFormState] = useState<AssignFormState>(initialFormState);
  const [formError, setFormError] = useState<string | null>(null);

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
    queryKey: ['active-assignments', queryParams],
    queryFn: () => getActiveAssignments(queryParams),
  });

  const assignMutation = useMutation({
    mutationFn: (request: AssignDeviceRequest) => assignDevice(request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['active-assignments'] });
      setIsAssignDialogOpen(false);
      setFormState(initialFormState);
      setFormError(null);
    },
    onError: () => {
      setFormError('Failed to assign device.');
    },
  });

  function handleSearchChange(value: string) {
    setSearch(value);
    setPageNumber(1);
  }

  function handleOpenAssignDialog() {
    setFormState(initialFormState);
    setFormError(null);
    setIsAssignDialogOpen(true);
  }

  function handleCloseAssignDialog() {
    if (assignMutation.isPending) {
      return;
    }

    setIsAssignDialogOpen(false);
    setFormError(null);
  }

  function handleAssignSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const request: AssignDeviceRequest = {
      engineerPublicId: formState.engineerPublicId.trim(),
      devicePublicId: formState.devicePublicId.trim(),
    };

    if (!request.engineerPublicId || !request.devicePublicId) {
      setFormError('Please fill engineer public id and device public id.');
      return;
    }

    setFormError(null);
    assignMutation.mutate(request);
  }

  return (
    <>
      <PageHeader
        title="Assignments"
        subtitle="View and manage active engineer-device assignments."
        actionLabel="Assign Device"
        actionIcon={<AddIcon />}
        onActionClick={handleOpenAssignDialog}
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
            placeholder="Search assignments..."
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

      {isLoading && <LoadingState message="Loading assignments..." />}

      {isError && (
        <ErrorState
          message="Failed to load assignments."
          onRetry={() => {
            void refetch();
          }}
        />
      )}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <EmptyState
          title="No active assignments found"
          description="Assign a device to an engineer to see it here."
        />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Engineer</TableCell>
                  <TableCell>Device</TableCell>
                  <TableCell>Assigned At</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {data.items.map((assignment) => (
                  <TableRow key={assignment.publicId} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>
                        {assignment.engineerName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {assignment.engineerPublicId}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>
                        {assignment.deviceName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {assignment.devicePublicId}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      {new Date(assignment.assignedAtUtc).toLocaleDateString()}
                    </TableCell>

                    <TableCell>
                      {assignment.isActive ? (
                        <StatusChip label="Active" color="success" />
                      ) : (
                        <StatusChip label="Inactive" color="warning" />
                      )}
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

      <Dialog
        open={isAssignDialogOpen}
        onClose={handleCloseAssignDialog}
        fullWidth
        maxWidth="sm"
      >
        <Box component="form" onSubmit={handleAssignSubmit}>
          <DialogTitle>Assign Device</DialogTitle>

          <DialogContent>
            {formError && (
              <Typography color="error" sx={{ mb: 2 }}>
                {formError}
              </Typography>
            )}

            <TextField
              fullWidth
              label="Engineer Public Id"
              value={formState.engineerPublicId}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  engineerPublicId: event.target.value,
                }))
              }
              sx={{ mt: 1, mb: 2 }}
            />

            <TextField
              fullWidth
              label="Device Public Id"
              value={formState.devicePublicId}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  devicePublicId: event.target.value,
                }))
              }
              sx={{ mb: 2 }}
            />

            <Typography variant="body2" color="text.secondary">
              For now, paste the engineer public id and device public id. Later we can replace this
              with searchable dropdowns.
            </Typography>
          </DialogContent>

          <DialogActions>
            <Button onClick={handleCloseAssignDialog} disabled={assignMutation.isPending}>
              Cancel
            </Button>

            <Button type="submit" variant="contained" disabled={assignMutation.isPending}>
              {assignMutation.isPending ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}