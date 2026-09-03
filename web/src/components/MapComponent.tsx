"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";

// Normal Leaflet initialization is client-side only
export default function MapComponent({ 
  venues, 
  onSelectVenue 
}: { 
  venues: any[]; 
  onSelectVenue?: (venue: any) => void 
}) {
  const position: [number, number] = [-25.2867, -57.647]; // Asunción, Paraguay
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  // Custom DivIcon creator styled like Google Flights (pricing pills)
  const createPriceIcon = (price: string | number, available: boolean, name: string, es_publico?: boolean) => {
    if (es_publico) {
      return L.divIcon({
        html: `
          <div style="
            background: #10b981;
            color: white;
            padding: 6px 12px;
            border-radius: 24px;
            font-family: 'Outfit', -apple-system, sans-serif;
            font-size: 13px;
            font-weight: 800;
            box-shadow: 0 4px 15px rgba(16,185,129,0.4);
            border: 2px solid white;
            white-space: nowrap;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
            letter-spacing: -0.2px;
          " 
          onmouseover="this.style.transform='scale(1.08)'; this.style.zIndex='9999';"
          onmouseout="this.style.transform='scale(1)';"
          title="${name}">
            🌳 Pública
          </div>
        `,
        className: 'custom-price-marker',
        iconSize: [100, 32],
        iconAnchor: [50, 16]
      });
    }

    const formattedPrice = typeof price === 'number' 
      ? new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(price)
      : price;

    const backgroundColor = available ? "#16a34a" : "#64748b"; // Green if available, Slate gray if full/unavail
    const borderGlow = available ? "0 4px 15px rgba(22,163,74,0.4)" : "0 4px 10px rgba(0,0,0,0.15)";
    
    return L.divIcon({
      html: `
        <div style="
          background: ${backgroundColor};
          color: white;
          padding: 6px 12px;
          border-radius: 24px;
          font-family: 'Outfit', -apple-system, sans-serif;
          font-size: 13px;
          font-weight: 800;
          box-shadow: ${borderGlow};
          border: 2px solid white;
          white-space: nowrap;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          letter-spacing: -0.2px;
        " 
        onmouseover="this.style.transform='scale(1.08)'; this.style.zIndex='9999';"
        onmouseout="this.style.transform='scale(1)';"
        title="${name}">
          ${available ? `${formattedPrice} Gs.` : 'No disponible'}
        </div>
      `,
      className: 'custom-price-marker',
      iconSize: [available ? 100 : 110, 32],
      iconAnchor: [available ? 50 : 55, 16]
    });
  };

  return (
    <MapContainer 
      center={position} 
      zoom={13} 
      scrollWheelZoom={true} 
      style={{ height: "100%", width: "100%", background: "#f1f5f9" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {venues.map(venue => {
        const hasPos = Array.isArray(venue.pos) && venue.pos.length === 2;
        const markerPos = hasPos ? venue.pos : [-25.2867, -57.647];
        
        return (
          <Marker 
            key={venue.id} 
            position={markerPos}
            icon={createPriceIcon(venue.price, venue.available, venue.name, venue.es_publico)}
            eventHandlers={{
              click: () => {
                if (onSelectVenue && !venue.es_publico) onSelectVenue(venue);
              }
            }}
          >
            <Popup className="custom-popup">
              <div style={{ padding: "4px", minWidth: "160px", fontFamily: "'Outfit', sans-serif" }}>
                <h3 style={{ fontWeight: 800, color: "#0f172a", fontSize: "14px", margin: "0 0 4px" }}>{venue.name}</h3>
                <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 10px" }}>
                  📍 {venue.direccion || 'Asunción'}
                </p>
                {venue.es_publico ? (
                  <div style={{ padding: '8px', background: '#ecfdf5', borderRadius: '8px', color: '#059669', fontSize: '12px', fontWeight: 700, textAlign: 'center' }}>
                    🌳 Cancha Pública (Sin Reservas)
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Tarifa:</span>
                      <span style={{ fontWeight: 800, color: venue.available ? '#16a34a' : '#64748b', fontSize: '13px' }}>
                        {venue.available ? `${new Intl.NumberFormat('es-PY').format(venue.price)} Gs` : 'Sin turnos'}
                      </span>
                    </div>
                    <button 
                      onClick={() => onSelectVenue && onSelectVenue(venue)}
                      style={{
                        width: "100%",
                        background: "#16a34a",
                        border: "none",
                        color: "white",
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "8px 12px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        transition: "background 0.2s"
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = "#15803d")}
                      onMouseOut={(e) => (e.currentTarget.style.background = "#16a34a")}
                    >
                      Ver Disponibilidad
                    </button>
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      <style jsx global>{`
        .leaflet-popup-content-wrapper {
          background: #fff;
          border-radius: 16px;
          padding: 8px;
          box-shadow: 0 10px 25px -5px rgba(15,23,42,0.1);
          border: 1px solid rgba(15,23,42,0.05);
        }
        .leaflet-popup-close-button {
          padding: 8px !important;
          color: #64748b !important;
        }
        .leaflet-popup-tip {
          background: #fff;
        }
        .leaflet-container {
          font-family: 'Outfit', sans-serif;
        }
      `}</style>
    </MapContainer>
  );
}
