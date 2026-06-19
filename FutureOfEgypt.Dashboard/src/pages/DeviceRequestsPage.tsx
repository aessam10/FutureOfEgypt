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
import type { DeviceAccessRequestResponse } from '../types/deviceRequests';

export function DeviceRequestsPage() {
  const queryClient = useQueryClient();

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');

  const [selectedRequest, setSelectedRequest] =
    useState<DeviceAccessRequestResponse | null>(null);

  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [approveDevicePublicId, setApproveDevicePublicId] = useState('');
  const [approveError, setApproveError] = useState<string | null>(null);

  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

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
    queryKey: ['pending-device-requests', queryParams],
    queryFn: () => getPendingDeviceRequests(queryParams),
  });

  const approveMutation = useMutation({
    mutationFn: ({
      requestPublicId,
      devicePublicId,
    }: {
      requestPublicId: string;
      devicePublicId: string;
    }) =>
      approveDeviceRequest(requestPublicId, {
        devicePublicId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pending-device-requests'] });
      setIsApproveDialogOpen(false);
      setSelectedRequest(null);
      setApproveDevicePublicId('');
      setApproveError(null);
    },
    onError: () => {
      setApproveError('Failed to approve request.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({
      requestPublicId,
      reason,
    }: {
      requestPublicId: string;
      reason: string;
    }) =>
      rejectDeviceRequest(requestPublicId, {
        rejectionReason: reason,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pending-device-requests'] });
      setIsRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
      setRejectError(null);
    },
    onError: () => {
      setRejectError('Failed to reject request.');
    },
  });

  function handleSearchChange(value: string) {
    setSearch(value);
    setPageNumber(1);
  }

  function handleOpenApproveDialog(request: DeviceAccessRequestResponse) {
    setSelectedRequest(request);
    setApproveDevicePublicId(request.devicePublicId ?? '');
    setApproveError(null);
    setIsApproveDialogOpen(true);
  }

  function handleCloseApproveDialog() {
    if (approveMutation.isPending) {
      return;
    }

    setIsApproveDialogOpen(false);
    setSelectedRequest(null);
    setApproveDevicePublicId('');
    setApproveError(null);
  }

  function handleApproveSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedRequest) {
      return;
    }

    const devicePublicId = approveDevicePublicId.trim();

    if (!devicePublicId) {
      setApproveError('Please enter device public id.');
      return;
    }

    setApproveError(null);

    approveMutation.mutate({
      requestPublicId: selectedRequest.publicId,
      devicePublicId,
    });
  }

  function handleOpenRejectDialog(request: DeviceAccessRequestResponse) {
    setSelectedRequest(request);
    setRejectionReason('');
    setRejectError(null);
    setIsRejectDialogOpen(true);
  }

  function handleCloseRejectDialog() {
    if (rejectMutation.isPending) {
      return;
    }

    setIsRejectDialogOpen(false);
    setSelectedRequest(null);
    setRejectionReason('');
    setRejectError(null);
  }

  function handleRejectSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedRequest) {
      return;
    }

    const reason = rejectionReason.trim();

    if (!reason) {
      setRejectError('Please enter rejection reason.');
      return;
    }

    setRejectError(null);

    rejectMutation.mutate({
      requestPublicId: selectedRequest.publicId,
      reason,
    });
  }

  return (
    <>
      <PageHeader
        title="Device Requests"
        subtitle="Review pending device access requests from engineers."
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
            placeholder="Search requests..."
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

      {isLoading && <LoadingState message="Loading device requests..." />}

      {isError && (
        <ErrorState
          message="Failed to load device requests."
          onRetry={() => {
            void refetch();
          }}
        />
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
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Engineer</TableCell>
                  <TableCell>Device</TableCell>
                  <TableCell>Installation Id</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Requested At</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {data.items.map((request) => (
                  <TableRow key={request.publicId} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>
                        {request.engineerName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {request.engineerPublicId}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>
                        {request.deviceName || 'Not assigned yet'}
                      </Typography>
                      {request.devicePublicId && (
                        <Typography variant="caption" color="text.secondary">
                          {request.devicePublicId}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>{request.installationId}</TableCell>

                    <TableCell>
                      <DeviceRequestStatusChip status={request.status} />
                    </TableCell>

                    <TableCell>
                      {new Date(request.requestedAtUtc).toLocaleDateString()}
                    </TableCell>

                    <TableCell align="right">
                      <Tooltip title="Approve">
                        <IconButton
                          color="success"
                          onClick={() => handleOpenApproveDialog(request)}
                        >
                          <CheckIcon />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Reject">
                        <IconButton
                          color="error"
                          onClick={() => handleOpenRejectDialog(request)}
                        >
                          <CloseIcon />
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
        open={isApproveDialogOpen}
        onClose={handleCloseApproveDialog}
        fullWidth
        maxWidth="sm"
      >
        <Box component="form" onSubmit={handleApproveSubmit}>
          <DialogTitle>Approve Device Request</DialogTitle>

          <DialogContent>
            {approveError && (
              <Typography color="error" sx={{ mb: 2 }}>
                {approveError}
              </Typography>
            )}

            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Enter the device public id that should be approved for this engineer.
            </Typography>

            <TextField
              fullWidth
              label="Device Public Id"
              value={approveDevicePublicId}
              onChange={(event) => setApproveDevicePublicId(event.target.value)}
              sx={{ mt: 1 }}
            />
          </DialogContent>

          <DialogActions>
            <Button onClick={handleCloseApproveDialog} disabled={approveMutation.isPending}>
              Cancel
            </Button>

            <Button type="submit" variant="contained" disabled={approveMutation.isPending}>
              {approveMutation.isPending ? 'Approving...' : 'Approve'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog
        open={isRejectDialogOpen}
        onClose={handleCloseRejectDialog}
        fullWidth
        maxWidth="sm"
      >
        <Box component="form" onSubmit={handleRejectSubmit}>
          <DialogTitle>Reject Device Request</DialogTitle>

          <DialogContent>
            {rejectError && (
              <Typography color="error" sx={{ mb: 2 }}>
                {rejectError}
              </Typography>
            )}

            <TextField
              fullWidth
              label="Rejection Reason"
              multiline
              minRows={3}
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              sx={{ mt: 1 }}
            />
          </DialogContent>

          <DialogActions>
            <Button onClick={handleCloseRejectDialog} disabled={rejectMutation.isPending}>
              Cancel
            </Button>

            <Button color="error" type="submit" variant="contained" disabled={rejectMutation.isPending}>
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}