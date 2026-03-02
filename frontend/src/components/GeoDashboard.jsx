import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from 'react-leaflet';
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

const LocalRow = ({ local, onSave }) => {
    const [tempLat, setTempLat] = useState(local.ubicacion?.lat || '');
    const [tempLng, setTempLng] = useState(local.ubicacion?.lng || '');

    return (
        <tr>
            <td>{local.descripcion}</td>
            <td className="addr-cell">{local.domicilio || 'Sin dirección'}</td>
            <td className="count-cell">{local.votantes.toLocaleString()}</td>
            <td>
                <div className="coord-inputs">
                    <input type="number" step="0.0001" placeholder="Lat" value={tempLat} onChange={e => setTempLat(e.target.value)} />
                    <input type="number" step="0.0001" placeholder="Lng" value={tempLng} onChange={e => setTempLng(e.target.value)} />
                </div>
            </td>
            <td>
                <button
                    className="save-btn"
                    onClick={() => onSave(local, parseFloat(tempLat), parseFloat(tempLng))}
                >
                    💾 Guardar
                </button>
            </td>
        </tr>
    );
};

const AutoCenter = ({ data, priority }) => {
    const map = useMap();
    useEffect(() => {
        const geojson = priority || data;
        if (geojson && geojson.features && geojson.features.length > 0) {
            const layer = L.geoJSON(geojson);
            map.fitBounds(layer.getBounds());
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

    useEffect(() => {
        fetchDptos();
    }, []);

    const fetchDptos = async () => {
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

            // Cargar barrios y locales en paralelo
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
            if (distId) {
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
        if (isNaN(lat) || isNaN(lng)) return alert("Coordenadas inválidas");
        try {
            const url = `/electoral/geo/locales/ubicacion?departamento_id=${local.departamento_id}&distrito_id=${local.distrito_id}&seccional_id=${local.seccional_id}&local_id=${local.local_id}&lat=${lat}&lng=${lng}`;
            await authFetch(url, { method: 'PUT' });
            fetchLocales(local.departamento_id, selectedDist);
        } catch (e) {
            alert("Error al actualizar ubicación");
        }
    };

    // Estilo para los barrios
    const barrioStyle = (feature) => {
        return {
            fillColor: '#3182ce',
            weight: 1,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.3
        };
    };

    if (loading && stats.length === 0) return <div>Cargando panel geográfico...</div>;

    return (
        <div className="geo-dashboard">
            <header className="geo-header">
                <h2>🗺️ Panel Georreferenciado Administrativo</h2>
                <div className="geo-tabs">
                    <button onClick={fetchDptos} className={viewMode === 'dptos' ? 'active' : ''}>📍 Departamentos</button>
                    {selectedDpto && (
                        <button className="active">
                            🏙️ {viewMode === 'distritos' ? 'Distritos' : 'Barrios'}
                        </button>
                    )}
                </div>
            </header>

            <div className="geo-main">
                <div className="geo-sidebar card">
                    <h3>{viewMode === 'dptos' ? 'Votantes por Departamento' : 'Votantes por Distrito'}</h3>
                    <div className="stats-list">
                        {stats.map(item => (
                            <div
                                key={item.id}
                                className={`stat-item ${selectedDist === item.id ? 'active' : ''}`}
                                onClick={() => viewMode === 'dptos' ? fetchDistritos(item.id) : fetchLocales(selectedDpto, item.id)}
                            >
                                <span className="item-name">{item.nombre}</span>
                                <span className="item-value">{item.votantes.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="geo-content">
                    <div className="map-container card">
                        <MapContainer center={[-25.4, -57.4]} zoom={selectedDpto === 11 ? 10 : 7} style={{ height: '500px', width: '100%', borderRadius: '8px' }}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <AutoCenter data={barriosGeoJson} priority={distritoGeoJson} />

                            {/* Capa de todo el departamento (sólo cuando NO hay distrito seleccionado) */}
                            {barriosGeoJson && !selectedDist && (
                                <GeoJSON
                                    key={`barrios-${selectedDpto}-${barriosGeoJson.features?.length}`}
                                    data={barriosGeoJson}
                                    style={barrioStyle}
                                    onEachFeature={(f, l) => {
                                        l.bindPopup(`<strong>Barrio:</strong> ${f.properties.BARLO_DESC || 'Desconocido'}<br/><strong>Distrito:</strong> ${f.properties.DIST_DESC_}`);
                                    }}
                                />
                            )}

                            {/* Capa del distrito seleccionado (con color diferente) */}
                            {distritoGeoJson && (
                                <GeoJSON
                                    key={`dist-${selectedDpto}-${selectedDist}-${distritoGeoJson.features?.length}`}
                                    data={distritoGeoJson}
                                    style={{
                                        fillColor: '#e6550d',
                                        weight: 2,
                                        opacity: 1,
                                        color: '#fd8d3c',
                                        fillOpacity: 0.25
                                    }}
                                    onEachFeature={(f, l) => {
                                        l.bindPopup(`<strong>${f.properties.nombre || f.properties.DIST_DESC_ || 'Distrito'}</strong>`);
                                    }}
                                />
                            )}

                            {locales.map((loc, idx) => (
                                loc.ubicacion && (
                                    <Marker
                                        key={`${loc.local_id}-${idx}-${loc.ubicacion?.lat}`}
                                        position={[loc.ubicacion.lat, loc.ubicacion.lng]}
                                        icon={new L.Icon({
                                            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                                            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                                            iconSize: [25, 41],
                                            iconAnchor: [12, 41],
                                            popupAnchor: [1, -34],
                                            shadowSize: [41, 41]
                                        })}
                                    >
                                        <Popup>
                                            <strong>{loc.descripcion}</strong><br />
                                            {loc.domicilio}<br />
                                            Votantes: <strong>{loc.votantes}</strong>
                                        </Popup>
                                    </Marker>
                                )
                            ))}
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
                                    {locales.map((loc, idx) => (
                                        <LocalRow
                                            key={`${loc.local_id}-${idx}-${loc.ubicacion?.lat}`}
                                            local={loc}
                                            onSave={handleUpdateUbicacion}
                                        />
                                    ))}
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
