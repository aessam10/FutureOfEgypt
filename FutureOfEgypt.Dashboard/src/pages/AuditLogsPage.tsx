import { useMemo, useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Box,
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
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../components/common/PageHeader';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { getAuditLogs } from '../api/auditLogsApi';

export function AuditLogsPage() {
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');

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
    queryKey: ['audit-logs', queryParams],
    queryFn: () => getAuditLogs(queryParams),
  });

  function handleSearchChange(value: string) {
    setSearch(value);
    setPageNumber(1);
  }

  return (
    <>
      <PageHeader
        title="Audit Logs"
        subtitle="Track important actions performed inside the system."
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
            placeholder="Search audit logs..."
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

      {isLoading && <LoadingState message="Loading audit logs..." />}

      {isError && (
        <ErrorState
          message="Failed to load audit logs."
          onRetry={() => {
            void refetch();
          }}
        />
      )}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <EmptyState
          title="No audit logs found"
          description="No actions have been recorded yet."
        />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Action</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Entity</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Created At</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {data.items.map((log) => (
                  <TableRow key={log.publicId} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700 }}>{log.action}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {log.publicId}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography>{log.userName || 'System'}</Typography>

                      {log.userId && (
                        <Typography variant="caption" color="text.secondary">
                          {log.userId}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <Typography>{log.entityName || '—'}</Typography>

                      {log.entityPublicId && (
                        <Typography variant="caption" color="text.secondary">
                          {log.entityPublicId}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell sx={{ maxWidth: 420 }}>
                      <Typography variant="body2">
                        {log.description || '—'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      {new Date(log.createdAtUtc).toLocaleString()}
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
    </>
  );
}