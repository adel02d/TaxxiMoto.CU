"use client";

import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";

if (typeof window !== "undefined") {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
}

function MapEvents({ onMapClick }: { onMapClick: (latlng: any) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
}

interface MapContentProps {
  pickup: [number, number] | null;
  dropoff: [number, number] | null;
  routeCoords: [number, number][];
  onMapClick: (latlng: any) => void;
}

export default function MapComponent({ pickup, dropoff, routeCoords, onMapClick }: MapContentProps) {
  return (
    <MapContainer 
      center={[23.1136, -82.3666]} 
      zoom={13} 
      zoomControl={false}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {pickup && <Marker position={pickup} />}
      {dropoff && <Marker position={dropoff} />}
      {routeCoords.length > 0 && (
        <Polyline positions={routeCoords} color="#f59e0b" weight={5} opacity={0.8} />
      )}
      <MapEvents onMapClick={onMapClick} />
    </MapContainer>
  );
}
