import { useMemo, useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
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
import { DeviceRequestStatusChip } from '../components/status/DeviceRequestStatusChip';
import {
  approveDeviceRequest,
  getPendingDeviceRequests,
  rejectDeviceRequest,
} from '../api/deviceRequestsApi';
import { getDevices } from '../api/devicesApi';
import type { DeviceAccessRequestResponse } from '../types/deviceRequests';
import type { DeviceResponse } from '../types/devices';

export function DeviceRequestsPage() {
  const queryClient = useQueryClient();

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');

  const [selectedRequest, setSelectedRequest] =
    useState<DeviceAccessRequestResponse | null>(null);

  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceResponse | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);

  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  const queryParams = useMemo(
    () => ({ pageNumber, pageSize, search: search.trim() || undefined }),
    [pageNumber, pageSize, search],
  );

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['pending-device-requests', queryParams],
    queryFn: () => getPendingDeviceRequests(queryParams),
  });

  // Devices for Autocomplete — only loaded when approve dialog is open
  const { data: devicesData, isLoading: isDevicesLoading } = useQuery({
    queryKey: ['devices-all'],
    queryFn: () => getDevices({ pageNumber: 1, pageSize: 200 }),
    staleTime: 5 * 60_000,
    enabled: isApproveDialogOpen,
  });
  const devices = devicesData?.items ?? [];

  // ── Mutations ─────────────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: ({ requestPublicId, devicePublicId }: { requestPublicId: string; devicePublicId: string }) =>
      approveDeviceRequest(requestPublicId, { devicePublicId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pending-device-requests'] });
      setIsApproveDialogOpen(false);
      setSelectedRequest(null);
      setSelectedDevice(null);
      setApproveError(null);
    },
    onError: () => setApproveError('Failed to approve request.'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ requestPublicId, reason }: { requestPublicId: string; reason: string }) =>
      rejectDeviceRequest(requestPublicId, { rejectionReason: reason }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pending-device-requests'] });
      setIsRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
      setRejectError(null);
    },
    onError: () => setRejectError('Failed to reject request.'),
  });

  // ── Handlers ──────────────────────────────────────────────────
  function handleOpenApproveDialog(request: DeviceAccessRequestResponse) {
    setSelectedRequest(request);
    setSelectedDevice(null);
    setApproveError(null);
    setIsApproveDialogOpen(true);
  }

  function handleCloseApproveDialog() {
    if (approveMutation.isPending) return;
    setIsApproveDialogOpen(false);
    setSelectedRequest(null);
    setSelectedDevice(null);
    setApproveError(null);
  }

  function handleApproveSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedRequest) return;
    if (!selectedDevice) {
      setApproveError('Please select a device.');
      return;
    }
    setApproveError(null);
    approveMutation.mutate({
      requestPublicId: selectedRequest.publicId,
      devicePublicId: selectedDevice.publicId,
    });
  }

  function handleOpenRejectDialog(request: DeviceAccessRequestResponse) {
    setSelectedRequest(request);
    setRejectionReason('');
    setRejectError(null);
    setIsRejectDialogOpen(true);
  }

  function handleCloseRejectDialog() {
    if (rejectMutation.isPending) return;
    setIsRejectDialogOpen(false);
    setSelectedRequest(null);
    setRejectionReason('');
    setRejectError(null);
  }

  function handleRejectSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedRequest) return;
    const reason = rejectionReason.trim();
    if (!reason) { setRejectError('Please enter a rejection reason.'); return; }
    setRejectError(null);
    rejectMutation.mutate({ requestPublicId: selectedRequest.publicId, reason });
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      <PageHeader
        title="Device Requests"
        subtitle="Review pending device access requests from engineers."
      />

      {/* Search bar */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
          <TextField
            placeholder="Search requests..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPageNumber(1); }}
            sx={{ maxWidth: 400 }}
            aria-label="Search device requests"
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
              <IconButton onClick={() => void refetch()} disabled={isFetching} aria-label="Refresh requests">
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Paper>

      {isLoading && <LoadingState variant="table" />}
      {isError && (
        <ErrorState message="Failed to load device requests." onRetry={() => { void refetch(); }} />
      )}
      {!isLoading && !isError && data && data.items.length === 0 && (
        <EmptyState
          title="No pending requests"
          description="There are no device access requests waiting for review."
        />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <Paper>
          <TableContainer>
            <Table aria-label="Device requests table">
              <TableHead>
                <TableRow>
                  <TableCell scope="col">Engineer</TableCell>
                  <TableCell scope="col">Device</TableCell>
                  <TableCell scope="col">Installation ID</TableCell>
                  <TableCell scope="col">Status</TableCell>
                  <TableCell scope="col">Requested At</TableCell>
                  <TableCell scope="col" align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((request) => (
                  <TableRow key={request.publicId} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        {request.engineerName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace' }}>
                        {request.engineerPublicId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        {request.deviceName || (
                          <Box component="span" sx={{ color: 'text.disabled', fontStyle: 'italic', fontWeight: 400 }}>
                            Not assigned
                          </Box>
                        )}
                      </Typography>
                      {request.devicePublicId && (
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace' }}>
                          {request.devicePublicId}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                        {request.installationId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <DeviceRequestStatusChip status={request.status} />
                    </TableCell>
                    <TableCell>
                      {new Date(request.requestedAtUtc).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <Tooltip title="Approve Request">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleOpenApproveDialog(request)}
                            aria-label={`Approve request from ${request.engineerName}`}
                            sx={{
                              border: '1px solid',
                              borderColor: 'success.main',
                              borderRadius: '8px',
                              '&:hover': { backgroundColor: 'rgba(16,185,129,0.08)' },
                            }}
                          >
                            <CheckIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject Request">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleOpenRejectDialog(request)}
                            aria-label={`Reject request from ${request.engineerName}`}
                            sx={{
                              border: '1px solid',
                              borderColor: 'error.main',
                              borderRadius: '8px',
                              '&:hover': { backgroundColor: 'rgba(239,68,68,0.08)' },
                            }}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
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

      {/* ── Approve Dialog — searchable Device dropdown ──────────── */}
      <Dialog
        open={isApproveDialogOpen}
        onClose={handleCloseApproveDialog}
        fullWidth
        maxWidth="sm"
        aria-labelledby="approve-dialog-title"
      >
        <Box component="form" onSubmit={handleApproveSubmit}>
          <DialogTitle id="approve-dialog-title">Approve Device Request</DialogTitle>
          <DialogContent>
            {/* Engineer info */}
            {selectedRequest && (
              <Box
                sx={{
                  p: 1.5,
                  mb: 2,
                  borderRadius: '8px',
                  backgroundColor: 'action.hover',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Engineer
                </Typography>
                <Typography sx={{ fontWeight: 600, mt: 0.25 }}>{selectedRequest.engineerName}</Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace' }}>
                  Installation ID: {selectedRequest.installationId}
                </Typography>
              </Box>
            )}

            {approveError && (
              <Typography color="error" sx={{ mb: 2, fontSize: '0.875rem' }}>{approveError}</Typography>
            )}

            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
              Select the device to assign to this engineer:
            </Typography>

            {/* ✅ FIX: Searchable Autocomplete instead of raw text field */}
            <Autocomplete
              options={devices}
              loading={isDevicesLoading}
              getOptionLabel={(opt) => `${opt.deviceName} — ${opt.serialNumber}`}
              value={selectedDevice}
              onChange={(_, val) => setSelectedDevice(val)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Device"
                  placeholder="Search by device name or serial..."
                  required
                />
              )}
              renderOption={(props, opt) => (
                <Box component="li" {...props} key={opt.publicId}>
                  <Box>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>{opt.deviceName}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                      {opt.serialNumber}
                    </Typography>
                  </Box>
                </Box>
              )}
              noOptionsText="No devices found"
              aria-label="Select device for approval"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseApproveDialog} disabled={approveMutation.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="success"
              disabled={approveMutation.isPending || !selectedDevice}
              startIcon={<CheckIcon />}
            >
              {approveMutation.isPending ? 'Approving...' : 'Approve'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* ── Reject Dialog ────────────────────────────────────────── */}
      <Dialog
        open={isRejectDialogOpen}
        onClose={handleCloseRejectDialog}
        fullWidth
        maxWidth="sm"
        aria-labelledby="reject-dialog-title"
      >
        <Box component="form" onSubmit={handleRejectSubmit}>
          <DialogTitle id="reject-dialog-title">Reject Device Request</DialogTitle>
          <DialogContent>
            {/* Engineer info */}
            {selectedRequest && (
              <Box
                sx={{
                  p: 1.5,
                  mb: 2,
                  borderRadius: '8px',
                  backgroundColor: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}
              >
                <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Rejecting request from
                </Typography>
                <Typography sx={{ fontWeight: 600, mt: 0.25 }}>{selectedRequest.engineerName}</Typography>
              </Box>
            )}

            {rejectError && (
              <Typography color="error" sx={{ mb: 2, fontSize: '0.875rem' }}>{rejectError}</Typography>
            )}

            <TextField
              fullWidth
              label="Rejection Reason"
              placeholder="Explain why this request is being rejected..."
              multiline
              minRows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              required
              aria-label="Rejection reason"
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseRejectDialog} disabled={rejectMutation.isPending}>
              Cancel
            </Button>
            <Button
              color="error"
              type="submit"
              variant="contained"
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
              startIcon={<CloseIcon />}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject Request'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}