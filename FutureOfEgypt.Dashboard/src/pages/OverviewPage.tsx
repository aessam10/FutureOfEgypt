import { Grid } from '@mui/material';
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
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
  });

  if (isLoading) {
    return <LoadingState message="Loading dashboard summary..." />;
  }

  if (isError || !data) {
    return (
      <ErrorState
        message="Failed to load dashboard summary."
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="Quick summary of engineers, devices, assignments, and requests."
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Engineers"
            value={data.totalEngineers}
            icon={<EngineeringIcon />}
            helperText={`${data.activeEngineers} active`}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Devices"
            value={data.totalDevices}
            icon={<DevicesIcon />}
            helperText={`${data.activeDevices} active`}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Active Assignments"
            value={data.activeAssignments}
            icon={<AssignmentIcon />}
            helperText="Currently assigned devices"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Pending Requests"
            value={data.pendingDeviceAccessRequests}
            icon={<PendingActionsIcon />}
            helperText="Awaiting admin action"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Online Engineers"
            value={data.onlineEngineers}
            icon={<WifiIcon />}
            helperText="Recently active"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Offline Engineers"
            value={data.offlineEngineers}
            icon={<WifiOffIcon />}
            helperText="No recent location update"
          />
        </Grid>
      </Grid>
    </>
  );
}