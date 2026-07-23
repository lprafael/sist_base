"use client";

import { MapContainer, TileLayer, Marker, useMapEvents, LayersControl, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";
import { Search, Loader2 } from "lucide-react";

// Fix missing default icon in Leaflet when using Webpack/Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface LocationPickerProps {
  defaultLocation?: { lat: number; lng: number };
  onLocationSelect?: (loc: { lat: number; lng: number }, addressName?: string) => void;
  readOnly?: boolean;
}

function LocationMarker({ onSelect, currentLoc, readOnly }: { onSelect?: (l: any) => void, currentLoc?: {lat: number, lng: number}, readOnly?: boolean }) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(currentLoc || null);
  const map = useMapEvents({
    click(e) {
      if (readOnly) return;
      setPosition(e.latlng);
      if (onSelect) onSelect(e.latlng);
    },
  });

  useEffect(() => {
    if (currentLoc) {
      setPosition(currentLoc);
    }
  }, [currentLoc]);

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

function MapController({ center }: { center: {lat: number, lng: number} | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 15);
    }
  }, [center, map]);
  return null;
}

export default function LocationPickerMap({ defaultLocation, onLocationSelect, readOnly = false }: LocationPickerProps) {
  const [isClient, setIsClient] = useState(false);
  const initialPos: [number, number] = defaultLocation ? [defaultLocation.lat, defaultLocation.lng] : [-25.2867, -57.6470]; // Asunción
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | null>(defaultLocation || null);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
      {!readOnly && (
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
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
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
