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
import {
  createDevice,
  getDevices,
  updateDeviceStatus,
} from '../api/devicesApi';
import type { CreateDeviceRequest, DeviceResponse } from '../types/devices';

const ACTIVE_STATUS = 1;
const INACTIVE_STATUS = 2;

interface DeviceFormState {
  deviceName: string;
  serialNumber: string;
  imei: string;
  status: number;
}

const initialFormState: DeviceFormState = {
  deviceName: '',
  serialNumber: '',
  imei: '',
  status: ACTIVE_STATUS,
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
    queryKey: ['devices', queryParams],
    queryFn: () => getDevices(queryParams),
  });

  const createMutation = useMutation({
    mutationFn: (request: CreateDeviceRequest) => createDevice(request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['devices'] });
      setIsCreateDialogOpen(false);
      setFormState(initialFormState);
      setFormError(null);
    },
    onError: () => {
      setFormError('Failed to create device.');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      devicePublicId,
      status,
    }: {
      devicePublicId: string;
      status: number;
    }) =>
      updateDeviceStatus(devicePublicId, {
        status,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['devices'] });
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

    const request: CreateDeviceRequest = {
      deviceName: formState.deviceName.trim(),
      serialNumber: formState.serialNumber.trim(),
      imei: formState.imei.trim(),
      status: formState.status,
    };

    if (!request.deviceName || !request.serialNumber || !request.imei) {
      setFormError('Please fill all required fields.');
      return;
    }

    setFormError(null);
    createMutation.mutate(request);
  }

  function handleOpenMenu(event: React.MouseEvent<HTMLElement>, device: DeviceResponse) {
    setMenuAnchor(event.currentTarget);
    setSelectedDevice(device);
  }

  function handleCloseMenu() {
    setMenuAnchor(null);
    setSelectedDevice(null);
  }

  function handleChangeDeviceStatus(status: number) {
    if (!selectedDevice) {
      return;
    }

    updateStatusMutation.mutate({
      devicePublicId: selectedDevice.publicId,
      status,
    });
  }

  return (
    <>
      <PageHeader
        title="Devices"
        subtitle="Manage company devices and activation status."
        actionLabel="Add Device"
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
            placeholder="Search devices..."
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

      {isLoading && <LoadingState message="Loading devices..." />}

      {isError && (
        <ErrorState
          message="Failed to load devices."
          onRetry={() => {
            void refetch();
          }}
        />
      )}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <EmptyState
          title="No devices found"
          description="Try changing your search filters or add a new device."
        />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Device</TableCell>
                  <TableCell>Serial Number</TableCell>
                  <TableCell>IMEI</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created At</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {data.items.map((device) => (
                  <TableRow key={device.publicId} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>{device.deviceName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {device.publicId}
                      </Typography>
                    </TableCell>

                    <TableCell>{device.serialNumber}</TableCell>

                    <TableCell>{device.imei}</TableCell>

                    <TableCell>
                      <DeviceStatusChip status={device.status} />
                    </TableCell>

                    <TableCell>
                      {new Date(device.createdAt).toLocaleDateString()}
                    </TableCell>

                    <TableCell align="right">
                      <IconButton onClick={(event) => handleOpenMenu(event, device)}>
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
          disabled={selectedDevice?.status === ACTIVE_STATUS || updateStatusMutation.isPending}
          onClick={() => handleChangeDeviceStatus(ACTIVE_STATUS)}
        >
          Mark as Active
        </MenuItem>

        <MenuItem
          disabled={selectedDevice?.status === INACTIVE_STATUS || updateStatusMutation.isPending}
          onClick={() => handleChangeDeviceStatus(INACTIVE_STATUS)}
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
          <DialogTitle>Add Device</DialogTitle>

          <DialogContent>
            {formError && (
              <Typography color="error" sx={{ mb: 2 }}>
                {formError}
              </Typography>
            )}

            <TextField
              fullWidth
              label="Device Name"
              value={formState.deviceName}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  deviceName: event.target.value,
                }))
              }
              sx={{ mt: 1, mb: 2 }}
            />

            <TextField
              fullWidth
              label="Serial Number"
              value={formState.serialNumber}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  serialNumber: event.target.value,
                }))
              }
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="IMEI"
              value={formState.imei}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  imei: event.target.value,
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