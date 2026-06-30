import React, { useMemo, useEffect, useState } from 'react';
import { Box, Paper, Typography, Button, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, useTheme, GlobalStyles, Snackbar, Alert, Slider, FormControlLabel, Checkbox, Divider, useMediaQuery } from '@mui/material';
import { Marker, Popup, TileLayer, MapContainer, useMap, Polyline, CircleMarker, Tooltip as LeafletTooltip } from 'react-leaflet';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import CloseIcon from '@mui/icons-material/Close';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../components/common/PageHeader';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { AuthorizedAvatar } from '../components/common/AuthorizedAvatar';
import { EmptyState } from '../components/common/EmptyState';
import { getLatestLocations, getEngineerLocationHistoryByDate, hideLatestLocation, unhideLatestLocation, getHiddenLatestLocations, getDailyAnalysis } from '../api/trackingApi';
import { createLocationHubConnection } from '../signalr/locationHub';
import type { LatestLocationResponse, LocationReceivedEvent, EngineerStatusChangedEvent } from '../types/tracking';
import { AvatarPreviewModal } from '../components/profile/AvatarPreviewModal';

// ─── Map center (Egypt) ───────────────────────────────────────────────────────
const DEFAULT_CENTER: [number, number] = [26.8206, 30.8025];

// Parse UTC date strings reliably — handles missing 'Z' suffix from API
function safeDate(utcStr: string | null | undefined): Date | null {
  if (!utcStr) return null;
  const normalized = /[Zz+\-]\d*$/.test(utcStr.trim()) ? utcStr : `${utcStr}Z`;
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

function areTimestampsEqual(dateStr1: string | null | undefined, dateStr2: string | null | undefined): boolean {
  const d1 = safeDate(dateStr1);
  const d2 = safeDate(dateStr2);
  if (!d1 || !d2) return false;
  return Math.abs(d1.getTime() - d2.getTime()) < 5000;
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

  return filtered;
}

// ─── Status Display Helper ────────────────────────────────────────────────────
function isServiceStalled(location: LatestLocationResponse): boolean {
  if (location.backgroundServiceAlive === false) return true;

  const effectiveIntervalMs = location.trackingIntervalMs ?? FALLBACK_TRACKING_INTERVAL_MS;
  const serviceStallThresholdMs = Math.min(15 * 60 * 1000, effectiveIntervalMs * 2);

  const isStale = (dateStr?: string) => {
    if (!dateStr) return false; // Missing timestamp alone does not mean stalled
    const diff = Date.now() - new Date(dateStr).getTime();
    return diff > serviceStallThresholdMs;
  };

  if (!location.lastTickAtUtc && !location.lastHealthReportAt) {
    const diff = Date.now() - new Date(location.receivedAt).getTime();
    return diff > serviceStallThresholdMs;
  }

  const timestamps = [location.lastTickAtUtc, location.lastHealthReportAt].filter(Boolean) as string[];
  return timestamps.some(isStale);
}

function getDashboardStatus(location: LatestLocationResponse): { label: string, color: string, isBlocked: boolean } {
  const reason = location.trackingStatusReason;

  if (reason === 'LocationPermissionDenied') {
    return { label: 'Blocked — Location permission denied', color: '#ef4444', isBlocked: true };
  }
  if (reason === 'LocationServiceDisabled') {
    return { label: 'Blocked — Location service off', color: '#ef4444', isBlocked: true };
  }
  if (reason === 'BackgroundPermissionMissing') {
    return { label: 'Blocked — Background permission missing', color: '#ef4444', isBlocked: true };
  }
  if (reason === 'AuthExpired' || reason === 'DeviceRevoked') {
    return { label: 'Blocked — Device revoked', color: '#ef4444', isBlocked: true };
  }

  if (isServiceStalled(location)) {
    return { label: 'Offline — App stopped or permission may have changed', color: '#94a3b8', isBlocked: false };
  }

  if (location.isOnline) {
    return { label: 'Online', color: '#10b981', isBlocked: false };
  }

  if (!reason || reason === 'Valid') {
    return { label: 'Offline — App stopped or permission may have changed', color: '#94a3b8', isBlocked: false };
  }

  return { label: 'Offline — App possibly stopped', color: '#94a3b8', isBlocked: false };
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

const MOCKED_ICON = createPinIcon('#ef4444');   // Red
const HIDDEN_ICON = createPinIcon('#f59e0b');   // Orange/Amber

function getMarkerIcon(location: LatestLocationResponse, currentFilter: FilterType): L.DivIcon {
  if (currentFilter === 'hidden') return HIDDEN_ICON;
  if (location.isMocked) return MOCKED_ICON;
  const status = getDashboardStatus(location);
  return createPinIcon(status.color);
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
    isOnline: event.isOnline,
    backgroundServiceAlive: event.backgroundServiceAlive,
    batteryOptimizationIgnored: event.batteryOptimizationIgnored,
    lastTickAtUtc: event.lastTickAtUtc,
    lastError: event.lastError,
    trackingIntervalMs: event.trackingIntervalMs,
  };
}

// ─── Tracking Constants ──────────────────────────────────────────────────────
const FALLBACK_TRACKING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes fallback if not reported by device

// ─── Filter type ─────────────────────────────────────────────────────────────
type FilterType = 'all' | 'online' | 'offline' | 'hidden';

// ─── Component ───────────────────────────────────────────────────────────────
export function LiveMapPage() {
  const [liveLocations, setLiveLocations] = useState<LatestLocationResponse[]>([]);
  const [hiddenLocations, setHiddenLocations] = useState<LatestLocationResponse[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedDevicePublicId, setSelectedDevicePublicId] = useState<string | null>(null);
  const [showMobilePanel, setShowMobilePanel] = useState(false);
  const [showRouteSettings, setShowRouteSettings] = useState(true);

  // Custom drag state for Route Settings on mobile
  const [routeSettingsPos, setRouteSettingsPos] = useState({ x: 0, y: 0 });
  const dragStartPos = React.useRef({ x: 0, y: 0 });
  const isDragging = React.useRef(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDragging.current = true;
    dragStartPos.current = {
      x: e.clientX - routeSettingsPos.x,
      y: e.clientY - routeSettingsPos.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;

    let newX = e.clientX - dragStartPos.current.x;
    let newY = e.clientY - dragStartPos.current.y;

    // It's anchored top-right (right: 8, top: 8 on mobile).
    // Max X is 8 (so it hits the right edge). Min X is roughly -(window.innerWidth - 240).
    const maxX = 8;
    const minX = -window.innerWidth + 240;

    // Min Y is -8 (so it hits top edge). Max Y is window.innerHeight - 200.
    const minY = -8;
    const maxY = window.innerHeight - 200;

    newX = Math.max(minX, Math.min(newX, maxX));
    newY = Math.max(minY, Math.min(newY, maxY));

    setRouteSettingsPos({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const [routeHistory, setRouteHistory] = useState<RoutePoint[]>([]);
  const [historyDate, setHistoryDate] = useState<string>(() => {
    // Return today's date in YYYY-MM-DD local format
    const d = new Date();
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  });
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
  const [previewAvatar, setPreviewAvatar] = useState<{ url: string; altText: string; fallbackText: string } | null>(null);
  const isTouchDevice = useMediaQuery('(hover: none) and (pointer: coarse)');

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

  // Calculate selected engineerPublicId based on selectedDevicePublicId
  const selectedEngineerPublicId = useMemo(() => {
    if (!selectedDevicePublicId) return null;
    const loc = liveLocations.find(l => l.devicePublicId === selectedDevicePublicId);
    return loc ? loc.engineerPublicId : null;
  }, [selectedDevicePublicId, liveLocations]);

  const { data: dailyAnalysis, isLoading: isAnalysisLoading } = useQuery({
    queryKey: ['daily-analysis', selectedEngineerPublicId, historyDate],
    queryFn: () => getDailyAnalysis(selectedEngineerPublicId!, historyDate),
    enabled: !!selectedEngineerPublicId && !!historyDate,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (data && Array.isArray(data)) setLiveLocations(data);
  }, [data]);

  useEffect(() => {
    if (hiddenData && Array.isArray(hiddenData)) setHiddenLocations(hiddenData);
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
        updated[idx] = { ...current[idx], ...latestLocation };
        return updated;
      });
    });

    connection.on('engineerStatusChanged', (statusEvent: EngineerStatusChangedEvent) => {
      setLiveLocations((current) => {
        const idx = current.findIndex((i) => i.devicePublicId === statusEvent.devicePublicId);
        if (idx === -1) return current;
        const updated = [...current];
        updated[idx] = { ...updated[idx], isOnline: statusEvent.isOnline };
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
    if (filter === 'hidden') return hiddenLocations;

    return liveLocations.filter((l) => {
      if (l.isHidden) return false;
      if (filter === 'online' && !l.isOnline) return false;
      if (filter === 'offline' && l.isOnline) return false;
      return true;
    });
  }, [liveLocations, filter, hiddenLocations]);

  // Stats
  const onlineCount = useMemo(
    () => liveLocations.filter((l) => !l.isHidden && l.isOnline).length,
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
      if (loc && loc.latitude != null && loc.longitude != null && (loc.latitude !== 0 || loc.longitude !== 0)) {
        return [loc.latitude, loc.longitude];
      }
    }
    const validLoc = filteredVisibleLocations.find((l) => l.latitude != null && l.longitude != null && (l.latitude !== 0 || l.longitude !== 0));
    return validLoc
      ? [validLoc.latitude, validLoc.longitude]
      : DEFAULT_CENTER;
  }, [filteredVisibleLocations, selectedDevicePublicId]);

  useEffect(() => {
    // Clear route if date changes so it's not confusing
    if (routeHistory.length > 0) {
      setRouteHistory([]);
    }
  }, [historyDate]);

  const handleFetchRoute = async (engineerPublicId: string, devicePublicId: string) => {
    // If route is already showing for this device, hide it
    if (routeHistory.length > 0 && selectedDevicePublicId === devicePublicId) {
      setRouteHistory([]);
      if (isTouchDevice) setShowMobilePanel(false);
      return;
    }

    if (isTouchDevice) setShowMobilePanel(false);

    try {
      setIsFetchingRoute(true);

      const res = await getEngineerLocationHistoryByDate(engineerPublicId, historyDate, 150);

      if (res && res.length > 0) {
        // Filter out invalid coords
        const validPoints = res
          .filter(h => typeof h.latitude === 'number' && typeof h.longitude === 'number' && !isNaN(h.latitude) && !isNaN(h.longitude));

        if (validPoints.length === 0) {
          setSnackbar({ open: true, message: 'No valid route history found for this date.', severity: 'error' });
          setRouteHistory([]);
        } else {
          const finalPoints = filterAndDownsampleRoute(validPoints);

          if (finalPoints.length < 2) {
            setSnackbar({ open: true, message: 'Only one valid route point found. Route needs at least two points.', severity: 'warning' });
            // We can still show it as a marker, so let's allow it
            setRouteHistory(finalPoints);
            setSelectedDevicePublicId(devicePublicId);
          } else {
            setRouteHistory(finalPoints);
            setSelectedDevicePublicId(devicePublicId); // Ensure the device is selected so we can unselect it later
            setShowRouteSettings(true); // Always show settings when loading a new route
            if (isTouchDevice) setShowMobilePanel(false);
          }
        }
      } else {
        setSnackbar({ open: true, message: 'No history found for this date.', severity: 'info' });
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

  const renderActionPanelContent = (location: LatestLocationResponse, isMobile: boolean) => (
    <>
      {isMobile && (
        <IconButton
          size="small"
          onClick={(e) => { e.stopPropagation(); setSelectedDevicePublicId(null); }}
          sx={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1.5, pr: isMobile ? 4 : 0 }}>
        <AuthorizedAvatar
          srcUrl={location.profilePhotoUrl}
          fallbackText={location.engineerName.charAt(0).toUpperCase()}
          onClick={() => setPreviewAvatar({ url: location.profilePhotoUrl || '', altText: location.engineerName, fallbackText: location.engineerName.charAt(0).toUpperCase() })}
          sx={{ width: 40, height: 40, fontSize: '1rem', bgcolor: 'primary.main', cursor: 'pointer' }}
        />
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.2 }}>
            {location.engineerName}
          </Typography>
          {location.engineerPhoneNumber && (
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              {location.engineerPhoneNumber}
            </Typography>
          )}
        </Box>
      </Box>
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
      {areTimestampsEqual(location.receivedAt, location.recordedAt) ? (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: 'text.disabled' }}>
          Last seen: {formatLastSeen(location.receivedAt)}
        </Typography>
      ) : (
        <>
          <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: 'text.disabled' }}>
            Last ping: {formatLastSeen(location.receivedAt)}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: 'text.disabled' }}>
            GPS time: {formatLastSeen(location.recordedAt)}
          </Typography>
        </>
      )}

      <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(148, 163, 184, 0.15)' }}>
        {(() => {
          const isServiceStopped = isServiceStalled(location);
          const showBatteryWarning = isServiceStopped && location.batteryOptimizationIgnored === false;

          return (
            <>
              <Typography variant="caption" sx={{ display: 'block', color: isServiceStopped ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                Background Service: {isServiceStopped ? 'Stopped' : 'Active'}
              </Typography>
              {showBatteryWarning && (
                <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: '#ef4444', fontWeight: 500 }}>
                  Possible cause: Battery optimization / OS killed the service
                </Typography>
              )}
              {location.lastTickAtUtc && (
                <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: 'text.secondary' }}>
                  Last Tick: {formatLastSeen(location.lastTickAtUtc)}
                </Typography>
              )}
              {location.lastError && (
                <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: '#ef4444', wordBreak: 'break-word', fontStyle: 'italic' }}>
                  Error: {location.lastError}
                </Typography>
              )}
            </>
          );
        })()}
      </Box>

      <Button
        variant="outlined"
        size="small"
        disabled={isFetchingRoute}
        onClick={(e) => {
          e.stopPropagation();
          void handleFetchRoute(location.engineerPublicId, location.devicePublicId);
        }}
        sx={{ mt: 1.5, width: '100%', height: { xs: 40, sm: 'auto' } }}
      >
        {isFetchingRoute ? 'Loading...' : routeHistory.length > 0 && selectedDevicePublicId === location.devicePublicId ? 'Hide Route' : 'Show Route'}
      </Button>
    </>
  );

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
              {routeHistory.length > 0 && showRouteSettings && (
                <Paper
                  sx={{
                    position: 'absolute',
                    top: { xs: 8, sm: 16 },
                    right: { xs: 8, sm: 16 },
                    zIndex: 1000,
                    p: { xs: 1, sm: 2 },
                    display: 'flex',
                    flexDirection: 'column',
                    gap: { xs: 0, sm: 0.5 },
                    backgroundColor: 'background.paper',
                    backdropFilter: isDarkMode ? 'blur(4px)' : 'none',
                    borderRadius: 2,
                    boxShadow: 3,
                    minWidth: { xs: 220, sm: 220 },
                    maxWidth: { xs: 260, sm: 300 },
                    transform: `translate(${routeSettingsPos.x}px, ${routeSettingsPos.y}px)`,
                    touchAction: 'none' // Important to prevent map scrolling while dragging
                  }}
                >
                  <Box
                    className="route-settings-drag-handle"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: { xs: 0.25, sm: 0.5 },
                      cursor: isDragging.current ? 'grabbing' : 'grab',
                      pb: { xs: 0.5, sm: 0 },
                      borderBottom: { xs: '1px solid rgba(0,0,0,0.05)', sm: 'none' },
                      touchAction: 'none'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <DragIndicatorIcon sx={{ fontSize: '1.2rem', color: 'text.disabled' }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', fontSize: { xs: '0.75rem', sm: '0.875rem' }, textTransform: { xs: 'uppercase', sm: 'none' }, letterSpacing: { xs: '0.02em', sm: 'normal' } }}>Route Settings</Typography>
                    </Box>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); setShowRouteSettings(false); }} sx={{ padding: '2px', mr: -0.5 }}>
                      <CloseIcon fontSize="small" sx={{ fontSize: { xs: '1.2rem', sm: '1rem' } }} />
                    </IconButton>
                  </Box>
                  <FormControlLabel
                    control={<Checkbox size="small" checked={showRoutePoints} onChange={(e) => setShowRoutePoints(e.target.checked)} sx={{ p: { xs: 0.5, sm: 1 } }} />}
                    label={<Typography variant="body2" sx={{ color: 'text.primary', fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Show Points</Typography>}
                    sx={{ m: 0, ml: { xs: -0.5, sm: 0 } }}
                  />
                  <FormControlLabel
                    control={<Checkbox size="small" checked={showRouteLine} onChange={(e) => setShowRouteLine(e.target.checked)} sx={{ p: { xs: 0.5, sm: 1 } }} />}
                    label={<Typography variant="body2" sx={{ color: 'text.primary', fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Show Animated Line</Typography>}
                    sx={{ m: 0, ml: { xs: -0.5, sm: 0 } }}
                  />
                  {showRouteLine && (
                    <Box sx={{ mt: { xs: 0.5, sm: 1 }, px: { xs: 0.5, sm: 1 } }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: { xs: 0, sm: 0.5 }, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                        Speed: {routeLineSpeed}ms / point
                      </Typography>
                      <Slider
                        size="small"
                        value={routeLineSpeed}
                        min={100}
                        max={1000}
                        step={50}
                        onChange={(_, val) => setRouteLineSpeed(val as number)}
                        sx={{ p: 0, py: { xs: 1, sm: 0 }, '& .MuiSlider-thumb': { width: { xs: 14, sm: 20 }, height: { xs: 14, sm: 20 } } }}
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

                {isTouchDevice && selectedDevicePublicId && showMobilePanel && (
                  (() => {
                    const selectedLocation = filteredVisibleLocations.find(l => l.devicePublicId === selectedDevicePublicId);
                    if (!selectedLocation) return null;
                    return (
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 24,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 'calc(100% - 32px)',
                          maxWidth: 400,
                          zIndex: 1000,
                        }}
                      >
                        <Paper
                          elevation={6}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            position: 'relative',
                            bgcolor: 'background.paper',
                            color: 'text.primary',
                          }}
                        >
                          {renderActionPanelContent(selectedLocation, true)}
                        </Paper>
                      </Box>
                    );
                  })()
                )}

                <MarkerClusterGroup chunkedLoading>
                  {filteredVisibleLocations.map((location) => {
                    const hasValidCoords = location.latitude != null && location.longitude != null && (location.latitude !== 0 || location.longitude !== 0);
                    if (!hasValidCoords) return null;
                    return (
                      <Marker
                        key={location.devicePublicId}
                        position={[location.latitude, location.longitude]}
                        icon={getMarkerIcon(location, filter)}
                        eventHandlers={{
                          click: (e) => {
                            e.originalEvent?.stopPropagation();
                            setSelectedDevicePublicId(location.devicePublicId);
                            if (isTouchDevice) {
                              setShowMobilePanel(true);
                            }
                            if (routeHistory.length > 0 && selectedDevicePublicId === location.devicePublicId) {
                              setShowRouteSettings(true);
                            }
                          },
                        }}
                      >
                        <LeafletTooltip direction="top" offset={[0, -20]} opacity={1} className="hide-on-mobile">
                          {location.engineerName} — {location.isOnline ? 'Online' : 'Offline'}
                        </LeafletTooltip>
                        {!isTouchDevice && (
                          <Popup closeOnClick={false}>
                            <Box
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              sx={{
                                minWidth: 180,
                                fontFamily: 'Inter, sans-serif',
                                color: 'text.primary',
                                bgcolor: 'background.paper',
                              }}>
                              {renderActionPanelContent(location, false)}
                            </Box>
                          </Popup>
                        )}
                      </Marker>
                    )
                  })}
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
                {filteredVisibleLocations.length} Engineers
              </Typography>
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              {filteredVisibleLocations.map((location) => {
                const isSelected = selectedDevicePublicId === location.devicePublicId;

                return (
                  <Box
                    key={location.devicePublicId}
                    component={isSelected ? "div" : "button"}
                    onClick={() => {
                      if (!isSelected) {
                        setSelectedDevicePublicId(location.devicePublicId);
                      }
                    }}
                    aria-label={`${location.engineerName} — ${location.isOnline ? 'Online' : 'Offline'}, last ping ${formatLastSeen(location.receivedAt)}`}
                    aria-pressed={isSelected}
                    role="listitem"
                    sx={{
                      display: 'flex',
                      flexDirection: isSelected ? 'column' : 'row',
                      width: '100%',
                      gap: isSelected ? 0 : 1.5,
                      px: isSelected ? 0 : 2,
                      py: isSelected ? 0 : 1.5,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      textAlign: 'left',
                      cursor: isSelected ? 'default' : 'pointer',
                      fontFamily: 'inherit',
                      backgroundColor: isSelected ? 'primary.dark' : 'transparent',
                      transition: 'background-color 0.15s ease',
                      border: 'none',
                      position: 'relative',
                      '&:hover': {
                        backgroundColor: isSelected ? 'primary.dark' : 'action.hover',
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
                    {isSelected ? (
                      <Box
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                          display: 'flex', flexDirection: 'column',
                          p: 2.5,
                          gap: 2,
                          color: '#fff',
                        }}
                      >
                        {/* 1. Selected Engineer Profile */}
                        <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'flex-start' }}>
                          <AuthorizedAvatar
                            srcUrl={location.profilePhotoUrl}
                            fallbackText={location.engineerName.charAt(0)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewAvatar({ url: location.profilePhotoUrl || '', altText: location.engineerName, fallbackText: location.engineerName.charAt(0) });
                            }}
                            sx={{ width: 64, height: 64, border: '2px solid white', cursor: 'pointer', flexShrink: 0 }}
                          />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                              <Typography noWrap sx={{ fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.2 }}>
                                {location.engineerName}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={(e) => { e.stopPropagation(); setSelectedDevicePublicId(null); setRouteHistory([]); }}
                                sx={{ color: 'rgba(255,255,255,0.7)', p: 0.5, mt: -0.5, mr: -0.5, '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}
                              >
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </Box>
                            {location.engineerPhoneNumber && (
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mb: 0.25 }}>
                                📞 {location.engineerPhoneNumber}
                              </Typography>
                            )}
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mb: 1 }}>
                              📱 {location.deviceName}
                            </Typography>
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.5, borderRadius: 1.5, bgcolor: 'rgba(0,0,0,0.25)' }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: getDashboardStatus(location).color }} />
                              <Typography variant="caption" sx={{ fontWeight: 600, color: getDashboardStatus(location).color, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                                {getDashboardStatus(location).label}
                              </Typography>
                            </Box>
                            {isServiceStalled(location) && location.batteryOptimizationIgnored === false && (
                              <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: '#fca5a5', fontWeight: 600 }}>
                                Possible cause: Battery optimization / OS killed the service
                              </Typography>
                            )}
                          </Box>
                        </Box>

                        <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)' }} />

                        {/* 2. Activity Section */}
                        <Box>
                          <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block', mb: 0.5, lineHeight: 1.2 }}>
                            Activity
                          </Typography>
                          {areTimestampsEqual(location.receivedAt, location.recordedAt) ? (
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 0.25 }}>
                              <span style={{ opacity: 0.7, marginRight: '8px' }}>Last Seen:</span> {formatLastSeen(location.receivedAt)}
                              {location.isMocked && <span style={{ color: '#fca5a5', marginLeft: '8px', fontWeight: 600 }}>⚠ Mocked</span>}
                            </Typography>
                          ) : (
                            <>
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 0.25 }}>
                                <span style={{ opacity: 0.7, marginRight: '8px' }}>Last Ping:</span> {formatLastSeen(location.receivedAt)}
                              </Typography>
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                                <span style={{ opacity: 0.7, marginRight: '8px' }}>GPS:</span> {formatLastSeen(location.recordedAt)}
                                {location.isMocked && <span style={{ color: '#fca5a5', marginLeft: '8px', fontWeight: 600 }}>⚠ Mocked</span>}
                              </Typography>
                            </>
                          )}
                          {(!location.latitude || !location.longitude || (location.latitude === 0 && location.longitude === 0)) && (
                            <Typography variant="caption" sx={{ color: '#fca5a5', display: 'block', mt: 0.5, fontWeight: 600 }}>
                              ⚠ No last known location
                            </Typography>
                          )}
                          {location.lastHealthReportAt && (
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mt: 0.25 }}>
                              <span style={{ opacity: 0.7, marginRight: '8px' }}>Health:</span> {formatLastSeen(location.lastHealthReportAt)}
                            </Typography>
                          )}
                        </Box>

                        {/* 2.5. Daily Analysis Section */}
                        {filter !== 'hidden' && (
                          <>
                            <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)' }} />
                            <Box>
                              <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block', mb: 0.5, lineHeight: 1.2 }}>
                                Daily Analysis ({historyDate})
                              </Typography>
                              {isAnalysisLoading ? (
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>
                                  Loading analysis...
                                </Typography>
                              ) : dailyAnalysis ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                  {!dailyAnalysis.hasData ? (
                                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>
                                      No tracking data for this day.
                                    </Typography>
                                  ) : (
                                    <>
                                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                                        <span style={{ opacity: 0.7, marginRight: '8px' }}>Online:</span> {dailyAnalysis.onlineDisplay}
                                      </Typography>
                                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                                        <span style={{ opacity: 0.7, marginRight: '8px' }}>Offline:</span> {dailyAnalysis.offlineDisplay}
                                      </Typography>
                                      {dailyAnalysis.isPartialData && (
                                        <Typography variant="caption" sx={{ color: '#fca5a5', display: 'block', mt: 0.5 }}>
                                          ⚠ Partial data (history missing before window)
                                        </Typography>
                                      )}
                                    </>
                                  )}
                                </Box>
                              ) : (
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>
                                  Analysis not available.
                                </Typography>
                              )}
                            </Box>
                          </>
                        )}

                        {filter !== 'hidden' && (
                          <>
                            <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)' }} />
                            {/* 3. History Section */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                              <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.2 }}>
                                History
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
                                <input
                                  type="date"
                                  value={historyDate}
                                  onChange={(e) => setHistoryDate(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(255,255,255,0.3)',
                                    background: 'rgba(0,0,0,0.15)',
                                    color: 'white',
                                    fontFamily: 'inherit',
                                    fontSize: '0.9rem',
                                    outline: 'none',
                                    height: '40px'
                                  }}
                                />
                                <Button
                                  variant="contained"
                                  disabled={isFetchingRoute}
                                  onClick={(e) => { e.stopPropagation(); void handleFetchRoute(location.engineerPublicId, location.devicePublicId); }}
                                  sx={{
                                    bgcolor: 'white',
                                    color: 'primary.dark',
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    px: 3,
                                    height: '40px',
                                    minWidth: { xs: '100%', sm: 'auto' },
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                                  }}
                                >
                                  {isFetchingRoute ? '...' : routeHistory.length > 0 ? 'Hide' : 'Load'}
                                </Button>
                              </Box>
                            </Box>
                          </>
                        )}
                      </Box>
                    ) : (
                      <>
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
                                  : getDashboardStatus(location).color,
                              boxShadow: location.isOnline && !location.isMocked
                                ? '0 0 0 3px rgba(16,185,129,0.2)'
                                : 'none',
                              mr: 1.5
                            }}
                            aria-hidden="true"
                          />
                          <AuthorizedAvatar
                            srcUrl={location.profilePhotoUrl}
                            fallbackText={location.engineerName.charAt(0)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewAvatar({ url: location.profilePhotoUrl || '', altText: location.engineerName, fallbackText: location.engineerName.charAt(0) });
                            }}
                            sx={{ width: 40, height: 40, border: '2px solid white', cursor: 'pointer' }}
                          />
                        </Box>

                        <Box sx={{ flex: 1, minWidth: 0, pr: 3 }}>
                          <Typography
                            noWrap
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.875rem',
                              color: location.isOnline ? '#10b981' : '#94a3b8',
                            }}
                          >
                            {location.engineerName}
                          </Typography>
                          {location.engineerPhoneNumber && (
                            <Typography
                              noWrap
                              variant="caption"
                              sx={{
                                color: 'text.secondary',
                                display: 'block',
                                fontSize: '0.75rem',
                              }}
                            >
                              {location.engineerPhoneNumber}
                            </Typography>
                          )}
                          <Typography
                            noWrap
                            variant="caption"
                            sx={{
                              color: 'text.secondary',
                              display: 'block',
                              fontSize: '0.75rem',
                            }}
                          >
                            {location.deviceName}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'text.disabled',
                              fontSize: '0.7rem',
                            }}
                          >
                            {areTimestampsEqual(location.receivedAt, location.recordedAt) ? (
                              <>
                                Last Seen: {formatLastSeen(location.receivedAt)}
                                {location.isMocked && ' · ⚠ Mocked'}
                              </>
                            ) : (
                              <>
                                Last Ping: {formatLastSeen(location.receivedAt)}
                                <br />
                                GPS: {formatLastSeen(location.recordedAt)}
                                {location.isMocked && ' · ⚠ Mocked'}
                              </>
                            )}
                            {location.lastHealthReportAt && (
                              <>
                                <br />
                                Health: {formatLastSeen(location.lastHealthReportAt)}
                              </>
                            )}
                          </Typography>
                        </Box>
                      </>
                    )}
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

      {previewAvatar && (
        <AvatarPreviewModal
          open={!!previewAvatar}
          onClose={() => setPreviewAvatar(null)}
          imageUrl={previewAvatar.url}
          altText={previewAvatar.altText}
          fallbackText={previewAvatar.fallbackText}
        />
      )}
    </>
  );
}

