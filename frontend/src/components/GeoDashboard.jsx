import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap, useMapEvents, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { authFetch } from '../utils/authFetch';
import './GeoDashboard.css';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LocalRow = ({ local, onSave, isAdmin, onPickOnMap, isPicking, inside }) => {
    const [tempLat, setTempLat] = useState(local.ubicacion?.lat || '');
    const [tempLng, setTempLng] = useState(local.ubicacion?.lng || '');
    const [rawInput, setRawInput] = useState(local.ubicacion ? `${local.ubicacion.lat}, ${local.ubicacion.lng}` : '');

    useEffect(() => {
        setTempLat(local.ubicacion?.lat || '');
        setTempLng(local.ubicacion?.lng || '');
        setRawInput(local.ubicacion ? `${local.ubicacion.lat}, ${local.ubicacion.lng}` : '');
    }, [local.ubicacion]);

    // Added logic for Google Maps pasting
    const handleRawInputChange = (e) => {
        const val = e.target.value;
        setRawInput(val);

        // Clean up common extra characters: spaces, quotes, brackets, parentheses
        const cleanVal = val.replace(/["'[\]()]/g, '');

        // Match "-25.2608, -57.5001" or anything with a comma
        if (cleanVal.includes(',')) {
            const parts = cleanVal.split(',');
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                setTempLat(parseFloat(parts[0].trim()));
                setTempLng(parseFloat(parts[1].trim()));
            }
        }
    };

    const rowClass =
        inside === true ? 'local-row-inside' :
        inside === false ? 'local-row-outside' :
        '';

    return (
        <tr className={`${isPicking ? 'picking-row' : ''} ${rowClass}`}>
            <td>{local.descripcion}</td>
            <td className="addr-cell">{local.domicilio || 'Sin dirección'}</td>
            <td className="count-cell">{local.votantes.toLocaleString()}</td>
            <td>
                <div className="coord-inputs">
                    <input
                        type="text"
                        placeholder="Ej: -25.260, -57.500"
                        value={rawInput}
                        onChange={handleRawInputChange}
                        disabled={!isAdmin}
                        style={{ width: '200px' }}
                    />
                </div>
            </td>
            <td>
                <div className="action-btns">
                    <button
                        className={`pick-btn ${isPicking ? 'active' : ''}`}
                        onClick={() => onPickOnMap(local)}
                        disabled={!isAdmin}
                        title="Seleccionar en el mapa"
                    >
                        {isPicking ? '📍 ...' : '📍'}
                    </button>
                    <button
                        className="save-btn"
                        onClick={() => onSave(local, parseFloat(tempLat), parseFloat(tempLng))}
                        disabled={!isAdmin}
                    >
                        💾
                    </button>
                </div>
            </td>
        </tr>
    );
};

const MapPicker = ({ active, onPick }) => {
    useMapEvents({
        click(e) {
            if (active) {
                onPick(e.latlng.lat, e.latlng.lng);
            }
        },
    });
    return null;
};

const AutoCenter = ({ data, priority }) => {
    const map = useMap();
    useEffect(() => {
        // PRIORIDAD: Si hay un distrito seleccionado (priority), centrar SÓLO en ese.
        // Si no hay (vista dptal), centrar en el conjunto de barrios.
        const geojson = priority || data;
        if (geojson && geojson.features && geojson.features.length > 0) {
            const layer = L.geoJSON(geojson);
            map.fitBounds(layer.getBounds(), { padding: [20, 20] });
        }
    }, [data, priority, map]);
    return null;
};

const GeoDashboard = () => {
    const [stats, setStats] = useState([]);
    const [locales, setLocales] = useState([]);
    const [selectedDpto, setSelectedDpto] = useState(null);
    const [selectedDist, setSelectedDist] = useState(null);
    const [barriosGeoJson, setBarriosGeoJson] = useState(null);
    const [distritoGeoJson, setDistritoGeoJson] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('dptos'); // 'dptos', 'distritos'
    const [pickingLocal, setPickingLocal] = useState(null);

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = currentUser?.rol === 'admin';
    const isRestricted = ['intendente', 'concejal', 'referente'].includes(currentUser?.rol);

    useEffect(() => {
        if (isRestricted && currentUser.departamento_id && currentUser.distrito_id) {
            // Restricted users go straight to their district
            fetchSpecificDistrict(currentUser.departamento_id, currentUser.distrito_id);
        } else {
            fetchDptos();
        }
    }, []);

    const fetchSpecificDistrict = async (dptoId, distId) => {
        setLoading(true);
        try {
            // Get department name for header/context
            const dptosResp = await authFetch('/electoral/geo/stats/departamentos');
            const dptosData = await dptosResp.json();
            const myDpto = dptosData.find(d => d.id === dptoId);

            // Get district name and stats
            const distsResp = await authFetch(`/electoral/geo/stats/distritos/${dptoId}`);
            const distsData = await distsResp.json();
            const myDist = distsData.find(d => d.id === distId);

            setStats(myDist ? [myDist] : []);
            setSelectedDpto(dptoId);
            setSelectedDist(distId);
            setViewMode('distritos');

            // Load specific layers
            const [geoResp] = await Promise.all([
                authFetch(`/electoral/geo/cartografia/distrito/${dptoId}/${distId}`),
                fetchLocales(dptoId, distId)
            ]);

            const geoData = await geoResp.json();
            setDistritoGeoJson(geoData && geoData.features?.length > 0 ? geoData : null);

            // Optionally load barrios of this DEPARTAGMENTO but they will be filtered in the map if needed
            // For now, let's keep it clean showing just the district
        } catch (e) {
            console.error("Error fetching restricted view:", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchDptos = async () => {
        if (isRestricted) return; // double check
        setLoading(true);
        try {
            const resp = await authFetch('/electoral/geo/stats/departamentos');
            const data = await resp.json();
            setStats(data);
            setViewMode('dptos');
            setSelectedDpto(null);
            setSelectedDist(null);
        } catch (e) {
            console.error("Error fetching dptos:", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchDistritos = async (dptoId) => {
        setLoading(true);
        // Limpiar capas anteriores ANTES de cargar las nuevas
        setBarriosGeoJson(null);
        setDistritoGeoJson(null);
        setSelectedDist(null);
        setLocales([]);
        try {
            const resp = await authFetch(`/electoral/geo/stats/distritos/${dptoId}`);
            const data = await resp.json();
            setStats(data);
            setSelectedDpto(dptoId);
            setViewMode('distritos');

            // Al cargar distritos, traemos locales de todo el departamento por defecto
            const [geoResp] = await Promise.all([
                authFetch(`/electoral/geo/barrios/${dptoId}`),
                fetchLocales(dptoId)
            ]);
            const geoData = await geoResp.json();
            setBarriosGeoJson(geoData && geoData.features?.length > 0 ? geoData : null);
        } catch (e) {
            console.error("Error fetching distritos:", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchLocales = async (dptoId, distId = null) => {
        try {
            let url = `/electoral/geo/locales?departamento_id=${dptoId}`;
            if (distId) url += `&distrito_id=${distId}`;
            const resp = await authFetch(url);
            const data = await resp.json();
            setLocales(data);
            if (distId !== null) {
                setSelectedDist(distId);
                // Limpiar capa anterior del distrito antes de cargar la nueva
                setDistritoGeoJson(null);
                try {
                    const geoResp = await authFetch(`/electoral/geo/cartografia/distrito/${dptoId}/${distId}`);
                    const geoData = await geoResp.json();
                    setDistritoGeoJson(geoData && geoData.features?.length > 0 ? geoData : null);
                } catch (e) {
                    console.warn('No se pudo cargar cartografia del distrito', e);
                    setDistritoGeoJson(null);
                }
            } else {
                setSelectedDist(null);
                setDistritoGeoJson(null);
            }
        } catch (e) {
            console.error("Error fetching locales:", e);
        }
    };

    const handleUpdateUbicacion = async (local, lat, lng) => {
        if (!isAdmin) return alert("Solo el administrador puede modificar los locales de votación");
        if (isNaN(lat) || isNaN(lng)) return alert("Coordenadas inválidas");
        try {
            const url = `/electoral/geo/locales/ubicacion?departamento_id=${local.departamento_id}&distrito_id=${local.distrito_id}&seccional_id=${local.seccional_id}&local_id=${local.local_id}&lat=${lat}&lng=${lng}`;
            const resp = await authFetch(url, { method: 'PUT' });

            if (resp.status === 403) {
                return alert("Solo el administrador puede modificar los locales de votación");
            }

            if (!resp.ok) throw new Error();

            fetchLocales(local.departamento_id, selectedDist);
            setPickingLocal(null);
        } catch (e) {
            console.error(e);
            alert("Error al actualizar ubicación");
        }
    };

    const handleMapPick = (lat, lng) => {
        if (pickingLocal) {
            handleUpdateUbicacion(pickingLocal, lat, lng);
        }
    };

    // Centroide y bounds del área actual (distrito o departamento) para ubicar y validar locales
    const { centroidDistrito, boundsArea } = useMemo(() => {
        const geojson = distritoGeoJson?.features?.length
            ? distritoGeoJson
            : (barriosGeoJson?.features?.length ? barriosGeoJson : null);
        if (!geojson) return { centroidDistrito: null, boundsArea: null };
        try {
            const layer = L.geoJSON(geojson);
            const bounds = layer.getBounds();
            if (bounds.isValid()) {
                return { centroidDistrito: bounds.getCenter(), boundsArea: bounds };
            }
        } catch (e) {
            console.warn('Centroide geo:', e);
        }
        return { centroidDistrito: null, boundsArea: null };
    }, [distritoGeoJson, barriosGeoJson]);

    // Estilo para los barrios — paleta naranja/ámbar
    const barrioStyle = (feature) => {
        const popTotal = feature.properties.poblacion_total || 0;
        const captados = feature.properties.captados_count || 0;
        const penetracion = popTotal > 0 ? (captados / popTotal) * 100 : 0;

        // Escala de colores naranja (Heatmap de Penetración)
        let fillColor = '#d1c4aa'; // Gris cálido por defecto (sin datos censo 2022)
        if (popTotal > 0) {
            if (penetracion === 0) fillColor = '#fff3e0';       // Sin penetración — crema
            else if (penetracion < 0.5) fillColor = '#ffe0b2';  // Muy baja — naranja muy claro
            else if (penetracion < 2) fillColor = '#ffb74d';  // Baja — ámbar
            else if (penetracion < 5) fillColor = '#ff9800';  // Media — naranja
            else if (penetracion < 10) fillColor = '#f57c00';  // Alta — naranja intenso
            else fillColor = '#e65100';  // Muy Alta (>10%) — naranja oscuro
        }

        return {
            fillColor: fillColor,
            weight: 1.5,
            opacity: 1,
            color: '#bf360c',    // Borde naranja-marrón
            dashArray: '3',
            fillOpacity: 0.70
        };
    };

    if (loading && stats.length === 0) return <div>Cargando panel geográfico...</div>;

    return (
        <div className="geo-dashboard">
            <header className="geo-header">
                <h2>{isRestricted ? '� Mi Distrito - Panel Geográfico' : '�🗺️ Panel Georreferenciado Administrativo'}</h2>
                <div className="geo-tabs">
                    {!isRestricted && (
                        <button onClick={fetchDptos} className={viewMode === 'dptos' ? 'active' : ''}>📍 Departamentos</button>
                    )}
                    {(selectedDpto || isRestricted) && (
                        <button className="active">
                            🏙️ {isRestricted ? (stats[0]?.nombre || 'Cargando...') : (viewMode === 'distritos' ? 'Distritos' : 'Barrios')}
                        </button>
                    )}
                </div>
            </header>

            <div className="geo-main">
                <div className="geo-sidebar card">
                    <h3>{isRestricted ? '📌 Tu Distrito Registrado' : (viewMode === 'dptos' ? 'Votantes por Departamento' : 'Votantes por Distrito')}</h3>
                    <div className="stats-list">
                        {stats.map(item => (
                            <div
                                key={item.id}
                                className={`stat-item ${selectedDist === item.id ? 'active' : ''} ${isRestricted ? 'no-click' : ''}`}
                                onClick={() => {
                                    if (isRestricted) return;
                                    if (viewMode === 'dptos') {
                                        fetchDistritos(item.id);
                                    } else {
                                        // Click en un distrito: cargar sus barrios Y sus locales (FILTRADO por dist_id)
                                        fetchLocales(selectedDpto, item.id);
                                    }
                                }}
                            >
                                <span className="item-name">{item.nombre}</span>
                                <span className="item-value">{item.votantes.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="geo-content">
                    <div className={`map-container card ${pickingLocal ? 'map-picking' : ''}`}>
                        <MapContainer center={[-25.4, -57.4]} zoom={selectedDpto === 11 ? 10 : 7} style={{ height: '500px', width: '100%', borderRadius: '8px' }}>
                            <LayersControl position="topright">
                                <LayersControl.BaseLayer checked name="Mapa estándar">
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution="&copy; OpenStreetMap contributors"
                                    />
                                </LayersControl.BaseLayer>
                                <LayersControl.BaseLayer name="Satélite (Esri)">
                                    <TileLayer
                                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                        attribution="Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics"
                                    />
                                </LayersControl.BaseLayer>
                            </LayersControl>

                            <AutoCenter data={barriosGeoJson} priority={distritoGeoJson} />

                            {/* Barrios del DEPARTAMENTO completo (cuando no hay distito seleccionado) */}
                            {barriosGeoJson && selectedDist === null && (
                                <GeoJSON
                                    key={`barrios-dpto-${selectedDpto}`}
                                    data={barriosGeoJson}
                                    interactive={!pickingLocal}
                                    style={barrioStyle}
                                    onEachFeature={(f, l) => {
                                        const distName = f.properties.dist_desc_ || 'Desconocido';
                                        const barName = f.properties.barlo_desc || f.properties.nombre || 'N/A';
                                        const popTotal = f.properties.poblacion_total || 0;
                                        const captados = f.properties.captados_count || 0;
                                        const penetracion = popTotal > 0 ? ((captados / popTotal) * 100).toFixed(2) : 0;
                                        l.bindPopup(`
                                            <div class="penetration-popup">
                                                <h4 style="margin:0 0 8px 0; color:#2b6cb0;">📊 Barrio</h4>
                                                <div style="font-size: 1.1rem; margin-bottom: 5px;"><strong>${barName}</strong></div>
                                                <div style="font-size: 0.9rem; color: #4a5568; margin-bottom: 10px;">Distrito: ${distName}</div>
                                                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 8px 0;"/>
                                                <div>Población: <strong>${popTotal.toLocaleString()}</strong></div>
                                                <div>Simpatizantes: <strong style="color:#276749">${captados.toLocaleString()}</strong></div>
                                                ${popTotal > 0 ? `<div>Penetración: <strong>${penetracion}%</strong></div>` : ''}
                                            </div>
                                        `, { minWidth: 220 });
                                    }}
                                />
                            )}

                            {/* Barrios del DISTRITO seleccionado (vista detallada por barrio) */}
                            {distritoGeoJson && selectedDist !== null && (
                                <GeoJSON
                                    key={`dist-${selectedDpto}-${selectedDist}-${distritoGeoJson.features?.length}`}
                                    data={distritoGeoJson}
                                    interactive={!pickingLocal}
                                    style={(f) => {
                                        if (f.properties.tipo === 'barrio') return barrioStyle(f);
                                        return {
                                            fillColor: '#e6550d', weight: 2,
                                            opacity: 1, color: '#fd8d3c', fillOpacity: 0.25
                                        };
                                    }}
                                    onEachFeature={(f, l) => {
                                        const distName = f.properties.dist_desc_ || 'Desconocido';
                                        const barName = f.properties.barlo_desc || f.properties.nombre || 'N/A';
                                        const popTotal = f.properties.poblacion_total || 0;
                                        const captados = f.properties.captados_count || 0;
                                        const penetracion = popTotal > 0 ? ((captados / popTotal) * 100).toFixed(2) : 0;

                                        if (f.properties.tipo === 'barrio') {
                                            l.bindPopup(`
                                                <div class="penetration-popup">
                                                    <h4 style="margin:0 0 8px 0; color:#2b6cb0;">📊 Análisis de Penetración</h4>
                                                    <div style="font-size:1.1rem;margin-bottom:5px;"><strong>Barrio:</strong> ${barName}</div>
                                                    <div style="font-size:0.9rem;color:#4a5568;margin-bottom:10px;">Distrito: ${distName}</div>
                                                    <hr style="border:0;border-top:1px solid #e2e8f0;margin:10px 0;"/>
                                                    <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
                                                        <span>Población (2022):</span>
                                                        <strong>${popTotal.toLocaleString()}</strong>
                                                    </div>
                                                    <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
                                                        <span>Simpatizantes:</span>
                                                        <strong style="color:#276749">${captados.toLocaleString()}</strong>
                                                    </div>
                                                    <div style="margin-top:12px;">
                                                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                                            <span style="font-weight:bold;">Penetración:</span>
                                                            <span style="font-weight:800;color:#2b6cb0;font-size:1.2rem;">${penetracion}%</span>
                                                        </div>
                                                        <div style="width:100%;background:#edf2f7;height:10px;border-radius:5px;overflow:hidden;">
                                                            <div style="width:${Math.min(penetracion * 2, 100)}%;background:linear-gradient(90deg,#ff9800,#e65100);height:100%;"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            `, { minWidth: 250 });
                                        } else {
                                            l.bindPopup(`<strong>${barName}</strong>`);
                                        }
                                    }}
                                />
                            )}

                            <MapPicker active={!!pickingLocal} onPick={handleMapPick} />

                            {/* Locales de votación: verde si caen dentro del área (bounds), rojo si están fuera, gris si sin coords (aprox) */}
                            {locales.map((loc, idx) => {
                                const hasCoords = loc.ubicacion && typeof loc.ubicacion.lat === 'number' && typeof loc.ubicacion.lng === 'number';
                                const fallbackPos = !!centroidDistrito;
                                const position = hasCoords
                                    ? [loc.ubicacion.lat, loc.ubicacion.lng]
                                    : (fallbackPos ? [centroidDistrito.lat, centroidDistrito.lng] : null);
                                if (!position) return null;
                                const isApprox = !hasCoords;
                                const isInside =
                                    hasCoords && boundsArea
                                        ? boundsArea.contains(L.latLng(loc.ubicacion.lat, loc.ubicacion.lng))
                                        : null;
                                return (
                                    <Marker
                                        key={`loc-${loc.departamento_id}-${loc.distrito_id}-${loc.seccional_id}-${loc.local_id}-${idx}`}
                                        position={position}
                                        icon={new L.Icon({
                                            iconUrl: isApprox
                                                ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png'
                                                : (isInside ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png'
                                                            : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png'),
                                            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                                            iconSize: [25, 41],
                                            iconAnchor: [12, 41],
                                            popupAnchor: [1, -34],
                                            shadowSize: [41, 41]
                                        })}
                                    >
                                        <Popup>
                                            <strong>{loc.descripcion}</strong><br />
                                            {loc.domicilio && <>{loc.domicilio}<br /></>}
                                            Votantes: <strong>{loc.votantes?.toLocaleString() ?? loc.votantes}</strong>
                                            {isApprox && (
                                                <><br /><em style={{ color: '#718096', fontSize: '0.85em' }}>Sin coordenadas — posición aproximada (centro del distrito)</em></>
                                            )}
                                        </Popup>
                                    </Marker>
                                );
                            })}
                        </MapContainer>
                    </div>

                    <div className="locales-crud card">
                        <div className="crud-header">
                            <h3>Gestión de Locales de Votación</h3>
                            <span className="badge">{locales.length} locales</span>
                        </div>
                        <p className="subtitle">Usa el mapa o carga coordenadas manualmente para habilitar la vista de puntos</p>

                        <div className="locales-table-wrapper">
                            <table className="locales-table">
                                <thead>
                                    <tr>
                                        <th>Local</th>
                                        <th>Dirección</th>
                                        <th className="count-cell">Votantes</th>
                                        <th>Ubicación (Lat, Lng)</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {locales.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="empty">
                                                {viewMode === 'dptos' ? 'Selecciona un departamento para ver sus locales' : 'Buscando locales...'}
                                            </td>
                                        </tr>
                                    )}
                            {locales.map((loc, idx) => {
                                const hasCoords = loc.ubicacion && typeof loc.ubicacion.lat === 'number' && typeof loc.ubicacion.lng === 'number';
                                const insideRow =
                                    hasCoords && boundsArea
                                        ? boundsArea.contains(L.latLng(loc.ubicacion.lat, loc.ubicacion.lng))
                                        : null;
                                return (
                                    <LocalRow
                                        key={`${loc.local_id}-${idx}-${loc.ubicacion?.lat}`}
                                        local={loc}
                                        isAdmin={isAdmin}
                                        onSave={handleUpdateUbicacion}
                                        onPickOnMap={(l) => setPickingLocal(pickingLocal?.local_id === l.local_id ? null : l)}
                                        isPicking={pickingLocal?.local_id === loc.local_id}
                                        inside={insideRow}
                                    />
                                );
                            })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GeoDashboard;
