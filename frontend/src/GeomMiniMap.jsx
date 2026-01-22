// GeomMiniMap.jsx
// Muestra una vista pequeña de un shape GeoJSON en un mapa Leaflet
import React, { useMemo, useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import GeomModalMap from "./GeomModalMap";
import "leaflet/dist/leaflet.css";

const isWKB = (str) => {
  if (typeof str !== "string") return false;
  return (str.startsWith("\\x") || str.startsWith("0x") || /^[0-9a-fA-F]+$/.test(str));
};

// Implementación dummy para WKB
const wkbToGeoJSON = (wkbHex) => {
  return null; // En una app real usar wkx
};

function GeomMiniMap({ geom }) {
  const [showModal, setShowModal] = useState(false);

  const { geojson, parseError } = useMemo(() => {
    try {
      if (!geom) return { geojson: null, parseError: null };

      // Si es un array, normalizarlo a FeatureCollection
      if (Array.isArray(geom)) {
        const features = geom.map(g => {
          if (!g) return null;
          let parsed = typeof g === 'string' ? JSON.parse(g) : g;
          return {
            type: "Feature",
            geometry: parsed.type ? parsed : (parsed.geometry || parsed),
            properties: parsed.properties || {}
          };
        }).filter(f => f);

        return {
          geojson: { type: "FeatureCollection", features },
          parseError: null
        };
      }

      let parsedGeom = geom;
      if (typeof geom === "string") {
        if (isWKB(geom)) {
          const converted = wkbToGeoJSON(geom);
          if (converted) return { geojson: converted, parseError: null };
        }
        try {
          parsedGeom = JSON.parse(geom);
        } catch (e) {
          return { geojson: null, parseError: "Formato no soportado" };
        }
      }

      if (parsedGeom && typeof parsedGeom === "object") {
        if (parsedGeom.type === "Feature" || parsedGeom.type === "FeatureCollection")
          return { geojson: parsedGeom, parseError: null };

        if (parsedGeom.type && ["Point", "LineString", "Polygon", "MultiPoint", "MultiLineString", "MultiPolygon"].includes(parsedGeom.type)) {
          return {
            geojson: { type: "Feature", geometry: parsedGeom, properties: {} },
            parseError: null,
          };
        }
      }

      return { geojson: null, parseError: "Formato no soportado" };
    } catch (error) {
      return { geojson: null, parseError: "Error al procesar" };
    }
  }, [geom]);

  if (parseError) return <span style={{ color: "red" }}>{parseError}</span>;
  if (!geojson) return <span style={{ color: "#aaa" }}>Sin geometría</span>;

  const getCenter = () => {
    try {
      const feat = geojson.type === "FeatureCollection" ? geojson.features[0] : geojson;
      if (feat.geometry.type === "Point") {
        return [feat.geometry.coordinates[1], feat.geometry.coordinates[0]];
      }
      if (feat.geometry.type === "LineString" && feat.geometry.coordinates.length > 0) {
        return [feat.geometry.coordinates[0][1], geojson.geometry.coordinates[0][0]];
      }
      if (feat.geometry.type === "Polygon" && feat.geometry.coordinates[0].length > 0) {
        return [feat.geometry.coordinates[0][0][1], feat.geometry.coordinates[0][0][0]];
      }
    } catch (e) { }
    return [-25.3, -57.6];
  };

  return (
    <>
      <div
        style={{
          width: 90,
          height: 60,
          cursor: "pointer",
          border: "1px solid #ddd",
          borderRadius: "4px",
          overflow: "hidden",
        }}
        onClick={() => setShowModal(true)}
      >
        <MapContainer
          style={{ width: "100%", height: "100%" }}
          center={getCenter()}
          zoom={12}
          zoomControl={false}
          attributionControl={false}
          dragging={false}
          scrollWheelZoom={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <GeoJSON
            data={geojson}
            style={{ color: "#1976d2", weight: 2 }}
          />
        </MapContainer>
      </div>
      {showModal && (
        <GeomModalMap geom={geojson} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}

export default React.memo(GeomMiniMap);
