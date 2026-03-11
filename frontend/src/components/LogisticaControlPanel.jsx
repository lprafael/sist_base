import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { authFetch } from '../utils/authFetch';
import './Logistica.css';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const carIcon = L.divIcon({
    html: '<div style="font-size: 24px;">🚗</div>',
    className: 'custom-div-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

const voterRedIcon = L.divIcon({
    html: '<div style="color: red; font-size: 20px;">📍</div>',
    className: 'custom-div-icon',
    iconSize: [25, 25],
    iconAnchor: [12, 25]
});

const voterYellowIcon = L.divIcon({
    html: '<div style="color: gold; font-size: 20px; filter: drop-shadow(0 0 2px white);">📍</div>',
    className: 'custom-div-icon',
    iconSize: [25, 25],
    iconAnchor: [12, 25]
});

const getVoterIcon = (grado, estado) => {
    if (estado === 'en_camino') return voterYellowIcon;
    const color = grado <= 2 ? '#ef4444' : grado <= 4 ? '#f59e0b' : '#22c55e';
    return L.divIcon({
        html: `<div style="color: ${color}; font-size: 20px; filter: drop-shadow(0 0 2px white);">📍</div>`,
        className: 'custom-div-icon',
        iconSize: [25, 25],
        iconAnchor: [12, 25]
    });
};

const LogisticaControlPanel = ({ user }) => {
    const [data, setData] = useState({ choferes: [], votantes: [] });
    const [loading, setLoading] = useState(true);
    const [viewPort, setViewPort] = useState([-25.344, -57.51]);
    const [minSeguridad, setMinSeguridad] = useState(1);
    const [maxSeguridad, setMaxSeguridad] = useState(5);
    const refreshInterval = useRef(null);

    useEffect(() => {
        fetchData();
        refreshInterval.current = setInterval(fetchData, 10000); // 10s refresh
        return () => clearInterval(refreshInterval.current);
    }, []);

    const fetchData = async () => {
        try {
            const res = await authFetch(`/api/logistica/control-mapa?dept_id=${user.departamento_id || 11}&dist_id=${user.distrito_id || 27}`);
            if (res.ok) {
                const newData = await res.json();
                setData(newData);

                // Set initial view to first chofer or voter if not set
                if (loading && newData.choferes.length > 0) {
                    const firstChofer = newData.choferes.find(c => c.lat !== null && c.lng !== null);
                    if (firstChofer) {
                        setViewPort([firstChofer.lat, firstChofer.lng]);
                    }
                } else if (loading && newData.votantes.length > 0) {
                    const firstWithCoords = newData.votantes.find(v => v.lat !== null && v.lng !== null);
                    if (firstWithCoords) {
                        setViewPort([firstWithCoords.lat, firstWithCoords.lng]);
                    }
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const marcarVoto = async (votanteId) => {
        if (!window.confirm("¿Confirmar que el simpatizante ya votó?")) return;
        try {
            const res = await authFetch(`/api/logistica/marcar-voto`, {
                method: 'POST',
                body: JSON.stringify({ votante_id: votanteId })
            });
            if (res.ok) {
                fetchData();
            }
        } catch (err) {
            alert("Error al registrar voto");
        }
    };

    const filteredVotantes = data.votantes.filter(v =>
        (v.grado_seguridad || 1) >= minSeguridad &&
        (v.grado_seguridad || 1) <= maxSeguridad
    );

    const stats = {
        totalVotantes: data.votantes.length,
        mostrados: filteredVotantes.length,
        choferesActivos: data.choferes.length,
        enTraslado: filteredVotantes.filter(v => v.estado === 'en_camino').length,
        pendientes: filteredVotantes.filter(v => v.estado === 'pendiente').length
    };

    return (
        <div className="logistica-container">
            <header className="section-header">
                <h2>🛰️ Tablero de Control - Día D</h2>
                <div className="live-indicator">
                    <span className="dot pulse"></span> EN VIVO
                </div>
            </header>

            <div className="tablero-logistica">
                <div className="map-container">
                    <MapContainer center={viewPort} zoom={13} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                        {/* Choferes con ubicación activa */}
                        {data.choferes.filter(c => c.lat !== null && c.lng !== null).map(c => (
                            <Marker key={`c-${c.id}`} position={[c.lat, c.lng]} icon={carIcon}>
                                <Popup>
                                    <div style={{ minWidth: '120px' }}>
                                        <strong>Chofer: {c.nombre}</strong><br />
                                        Vehículo: {c.vehiculo}<br />
                                        <small style={{ color: '#64748b' }}>Responsable: {c.creador_nombre || 'Sist.'}</small><br />
                                        <span style={{ fontSize: '0.7rem' }}>Última vez: {new Date(c.ultima_conexion).toLocaleTimeString()}</span>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}

                        {/* Votantes con coordenadas (filtrados por seguridad) */}
                        {filteredVotantes.filter(v => v.lat !== null && v.lng !== null).map(v => (
                            <Marker
                                key={`v-${v.id}`}
                                position={[v.lat, v.lng]}
                                icon={getVoterIcon(v.grado_seguridad || 1, v.estado)}
                            >
                                <Popup>
                                    <div style={{ minWidth: '150px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <strong>{v.nombre}</strong>
                                            <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9' }}>
                                                🛡️ Nivel {v.grado_seguridad || 1}
                                            </span>
                                        </div>
                                        Estado: {v.estado === 'en_camino' ? '🚕 En traslado' : '🔴 Pendiente'}<br />
                                        Local: {v.local}<br />
                                        <button
                                            className="btn-small"
                                            style={{ marginTop: '10px', width: '100%', background: '#22c55e', color: 'white', border: 'none', padding: '8px', cursor: 'pointer', borderRadius: '4px' }}
                                            onClick={() => marcarVoto(v.id)}
                                        >
                                            ✅ Ya Votó
                                        </button>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>

                <div className="stats-sidebar">
                    <div className="filter-box" style={{ background: 'white', padding: '15px', borderRadius: '12px', marginBottom: '15px', border: '1px solid #e2e8f0' }}>
                        <h5 style={{ marginTop: 0, marginBottom: '12px', color: '#1e3a8a' }}>🔍 Filtrar por Seguridad</h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Mínimo: <strong>{minSeguridad}</strong></span>
                                <span>Máximo: <strong>{maxSeguridad}</strong></span>
                            </div>
                            <div className="range-container" style={{ position: 'relative', height: '30px' }}>
                                <input
                                    type="range" min="1" max="5" value={minSeguridad}
                                    onChange={(e) => setMinSeguridad(Math.min(parseInt(e.target.value), maxSeguridad))}
                                    style={{ width: '100%' }}
                                />
                                <input
                                    type="range" min="1" max="5" value={maxSeguridad}
                                    onChange={(e) => setMaxSeguridad(Math.max(parseInt(e.target.value), minSeguridad))}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', textAlign: 'center' }}>
                                {minSeguridad === 1 && maxSeguridad === 5 ? "Mostrando todos los niveles" :
                                    minSeguridad >= 3 && maxSeguridad >= 5 ? "Solo Seguros" :
                                        maxSeguridad <= 2 ? "Solo No Seguros" : "Rango Personalizado"}
                            </div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <h4>Mostrando en Mapa</h4>
                        <div className="value" style={{ color: '#2563eb' }}>{stats.mostrados}</div>
                        <small style={{ color: '#64748b' }}>de {stats.totalVotantes} totales</small>
                    </div>
                    <div className="stat-card" style={{ borderColor: '#ef4444' }}>
                        <h4>Simpatizantes Pendientes</h4>
                        <div className="value">{stats.pendientes}</div>
                    </div>
                    <div className="stat-card" style={{ borderColor: '#f59e0b' }}>
                        <h4>En Camino</h4>
                        <div className="value">{stats.enTraslado}</div>
                    </div>

                    <div className="legend-box" style={{ background: 'white', padding: '15px', borderRadius: '12px' }}>
                        <h5>Leyenda</h5>
                        <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.8rem' }}>
                            <li>🚗 Chofer en movimiento</li>
                            <li>🔴 Seguridad 1-2 (No seguro)</li>
                            <li>🟠 Seguridad 3-4 (Dudoso)</li>
                            <li>🟢 Seguridad 5 (Comprometido)</li>
                            <li>🚕 Traslado en proceso (Amarillo)</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LogisticaControlPanel;
