"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function MapComponent() {
  const position: [number, number] = [-25.2867, -57.647];

  return (
    <MapContainer 
      center={position} 
      zoom={13} 
      style={{ height: "100%", width: "100%", background: "#0c0c0c" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      
      <Marker position={[-25.268, -57.485]}>
        <Popup><b>Sintético Central</b><br/>Gs. 150.000 / h</Popup>
      </Marker>
      <Marker position={[-25.295, -57.620]}>
        <Popup><b>Padel Mania</b><br/>Gs. 120.000 / h</Popup>
      </Marker>
    </MapContainer>
  );
}
