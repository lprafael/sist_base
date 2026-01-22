import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import 'leaflet-snap';

// Corregir iconos de marcadores en producción
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

const MapEditor = ({ initialRoute, onSave, onCancel }) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [editableLayer, setEditableLayer] = useState(null);
  const [osmLayer, setOsmLayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Inicializar el mapa
  useEffect(() => {
    if (!mapRef.current) return;

    // Crear instancia del mapa centrada en Asunción, Paraguay
    const mapInstance = L.map(mapRef.current, {
      center: [-25.3005, -57.6362],
      zoom: 13,
      pmIgnore: false // Habilitar el plugin de edición
    });

    // Añadir capa base de OSM
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstance);
    setOsmLayer(osmLayer);

    // Cargar datos de calles de OSM usando Overpass API
    const loadOsmStreets = async () => {
      try {
        setLoading(true);
        
        // Configuración inicial de Geoman
        mapInstance.pm.addControls({
          position: 'topleft',
          drawMarker: false,
          drawCircleMarker: false,
          drawPolyline: true,  // Habilitar dibujo de líneas
          drawRectangle: false,
          drawPolygon: false,
          drawCircle: false,
          editMode: true,      // Habilitar edición
          dragMode: true,      // Habilitar arrastre
          cutPolygon: false,
          removalMode: true,   // Habilitar eliminación
        });

        // Función para obtener datos de OSM con reintentos
        const fetchWithRetry = async (bbox, retries = 3, delay = 1000) => {
          const [minLon, minLat, maxLon, maxLat] = bbox.split(',').map(Number);
          
          // Mejor consulta Overpass para el área de Asunción
          const overpassQuery = `
            [out:json][timeout:25];
            (
              way[highway~"^(primary|secondary|tertiary|residential|unclassified|service|track|path|footway)$"]
                (${minLat - 0.01},${minLon - 0.01},${maxLat + 0.01},${maxLon + 0.01});
            );
            out body;
            >;
            out skel qt;
          `.trim(); // Only trim extra whitespace, don't remove all spaces

          const servers = [
            `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`,
            `https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(overpassQuery)}`,
            `https://maps.mail.ru/osm/tools/overpass/api/interpreter?data=${encodeURIComponent(overpassQuery)}`
          ];

          for (let server of servers) {
            for (let i = 0; i < retries; i++) {
              try {
                console.log(`Intento ${i + 1} con servidor:`, server);
                const response = await fetch(server);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const text = await response.text();
                try {
                  const data = JSON.parse(text);
                  if (data.elements && data.elements.length > 0) {
                    console.log('Datos de OSM cargados correctamente');
                    return data;
                  }
                  throw new Error('No se encontraron elementos en la respuesta');
                } catch (e) {
                  console.warn('Error procesando respuesta:', e.message);
                  throw new Error('Respuesta no es JSON válido');
                }
              } catch (error) {
                console.warn(`Error en el intento ${i + 1}:`, error.message);
                if (i === retries - 1) continue; // Cambiar al siguiente servidor
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
          }
          throw new Error('No se pudo cargar datos de OSM después de varios intentos');
        };

        // Inicializar Geoman si está disponible
        if (window.PM) {
          // Configurar opciones globales de Geoman
          mapInstance.pm.setGlobalOptions({
            snappable: true,
            snapDistance: 20,
            snapMiddle: true,
            snapSegment: true,
            allowSelfIntersection: false,
          });
          
          // Configurar la barra de herramientas de Geoman
          mapInstance.pm.addControls({
            position: 'topleft',
            drawMarker: false,
            drawCircleMarker: false,
            drawPolyline: true,
            drawRectangle: false,
            drawPolygon: false,
            drawCircle: false,
            editMode: true,
            dragMode: true,
            cutPolygon: false,
            removalMode: true,
          });
        }

        // Cargar calles de OSM
        const loadOsmStreets = async () => {
          try {
            setLoading(true);
            const bbox = mapInstance.getBounds().toBBoxString();
            console.log('Buscando calles en el área:', bbox);
            
            const data = await fetchWithRetry(bbox);
            console.log('Datos de OSM cargados correctamente', data);
            
            // Convertir datos de Overpass a GeoJSON
            const nodes = {};
            const ways = [];
            
            // Primero extraemos todos los nodos
            data.elements.forEach(element => {
              if (element.type === 'node') {
                nodes[element.id] = [element.lon, element.lat];
              } else if (element.type === 'way' && element.nodes) {
                ways.push(element);
              }
            });
            
            // Crear features GeoJSON para cada way
            const features = ways.map(way => {
              const coordinates = way.nodes
                .map(nodeId => nodes[nodeId])
                .filter(coord => coord !== undefined);
                
              if (coordinates.length < 2) return null;
                
              return {
                type: 'Feature',
                properties: way.tags || {},
                geometry: {
                  type: 'LineString',
                  coordinates: coordinates
                }
              };
            }).filter(Boolean);
            
            const geoJsonData = {
              type: 'FeatureCollection',
              features: features
            };
            
            // Limpiar capas anteriores
            if (window.osmLayer) {
              mapInstance.removeLayer(window.osmLayer);
            }
            
            // Crear capa de calles OSM
            window.osmLayer = L.geoJSON(geoJsonData, {
              style: {
                color: '#666',
                weight: 2,
                opacity: 0.7
              }
            }).addTo(mapInstance);
            
            // Habilitar snapping con las calles cargadas si Geoman está disponible
            if (window.PM && window.osmLayer) {
              try {
                mapInstance.pm.setGlobalOptions({
                  snappable: true,
                  snapDistance: 20,
                  snapMiddle: true,
                  snapSegment: true,
                  allowSelfIntersection: false,
                  snapLayer: window.osmLayer
                });
                console.log('Snapping configurado correctamente');
              } catch (e) {
                console.warn('Error al configurar snapping:', e);
              }
            }
            
            // Ajustar la vista para mostrar las calles cargadas
            if (features.length > 0) {
              mapInstance.fitBounds(window.osmLayer.getBounds());
            }
            
            // Estilo para las rutas existentes
            const routeStyle = {
              color: '#ff0000',
              weight: 3,
              opacity: 1
            };
            
            // Dibujar ruta existente si existe
            if (initialRoute) {
              const routeLayer = L.geoJSON(initialRoute, {
                style: routeStyle
              }).addTo(mapInstance);
              mapInstance.fitBounds(routeLayer.getBounds());
            }
            
          } catch (error) {
            console.error('Error al cargar calles de OSM:', error);
          } finally {
            setLoading(false);
          }
        };
        
        // Cargar calles al iniciar
        loadOsmStreets();
        
        // Desactivar temporalmente el modo de dibujo hasta que el usuario lo active
        if (mapInstance.pm) {
          mapInstance.pm.disableDraw();
        }

        setMap(mapInstance);
        setLoading(false);
      } catch (err) {
        console.error('Error al cargar calles de OSM:', err);
        setError('No se pudieron cargar las calles. Intente nuevamente.');
        setLoading(false);
      }
    };

    // Inicializar el mapa
    setMap(mapInstance);
    
    // Configurar la barra de herramientas de edición
    if (mapInstance.pm) {
      // Habilitar la barra de herramientas de edición
      mapInstance.pm.addControls({
        position: 'topleft',
        drawMarker: false,
        drawCircleMarker: false,
        drawPolyline: true,
        drawRectangle: false,
        drawPolygon: false,
        drawCircle: false,
        editMode: true,
        dragMode: true,
        cutPolygon: false,
        removalMode: true,
      });
      
      console.log('Map editor controls initialized');
    }
    
    // Usar un pequeño retraso para asegurar que el mapa esté listo
    const initTimer = setTimeout(() => {
      loadOsmStreets()
        .then(() => {
          console.log('OSM streets loaded, map should be ready for initial route');
          // Forzar actualización del mapa para asegurar que todo esté renderizado
          mapInstance.invalidateSize();
        })
        .catch(err => {
          console.error('Error loading OSM streets:', err);
          setError('Error al cargar las calles. Intente nuevamente.');
        });
    }, 500); // Aumentar el retraso para asegurar que todo esté listo

    // Limpieza al desmontar el componente
    return () => {
      clearTimeout(initTimer);
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, []);

  // Cargar la geometría inicial si existe
  useEffect(() => {
    console.log('Initial route changed:', initialRoute);
    if (!map) {
      console.log('Map not ready yet');
      return;
    }
    
    if (!initialRoute) {
      console.log('No initial route provided');
      return;
    }
    
    try {
      console.log('Trying to load initial route geometry');
      
      // Limpiar capa editable anterior si existe
      if (editableLayer && map.hasLayer(editableLayer)) {
        console.log('Removing existing editable layer');
        map.removeLayer(editableLayer);
      }
      
      // Crear una capa de grupo para manejar la geometría
      const layerGroup = L.featureGroup().addTo(map);
      
      // Crear la capa con la geometría inicial
      console.log('Creating new layer with geometry:', initialRoute);
      const layer = L.geoJSON(initialRoute, {
        style: {
          color: '#ff0000',
          weight: 5,
          opacity: 1,
          fillOpacity: 0.5
        },
        pmIgnore: false
      }).addTo(layerGroup);
      
      // Asegurarse de que el mapa tenga el plugin de Geoman
      if (map.pm) {
        // Habilitar la edición en cada capa del grupo
        layerGroup.eachLayer((layer) => {
          // Habilitar la edición en la capa
          if (layer.pm) {
            layer.pm.enable({
              allowSelfIntersection: false,
              snappable: true,
              snapDistance: 20,
              draggable: true
            });
            
            // Configurar eventos de edición
            layer.on('pm:edit', (e) => {
              console.log('Layer edited:', e.layer.toGeoJSON());
            });
            
            // Activar el modo de edición
            layer.pm.enable();
            console.log('Layer editing enabled for layer:', layer);
          }
        });
        
        // Configurar el grupo para permitir la edición
        layerGroup.pm.enable();
        
        // Asegurarse de que la capa sea la capa editable
        setEditableLayer(layerGroup);
        
        console.log('Layer created, fitting bounds');
        // Ajustar la vista para mostrar la geometría
        map.fitBounds(layer.getBounds(), { padding: [50, 50] });
        
        console.log('Editable layer set');
      }
    } catch (err) {
      console.error('Error al cargar la geometría:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        initialRoute: JSON.stringify(initialRoute, null, 2)
      });
      setError('No se pudo cargar la ruta para edición');
    }
  }, [map, initialRoute]);

  // Manejar el guardado de la geometría editada
  const handleSave = () => {
    if (!editableLayer) return;
    
    try {
      // Obtener la geometría editada desde la capa
      const geoJSON = editableLayer.toGeoJSON();
      
      // Si es un FeatureCollection, tomar solo la primera característica
      if (geoJSON.type === 'FeatureCollection' && geoJSON.features.length > 0) {
        onSave(geoJSON.features[0]);
      } else {
        onSave(geoJSON);
      }
    } catch (err) {
      console.error('Error al guardar la geometría:', err);
      setError('Error al guardar los cambios');
    }
  };

  return (
    <div style={{ width: '100%', height: '500px', position: 'relative' }}>
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div>Cargando editor de rutas...</div>
        </div>
      )}
      
      {error && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(255, 0, 0, 0.7)',
          color: 'white',
          padding: '10px',
          borderRadius: '4px',
          zIndex: 1000
        }}>
          {error}
        </div>
      )}
      
      <div 
        ref={mapRef} 
        style={{ width: '100%', height: '100%' }}
      />
      
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        gap: '10px'
      }}>
        <button 
          onClick={handleSave}
          style={{
            padding: '8px 20px',
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
          style={{
            padding: '8px 20px',
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

export default MapEditor;
