import { Box, Paper, Typography } from '@mui/material';
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
import { getDashboardSummary, getEngineersStatus } from '../api/dashboardApi';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '@mui/material/styles';

export function OverviewPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
    refetchInterval: 60_000,
  });

  const { data: statusData } = useQuery({
    queryKey: ['engineers-status'],
    queryFn: getEngineersStatus,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Overview"
          subtitle="Real-time summary of engineers, devices, assignments, and requests."
        />
        <LoadingState variant="cards" />
      </>
    );
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

      {/* Charts Section */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 2.5, mt: 3 }}>
        <Paper sx={{ p: 3, background: isDark ? 'rgba(10, 15, 30, 0.4)' : 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(10px)', border: `1px solid ${isDark ? 'rgba(0, 240, 255, 0.1)' : 'rgba(0,0,0,0.05)'}`, borderRadius: 3, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" sx={{ color: isDark ? '#fff' : '#000', mb: 3, fontWeight: 600 }}>Resource Utilization</Typography>
          <Box sx={{ display: 'flex', width: '100%', flex: 1, minHeight: 250, gap: 2 }}>
            
            {/* Devices Donut */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="subtitle2" sx={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', mb: 1, fontWeight: 600 }}>Devices</Typography>
              <Box sx={{ width: '100%', flex: 1, position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data ? [
                        { name: 'Assigned', value: data.activeAssignments, color: '#00F0FF' },
                        { name: 'Unassigned', value: Math.max(0, data.totalDevices - data.activeAssignments), color: isDark ? 'rgba(0, 240, 255, 0.15)' : 'rgba(0, 240, 255, 0.3)' },
                      ] : []}
                      cx="50%"
                      cy="50%"
                      innerRadius="65%"
                      outerRadius="85%"
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={6}
                    >
                      {(data ? [1, 2] : []).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#00F0FF' : (isDark ? 'rgba(0, 240, 255, 0.15)' : 'rgba(0, 240, 255, 0.3)')} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: isDark ? 'rgba(10, 15, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)', borderColor: isDark ? 'rgba(0, 240, 255, 0.2)' : 'rgba(0,0,0,0.1)', borderRadius: '8px', color: isDark ? '#fff' : '#000' }}
                      itemStyle={{ color: isDark ? '#fff' : '#000' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <Typography variant="h5" sx={{ color: '#00F0FF', fontWeight: 700 }}>
                    {data && data.totalDevices > 0 ? Math.round((data.activeAssignments / data.totalDevices) * 100) : 0}%
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', mt: 1 }}>Assigned Devices</Typography>
            </Box>

            {/* Engineers Donut */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="subtitle2" sx={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', mb: 1, fontWeight: 600 }}>Engineers</Typography>
              <Box sx={{ width: '100%', flex: 1, position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data ? [
                        { name: 'Active', value: data.activeEngineers, color: '#8b5cf6' },
                        { name: 'Inactive', value: Math.max(0, data.totalEngineers - data.activeEngineers), color: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.3)' },
                      ] : []}
                      cx="50%"
                      cy="50%"
                      innerRadius="65%"
                      outerRadius="85%"
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={6}
                    >
                      {(data ? [1, 2] : []).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#8b5cf6' : (isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.3)')} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: isDark ? 'rgba(10, 15, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)', borderColor: isDark ? 'rgba(0, 240, 255, 0.2)' : 'rgba(0,0,0,0.1)', borderRadius: '8px', color: isDark ? '#fff' : '#000' }}
                      itemStyle={{ color: isDark ? '#fff' : '#000' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <Typography variant="h5" sx={{ color: '#8b5cf6', fontWeight: 700 }}>
                    {data && data.totalEngineers > 0 ? Math.round((data.activeEngineers / data.totalEngineers) * 100) : 0}%
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', mt: 1 }}>Active Field Engineers</Typography>
            </Box>

          </Box>
        </Paper>

        <Paper sx={{ p: 3, background: isDark ? 'rgba(10, 15, 30, 0.4)' : 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(10px)', border: `1px solid ${isDark ? 'rgba(0, 240, 255, 0.1)' : 'rgba(0,0,0,0.05)'}`, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ color: isDark ? '#fff' : '#000', mb: 3, fontWeight: 600 }}>Current Status</Typography>
          <Box sx={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={statusData ? [
                { name: 'Online', count: statusData.onlineCount, fill: '#10b981' },
                { name: 'Offline', count: statusData.offlineCount, fill: '#94a3b8' },
                { name: 'Unassigned', count: statusData.neverConnectedCount, fill: '#ef4444' }
              ] : []} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} horizontal={false} />
                <XAxis type="number" stroke={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"} tick={{fill: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'}} />
                <YAxis dataKey="name" type="category" width={100} stroke={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"} tick={{fill: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', textAnchor: 'middle', dx: -45}} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}}
                  contentStyle={{ backgroundColor: isDark ? 'rgba(10, 15, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)', borderColor: isDark ? 'rgba(0, 240, 255, 0.2)' : 'rgba(0,0,0,0.1)', borderRadius: '8px', color: isDark ? '#fff' : '#000' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      </Box>
    </>
  );
}