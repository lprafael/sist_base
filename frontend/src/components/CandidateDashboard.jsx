import React, { useState, useEffect } from 'react';
import { authFetch } from '../utils/authFetch';
import './CandidateDashboard.css';
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const CandidateDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await authFetch('/electoral/dashboard/candidato');
                const data = await response.json();
                setStats(data);
            } catch (error) {
                console.error("Error fetching stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="loading">Cargando tablero...</div>;
    if (!stats) return <div className="error">No se pudieron cargar las estadísticas.</div>;

    // Map Controller to update center when stats load
    const MapController = ({ center }) => {
        const map = useMapEvents({});
        useEffect(() => {
            if (center) {
                map.setView(center, map.getZoom());
            }
        }, [center]);
        return null;
    };

    const overlap = stats.total_votantes_bruto - stats.total_votantes_unicos;
    const overlapPercent = stats.total_votantes_bruto > 0
        ? ((overlap / stats.total_votantes_bruto) * 100).toFixed(1)
        : 0;

    // Use dynamic center from backend or fallback to Asunción
    const initialCenter = stats.map_center ? [stats.map_center.lat, stats.map_center.lng] : [-25.2867, -57.6470];

    return (
        <div className="candidate-dashboard">
            <header className="dashboard-header">
                <h2>📈 Tablero de Control del Candidato</h2>
                <p>Resumen de captación y rendimiento de referentes</p>
            </header>

            <div className="stats-row">
                <div className="stat-card primary">
                    <span className="stat-label">Votantes Únicos</span>
                    <span className="stat-value">{stats.total_votantes_unicos}</span>
                    <span className="stat-icon">👤</span>
                </div>
                <div className="stat-card secondary">
                    <span className="stat-label">Suma Bruta</span>
                    <span className="stat-value">{stats.total_votantes_bruto}</span>
                    <span className="stat-icon">🧮</span>
                </div>
                <div className="stat-card warning">
                    <span className="stat-label">Solapamiento</span>
                    <span className="stat-value">{overlap}</span>
                    <span className="stat-note">{overlapPercent}% duplicidad</span>
                    <span className="stat-icon">⚠️</span>
                </div>
            </div>

            <div className="map-and-list">
                <div className="map-column card">
                    <h3>🗺️ Mapa de Calor de Captación</h3>
                    <div className="map-wrapper">
                        <MapContainer center={initialCenter} zoom={13} style={{ height: '400px', width: '100%' }}>
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; OpenStreetMap contributors'
                            />
                            <MapController center={initialCenter} />
                            {stats.puntos_calor.map((pt, idx) => (
                                <CircleMarker
                                    key={idx}
                                    center={[pt.lat, pt.lng]}
                                    radius={10 + (pt.weight * 2)}
                                    pathOptions={{
                                        fillColor: pt.weight > 3 ? '#e53e3e' : '#ecc94b',
                                        color: 'none',
                                        fillOpacity: 0.5
                                    }}
                                >
                                    <Popup>
                                        Seguridad: {pt.weight}/5
                                    </Popup>
                                </CircleMarker>
                            ))}
                        </MapContainer>
                    </div>
                </div>
                <div className="referentes-section card">
                    <h3>👥 Rendimiento por Referente</h3>
                    <div className="referentes-container">
                        {stats.referentes.map(referente => {
                            const participation = stats.total_votantes_bruto > 0
                                ? (referente.cantidad_votantes / stats.total_votantes_bruto * 100).toFixed(1)
                                : 0;

                            return (
                                <div key={referente.id_referente} className="referente-row">
                                    <div className="referente-meta">
                                        <span className="c-name">{referente.nombre_referente}</span>
                                        <span className="c-count"><strong>{referente.cantidad_votantes}</strong> simpatizantes ({participation}%)</span>
                                    </div>
                                    <div className="bar-wrapper">
                                        <div
                                            className="bar-fill"
                                            style={{ width: `${participation}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                        {stats.referentes.length === 0 && (
                            <div className="empty-msg">No hay referentes vinculados aún.</div>
                        )}
                    </div>
                </div>
            </div>

            <div className="drilldown-row">
                <div className="drilldown-card card">
                    <h3>📍 Resumen por Local</h3>
                    <div className="drilldown-container">
                        <table className="stats-table">
                            <thead>
                                <tr>
                                    <th>Local de Votación</th>
                                    <th>Simpatizantes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.resumen_locales.map((loc, idx) => (
                                    <tr key={idx}>
                                        <td>{loc.nombre_local}</td>
                                        <td className="t-count">{loc.cantidad}</td>
                                    </tr>
                                ))}
                                {stats.resumen_locales.length === 0 && (
                                    <tr><td colSpan="2" className="empty-td">Sin datos por local.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="drilldown-card card">
                    <h3>🗳️ Top Mesas con más Captación</h3>
                    <div className="drilldown-container">
                        <table className="stats-table">
                            <thead>
                                <tr>
                                    <th>Local</th>
                                    <th>Mesa</th>
                                    <th>Cant.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.resumen_mesas.map((m, idx) => (
                                    <tr key={idx}>
                                        <td>{m.nombre_local}</td>
                                        <td>{m.mesa}</td>
                                        <td className="t-count">{m.cantidad}</td>
                                    </tr>
                                ))}
                                {stats.resumen_mesas.length === 0 && (
                                    <tr><td colSpan="3" className="empty-td">Sin datos por mesa.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CandidateDashboard;
