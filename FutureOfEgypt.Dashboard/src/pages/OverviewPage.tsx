import { Box } from '@mui/material';
import EngineeringIcon from '@mui/icons-material/Engineering';
import DevicesIcon from '@mui/icons-material/Devices';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../components/common/PageHeader';
import { StatCard } from '../components/common/StatCard';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { getDashboardSummary } from '../api/dashboardApi';

export function OverviewPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return <LoadingState message="Loading dashboard summary..." />;
  }

  if (isError || !data) {
    return (
      <ErrorState
        message="Failed to load dashboard summary."
        onRetry={() => { void refetch(); }}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="Real-time summary of engineers, devices, assignments, and requests."
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 2.5,
        }}
      >
        <StatCard
            title="Total Engineers"
            value={data.totalEngineers}
            icon={<EngineeringIcon />}
            helperText={`${data.activeEngineers} active`}
            accent="default"
          />

        <StatCard
            title="Total Devices"
            value={data.totalDevices}
            icon={<DevicesIcon />}
            helperText={`${data.activeDevices} active`}
            accent="info"
          />

        <StatCard
            title="Active Assignments"
            value={data.activeAssignments}
            icon={<AssignmentIcon />}
            helperText="Currently assigned devices"
            accent="success"
          />

        <StatCard
            title="Pending Requests"
            value={data.pendingDeviceAccessRequests}
            icon={<PendingActionsIcon />}
            helperText="Awaiting admin action"
            accent={data.pendingDeviceAccessRequests > 0 ? 'warning' : 'default'}
          />

        <StatCard
            title="Online Engineers"
            value={data.onlineEngineers}
            icon={<WifiIcon />}
            helperText="Recently active"
            accent="success"
            trend={data.onlineEngineers > 0 ? 'up' : 'neutral'}
          />

        <StatCard
            title="Offline Engineers"
            value={data.offlineEngineers}
            icon={<WifiOffIcon />}
            helperText="No recent location update"
            accent={data.offlineEngineers > 0 ? 'error' : 'default'}
          />
      </Box>
    </>
  );
}