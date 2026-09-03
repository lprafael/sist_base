"use client";

import { MapContainer, TileLayer, Marker, useMapEvents, LayersControl, useMap, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";
import { Search, Loader2 } from "lucide-react";

// Modern custom SVG/HTML pin icon that renders reliably without external CDN dependencies
const customMarkerIcon = typeof window !== "undefined" ? L.divIcon({
  className: "custom-location-pin",
  html: `<div style="
    display: flex;
    flex-direction: column;
    align-items: center;
    transform: translate(-50%, -100%);
    cursor: pointer;
    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.35));
  ">
    <div style="
      background: linear-gradient(135deg, #ef4444, #dc2626);
      width: 36px;
      height: 36px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2.5px solid #ffffff;
    ">
      <div style="transform: rotate(45deg); font-size: 16px;">📍</div>
    </div>
    <div style="
      width: 12px;
      height: 4px;
      background: rgba(0,0,0,0.25);
      border-radius: 50%;
      margin-top: 2px;
    "></div>
  </div>`,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
  popupAnchor: [0, -36]
}) : undefined;

interface LocationPickerProps {
  defaultLocation?: { lat: number; lng: number };
  onLocationSelect?: (loc: { lat: number; lng: number }, addressName?: string) => void;
  readOnly?: boolean;
  hideSearchOverlay?: boolean;
}

function LocationMarker({ onSelect, currentLoc, readOnly }: { onSelect?: (l: any) => void, currentLoc?: {lat: number, lng: number} | null, readOnly?: boolean }) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(currentLoc || null);
  const map = useMapEvents({
    click(e) {
      if (readOnly) return;
      setPosition(e.latlng);
      if (onSelect) onSelect(e.latlng);
    },
  });

  useEffect(() => {
    if (currentLoc && typeof currentLoc.lat === 'number' && typeof currentLoc.lng === 'number' && !isNaN(currentLoc.lat) && !isNaN(currentLoc.lng)) {
      setPosition({ lat: currentLoc.lat, lng: currentLoc.lng });
    }
  }, [currentLoc?.lat, currentLoc?.lng]);

  if (!position) return null;

  return (
    <Marker 
      position={position}
      icon={customMarkerIcon}
      draggable={!readOnly}
      eventHandlers={{
        dragend(e) {
          const marker = e.target;
          if (marker) {
            const newPos = marker.getLatLng();
            setPosition(newPos);
            if (onSelect) onSelect(newPos);
          }
        }
      }}
    >
      <Popup offset={[0, -36]}>
        <div style={{ textAlign: 'center', padding: '2px 4px', fontSize: '12px' }}>
          <strong style={{ color: '#0f172a', display: 'block' }}>Ubicación Seleccionada</strong>
          {!readOnly && <span style={{ color: '#64748b', fontSize: '11px' }}>Puedes arrastrar este marcador</span>}
        </div>
      </Popup>
    </Marker>
  );
}

function MapController({ center }: { center: {lat: number, lng: number} | null }) {
  const map = useMap();
  useEffect(() => {
    if (center && typeof center.lat === 'number' && typeof center.lng === 'number' && !isNaN(center.lat) && !isNaN(center.lng)) {
      map.flyTo([center.lat, center.lng], 16, { animate: true, duration: 1.2 });
    }
  }, [center?.lat, center?.lng, map]);
  return null;
}

export default function LocationPickerMap({ defaultLocation, onLocationSelect, readOnly = false, hideSearchOverlay = false }: LocationPickerProps) {
  const [isClient, setIsClient] = useState(false);
  const initialPos: [number, number] = defaultLocation && typeof defaultLocation.lat === 'number' && !isNaN(defaultLocation.lat) 
    ? [defaultLocation.lat, defaultLocation.lng] 
    : [-25.2867, -57.6470]; // Asunción
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | null>(defaultLocation || null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Sync external defaultLocation updates (e.g. from places autocomplete) to flyTo and update marker
  useEffect(() => {
    if (defaultLocation && typeof defaultLocation.lat === 'number' && typeof defaultLocation.lng === 'number' && !isNaN(defaultLocation.lat) && !isNaN(defaultLocation.lng)) {
      setMapCenter({ lat: defaultLocation.lat, lng: defaultLocation.lng });
    }
  }, [defaultLocation?.lat, defaultLocation?.lng]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      // Nominatim search API
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ', Paraguay')}&limit=5`);
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error("Error searching location:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const newLoc = { lat, lng };
    setMapCenter(newLoc);
    if (onLocationSelect) onLocationSelect(newLoc, result.display_name);
    setSearchResults([]);
    setSearchQuery(result.display_name);
  };

  if (!isClient) return null;

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      {/* Search overlay */}
      {!readOnly && !hideSearchOverlay && (
        <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: '90%', maxWidth: 400 }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, background: 'white', padding: '6px', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <input 
              type="text" 
              placeholder="Buscar (ej. Shopping del Sol)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, border: 'none', outline: 'none', padding: '0 8px', fontSize: 14, color: '#0f172a' }}
            />
            <button type="submit" disabled={isSearching} style={{ background: '#16a34a', color: 'white', border: 'none', padding: '8px 12px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div style={{ marginTop: 8, background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
              {searchResults.map((res, i) => (
                <div 
                  key={i} 
                  onClick={() => handleSelectResult(res)}
                  style={{ padding: '10px 12px', fontSize: 13, borderBottom: i < searchResults.length - 1 ? '1px solid #e2e8f0' : 'none', cursor: 'pointer', color: '#334155' }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                >
                  {res.display_name}
                </div>
              ))}
            </div>
          )}
          {searchResults.length === 0 && searchQuery && !isSearching && (
            <div style={{ marginTop: 8, background: 'white', borderRadius: 12, padding: '10px 12px', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', color: '#64748b', textAlign: 'center' }}>
              No se encontró. Intenta buscar la ciudad y luego haz clic en el mapa para ubicar el marcador manualmente.
            </div>
          )}
        </div>
      )}

      <MapContainer
        center={initialPos}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", borderRadius: "12px" }}
      >
        <MapController center={mapCenter} />
        
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Mapa (Plano)">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satélite">
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        <LocationMarker onSelect={onLocationSelect} currentLoc={mapCenter || defaultLocation} readOnly={readOnly} />
      </MapContainer>
    </div>
  );
}
