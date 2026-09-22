import React, { useState, useEffect } from 'react';
import { authFetch } from '../utils/authFetch';
import './CandidateDashboard.css';
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const CandidateDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    // Estados para desplegar y consultar simpatizantes por referente
    const [expandedRefs, setExpandedRefs] = useState({});
    const [referenteDetails, setReferenteDetails] = useState({});
    const [searchTerms, setSearchTerms] = useState({});
    const [filterTabs, setFilterTabs] = useState({}); // 'todos' | 'solapados' | 'unicos'

    const toggleReferente = async (refId) => {
        const isCurrentlyExpanded = !!expandedRefs[refId];
        setExpandedRefs(prev => ({ ...prev, [refId]: !isCurrentlyExpanded }));

        // Cargar datos si se abre y no existen aún o si hubo error previo
        if (!isCurrentlyExpanded && (!referenteDetails[refId] || referenteDetails[refId].error)) {
            setReferenteDetails(prev => ({
                ...prev,
                [refId]: { loading: true, data: null, error: null }
            }));
            try {
                const response = await authFetch(`/electoral/dashboard/candidato/referente/${refId}/simpatizantes`);
                const data = await response.json();
                setReferenteDetails(prev => ({
                    ...prev,
                    [refId]: { loading: false, data: data, error: null }
                }));
            } catch (error) {
                console.error("Error al cargar simpatizantes del referente:", error);
                setReferenteDetails(prev => ({
                    ...prev,
                    [refId]: { loading: false, data: null, error: "No se pudieron cargar los simpatizantes." }
                }));
            }
        }
    };

    const handleSearchChange = (refId, value) => {
        setSearchTerms(prev => ({ ...prev, [refId]: value }));
    };

    const handleFilterTabChange = (refId, tab) => {
        setFilterTabs(prev => ({ ...prev, [refId]: tab }));
    };

    const cleanPhone = (phone) => {
        if (!phone) return '';
        let p = phone.replace(/[^0-9]/g, '');
        if (p.startsWith('0')) p = '595' + p.substring(1);
        if (!p.startsWith('595') && p.length <= 10) p = '595' + p;
        return p;
    };

    const formatCedula = (cedula) => {
        if (!cedula) return '';
        const num = cedula.toString().replace(/\D/g, '');
        return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

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
                    <div className="referentes-section-header">
                        <div>
                            <h3>👥 Rendimiento y Simpatizantes por Referente</h3>
                            <p className="referentes-subtitle">Haga clic en un referente para ver su listado detallado y detectar votantes solapados</p>
                        </div>
                    </div>
                    <div className="referentes-container">
                        {stats.referentes.map(referente => {
                            const refId = referente.id_referente;
                            const isExpanded = !!expandedRefs[refId];
                            const details = referenteDetails[refId] || {};
                            const searchTerm = (searchTerms[refId] || '').toLowerCase();
                            const currentTab = filterTabs[refId] || 'todos';

                            const participation = stats.total_votantes_bruto > 0
                                ? (referente.cantidad_votantes / stats.total_votantes_bruto * 100).toFixed(1)
                                : 0;

                            // Filtrado de simpatizantes según búsqueda y pestaña de solapamiento
                            let filteredSimpatizantes = [];
                            if (details.data && details.data.simpatizantes) {
                                filteredSimpatizantes = details.data.simpatizantes.filter(s => {
                                    if (currentTab === 'solapados' && !s.solapado) return false;
                                    if (currentTab === 'unicos' && s.solapado) return false;
                                    
                                    if (searchTerm) {
                                        const matchCedula = (s.cedula || '').toLowerCase().includes(searchTerm);
                                        const matchNombre = (s.nombre_completo || '').toLowerCase().includes(searchTerm);
                                        const matchLocal = (s.nombre_local || '').toLowerCase().includes(searchTerm);
                                        const matchTel = (s.telefono || '').toLowerCase().includes(searchTerm);
                                        if (!matchCedula && !matchNombre && !matchLocal && !matchTel) return false;
                                    }
                                    return true;
                                });
                            }

                            return (
                                <div key={refId} className={`referente-card-item ${isExpanded ? 'is-expanded' : ''}`}>
                                    <div 
                                        className="referente-header"
                                        onClick={() => toggleReferente(refId)}
                                        title="Haga clic para desplegar u ocultar los simpatizantes de este referente"
                                    >
                                        <div className="referente-meta">
                                            <div className="ref-title-group">
                                                <span className={`ref-chevron ${isExpanded ? 'open' : ''}`}>▶</span>
                                                <span className="c-name">{referente.nombre_referente}</span>
                                                {referente.cantidad_solapados > 0 ? (
                                                    <span className="badge-overlap-pill" title="Simpatizantes que también fueron registrados por otro referente">
                                                        ⚠️ {referente.cantidad_solapados} solapado{referente.cantidad_solapados > 1 ? 's' : ''}
                                                    </span>
                                                ) : (
                                                    referente.cantidad_votantes > 0 && (
                                                        <span className="badge-unique-pill" title="Todos sus simpatizantes son únicos para su lista">
                                                            ✓ 100% únicos
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                            <div className="ref-stats-group">
                                                <span className="c-count">
                                                    <strong>{referente.cantidad_votantes}</strong> simpatizantes ({participation}%)
                                                </span>
                                                <button 
                                                    type="button" 
                                                    className="btn-toggle-simpatizantes"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleReferente(refId);
                                                    }}
                                                >
                                                    {isExpanded ? 'Ocultar listado ▲' : 'Ver simpatizantes ▼'}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="bar-wrapper">
                                            <div
                                                className="bar-fill"
                                                style={{ width: `${participation}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Panel Desplegable de Simpatizantes */}
                                    {isExpanded && (
                                        <div className="referente-accordion-body">
                                            {details.loading && (
                                                <div className="ref-body-loading">
                                                    <span className="ref-spinner"></span>
                                                    <span>Cargando simpatizantes de <strong>{referente.nombre_referente}</strong>...</span>
                                                </div>
                                            )}

                                            {details.error && (
                                                <div className="ref-body-error">
                                                    <span>⚠️ {details.error}</span>
                                                    <button 
                                                        type="button" 
                                                        className="btn-retry"
                                                        onClick={() => toggleReferente(refId)}
                                                    >
                                                        Reintentar
                                                    </button>
                                                </div>
                                            )}

                                            {!details.loading && !details.error && details.data && (
                                                <div className="ref-simpatizantes-content">
                                                    {/* Toolbar de Filtros y Búsqueda */}
                                                    <div className="ref-simpatizantes-toolbar">
                                                        <div className="ref-filter-chips">
                                                            <button
                                                                type="button"
                                                                className={`filter-chip ${currentTab === 'todos' ? 'active' : ''}`}
                                                                onClick={() => handleFilterTabChange(refId, 'todos')}
                                                            >
                                                                Todos ({details.data.total_simpatizantes})
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className={`filter-chip warning ${currentTab === 'solapados' ? 'active' : ''}`}
                                                                onClick={() => handleFilterTabChange(refId, 'solapados')}
                                                            >
                                                                ⚠️ Solapados ({details.data.total_solapados})
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className={`filter-chip success ${currentTab === 'unicos' ? 'active' : ''}`}
                                                                onClick={() => handleFilterTabChange(refId, 'unicos')}
                                                            >
                                                                ✓ Únicos ({details.data.total_simpatizantes - details.data.total_solapados})
                                                            </button>
                                                        </div>
                                                        <div className="ref-search-box">
                                                            <span className="search-icon">🔍</span>
                                                            <input
                                                                type="text"
                                                                placeholder="Buscar por cédula, nombre o local..."
                                                                value={searchTerms[refId] || ''}
                                                                onChange={(e) => handleSearchChange(refId, e.target.value)}
                                                                className="ref-search-input"
                                                            />
                                                            {searchTerms[refId] && (
                                                                <button 
                                                                    type="button" 
                                                                    className="btn-clear-search"
                                                                    onClick={() => handleSearchChange(refId, '')}
                                                                >
                                                                    ✕
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Listado / Tabla de Simpatizantes */}
                                                    {filteredSimpatizantes.length > 0 ? (
                                                        <div className="ref-table-responsive">
                                                            <table className="simpatizantes-detail-table">
                                                                <thead>
                                                                    <tr>
                                                                        <th>Cédula & Nombre</th>
                                                                        <th>Contacto</th>
                                                                        <th>Local & Mesa</th>
                                                                        <th>Seguridad</th>
                                                                        <th>Estado de Solapamiento</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {filteredSimpatizantes.map((voter) => {
                                                                        const telClean = cleanPhone(voter.telefono);
                                                                        return (
                                                                            <tr 
                                                                                key={voter.id} 
                                                                                className={`simpatizante-row ${voter.solapado ? 'row-solapado' : 'row-unico'}`}
                                                                            >
                                                                                <td className="col-persona">
                                                                                    <div className="voter-fullname">
                                                                                        {voter.nombre_completo}
                                                                                    </div>
                                                                                    <div className="voter-ci">
                                                                                        CI: <strong>{formatCedula(voter.cedula)}</strong>
                                                                                        {voter.parentesco && (
                                                                                            <span className="badge-parentesco"> • {voter.parentesco}</span>
                                                                                        )}
                                                                                    </div>
                                                                                    {voter.domicilio && (
                                                                                        <div className="voter-address" title={voter.domicilio}>
                                                                                            🏠 {voter.domicilio}
                                                                                        </div>
                                                                                    )}
                                                                                </td>
                                                                                <td className="col-telefono">
                                                                                    {voter.telefono ? (
                                                                                        <div className="tel-actions-container">
                                                                                            <span className="tel-number">{voter.telefono}</span>
                                                                                            <div className="tel-buttons">
                                                                                                <a
                                                                                                    href={`https://wa.me/${telClean}`}
                                                                                                    target="_blank"
                                                                                                    rel="noopener noreferrer"
                                                                                                    className="btn-tel-action whatsapp"
                                                                                                    title="Enviar WhatsApp"
                                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                                >
                                                                                                    💬 WA
                                                                                                </a>
                                                                                                <a
                                                                                                    href={`tel:${voter.telefono}`}
                                                                                                    className="btn-tel-action call"
                                                                                                    title="Llamar"
                                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                                >
                                                                                                    📞
                                                                                                </a>
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <span className="no-tel">Sin teléfono</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="col-local">
                                                                                    <div className="local-name" title={voter.nombre_local}>
                                                                                        📍 {voter.nombre_local}
                                                                                    </div>
                                                                                    <div className="local-mesa-orden">
                                                                                        <span>Mesa: <strong>{voter.mesa ?? 'S/M'}</strong></span>
                                                                                        <span>Orden: <strong>{voter.orden ?? 'S/O'}</strong></span>
                                                                                    </div>
                                                                                </td>
                                                                                <td className="col-seguridad">
                                                                                    <div className="seguridad-badge" title={`Nivel de seguridad: ${voter.grado_seguridad}/5`}>
                                                                                        <span className="seguridad-stars">
                                                                                            {"★".repeat(Math.min(5, Math.max(1, voter.grado_seguridad || 3)))}
                                                                                            <span className="empty-stars">
                                                                                                {"☆".repeat(5 - Math.min(5, Math.max(1, voter.grado_seguridad || 3)))}
                                                                                            </span>
                                                                                        </span>
                                                                                        <span className="seguridad-score">({voter.grado_seguridad || 3}/5)</span>
                                                                                    </div>
                                                                                    {voter.movilidad_propia && (
                                                                                        <span className="badge-movilidad" title="Tiene movilidad propia">🚗 Móvil propio</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="col-solapamiento">
                                                                                    {voter.solapado ? (
                                                                                        <div className="solapado-alert-box">
                                                                                            <div className="solapado-title">
                                                                                                <span className="solapado-icon">⚠️</span>
                                                                                                <strong>Solapado con:</strong>
                                                                                            </div>
                                                                                            <div className="solapado-referentes-list">
                                                                                                {voter.otros_referentes && voter.otros_referentes.length > 0 ? (
                                                                                                    voter.otros_referentes.map((otherName, idx) => (
                                                                                                        <span key={idx} className="other-referente-pill">
                                                                                                            👤 {otherName}
                                                                                                        </span>
                                                                                                    ))
                                                                                                ) : (
                                                                                                    <span className="other-referente-pill duplicate">
                                                                                                        🔄 Cargado duplicado
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <span className="badge-unico-status">
                                                                                            ✓ Simpatizante Único
                                                                                        </span>
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    ) : (
                                                        <div className="ref-empty-sublist">
                                                            <p>🔍 No se encontraron simpatizantes que coincidan con la búsqueda o filtro aplicado.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
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
