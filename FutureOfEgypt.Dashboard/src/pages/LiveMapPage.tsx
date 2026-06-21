import { useMemo, useEffect, useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { Marker, Popup, TileLayer, MapContainer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../components/common/PageHeader';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { getLatestLocations } from '../api/trackingApi';
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
  const isOnline = isLocationOnline(location.recordedAtUtc);
  return isOnline ? ONLINE_ICON : OFFLINE_ICON;
}

function isLocationOnline(recordedAtUtc: string): boolean {
  const d = safeDate(recordedAtUtc);
  if (!d) return false;
  const diffMs = Date.now() - d.getTime();
  return diffMs <= ONLINE_THRESHOLD_MINUTES * 60 * 1000;
}

function formatLastSeen(recordedAtUtc: string): string {
  const d = safeDate(recordedAtUtc);
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
    recordedAtUtc: event.recordedAtUtc,
    isMocked: event.isMocked,
  };
}

// ─── Filter type ─────────────────────────────────────────────────────────────
type FilterType = 'all' | 'online' | 'offline';

// ─── Component ───────────────────────────────────────────────────────────────
export function LiveMapPage() {
  const [liveLocations, setLiveLocations] = useState<LatestLocationResponse[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedEngineer, setSelectedEngineer] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['latest-locations'],
    queryFn: getLatestLocations,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (data) setLiveLocations(data);
  }, [data]);

  // SignalR
  useEffect(() => {
    const connection = createLocationHubConnection((locationEvent) => {
      const latestLocation = toLatestLocation(locationEvent);
      setLiveLocations((current) => {
        const idx = current.findIndex((i) => i.devicePublicId === latestLocation.devicePublicId);
        if (idx === -1) return [latestLocation, ...current];
        const updated = [...current];
        updated[idx] = latestLocation;
        return updated;
      });
    });

    void connection.start();
    return () => { void connection.stop(); };
  }, []);

  // Filtered list
  const filteredLocations = useMemo(() => {
    if (filter === 'online') return liveLocations.filter((l) => isLocationOnline(l.recordedAtUtc));
    if (filter === 'offline') return liveLocations.filter((l) => !isLocationOnline(l.recordedAtUtc));
    return liveLocations;
  }, [liveLocations, filter]);

  // Stats
  const onlineCount = useMemo(
    () => liveLocations.filter((l) => isLocationOnline(l.recordedAtUtc)).length,
    [liveLocations],
  );
  const offlineCount = liveLocations.length - onlineCount;

  // Map center
  const mapCenter = useMemo<[number, number]>(() => {
    if (selectedEngineer) {
      const loc = liveLocations.find((l) => l.engineerPublicId === selectedEngineer);
      if (loc) return [loc.latitude, loc.longitude];
    }
    return filteredLocations[0]
      ? [filteredLocations[0].latitude, filteredLocations[0].longitude]
      : DEFAULT_CENTER;
  }, [filteredLocations, selectedEngineer, liveLocations]);

  return (
    <>
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

      {!isLoading && !isError && liveLocations.length === 0 && (
        <EmptyState
          title="No locations found"
          description="No engineer locations have been received yet."
        />
      )}

      {!isLoading && !isError && liveLocations.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 2 }}>
          {/* Map */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* Stats bar */}
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              {(
                [
                  { label: 'All', value: 'all', count: liveLocations.length },
                  { label: 'Online', value: 'online', count: onlineCount, color: '#10b981' },
                  { label: 'Offline', value: 'offline', count: offlineCount, color: '#94a3b8' },
                ] as { label: string; value: FilterType; count: number; color?: string }[]
              ).map((f) => (
                <Box
                  key={f.value}
                  component="button"
                  onClick={() => { setFilter(f.value); setSelectedEngineer(null); }}
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

            <Paper sx={{ overflow: 'hidden', height: 580, p: 0, border: 'none' }}>
              <MapContainer
                center={DEFAULT_CENTER}
                zoom={6}
                style={{ height: '100%', width: '100%' }}
                aria-label="Engineers live location map"
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapRecenter center={mapCenter} />

                {filteredLocations.map((location) => (
                  <Marker
                    key={location.devicePublicId}
                    position={[location.latitude, location.longitude]}
                    icon={getMarkerIcon(location)}
                    eventHandlers={{
                      click: () => setSelectedEngineer(location.engineerPublicId),
                    }}
                  >
                    <Popup>
                      <Box sx={{ minWidth: 180, fontFamily: 'Inter, sans-serif' }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', mb: 0.5 }}>
                          {location.engineerName}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748b', mb: 0.25 }}>
                          📱 {location.deviceName}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748b', mb: 0.25 }}>
                          📍 {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                        </Typography>
                        {location.accuracy != null && (
                          <Typography variant="body2" sx={{ color: '#64748b', mb: 0.25 }}>
                            Accuracy: {location.accuracy.toFixed(1)}m
                          </Typography>
                        )}
                        {location.speed != null && (
                          <Typography variant="body2" sx={{ color: '#64748b', mb: 0.25 }}>
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
                            }}
                          >
                            ⚠ Mocked GPS
                          </Box>
                        )}
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: '#94a3b8' }}>
                          {formatLastSeen(location.recordedAtUtc)}
                        </Typography>
                      </Box>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </Paper>
          </Box>

          {/* Engineer list panel */}
          <Paper
            sx={{
              height: 632,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            role="list"
            aria-label="Engineer locations list"
          >
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>
                {filteredLocations.length} Engineers
              </Typography>
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              {filteredLocations.map((location) => {
                const online = isLocationOnline(location.recordedAtUtc);
                const isSelected = selectedEngineer === location.engineerPublicId;

                return (
                  <Box
                    key={location.devicePublicId}
                    component="button"
                    onClick={() => setSelectedEngineer(
                      isSelected ? null : location.engineerPublicId
                    )}
                    aria-label={`${location.engineerName} — ${online ? 'Online' : 'Offline'}, last seen ${formatLastSeen(location.recordedAtUtc)}`}
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
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      backgroundColor: isSelected ? 'primary.main' : 'transparent',
                      transition: 'background-color 0.15s ease',
                      border: 'none',
                      '&:hover': {
                        backgroundColor: isSelected ? 'primary.dark' : 'action.hover',
                      },
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: -2,
                      },
                    }}
                  >
                    {/* Status dot */}
                    <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          backgroundColor: location.isMocked
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

                    <Box sx={{ flex: 1, minWidth: 0 }}>
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
                        {formatLastSeen(location.recordedAtUtc)}
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
      {!isLoading && !isError && liveLocations.length > 0 && (
        <Box sx={{ display: 'flex', gap: 3, mt: 1.5, px: 0.5 }}>
          {[
            { color: '#10b981', label: 'Online (< 15 min)' },
            { color: '#94a3b8', label: 'Offline' },
            { color: '#ef4444', label: 'Mocked GPS ⚠' },
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
    </>
  );
}