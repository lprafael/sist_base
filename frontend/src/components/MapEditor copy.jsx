import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import 'leaflet-snap';
import { authFetch } from '../utils/authFetch';

// Corregir íconos de Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const MapEditor = ({ 
  initialGeoJSON, 
  onSave, 
  onCancel,
  rutaId,
  bounds
}) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [editableLayer, setEditableLayer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snapLayer, setSnapLayer] = useState(null);

  // Inicializar el mapa
  useEffect(() => {
    if (!mapRef.current) return;

    // Crear el mapa
    const mapInstance = L.map(mapRef.current, {
      preferCanvas: true,
      zoomControl: false,
    }).setView([-25.3, -57.6], 13);

    // Agregar capa base de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstance);

    // Inicializar controles de edición
    mapInstance.pm.addControls({
      position: 'topleft',
      drawPolyline: true,
      editMode: true,
      dragMode: true,
      cutPolygon: false,
      removalMode: false,
    });

    // Configurar opciones globales de edición
    mapInstance.pm.setGlobalOptions({
      snappable: true,
      snapDistance: 20,
      allowSelfIntersection: false,
    });

    setMap(mapInstance);

    // Limpieza al desmontar
    return () => {
      mapInstance.remove();
    };
  }, []);

  // Cargar datos de OSM para snapping
  useEffect(() => {
    if (!map) return;

    const loadOSMData = async () => {
      try {
        const response = await fetch(
          `https://overpass-api.de/api/interpreter?data=[out:json];(way[highway](around:500,${map.getCenter().lat},${map.getCenter().lng});>;);out;`
        );
        const data = await response.json();
        
        // Convertir datos OSM a GeoJSON
        const streets = L.geoJson(data, {
          style: {
            color: '#666',
            weight: 2,
            opacity: 0.7
          },
          interactive: false
        }).addTo(map);
        
        setSnapLayer(streets);
        
        // Configurar snapping con la capa de calles
        if (streets) {
          map.pm.setGlobalOptions({
            snappable: true,
            snapDistance: 20,
            snapMiddle: true,
            snapVertices: true,
            snapSegment: true,
            snapVerticesDistance: 20,
            snapSegment: true,
            snapSegmentDistance: 20,
            snapDistance: 20,
            snapEnabled: true,
            snapFinishOnly: false,
            snapPanes: { vertex: 'vertexPane', segment: 'segmentPane' },
            snapMarkers: true,
            snapMarkerStyle: {
              radius: 8,
              color: '#000',
              fillColor: '#fff',
              weight: 2,
              opacity: 1,
              fillOpacity: 1
            },
            snapMarker: true,
            snapMarkerOptions: {
              radius: 8,
              color: '#000',
              fillColor: '#fff',
              weight: 2,
              opacity: 1,
              fillOpacity: 1
            },
            snapLayer: streets
          });
        }
      } catch (err) {
        console.error('Error al cargar datos de OSM:', err);
        setError('No se pudieron cargar los datos de calles para el snapping');
      } finally {
        setIsLoading(false);
      }
    };

    loadOSMData();
  }, [map]);

  // Cargar y mostrar la ruta inicial
  useEffect(() => {
    if (!map || !initialGeoJSON) return;

    try {
      // Limpiar capa anterior si existe
      if (editableLayer) {
        map.removeLayer(editableLayer);
      }

      // Crear capa editable con la geometría inicial
      const layer = L.geoJSON(initialGeoJSON, {
        style: {
          color: '#3388ff',
          weight: 5,
          opacity: 0.8
        },
        pmIgnore: false
      }).addTo(map);

      // Hacer la capa editable
      layer.pm.enable({
        allowSelfIntersection: false,
        snappable: true,
        snapDistance: 20
      });

      setEditableLayer(layer);

      // Ajustar la vista al área de la ruta
      if (bounds) {
        map.fitBounds(bounds);
      } else if (layer.getBounds) {
        map.fitBounds(layer.getBounds().pad(0.1));
      }
    } catch (err) {
      console.error('Error al cargar la ruta:', err);
      setError('Error al cargar la ruta para edición');
    }
  }, [map, initialGeoJSON, bounds]);

  // Manejador para guardar cambios
  const handleSave = () => {
    if (!editableLayer) return;
    
    try {
      const geoJSON = editableLayer.toGeoJSON();
      onSave(geoJSON);
    } catch (err) {
      console.error('Error al guardar cambios:', err);
      setError('Error al guardar los cambios');
    }
  };

  if (isLoading) {
    return <div className="loading">Cargando editor de rutas...</div>;
  }

  return (
    <div className="map-editor-container">
      {error && <div className="error-message">{error}</div>}
      
      <div 
        ref={mapRef} 
        style={{ 
          height: '500px', 
          width: '100%',
          borderRadius: '8px',
          border: '1px solid #ddd'
        }}
      />
      
      <div className="editor-controls" style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
        <button 
          onClick={handleSave}
          className="btn btn-primary"
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Guardar Cambios
        </button>
        
        <button 
          onClick={onCancel}
          className="btn btn-secondary"
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export { MapEditor };
