import React, { useState, useEffect } from 'react';
import { authFetch } from '../utils/authFetch';
import './CandidateDashboard.css';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
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

    const overlap = stats.total_votantes_bruto - stats.total_votantes_unicos;
    const overlapPercent = stats.total_votantes_bruto > 0
        ? ((overlap / stats.total_votantes_bruto) * 100).toFixed(1)
        : 0;

    // Centro del mapa (Paraguay/Asunción aprox)
    const center = [-25.2867, -57.6470];

    return (
        <div className="candidate-dashboard">
            <header className="dashboard-header">
                <h2>📈 Tablero de Control del Candidato</h2>
                <p>Resumen de captación y rendimiento de caudillos</p>
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
                        <MapContainer center={center} zoom={13} style={{ height: '400px', width: '100%' }}>
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; OpenStreetMap contributors'
                            />
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

                <div className="caudillos-section card">
                    <h3>👥 Rendimiento por Caudillo</h3>
                    <div className="caudillos-container">
                        {stats.caudillos.map(caudillo => {
                            const participation = stats.total_votantes_bruto > 0
                                ? (caudillo.cantidad_votantes / stats.total_votantes_bruto * 100).toFixed(1)
                                : 0;

                            return (
                                <div key={caudillo.id_caudillo} className="caudillo-row">
                                    <div className="caudillo-meta">
                                        <span className="c-name">{caudillo.nombre_caudillo}</span>
                                        <span className="c-count"><strong>{caudillo.cantidad_votantes}</strong> simpatizantes ({participation}%)</span>
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
                        {stats.caudillos.length === 0 && (
                            <div className="empty-msg">No hay caudillos vinculados aún.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CandidateDashboard;
