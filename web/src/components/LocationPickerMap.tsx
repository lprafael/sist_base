"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";

// Fix missing default icon in Leaflet when using Webpack/Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface LocationPickerProps {
  defaultLocation?: { lat: number; lng: number };
  onLocationSelect: (loc: { lat: number; lng: number }) => void;
}

function LocationMarker({ onSelect, currentLoc }: { onSelect: (l: any) => void, currentLoc?: {lat: number, lng: number} }) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(currentLoc || null);
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onSelect(e.latlng);
    },
  });

  useEffect(() => {
    if (currentLoc) {
      setPosition(currentLoc);
      map.flyTo(currentLoc, map.getZoom());
    }
  }, [currentLoc, map]);

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export default function LocationPickerMap({ defaultLocation, onLocationSelect }: LocationPickerProps) {
  const [isClient, setIsClient] = useState(false);
  const initialPos: [number, number] = defaultLocation ? [defaultLocation.lat, defaultLocation.lng] : [-25.2867, -57.6470]; // Asunción

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <MapContainer
      center={initialPos}
      zoom={13}
      scrollWheelZoom={true}
      style={{ height: "100%", width: "100%", borderRadius: "12px" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <LocationMarker onSelect={onLocationSelect} currentLoc={defaultLocation} />
    </MapContainer>
  );
}
