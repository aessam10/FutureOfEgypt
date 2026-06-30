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
import { DeviceStatusChip } from '../components/status/DeviceStatusChip';
import { createDevice, getDevices, updateDeviceStatus } from '../api/devicesApi';
import type { CreateDeviceRequest, DeviceResponse } from '../types/devices';

const ACTIVE_STATUS = 1;
const INACTIVE_STATUS = 2;
const BLOCKED_STATUS = 3;

interface DeviceFormState {
  deviceName: string;
  serialNumber: string;
  imei: string;
  installationId: string;
  status: number;
}
const initialFormState: DeviceFormState = {
  deviceName: '', serialNumber: '', imei: '', installationId: '', status: ACTIVE_STATUS,
};

export function DevicesPage() {
  const queryClient = useQueryClient();
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formState, setFormState] = useState<DeviceFormState>(initialFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<DeviceResponse | null>(null);

  const queryParams = useMemo(
    () => ({ pageNumber, pageSize, search: search.trim() || undefined }),
    [pageNumber, pageSize, search],
  );

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['devices', queryParams],
    queryFn: () => getDevices(queryParams),
  });

  const createMutation = useMutation({
    mutationFn: (req: CreateDeviceRequest) => createDevice(req),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['devices'] });
      setIsCreateDialogOpen(false);
      setFormState(initialFormState);
      setFormError(null);
    },
    onError: () => setFormError('Failed to create device.'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ devicePublicId, status }: { devicePublicId: string; status: number }) =>
      updateDeviceStatus(devicePublicId, { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['devices'] });
      await queryClient.invalidateQueries({ queryKey: ['deviceAppStatuses'] });
      setMenuAnchor(null);
      setSelectedDevice(null);
    },
  });

  function handleCreateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const req: CreateDeviceRequest = {
      deviceName: formState.deviceName.trim(),
      serialNumber: formState.serialNumber.trim(),
      imei: formState.imei.trim(),
      installationId: formState.installationId.trim(),
      status: formState.status,
    };
    if (!req.deviceName || !req.serialNumber || !req.imei || !req.installationId) {
      setFormError('Please fill all required fields.');
      return;
    }
    setFormError(null);
    createMutation.mutate(req);
  }

  return (
    <>
      <PageHeader
        title="Devices"
        subtitle="Manage company tablets and mobile devices."
        actionLabel="Add Device"
        actionIcon={<AddIcon />}
        onActionClick={() => {
          setFormState(initialFormState);
          setFormError(null);
          setIsCreateDialogOpen(true);
        }}
      />

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}>
          <TextField
            placeholder="Search devices by name, serial, IMEI, or installation ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPageNumber(1); }}
            sx={{ maxWidth: { xs: 'none', sm: 400 }, flex: 1 }}
            aria-label="Search devices"
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
              <IconButton onClick={() => void refetch()} disabled={isFetching} aria-label="Refresh devices list">
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Paper>

      {isLoading && <LoadingState variant="table" />}
      {isError && <ErrorState message="Failed to load devices." onRetry={() => { void refetch(); }} />}
      {!isLoading && !isError && data && data.items.length === 0 && (
        <EmptyState title="No devices found" description="Add a new device or change your search filters." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: '100%', overflowX: 'auto' }}>
            <Table aria-label="Devices table" sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow>
                  <TableCell scope="col">Device</TableCell>
                  <TableCell scope="col">Installation ID</TableCell>
                  <TableCell scope="col">Assigned Engineer</TableCell>
                  <TableCell scope="col">Serial Number</TableCell>
                  <TableCell scope="col">IMEI</TableCell>
                  <TableCell scope="col">Status</TableCell>
                  <TableCell scope="col">Created</TableCell>
                  <TableCell scope="col" align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((device) => (
                  <TableRow key={device.publicId} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>{device.deviceName}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace' }}>
                        {device.publicId}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{device.installationId || '-'}</TableCell>
                    <TableCell>
                      {device.assignedEngineerName ? (
                        <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{device.assignedEngineerName}</Typography>
                      ) : (
                        <Typography sx={{ color: 'text.disabled', fontStyle: 'italic', fontSize: '0.85rem' }}>Unassigned</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{device.serialNumber}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{device.imei}</TableCell>
                    <TableCell><DeviceStatusChip status={device.status} /></TableCell>
                    <TableCell>{new Date(device.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Options">
                        <IconButton
                          size="small"
                          onClick={(e) => { setMenuAnchor(e.currentTarget); setSelectedDevice(device); }}
                          aria-label={`Options for ${device.deviceName}`}
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
          />
        </Paper>
      )}

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => { setMenuAnchor(null); setSelectedDevice(null); }}
      >
        <MenuItem
          disabled={selectedDevice?.status === ACTIVE_STATUS || updateStatusMutation.isPending}
          onClick={() => { if (selectedDevice) updateStatusMutation.mutate({ devicePublicId: selectedDevice.publicId, status: ACTIVE_STATUS }); }}
        >
          Mark as Active
        </MenuItem>
        <MenuItem
          disabled={selectedDevice?.status === INACTIVE_STATUS || updateStatusMutation.isPending}
          onClick={() => { if (selectedDevice) updateStatusMutation.mutate({ devicePublicId: selectedDevice.publicId, status: INACTIVE_STATUS }); }}
        >
          Mark as Inactive
        </MenuItem>
        <MenuItem
          disabled={selectedDevice?.status === BLOCKED_STATUS || updateStatusMutation.isPending}
          onClick={() => { if (selectedDevice) updateStatusMutation.mutate({ devicePublicId: selectedDevice.publicId, status: BLOCKED_STATUS }); }}
        >
          Mark as Blocked
        </MenuItem>
      </Menu>

      <Dialog
        open={isCreateDialogOpen}
        onClose={() => { if (!createMutation.isPending) { setIsCreateDialogOpen(false); setFormError(null); } }}
        fullWidth maxWidth="sm"
        aria-labelledby="create-device-title"
      >
        <Box component="form" onSubmit={handleCreateSubmit}>
          <DialogTitle id="create-device-title">Add Device</DialogTitle>
          <DialogContent>
            {formError && (
              <Typography color="error" sx={{ mb: 2, fontSize: '0.875rem' }}>{formError}</Typography>
            )}
            <TextField fullWidth label="Device Name" required value={formState.deviceName}
              onChange={(e) => setFormState((s) => ({ ...s, deviceName: e.target.value }))} sx={{ mt: 1, mb: 2 }} />
            <TextField fullWidth label="Serial Number" required value={formState.serialNumber}
              onChange={(e) => setFormState((s) => ({ ...s, serialNumber: e.target.value }))} sx={{ mb: 2 }} />
            <TextField fullWidth label="IMEI" required value={formState.imei}
              onChange={(e) => setFormState((s) => ({ ...s, imei: e.target.value }))} sx={{ mb: 2 }} />
            <TextField fullWidth label="Installation ID" required value={formState.installationId}
              onChange={(e) => setFormState((s) => ({ ...s, installationId: e.target.value }))} sx={{ mb: 2 }} />
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={formState.status}
                onChange={(e: SelectChangeEvent<number>) => setFormState((s) => ({ ...s, status: Number(e.target.value) }))}>
                <MenuItem value={ACTIVE_STATUS}>Active</MenuItem>
                <MenuItem value={INACTIVE_STATUS}>Inactive</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setIsCreateDialogOpen(false); setFormError(null); }} disabled={createMutation.isPending}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving...' : 'Save Device'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}