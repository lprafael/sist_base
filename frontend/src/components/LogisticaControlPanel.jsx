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
    html: '<div style="color: gold; font-size: 20px;">📍</div>',
    className: 'custom-div-icon',
    iconSize: [25, 25],
    iconAnchor: [12, 25]
});

const LogisticaControlPanel = ({ user }) => {
    const [data, setData] = useState({ choferes: [], votantes: [] });
    const [loading, setLoading] = useState(true);
    const [viewPort, setViewPort] = useState([-25.344, -57.51]); // Defaults to San Lorenzo
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
                    setViewPort([newData.choferes[0].lat, newData.choferes[0].lng]);
                } else if (loading && newData.votantes.length > 0) {
                    setViewPort([newData.votantes[0].lat, newData.votantes[0].lng]);
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

    const stats = {
        totalVotantes: data.votantes.length,
        choferesActivos: data.choferes.length,
        enTraslado: data.votantes.filter(v => v.estado === 'en_camino').length,
        pendientes: data.votantes.filter(v => v.estado === 'pendiente').length
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

                        {/* Choferes */}
                        {data.choferes.map(c => (
                            <Marker key={`c-${c.id}`} position={[c.lat, c.lng]} icon={carIcon}>
                                <Popup>
                                    <strong>Chofer: {c.nombre}</strong><br />
                                    Vehículo: {c.vehiculo}<br />
                                    Última vez: {new Date(c.ultima_conexion).toLocaleTimeString()}
                                </Popup>
                            </Marker>
                        ))}

                        {/* Votantes */}
                        {data.votantes.map(v => (
                            <Marker
                                key={`v-${v.id}`}
                                position={[v.lat, v.lng]}
                                icon={v.estado === 'en_camino' ? voterYellowIcon : voterRedIcon}
                            >
                                <Popup>
                                    <strong>{v.nombre}</strong><br />
                                    Estado: {v.estado === 'en_camino' ? '🚕 En trasalado' : '🔴 Pendiente'}<br />
                                    Local: {v.local}<br />
                                    <button
                                        className="btn-small"
                                        style={{ marginTop: '10px', width: '100%', background: '#22c55e', color: 'white', border: 'none' }}
                                        onClick={() => marcarVoto(v.id)}
                                    >
                                        ✅ Ya Votó
                                    </button>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>

                <div className="stats-sidebar">
                    <div className="stat-card">
                        <h4>Choferes Operando</h4>
                        <div className="value">{stats.choferesActivos}</div>
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
                            <li>🔴 Simpatizante pidiendo móvil</li>
                            <li>🚕 Traslado en proceso</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LogisticaControlPanel;
