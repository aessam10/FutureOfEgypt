import { useMemo, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Autocomplete,
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
import { getEngineers } from '../api/engineersApi';
import { getDevices } from '../api/devicesApi';
import type { AssignDeviceRequest } from '../types/assignments';
import type { EngineerResponse } from '../types/engineers';
import type { DeviceResponse } from '../types/devices';

export function AssignmentsPage() {
  const queryClient = useQueryClient();

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');

  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedEngineer, setSelectedEngineer] = useState<EngineerResponse | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<DeviceResponse | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const queryParams = useMemo(
    () => ({ pageNumber, pageSize, search: search.trim() || undefined }),
    [pageNumber, pageSize, search],
  );

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['active-assignments', queryParams],
    queryFn: () => getActiveAssignments(queryParams),
  });

  // Fetch engineers and devices for autocomplete
  const { data: engineersData } = useQuery({
    queryKey: ['engineers-all'],
    queryFn: () => getEngineers({ pageNumber: 1, pageSize: 200 }),
    staleTime: 5 * 60_000,
    enabled: isAssignDialogOpen,
  });
  const { data: devicesData } = useQuery({
    queryKey: ['devices-all'],
    queryFn: () => getDevices({ pageNumber: 1, pageSize: 200 }),
    staleTime: 5 * 60_000,
    enabled: isAssignDialogOpen,
  });

  const engineers = engineersData?.items ?? [];
  const devices = devicesData?.items ?? [];

  const assignMutation = useMutation({
    mutationFn: (req: AssignDeviceRequest) => assignDevice(req),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['active-assignments'] });
      setIsAssignDialogOpen(false);
      setSelectedEngineer(null);
      setSelectedDevice(null);
      setFormError(null);
    },
    onError: () => setFormError('Failed to assign device.'),
  });

  function handleAssignSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedEngineer || !selectedDevice) {
      setFormError('Please select both an engineer and a device.');
      return;
    }
    setFormError(null);
    assignMutation.mutate({
      engineerPublicId: selectedEngineer.publicId,
      devicePublicId: selectedDevice.publicId,
    });
  }

  function openDialog() {
    setSelectedEngineer(null);
    setSelectedDevice(null);
    setFormError(null);
    setIsAssignDialogOpen(true);
  }

  function closeDialog() {
    if (assignMutation.isPending) return;
    setIsAssignDialogOpen(false);
    setFormError(null);
  }

  return (
    <>
      <PageHeader
        title="Assignments"
        subtitle="View and manage active engineer-device assignments."
        actionLabel="Assign Device"
        actionIcon={<AddIcon />}
        onActionClick={openDialog}
      />

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
          <TextField
            placeholder="Search assignments..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPageNumber(1); }}
            sx={{ maxWidth: 400 }}
            aria-label="Search assignments"
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
              <IconButton onClick={() => void refetch()} disabled={isFetching} aria-label="Refresh assignments">
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Paper>

      {isLoading && <LoadingState variant="table" />}
      {isError && <ErrorState message="Failed to load assignments." onRetry={() => { void refetch(); }} />}
      {!isLoading && !isError && data && data.items.length === 0 && (
        <EmptyState title="No active assignments" description="Assign a device to an engineer to see it here." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <Paper>
          <TableContainer>
            <Table aria-label="Assignments table">
              <TableHead>
                <TableRow>
                  <TableCell scope="col">Engineer</TableCell>
                  <TableCell scope="col">Device</TableCell>
                  <TableCell scope="col">Assigned At</TableCell>
                  <TableCell scope="col">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((assignment) => (
                  <TableRow key={assignment.publicId} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>{assignment.engineerName}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace' }}>
                        {assignment.engineerPublicId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>{assignment.deviceName}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace' }}>
                        {assignment.devicePublicId}
                      </Typography>
                    </TableCell>
                    <TableCell>{new Date(assignment.assignedAtUtc).toLocaleDateString()}</TableCell>
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
            onPageChange={(_, p) => setPageNumber(p + 1)}
            onRowsPerPageChange={(e) => { setPageSize(Number(e.target.value)); setPageNumber(1); }}
          />
        </Paper>
      )}

      {/* Assign Dialog — with searchable dropdowns */}
      <Dialog open={isAssignDialogOpen} onClose={closeDialog} fullWidth maxWidth="sm" aria-labelledby="assign-dialog-title">
        <Box component="form" onSubmit={handleAssignSubmit}>
          <DialogTitle id="assign-dialog-title">Assign Device to Engineer</DialogTitle>
          <DialogContent>
            {formError && (
              <Typography color="error" sx={{ mb: 2, fontSize: '0.875rem' }}>{formError}</Typography>
            )}

            <Autocomplete
              options={engineers}
              getOptionLabel={(opt) => `${opt.fullName} — ${opt.email ?? opt.publicId}`}
              value={selectedEngineer}
              onChange={(_, val) => setSelectedEngineer(val)}
              renderInput={(params) => (
                <TextField {...params} label="Engineer" placeholder="Search engineers..." sx={{ mt: 1, mb: 2 }} required />
              )}
              noOptionsText="No engineers found"
              aria-label="Select engineer"
            />

            <Autocomplete
              options={devices}
              getOptionLabel={(opt) => `${opt.deviceName} — ${opt.serialNumber}`}
              value={selectedDevice}
              onChange={(_, val) => setSelectedDevice(val)}
              renderInput={(params) => (
                <TextField {...params} label="Device" placeholder="Search devices..." required />
              )}
              noOptionsText="No devices found"
              aria-label="Select device"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog} disabled={assignMutation.isPending}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={assignMutation.isPending || !selectedEngineer || !selectedDevice}>
              {assignMutation.isPending ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}