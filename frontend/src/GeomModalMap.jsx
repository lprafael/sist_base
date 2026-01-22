import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap, LayersControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const { BaseLayer } = LayersControl;

// Componente para ajustar los límites del mapa a la geometría
function FitBounds({ data }) {
  const map = useMap();
  useEffect(() => {
    if (data) {
      const layer = L.geoJSON(data);
      if (layer.getLayers().length > 0) {
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      }
    }
  }, [data, map]);
  return null;
}

export default function GeomModalMap({ geom, onClose }) {
  let geojson;

  // Normalizar la entrada para que siempre sea un GeoJSON válido (Feature o FeatureCollection)
  const processGeom = (input) => {
    if (!input) return null;
    try {
      let parsed = typeof input === "string" ? JSON.parse(input) : input;

      // Si recibimos un array de geometrías, creamos un FeatureCollection
      if (Array.isArray(parsed)) {
        return {
          type: "FeatureCollection",
          features: parsed.map(g => ({
            type: "Feature",
            geometry: g.type && g.coordinates ? g : (g.geometry || g),
            properties: g.properties || {}
          }))
        };
      }

      // Si no es un Feature o FeatureCollection, envolverlo
      if (parsed.type && !["Feature", "FeatureCollection"].includes(parsed.type)) {
        return {
          type: "Feature",
          geometry: parsed,
          properties: {}
        };
      }
      return parsed;
    } catch (e) {
      console.error("Error procesando geometría en modal:", e);
      return null;
    }
  };

  geojson = processGeom(geom);

  if (!geojson) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '95vw',
          height: '90vh',
          background: '#fff',
          borderRadius: 24,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: 'white',
            border: 'none',
            borderRadius: '12px',
            width: 40,
            height: 40,
            fontSize: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1e293b',
            cursor: 'pointer',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
            zIndex: 10001
          }}
        >
          &times;
        </button>

        <MapContainer
          style={{ width: '100%', height: '100%' }}
          center={[-25.3, -57.6]}
          zoom={13}
          scrollWheelZoom={true}
        >
          <LayersControl position="topright">
            <BaseLayer checked name="OpenStreetMap">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />
            </BaseLayer>
            <BaseLayer name="Satélite (Google)">
              <TileLayer
                url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                attribution='&copy; Google Maps'
              />
            </BaseLayer>
            <BaseLayer name="Calles (Google)">
              <TileLayer
                url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                attribution='&copy; Google Maps'
              />
            </BaseLayer>
          </LayersControl>

          <GeoJSON
            key={JSON.stringify(geojson)} // Forzar re-render si cambia la data
            data={geojson}
            style={(feature) => ({
              color: feature.geometry.type === "Point" ? "#ef4444" : "#2563eb",
              weight: feature.geometry.type === "Point" ? 2 : 4,
              fillColor: "#2563eb",
              fillOpacity: 0.2,
              opacity: 0.8,
              lineCap: 'round',
              lineJoin: 'round'
            })}
            pointToLayer={(feature, latlng) => {
              return L.marker(latlng, {
                icon: L.icon({
                  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
                  iconSize: [32, 32],
                  iconAnchor: [16, 32]
                })
              });
            }}
          />
          <FitBounds data={geojson} />
        </MapContainer>

        <div style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(4px)',
          padding: '8px 16px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '600',
          color: '#475569',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          pointerEvents: 'none',
          zIndex: 10001
        }}>
          🗺️ Vista Geoespacial - Terminal y Geocerca
        </div>
      </div>
    </div>
  );
}
