import React, { useMemo, useEffect, useState } from 'react';
import { Box, Paper, Typography, Button, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, useTheme, GlobalStyles, Snackbar, Alert, Slider, FormControlLabel, Checkbox } from '@mui/material';
import { Marker, Popup, TileLayer, MapContainer, useMap, Polyline, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import CloseIcon from '@mui/icons-material/Close';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../components/common/PageHeader';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { getLatestLocations, getDeviceLocationHistory, hideLatestLocation, unhideLatestLocation, getHiddenLatestLocations } from '../api/trackingApi';
import { createLocationHubConnection } from '../signalr/locationHub';
import type { LatestLocationResponse, LocationReceivedEvent } from '../types/tracking';

// ─── Map center (Egypt) ───────────────────────────────────────────────────────
const DEFAULT_CENTER: [number, number] = [26.8206, 30.8025];
const ONLINE_THRESHOLD_MINUTES = 15;

// Parse UTC date strings reliably — handles missing 'Z' suffix from API
function safeDate(utcStr: string | null | undefined): Date | null {
  if (!utcStr) return null;
  const normalized = /[Zz+\-]\d*$/.test(utcStr.trim()) ? utcStr : `${utcStr}Z`;
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

// ─── Distance Helper ──────────────────────────────────────────────────────────
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// ─── Route Point Interface ────────────────────────────────────────────────────
export interface RoutePoint {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  recordedAt: string;
}

// ─── Filter & Downsample ──────────────────────────────────────────────────────
function filterAndDownsampleRoute(points: RoutePoint[]): RoutePoint[] {
  if (points.length === 0) return points;

  // 1. Filter noisy and duplicate points
  const filtered: RoutePoint[] = [];
  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    
    // Ignore points with accuracy > 50m (if accuracy exists)
    if (pt.accuracy != null && pt.accuracy > 50) continue;
    
    if (filtered.length > 0) {
      const prev = filtered[filtered.length - 1];
      
      // Exact duplicate
      if (pt.latitude === prev.latitude && pt.longitude === prev.longitude) continue;
      
      // Distance < 10m
      const dist = calculateDistance(prev.latitude, prev.longitude, pt.latitude, pt.longitude);
      if (dist < 10) continue;
    }
    filtered.push(pt);
  }

  // 2. Downsample if > 200
  if (filtered.length <= 200) return filtered;

  const result: RoutePoint[] = [filtered[0]];
  const step = (filtered.length - 2) / 198; // We need 198 points from the middle
  for (let i = 1; i <= 198; i++) {
    const idx = Math.floor(step * i);
    result.push(filtered[idx]);
  }
  result.push(filtered[filtered.length - 1]);

  return result;
}

// ─── Custom marker icons ──────────────────────────────────────────────────────
function createPinIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
    html: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="28" height="37">
        <path d="M12 0C7.59 0 4 3.59 4 8c0 5.57 8 16 8 16s8-10.43 8-16c0-4.41-3.59-8-8-8z"
          fill="${color}" stroke="white" stroke-width="1.5"/>
        <circle cx="12" cy="8" r="3" fill="white"/>
      </svg>
    `,
  });
}

const ONLINE_ICON = createPinIcon('#10b981');   // Green
const OFFLINE_ICON = createPinIcon('#94a3b8');  // Gray
const MOCKED_ICON = createPinIcon('#ef4444');   // Red

function getMarkerIcon(location: LatestLocationResponse): L.DivIcon {
  if (location.isMocked) return MOCKED_ICON;
  const isOnline = isLocationOnline(location.receivedAt);
  return isOnline ? ONLINE_ICON : OFFLINE_ICON;
}

function isLocationOnline(dateStr: string): boolean {
  const d = safeDate(dateStr);
  if (!d) return false;
  const diffMs = Date.now() - d.getTime();
  return diffMs <= ONLINE_THRESHOLD_MINUTES * 60 * 1000;
}

function formatLastSeen(dateStr: string): string {
  const d = safeDate(dateStr);
  if (!d) return 'Unknown';
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString();
}

// ─── Map recenter helper ──────────────────────────────────────────────────────
function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

// ─── Map Route Fitter helper ──────────────────────────────────────────────────
function MapRouteFitter({ routeHistory, liveLocation }: { routeHistory: RoutePoint[], liveLocation?: LatestLocationResponse }) {
  const map = useMap();
  useEffect(() => {
    if (routeHistory.length >= 2) {
      const bounds = L.latLngBounds(routeHistory.map(p => [p.latitude, p.longitude]));
      if (liveLocation) {
        bounds.extend([liveLocation.latitude, liveLocation.longitude]);
      }
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });
    }
  }, [routeHistory, liveLocation, map]);
  return null;
}

// ─── Animated Route Path ──────────────────────────────────────────────────────
function AnimatedRoutePath({ points, speedMs }: { points: RoutePoint[], speedMs: number }) {
  const [visiblePoints, setVisiblePoints] = useState<[number, number][]>([]);

  useEffect(() => {
    if (points.length < 2) return;

    let startTime: number | null = null;
    let animationFrameId: number;

    const animate = (time: number) => {
      if (startTime === null) startTime = time;

      const segmentDurationMs = speedMs;
      const animationDuration = (points.length - 1) * segmentDurationMs;
      const pauseDuration = 1500;
      const loopDuration = animationDuration + pauseDuration;
      const timeInLoop = (time - startTime) % loopDuration;

      if (timeInLoop >= animationDuration) {
        setVisiblePoints([]);
      } else {
        const progress = timeInLoop / animationDuration;
        const totalSegments = points.length - 1;
        const currentSegmentFloat = progress * totalSegments;
        const currentSegmentIndex = Math.max(0, Math.floor(currentSegmentFloat));
        const segmentProgress = currentSegmentFloat - currentSegmentIndex;

        if (currentSegmentIndex >= totalSegments) {
          setVisiblePoints(points.map(p => [p.latitude, p.longitude]));
        } else {
          const p1 = points[currentSegmentIndex];
          const p2 = points[currentSegmentIndex + 1];
          
          if (p1 && p2) {
            const interpolatedPoint: [number, number] = [
              p1.latitude + (p2.latitude - p1.latitude) * segmentProgress,
              p1.longitude + (p2.longitude - p1.longitude) * segmentProgress,
            ];
            
            setVisiblePoints([
              ...points.slice(0, currentSegmentIndex + 1).map(p => [p.latitude, p.longitude] as [number, number]),
              interpolatedPoint,
            ]);
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [points, speedMs]);

  if (visiblePoints.length < 2) return null;

  return (
    <>
      <Polyline 
        positions={visiblePoints} 
        color="#00B4D8" 
        weight={12} 
        opacity={0.35} 
        lineCap="round"
        lineJoin="round"
        interactive={false}
      />
      <Polyline 
        positions={visiblePoints} 
        color="#90E0EF" 
        weight={4} 
        opacity={1} 
        lineCap="round"
        lineJoin="round"
        interactive={false}
      />
    </>
  );
}

// ─── SignalR helper ───────────────────────────────────────────────────────────
function toLatestLocation(event: LocationReceivedEvent): LatestLocationResponse {
  return {
    engineerPublicId: event.engineerPublicId,
    engineerName: event.engineerName,
    devicePublicId: event.devicePublicId,
    deviceName: event.deviceName,
    latitude: event.latitude,
    longitude: event.longitude,
    accuracy: event.accuracy,
    speed: event.speed,
    recordedAt: event.recordedAt,
    receivedAt: event.receivedAt,
    isMocked: event.isMocked,
  };
}

// ─── Filter type ─────────────────────────────────────────────────────────────
type FilterType = 'all' | 'online' | 'offline' | 'hidden';

// ─── Component ───────────────────────────────────────────────────────────────
export function LiveMapPage() {
  const [liveLocations, setLiveLocations] = useState<LatestLocationResponse[]>([]);
  const [hiddenLocations, setHiddenLocations] = useState<LatestLocationResponse[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedDevicePublicId, setSelectedDevicePublicId] = useState<string | null>(null);
  const [routeHistory, setRouteHistory] = useState<RoutePoint[]>([]);
  const [showRoutePoints, setShowRoutePoints] = useState(true);
  const [showRouteLine, setShowRouteLine] = useState(true);
  const [routeLineSpeed, setRouteLineSpeed] = useState(500);
  const [isFetchingRoute, setIsFetchingRoute] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'error' | 'warning' | 'info' | 'success' }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // For Hide Confirmation Dialog
  const [hideConfirmDevice, setHideConfirmDevice] = useState<string | null>(null);
  const [isHiding, setIsHiding] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['latest-locations'],
    queryFn: getLatestLocations,
    refetchInterval: 30_000,
  });

  const { data: hiddenData, refetch: refetchHidden } = useQuery({
    queryKey: ['hidden-locations'],
    queryFn: getHiddenLatestLocations,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (data) setLiveLocations(data);
  }, [data]);

  useEffect(() => {
    if (hiddenData) setHiddenLocations(hiddenData);
  }, [hiddenData]);

  // SignalR
  useEffect(() => {
    const connection = createLocationHubConnection((locationEvent) => {
      const latestLocation = toLatestLocation(locationEvent);
      // locationReceived
      setLiveLocations((current) => {
        // If the location is marked hidden, we don't want it in the visible list
        if (latestLocation.isHidden) return current;

        const idx = current.findIndex((i) => i.devicePublicId === latestLocation.devicePublicId);
        if (idx === -1) return [latestLocation, ...current];
        const updated = [...current];
        updated[idx] = latestLocation;
        return updated;
      });
    });

    // Listeners for hide/unhide
    connection.on('locationHidden', (devicePublicId: string) => {
      setLiveLocations((curr) => curr.filter((l) => l.devicePublicId !== devicePublicId));
      setSelectedDevicePublicId((prev) => (prev === devicePublicId ? null : prev));
      void refetchHidden();
    });

    connection.on('locationUnhidden', () => {
      void refetch();
      void refetchHidden();
    });

    void connection.start();
    return () => { void connection.stop(); };
  }, [refetch, refetchHidden]);

  // Filtered visible list
  const filteredVisibleLocations = useMemo(() => {
    if (filter === 'hidden') return [];

    return liveLocations.filter((l) => {
      if (l.isHidden) return false;
      const isOnline = isLocationOnline(l.receivedAt);
      if (filter === 'online' && !isOnline) return false;
      if (filter === 'offline' && isOnline) return false;
      return true;
    });
  }, [liveLocations, filter]);

  // Stats
  const onlineCount = useMemo(
    () => liveLocations.filter((l) => !l.isHidden && isLocationOnline(l.receivedAt)).length,
    [liveLocations],
  );
  const offlineCount = liveLocations.filter((l) => !l.isHidden).length - onlineCount;

  // Clear selection if selected device is no longer visible in current filter (unless we are viewing hidden list)
  useEffect(() => {
    if (selectedDevicePublicId && filter !== 'hidden') {
      const isStillVisible = filteredVisibleLocations.some((l) => l.devicePublicId === selectedDevicePublicId);
      if (!isStillVisible) {
        setSelectedDevicePublicId(null);
        setRouteHistory([]);
      }
    }
  }, [filteredVisibleLocations, filter, selectedDevicePublicId]);

  // Map center
  const mapCenter = useMemo<[number, number]>(() => {
    if (selectedDevicePublicId) {
      const loc = filteredVisibleLocations.find((l) => l.devicePublicId === selectedDevicePublicId);
      if (loc) return [loc.latitude, loc.longitude];
    }
    return filteredVisibleLocations[0]
      ? [filteredVisibleLocations[0].latitude, filteredVisibleLocations[0].longitude]
      : DEFAULT_CENTER;
  }, [filteredVisibleLocations, selectedDevicePublicId]);

  // Handle Fetch Route
  const handleFetchRoute = async (devicePublicId: string) => {
    // If route is already showing for this device, hide it
    if (routeHistory.length > 0 && selectedDevicePublicId === devicePublicId) {
      setRouteHistory([]);
      return;
    }

    try {
      setIsFetchingRoute(true);
      
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      console.log('Fetching route for:', devicePublicId, 'startDate:', startDate, 'endDate:', endDate);
      
      const res = await getDeviceLocationHistory(devicePublicId, { fromUtc: startDate, toUtc: endDate });
      
      if (res && res.items) {
        console.log('Route points returned:', res.items.length);
        
        // Filter out invalid coords and sort by recordedAt
        const validPoints = res.items
          .filter(h => typeof h.latitude === 'number' && typeof h.longitude === 'number' && !isNaN(h.latitude) && !isNaN(h.longitude))
          .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
          
        if (validPoints.length > 0) {
          console.log('First point:', validPoints[0].recordedAt, validPoints[0].latitude, validPoints[0].longitude);
          console.log('Last point:', validPoints[validPoints.length - 1].recordedAt, validPoints[validPoints.length - 1].latitude, validPoints[validPoints.length - 1].longitude);
        }

        if (validPoints.length === 0) {
          setSnackbar({ open: true, message: 'No route history found for this device in the last 24 hours.', severity: 'error' });
          setRouteHistory([]);
        } else {
          const finalPoints = filterAndDownsampleRoute(validPoints);

          if (finalPoints.length === 1) {
            setSnackbar({ open: true, message: 'Only one valid route point found. Route needs at least two points.', severity: 'warning' });
            setRouteHistory([]);
          } else {
            setRouteHistory(finalPoints);
            setSelectedDevicePublicId(devicePublicId); // Ensure the device is selected so we can unselect it later
          }
        }
      } else {
        setSnackbar({ open: true, message: 'No route history found for this device.', severity: 'error' });
        setRouteHistory([]);
      }
    } catch (e: any) {
      console.error('Failed to fetch route history', e);
      setSnackbar({ open: true, message: e?.response?.data?.message || 'Failed to fetch route history due to a network or server error.', severity: 'error' });
      setRouteHistory([]);
    } finally {
      setIsFetchingRoute(false);
    }
  };

  // Hide / Unhide functions
  const handleHideMarker = async () => {
    if (!hideConfirmDevice) return;
    try {
      setIsHiding(true);
      await hideLatestLocation(hideConfirmDevice);
      // Remove from live map
      setLiveLocations(curr => curr.filter(l => l.devicePublicId !== hideConfirmDevice));
      setSelectedDevicePublicId(null);
      void refetchHidden();
    } catch (e) {
      console.error('Failed to hide marker', e);
    } finally {
      setIsHiding(false);
      setHideConfirmDevice(null);
    }
  };

  const handleUnhideMarker = async (devicePublicId: string) => {
    try {
      await unhideLatestLocation(devicePublicId);
      // Remove from hidden list
      setHiddenLocations(curr => curr.filter(l => l.devicePublicId !== devicePublicId));
      setSelectedDevicePublicId(null);
      void refetch();
    } catch (e) {
      console.error('Failed to unhide marker', e);
    }
  };

  // Dark mode hook
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  return (
    <>
      <GlobalStyles
        styles={{
          '.leaflet-popup-content-wrapper': {
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            borderRadius: '12px',
          },
          '.leaflet-popup-tip': {
            backgroundColor: theme.palette.background.paper,
          },
          '.leaflet-container a.leaflet-popup-close-button': {
            color: theme.palette.text.secondary,
          },
        }}
      />
      <PageHeader
        title="Live Map"
        subtitle="Real-time engineer locations and GPS tracking updates."
      />

      {isLoading && <LoadingState message="Loading latest locations..." />}
      {isError && (
        <ErrorState
          message="Failed to load latest locations."
          onRetry={() => { void refetch(); }}
        />
      )}

      {!isLoading && !isError && liveLocations.length === 0 && filter !== 'hidden' && (
        <EmptyState
          title="No locations found"
          description="No engineer locations have been received yet."
        />
      )}

      {!isLoading && !isError && (liveLocations.length > 0 || filter === 'hidden') && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 320px' }, gap: 2 }}>
          {/* Map */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0 }}>
            {/* Stats bar */}
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
              {(
                [
                  { label: 'All', value: 'all', count: liveLocations.length },
                  { label: 'Online', value: 'online', count: onlineCount, color: '#10b981' },
                  { label: 'Offline', value: 'offline', count: offlineCount, color: '#94a3b8' },
                  { label: 'Hidden', value: 'hidden', count: hiddenLocations.length, color: '#f59e0b' },
                ] as { label: string; value: FilterType; count: number; color?: string }[]
              ).map((f) => (
                <Box
                  key={f.value}
                  component="button"
                  onClick={() => { setFilter(f.value); setSelectedDevicePublicId(null); setRouteHistory([]); }}
                  aria-label={`Show ${f.label} engineers (${f.count})`}
                  aria-pressed={filter === f.value}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 2,
                    py: 0.75,
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: filter === f.value ? 'primary.main' : 'divider',
                    backgroundColor: filter === f.value ? 'primary.main' : 'background.paper',
                    color: filter === f.value ? '#fff' : 'text.primary',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                >
                  {f.color && filter !== f.value && (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: f.color,
                        flexShrink: 0,
                      }}
                      aria-hidden="true"
                    />
                  )}
                  {f.label}
                  <Box
                    sx={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      px: 0.75,
                      py: 0.1,
                      borderRadius: '99px',
                      backgroundColor: filter === f.value ? 'rgba(255,255,255,0.25)' : 'action.hover',
                      minWidth: 20,
                      textAlign: 'center',
                    }}
                  >
                    {f.count}
                  </Box>
                </Box>
              ))}
            </Box>

            <Paper sx={{ position: 'relative', overflow: 'hidden', height: { xs: '50vh', lg: 580 }, minHeight: 300, p: 0, border: 'none' }}>
              {routeHistory.length > 0 && (
                <Paper
                  sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    zIndex: 1000,
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(4px)',
                    borderRadius: 2,
                    boxShadow: 3,
                    minWidth: 220,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: 'text.primary' }}>Route Settings</Typography>
                  <FormControlLabel
                    control={<Checkbox size="small" checked={showRoutePoints} onChange={(e) => setShowRoutePoints(e.target.checked)} />}
                    label={<Typography variant="body2" sx={{ color: 'text.primary' }}>Show Points</Typography>}
                    sx={{ m: 0 }}
                  />
                  <FormControlLabel
                    control={<Checkbox size="small" checked={showRouteLine} onChange={(e) => setShowRouteLine(e.target.checked)} />}
                    label={<Typography variant="body2" sx={{ color: 'text.primary' }}>Show Animated Line</Typography>}
                    sx={{ m: 0 }}
                  />
                  {showRouteLine && (
                    <Box sx={{ mt: 1, px: 1 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                        Speed: {routeLineSpeed}ms / point
                      </Typography>
                      <Slider
                        size="small"
                        value={routeLineSpeed}
                        min={100}
                        max={1000}
                        step={50}
                        onChange={(_, val) => setRouteLineSpeed(val as number)}
                        sx={{ p: 0 }}
                      />
                    </Box>
                  )}
                </Paper>
              )}
              <MapContainer
                center={DEFAULT_CENTER}
                zoom={6}
                style={{ height: '100%', width: '100%' }}
                aria-label="Engineers live location map"
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url={isDarkMode 
                    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  }
                />
                <MapRecenter center={mapCenter} />

                <MarkerClusterGroup chunkedLoading>
                  {filteredVisibleLocations.map((location) => (
                    <Marker
                      key={location.devicePublicId}
                      position={[location.latitude, location.longitude]}
                      icon={getMarkerIcon(location)}
                      eventHandlers={{
                         click: () => setSelectedDevicePublicId(location.devicePublicId),
                      }}
                    >
                      <Popup>
                        <Box sx={{ 
                          minWidth: 180, 
                          fontFamily: 'Inter, sans-serif',
                          color: 'text.primary',
                          bgcolor: 'background.paper',
                        }}>
                          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', mb: 0.5 }}>
                            {location.engineerName}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.25 }}>
                            📱 {location.deviceName}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.25 }}>
                            📍 {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                          </Typography>
                          {location.accuracy != null && (
                            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.25 }}>
                              Accuracy: {location.accuracy.toFixed(1)}m
                            </Typography>
                          )}
                          {location.speed != null && (
                            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.25 }}>
                              Speed: {location.speed.toFixed(1)} km/h
                            </Typography>
                          )}
                          {location.isMocked && (
                            <Box
                              sx={{
                                mt: 0.5,
                                px: 1,
                                py: 0.25,
                                borderRadius: '4px',
                                backgroundColor: 'rgba(239,68,68,0.1)',
                                color: '#ef4444',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                display: 'inline-block',
                                mb: 1
                              }}
                            >
                              ⚠ Mocked GPS
                            </Box>
                          )}
                          <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: 'text.disabled' }}>
                            Last ping: {formatLastSeen(location.receivedAt)}
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: 'text.disabled' }}>
                            GPS time: {formatLastSeen(location.recordedAt)}
                          </Typography>
                          
                          <Button 
                            variant="outlined" 
                            size="small" 
                            disabled={isFetchingRoute}
                            onClick={() => void handleFetchRoute(location.devicePublicId)}
                            sx={{ mt: 1.5, width: '100%' }}
                          >
                            {isFetchingRoute ? 'Loading...' : routeHistory.length > 0 && selectedDevicePublicId === location.devicePublicId ? 'Hide Route' : 'Show Route'}
                          </Button>
                        </Box>
                      </Popup>
                    </Marker>
                  ))}
                </MarkerClusterGroup>
                {routeHistory.length > 0 && (
                  <>
                    {showRouteLine && <AnimatedRoutePath points={routeHistory} speedMs={routeLineSpeed} />}
                    {showRoutePoints && routeHistory.map((point, index) => (
                      <React.Fragment key={`route-pt-${index}`}>
                        {/* Visible gold dot */}
                        <CircleMarker
                          center={[point.latitude, point.longitude]}
                          radius={6}
                          interactive={false}
                          pathOptions={{
                            color: '#0077B6',
                            fillColor: '#00B4D8',
                            fillOpacity: 0.9,
                            weight: 2,
                          }}
                        />
                        {/* Clickable hit target */}
                        <CircleMarker
                          center={[point.latitude, point.longitude]}
                          radius={16}
                          interactive={true}
                          pathOptions={{
                            color: '#00B4D8',
                            fillColor: '#00B4D8',
                            opacity: 0.01,
                            fillOpacity: 0.01,
                            weight: 1,
                          }}
                        >
                          <Popup>
                            <Box sx={{ minWidth: 160, fontFamily: 'Inter, sans-serif' }}>
                              <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', mb: 0.5 }}>
                                Route Point #{index + 1}
                              </Typography>
                              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.25 }}>
                                Time: {new Date(point.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </Typography>
                              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.25 }}>
                                📍 {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
                              </Typography>
                              {point.accuracy != null && (
                                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.25 }}>
                                  Accuracy: {point.accuracy.toFixed(1)}m
                                </Typography>
                              )}
                              {point.speed != null && (
                                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.25 }}>
                                  Speed: {point.speed.toFixed(1)} km/h
                                </Typography>
                              )}
                            </Box>
                          </Popup>
                        </CircleMarker>
                      </React.Fragment>
                    ))}
                  </>
                )}
                <MapRouteFitter 
                  routeHistory={routeHistory} 
                  liveLocation={selectedDevicePublicId ? liveLocations.find(l => l.devicePublicId === selectedDevicePublicId) : undefined} 
                />
              </MapContainer>
            </Paper>
          </Box>

          {/* Engineer list panel */}
          <Paper
            sx={{
              height: { xs: 400, lg: 632 },
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            role="list"
            aria-label="Engineer locations list"
          >
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>
                {filter === 'hidden' ? hiddenLocations.length : filteredVisibleLocations.length} Engineers
              </Typography>
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              {(filter === 'hidden' ? hiddenLocations : filteredVisibleLocations).map((location) => {
                const online = filter === 'hidden' ? false : isLocationOnline(location.receivedAt);
                const isSelected = selectedDevicePublicId === location.devicePublicId;

                return (
                  <Box
                    key={location.devicePublicId}
                    component="button"
                    onClick={() => {
                      if (filter !== 'hidden') {
                        setSelectedDevicePublicId(isSelected ? null : location.devicePublicId);
                        if (isSelected) setRouteHistory([]); // clear route on deselect
                      }
                    }}
                    aria-label={`${location.engineerName} — ${online ? 'Online' : 'Offline'}, last ping ${formatLastSeen(location.receivedAt)}`}
                    aria-pressed={isSelected}
                    role="listitem"
                    sx={{
                      display: 'flex',
                      width: '100%',
                      gap: 1.5,
                      px: 2,
                      py: 1.5,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      textAlign: 'left',
                      cursor: filter === 'hidden' ? 'default' : 'pointer',
                      fontFamily: 'inherit',
                      backgroundColor: isSelected ? 'primary.main' : 'transparent',
                      transition: 'background-color 0.15s ease',
                      border: 'none',
                      position: 'relative',
                      '&:hover': {
                        backgroundColor: filter === 'hidden' ? 'transparent' : (isSelected ? 'primary.dark' : 'action.hover'),
                      },
                      '&:hover .hide-btn': {
                        opacity: 1,
                      },
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: -2,
                      },
                    }}
                  >
                    {/* Hide / Unhide Action Button */}
                    <Box 
                      className="hide-btn"
                      sx={{ 
                        position: 'absolute', 
                        right: 8, 
                        top: '50%', 
                        transform: 'translateY(-50%)',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        zIndex: 10,
                      }}
                      onClick={(e) => { e.stopPropagation(); }}
                    >
                      {filter === 'hidden' ? (
                        <Button 
                          size="small" 
                          variant="contained" 
                          color="primary"
                          onClick={() => void handleUnhideMarker(location.devicePublicId)}
                        >
                          Restore marker
                        </Button>
                      ) : (
                        <Tooltip title="Hide current marker">
                          <IconButton 
                            size="small" 
                            onClick={() => setHideConfirmDevice(location.devicePublicId)}
                            sx={{ bgcolor: 'background.paper', boxShadow: 1, '&:hover': { bgcolor: 'error.light', color: 'white' } }}
                          >
                            <CloseIcon fontSize="small" color="error" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>

                    {/* Status dot */}
                    <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          backgroundColor: filter === 'hidden'
                            ? '#f59e0b'
                            : location.isMocked
                            ? '#ef4444'
                            : online
                            ? '#10b981'
                            : '#94a3b8',
                          boxShadow: online && !location.isMocked
                            ? '0 0 0 3px rgba(16,185,129,0.2)'
                            : 'none',
                        }}
                        aria-hidden="true"
                      />
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0, pr: 3 }}>
                      <Typography
                        noWrap
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          color: isSelected ? '#fff' : 'text.primary',
                        }}
                      >
                        {location.engineerName}
                      </Typography>
                      <Typography
                        noWrap
                        variant="caption"
                        sx={{
                          color: isSelected ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                          display: 'block',
                          fontSize: '0.75rem',
                        }}
                      >
                        {location.deviceName}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: isSelected ? 'rgba(255,255,255,0.55)' : 'text.disabled',
                          fontSize: '0.7rem',
                        }}
                      >
                        Last Ping: {formatLastSeen(location.receivedAt)}
                        <br/>
                        GPS: {formatLastSeen(location.recordedAt)}
                        {location.isMocked && ' · ⚠ Mocked'}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Box>
      )}

      {/* Legend */}
      {!isLoading && !isError && (liveLocations.length > 0 || hiddenLocations.length > 0) && (
        <Box sx={{ display: 'flex', gap: 3, mt: 1.5, px: 0.5 }}>
          {[
            { color: '#10b981', label: 'Online (< 15 min)' },
            { color: '#94a3b8', label: 'Offline' },
            { color: '#ef4444', label: 'Mocked GPS ⚠' },
            { color: '#f59e0b', label: 'Hidden Location' },
          ].map((item) => (
            <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box
                sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: item.color }}
                aria-hidden="true"
              />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>
                {item.label}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Hide Confirmation Dialog */}
      <Dialog
        open={!!hideConfirmDevice}
        onClose={() => !isHiding && setHideConfirmDevice(null)}
      >
        <DialogTitle>Hide current marker?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will hide the current marker from the Live Map. Location history will not be deleted.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHideConfirmDevice(null)} disabled={isHiding}>Cancel</Button>
          <Button onClick={() => void handleHideMarker()} color="error" variant="contained" disabled={isHiding}>
            {isHiding ? 'Hiding...' : 'Hide Marker'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}

