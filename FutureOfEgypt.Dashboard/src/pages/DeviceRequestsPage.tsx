import { useMemo, useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
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
  Tab,
  Tabs,
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
  getDeviceRequests,
  rejectDeviceRequest,
} from '../api/deviceRequestsApi';
import type { DeviceAccessRequestResponse } from '../types/deviceRequests';

export function DeviceRequestsPage() {
  const queryClient = useQueryClient();

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(1);

  const [selectedRequest, setSelectedRequest] =
    useState<DeviceAccessRequestResponse | null>(null);

  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [approveOverrideNote, setApproveOverrideNote] = useState('');
  const [approveError, setApproveError] = useState<string | null>(null);

  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  const queryParams = useMemo(
    () => ({ pageNumber, pageSize, search: search.trim() || undefined, status: statusFilter === 0 ? undefined : statusFilter }),
    [pageNumber, pageSize, search, statusFilter],
  );

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['device-requests', queryParams],
    queryFn: () => getDeviceRequests(queryParams),
  });

  // ── Mutations ─────────────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: ({ requestPublicId, reviewNote }: { requestPublicId: string; reviewNote?: string }) =>
      approveDeviceRequest(requestPublicId, { reviewNote }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['device-requests'] });
      setIsApproveDialogOpen(false);
      setSelectedRequest(null);
      setApproveOverrideNote('');
      setApproveError(null);
    },
    onError: () => setApproveError('Failed to approve request.'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ requestPublicId, reason }: { requestPublicId: string; reason: string }) =>
      rejectDeviceRequest(requestPublicId, { reviewNote: reason }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['device-requests'] });
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
    setApproveOverrideNote('');
    setApproveError(null);
    setIsApproveDialogOpen(true);
  }

  function handleCloseApproveDialog() {
    if (approveMutation.isPending) return;
    setIsApproveDialogOpen(false);
    setSelectedRequest(null);
    setApproveOverrideNote('');
    setApproveError(null);
  }

  function handleApproveSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedRequest) return;
    
    const isRejected = selectedRequest.status === 3;
    const note = approveOverrideNote.trim();
    if (isRejected && !note) {
      setApproveError('Please enter an override note to approve this rejected request.');
      return;
    }
    setApproveError(null);
    approveMutation.mutate({
      requestPublicId: selectedRequest.publicId,
      reviewNote: note || undefined,
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

      <Tabs
        value={statusFilter}
        onChange={(_, newValue) => { setStatusFilter(newValue); setPageNumber(1); }}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2 }}
      >
        <Tab label="All" value={0} />
        <Tab label="Pending" value={1} />
        <Tab label="Approved" value={2} />
        <Tab label="Rejected" value={3} />
        <Tab label="Cancelled" value={4} />
      </Tabs>

      {/* Search bar */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}>
          <TextField
            placeholder="Search requests..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPageNumber(1); }}
            sx={{ maxWidth: { xs: 'none', sm: 400 }, flex: 1 }}
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
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: '100%', overflowX: 'auto' }}>
            <Table aria-label="Device requests table" sx={{ minWidth: 800 }}>
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
                        {(request.matchedDeviceName ?? request.requestedDeviceName) || (
                          <Box component="span" sx={{ color: 'text.disabled', fontStyle: 'italic', fontWeight: 400 }}>
                            Not assigned
                          </Box>
                        )}
                      </Typography>
                      {(request.matchedDevicePublicId || request.devicePublicId) && (
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled', fontFamily: 'monospace' }}>
                          {request.matchedDevicePublicId || request.devicePublicId}
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
                      {request.status === 3 && request.reviewNote && (
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary', maxWidth: 200, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                          Note: {request.reviewNote}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(request.requestedAtUtc).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      {(request.status === 1 || request.status === 3) && (
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                          <Tooltip title={request.status === 3 ? "Approve Anyway" : "Approve Request"}>
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleOpenApproveDialog(request)}
                              aria-label={request.status === 3 ? `Approve request from ${request.engineerName} anyway` : `Approve request from ${request.engineerName}`}
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
                          {request.status === 1 && (
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
                          )}
                        </Box>
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

      {/* ── Approve Dialog ──────────── */}
      <Dialog
        open={isApproveDialogOpen}
        onClose={handleCloseApproveDialog}
        fullWidth
        maxWidth="sm"
        aria-labelledby="approve-dialog-title"
      >
        <Box component="form" onSubmit={handleApproveSubmit}>
          <DialogTitle id="approve-dialog-title">
            {selectedRequest?.status === 3 ? 'Override Approve Device Request' : 'Approve Device Request'}
          </DialogTitle>
          <DialogContent>
            {selectedRequest && (
              <Box
                sx={{
                  p: 2,
                  mb: 2,
                  borderRadius: '8px',
                  backgroundColor: 'action.hover',
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5
                }}
              >
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Engineer
                  </Typography>
                  <Typography sx={{ fontWeight: 600 }}>{selectedRequest.engineerName}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {selectedRequest.matchedDeviceName ? 'Matched Device' : 'Device'}
                  </Typography>
                  <Typography sx={{ fontWeight: 600 }}>{(selectedRequest.matchedDeviceName ?? selectedRequest.requestedDeviceName) || 'Unknown Device Name'}</Typography>
                  
                  {selectedRequest.matchedDeviceName && (
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>
                      Requested name: {selectedRequest.requestedDeviceName}
                    </Typography>
                  )}

                  <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontFamily: 'monospace', mt: 0.5 }}>
                    Installation ID: {selectedRequest.installationId}
                  </Typography>
                  {selectedRequest.serialNumber && (
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontFamily: 'monospace' }}>
                      Serial: {selectedRequest.serialNumber}
                    </Typography>
                  )}
                  {selectedRequest.imei && (
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontFamily: 'monospace' }}>
                      IMEI: {selectedRequest.imei}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}

            {selectedRequest?.status === 3 && (
              <Box sx={{ mb: 2, p: 1.5, border: '1px dashed', borderColor: 'warning.main', borderRadius: '8px', bgcolor: 'rgba(245,158,11,0.05)' }}>
                <Typography variant="body2" sx={{ color: 'warning.dark', fontWeight: 600, mb: 0.5 }}>
                  This request was previously rejected.
                </Typography>
                {selectedRequest.reviewNote && (
                  <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary' }}>
                    Original Rejection Reason: {selectedRequest.reviewNote}
                  </Typography>
                )}
                <TextField
                  fullWidth
                  label="Override Note"
                  placeholder="Explain why you are approving this rejected request..."
                  multiline
                  minRows={2}
                  value={approveOverrideNote}
                  onChange={(e) => setApproveOverrideNote(e.target.value)}
                  required
                  aria-label="Override note"
                />
              </Box>
            )}

            {approveError && (
              <Typography color="error" sx={{ mb: 2, fontSize: '0.875rem' }}>{approveError}</Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseApproveDialog} disabled={approveMutation.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="success"
              disabled={approveMutation.isPending}
              startIcon={<CheckIcon />}
            >
              {approveMutation.isPending ? 'Approving...' : (selectedRequest?.status === 3 ? 'Approve Anyway' : 'Approve Request')}
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