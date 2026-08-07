"use client";

import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";

// Icono personalizado para el Origen (Verde)
const pickupIcon = typeof window !== "undefined" ? L.divIcon({
  className: "custom-pickup-icon",
  html: `<div style="background-color: #10b981; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
}) : null;

// Icono personalizado para el Destino (Rojo)
const dropoffIcon = typeof window !== "undefined" ? L.divIcon({
  className: "custom-dropoff-icon",
  html: `<div style="background-color: #ef4444; width: 16px; height: 16px; border-radius: 3px; border: 3px solid white; transform: rotate(45deg); box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
}) : null;

function MapEvents({ onMapClick }: { onMapClick: (latlng: any) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
}

// Botón para centrar mapa
function LocationButton({ coords }: { coords: [number, number] | null }) {
  const map = useMap();
  const centerMap = () => {
    if (coords) map.flyTo(coords, 15);
  };
  return (
    <div className="leaflet-bottom leaflet-right" style={{ marginBottom: '220px', marginRight: '10px' }}>
      <button 
        onClick={centerMap}
        className="bg-white p-3 rounded-full shadow-lg border border-gray-100 active:scale-90 transition-transform pointer-events-auto"
        aria-label="Centrar Ubicación"
      >
        <span className="text-xl">🎯</span>
      </button>
    </div>
  );
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
      style={{ height: '100%', width: '100%', background: '#f3f4f6' }}
    >
      {/* Estilo de mapa Voyager: Más profesional y limpio */}
      <TileLayer 
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" 
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      />
      
      {pickup && <Marker position={pickup} icon={pickupIcon!} />}
      {dropoff && <Marker position={dropoff} icon={dropoffIcon!} />}
      
      {routeCoords.length > 0 && (
        <Polyline 
          positions={routeCoords} 
          color="#f59e0b" 
          weight={6} 
          opacity={0.8}
          lineJoin="round"
        />
      )}
      <MapEvents onMapClick={onMapClick} />
      <LocationButton coords={pickup} />
    </MapContainer>
  );
}
