import { useEffect, useMemo, useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { Marker, Popup, TileLayer, MapContainer } from 'react-leaflet';
import L from 'leaflet';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../components/common/PageHeader';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { StatusChip } from '../components/status/StatusChip';
import { getLatestLocations } from '../api/trackingApi';
import { createLocationHubConnection } from '../signalr/locationHub';
import type { LatestLocationResponse, LocationReceivedEvent } from '../types/tracking';

const defaultCenter: [number, number] = [26.8206, 30.8025];

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

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

export function LiveMapPage() {
  const [liveLocations, setLiveLocations] = useState<LatestLocationResponse[]>([]);

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['latest-locations'],
    queryFn: getLatestLocations,
  });

  useEffect(() => {
    if (data) {
      setLiveLocations(data);
    }
  }, [data]);

  useEffect(() => {
    const connection = createLocationHubConnection((locationEvent) => {
      const latestLocation = toLatestLocation(locationEvent);

      setLiveLocations((current) => {
        const existingIndex = current.findIndex(
          (item) => item.devicePublicId === latestLocation.devicePublicId,
        );

        if (existingIndex === -1) {
          return [latestLocation, ...current];
        }

        const updated = [...current];
        updated[existingIndex] = latestLocation;

        return updated;
      });
    });

    void connection.start();

    return () => {
      void connection.stop();
    };
  }, []);

  const mapCenter = useMemo<[number, number]>(() => {
    const firstLocation = liveLocations[0];

    if (!firstLocation) {
      return defaultCenter;
    }

    return [firstLocation.latitude, firstLocation.longitude];
  }, [liveLocations]);

  return (
    <>
      <PageHeader
        title="Live Map"
        subtitle="Monitor latest engineer locations and live tracking updates."
      />

      {isLoading && <LoadingState message="Loading latest locations..." />}

      {isError && (
        <ErrorState
          message="Failed to load latest locations."
          onRetry={() => {
            void refetch();
          }}
        />
      )}

      {!isLoading && !isError && liveLocations.length === 0 && (
        <EmptyState
          title="No locations found"
          description="No engineer locations have been received yet."
        />
      )}

      {!isLoading && !isError && liveLocations.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
            gap: 2,
          }}
        >
          <Paper sx={{ overflow: 'hidden', height: 620 }}>
            <MapContainer
              center={mapCenter}
              zoom={6}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {liveLocations.map((location) => (
                <Marker
                  key={location.devicePublicId}
                  position={[location.latitude, location.longitude]}
                  icon={markerIcon}
                >
                  <Popup>
                    <Typography sx={{ fontWeight: 700 }}>
                      {location.engineerName}
                    </Typography>

                    <Typography variant="body2">
                      Device: {location.deviceName}
                    </Typography>

                    <Typography variant="body2">
                      Accuracy: {location.accuracy ?? '—'}
                    </Typography>

                    <Typography variant="body2">
                      Speed: {location.speed ?? '—'}
                    </Typography>

                    <Typography variant="caption" color="text.secondary">
                      {new Date(location.recordedAtUtc).toLocaleString()}
                    </Typography>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </Paper>

          <Paper sx={{ p: 2, height: 620, overflow: 'auto' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Latest Locations
            </Typography>

            {liveLocations.map((location) => (
              <Box
                key={location.devicePublicId}
                sx={{
                  py: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography sx={{ fontWeight: 700 }}>
                  {location.engineerName}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  {location.deviceName}
                </Typography>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Lat: {location.latitude}, Lng: {location.longitude}
                </Typography>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {new Date(location.recordedAtUtc).toLocaleString()}
                </Typography>

                <Box sx={{ mt: 1 }}>
                  {location.isMocked ? (
                    <StatusChip label="Mocked" color="error" />
                  ) : (
                    <StatusChip label="Real GPS" color="success" />
                  )}
                </Box>
              </Box>
            ))}
          </Paper>
        </Box>
      )}
    </>
  );
}