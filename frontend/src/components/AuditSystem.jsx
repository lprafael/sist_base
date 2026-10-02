import React, { useState, useEffect } from 'react';
import { authFetch } from '../utils/authFetch';
import './AuditSystem.css';

const AuditSystem = () => {
    const [activeTab, setActiveTab] = useState('stats'); // 'stats', 'audit', 'access', 'sessions'
    const [data, setData] = useState([]);
    const [adminStats, setAdminStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);

    // Filtros
    const [filters, setFilters] = useState({
        username: '',
        limit: 100
    });

    const [showClearModal, setShowClearModal] = useState(false);
    const [clearPassword, setClearPassword] = useState('');

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            if (activeTab === 'stats') {
                const response = await authFetch('/public/padron/estadisticas/admin');
                if (response.ok) {
                    const result = await response.json();
                    setAdminStats(result);
                    setData(result.ultimas_consultas || []);
                } else {
                    setError('Error al obtener estadísticas de control.');
                }
                return;
            }

            let endpoint = '';
            if (activeTab === 'audit') endpoint = `/api/auditoria/logs`;
            else if (activeTab === 'access') endpoint = `/api/auditoria/accesos`;
            else if (activeTab === 'sessions') endpoint = `/api/auditoria/sesiones`;

            const params = new URLSearchParams();
            if (filters.username) params.append('username', filters.username);
            params.append('limit', filters.limit);

            const response = await authFetch(`${endpoint}?${params.toString()}`);
            if (response.ok) {
                const result = await response.json();
                setData(result);
            } else {
                setError('Error al obtener datos. Verifica tus permisos.');
            }
        } catch (err) {
            setError('Error de conexión con el servidor.');
        } finally {
            setLoading(false);
        }
    };


    const handleClearLogs = async () => {
        if (!clearPassword) return alert('Debes ingresar tu contraseña');
        try {
            const resp = await authFetch('/api/auditoria/clear', {
                method: 'POST',
                body: JSON.stringify({ password: clearPassword })
            });
            if (resp.ok) {
                alert('Logs vaciados exitosamente');
                setShowClearModal(false);
                setClearPassword('');
                fetchData();
            } else {
                const err = await resp.json();
                alert(err.detail || 'Contraseña incorrecta o error al vaciar logs');
            }
        } catch (e) {
            alert('Error de conexión con el servidor');
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab, filters.limit]);

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchData();
    };

    const formatFecha = (fechaStr) => {
        if (!fechaStr) return '-';
        return new Date(fechaStr).toLocaleString();
    };

    const renderAuditTable = () => (
        <table className="audit-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Usuario</th>
                    <th>Acción</th>
                    <th>Tabla</th>
                    <th>Registro ID</th>
                    <th>Fecha</th>
                    <th>Detalles</th>
                </tr>
            </thead>
            <tbody>
                {data.map(item => (
                    <tr key={item.id}>
                        <td>{item.id}</td>
                        <td style={{ fontWeight: 600 }}>{item.username}</td>
                        <td><span className="status-label" style={{ background: '#e0f2fe', color: '#0369a1' }}>{item.accion}</span></td>
                        <td>{item.tabla}</td>
                        <td>{item.registro_id || '-'}</td>
                        <td>{formatFecha(item.fecha)}</td>
                        <td>
                            {(item.datos_anteriores || item.datos_nuevos) ? (
                                <div className="audit-json-viewer" onClick={() => setSelectedItem(item)}>
                                    Ver cambios
                                </div>
                            ) : '-'}
                        </td>
                    </tr>
                ))}
                {data.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>No hay registros</td></tr>}
            </tbody>
        </table>
    );

    const renderAccessTable = () => (
        <table className="audit-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Usuario</th>
                    <th>Acción</th>
                    <th>IP</th>
                    <th>Resultado</th>
                    <th>Fecha</th>
                    <th>User Agent</th>
                </tr>
            </thead>
            <tbody>
                {data.map(item => (
                    <tr key={item.id}>
                        <td>{item.id}</td>
                        <td style={{ fontWeight: 600 }}>{item.username}</td>
                        <td>{item.accion}</td>
                        <td>{item.ip_address}</td>
                        <td>
                            <span className={`status-label ${item.exitoso ? 'status-success' : 'status-failed'}`}>
                                {item.exitoso ? 'Exitoso' : 'Fallido'}
                            </span>
                        </td>
                        <td>{formatFecha(item.fecha)}</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.user_agent}>
                            {item.user_agent}
                        </td>
                    </tr>
                ))}
                {data.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>No hay registros</td></tr>}
            </tbody>
        </table>
    );

    const renderSessionsTable = () => (
        <table className="audit-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Usuario</th>
                    <th>IP</th>
                    <th>Estado</th>
                    <th>Inicio</th>
                    <th>Expiración</th>
                    <th>Cierre</th>
                </tr>
            </thead>
            <tbody>
                {data.map(item => (
                    <tr key={item.id}>
                        <td>{item.id}</td>
                        <td style={{ fontWeight: 600 }}>{item.username}</td>
                        <td>{item.ip_address}</td>
                        <td>
                            <span className={`status-label ${item.activa ? 'status-success' : 'status-failed'}`}>
                                {item.activa ? 'Activa' : 'Cerrada'}
                            </span>
                        </td>
                        <td>{formatFecha(item.fecha_inicio)}</td>
                        <td>{formatFecha(item.fecha_expiracion)}</td>
                        <td>{formatFecha(item.fecha_cierre)}</td>
                    </tr>
                ))}
                {data.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>No hay sesiones registradas</td></tr>}
            </tbody>
        </table>
    );

    const renderStatsTable = () => {
        if (!adminStats) {
            return <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Cargando estadísticas...</div>;
        }

        return (
            <div style={{ padding: '16px' }}>
                {/* Métricas Principales en Tarjetas (KPIs) */}
                <div className="stats-overview-grid">
                    <div className="kpi-card blue">
                        <div className="kpi-header">
                            <span className="kpi-title">Usuarios Registrados</span>
                            <span className="kpi-icon">👥</span>
                        </div>
                        <div className="kpi-value">{adminStats.usuarios?.total || 0}</div>
                        <div className="kpi-subtext">Cuentas con acceso a SIGEL</div>
                        <div className="roles-breakdown-tags">
                            {Object.entries(adminStats.usuarios?.por_rol || {}).map(([r, count]) => (
                                <span key={r} className="role-tag">{r}: {count}</span>
                            ))}
                        </div>
                    </div>

                    <div className="kpi-card purple">
                        <div className="kpi-header">
                            <span className="kpi-title">Equipos Únicos</span>
                            <span className="kpi-icon">💻</span>
                        </div>
                        <div className="kpi-value">{adminStats.equipos?.total_unicos || 0}</div>
                        <div className="kpi-subtext">Celulares y PCs distintos detectados</div>
                        <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#6366f1', fontWeight: 600 }}>
                            📱 {adminStats.equipos?.en_padron || 0} consultaron el padrón
                        </div>
                    </div>

                    <div className="kpi-card orange">
                        <div className="kpi-header">
                            <span className="kpi-title">Visitas y Accesos</span>
                            <span className="kpi-icon">🔄</span>
                        </div>
                        <div className="kpi-value">{adminStats.visitas?.total_accesos || 0}</div>
                        <div className="kpi-subtext">
                            🌐 Web: {adminStats.visitas?.visitas_web || 0} | 🔐 Sesiones: {adminStats.visitas?.accesos_usuarios || 0}
                        </div>
                    </div>

                    <div className="kpi-card green">
                        <div className="kpi-header">
                            <span className="kpi-title">Padrón Municipal</span>
                            <span className="kpi-icon">🗳️</span>
                        </div>
                        <div className="kpi-value">{adminStats.padron_publico?.total_consultas || 0}</div>
                        <div className="kpi-subtext">
                            🆔 {adminStats.padron_publico?.cedulas_unicas || 0} electores distintos
                        </div>
                        <div style={{ marginTop: '6px', fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>
                            ✅ {adminStats.padron_publico?.exitosas || 0} encontrados / ❌ {adminStats.padron_publico?.fallidas || 0} sin coincidencia
                        </div>
                    </div>
                </div>

                {/* Tabla de Últimas Consultas al Padrón */}
                <h3 style={{ fontSize: '1.15rem', color: '#1e293b', margin: '24px 0 12px 0', fontWeight: 700 }}>
                    🕒 Registro de Consultas al Padrón en Tiempo Real
                </h3>
                <table className="audit-table">
                    <thead>
                        <tr>
                            <th>Fecha y Hora</th>
                            <th>Cédula</th>
                            <th>Elector</th>
                            <th>Mesa / Orden</th>
                            <th>Local de Votación</th>
                            <th>ID Equipo (Device)</th>
                            <th>Resultado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(adminStats.ultimas_consultas || []).map((c, idx) => (
                            <tr key={c.id || idx}>
                                <td>{formatFecha(c.fecha)}</td>
                                <td style={{ fontWeight: 700, color: '#1e3a8a' }}>{c.cedula}</td>
                                <td>{c.nombre_elector || '-'}</td>
                                <td>{c.mesa ? `Mesa ${c.mesa} (Ord. ${c.orden})` : '-'}</td>
                                <td>{c.local_votacion || '-'}</td>
                                <td style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '0.8rem' }} title={c.device_id}>
                                    {c.device_id || 'Desconocido'}
                                </td>
                                <td>
                                    <span className={`status-label ${c.encontrado ? 'status-success' : 'status-failed'}`}>
                                        {c.encontrado ? '✅ Encontrado' : '❌ No coincide'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {(!adminStats.ultimas_consultas || adminStats.ultimas_consultas.length === 0) && (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>Aún no se han registrado consultas al padrón público.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="audit-container fade-in">
            <div className="user-management-header">
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>🔍 Auditoría y Control</h1>
            </div>

            <div className="audit-tabs">
                <button
                    className={`audit-tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
                    onClick={() => setActiveTab('stats')}
                >
                    📊 Control de Equipos y Padrón
                </button>
                <button
                    className={`audit-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
                    onClick={() => setActiveTab('audit')}
                >
                    📜 Logs de Auditoría
                </button>
                <button
                    className={`audit-tab-btn ${activeTab === 'access' ? 'active' : ''}`}
                    onClick={() => setActiveTab('access')}
                >
                    🔑 Logs de Acceso
                </button>
                <button
                    className={`audit-tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sessions')}
                >
                    💻 Sesiones Activas
                </button>
            </div>

            <div className="audit-filters">
                {activeTab !== 'stats' ? (
                    <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                            name="username"
                            placeholder="Usuario..."
                            value={filters.username}
                            onChange={handleFilterChange}
                        />
                        <select name="limit" value={filters.limit} onChange={handleFilterChange}>
                            <option value="50">50 registros</option>
                            <option value="100">100 registros</option>
                            <option value="500">500 registros</option>
                        </select>
                        <button type="submit" className="btn btn-secondary">🔍 Buscar</button>
                        <button type="button" className="btn btn-secondary" onClick={fetchData}>🔄 Refrescar</button>
                        <button type="button" className="btn" style={{ background: '#ef4444', color: 'white' }} onClick={() => setShowClearModal(true)}>🗑️ Vaciar Logs</button>
                    </form>
                ) : (
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%' }}>
                        <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>
                            📈 Métricas consolidadas de tráfico de equipos, usuarios y consultas del padrón
                        </span>
                        <button type="button" className="btn btn-secondary" style={{ marginLeft: 'auto' }} onClick={fetchData}>
                            🔄 Actualizar Métricas
                        </button>
                    </div>
                )}
                {loading && <span style={{ marginLeft: 'auto', color: 'var(--primary-color)' }}>Actualizando...</span>}
            </div>

            {error && <div className="error-message" style={{ marginBottom: '20px' }}>{error}</div>}

            <div className="audit-table-wrapper">
                {activeTab === 'stats' && renderStatsTable()}
                {activeTab === 'audit' && renderAuditTable()}
                {activeTab === 'access' && renderAccessTable()}
                {activeTab === 'sessions' && renderSessionsTable()}
            </div>

            {selectedItem && (
                <div className="audit-modal" onClick={() => setSelectedItem(null)}>
                    <div className="audit-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Detalles del Log #{selectedItem.id}</h3>
                            <button className="close-btn" onClick={() => setSelectedItem(null)}>×</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                            <div>
                                <p><strong>Usuario:</strong> {selectedItem.username}</p>
                                <p><strong>Acción:</strong> {selectedItem.accion}</p>
                                <p><strong>Tabla:</strong> {selectedItem.tabla}</p>
                            </div>
                            <div>
                                <p><strong>Fecha:</strong> {formatFecha(selectedItem.fecha)}</p>
                                <p><strong>IP:</strong> {selectedItem.ip_address}</p>
                            </div>
                        </div>

                        {selectedItem.datos_anteriores && (
                            <div>
                                <p><strong>Datos Anteriores:</strong></p>
                                <pre className="json-block">{JSON.stringify(selectedItem.datos_anteriores, null, 2)}</pre>
                            </div>
                        )}

                        {selectedItem.datos_nuevos && (
                            <div style={{ marginTop: '15px' }}>
                                <p><strong>Datos Nuevos:</strong></p>
                                <pre className="json-block">{JSON.stringify(selectedItem.datos_nuevos, null, 2)}</pre>
                            </div>
                        )}

                        {selectedItem.detalles && (
                            <div style={{ marginTop: '15px' }}>
                                <p><strong>Detalles adicionales:</strong></p>
                                <p>{selectedItem.detalles}</p>
                            </div>
                        )}

                        <div className="modal-actions" style={{ marginTop: '20px' }}>
                            <button className="btn btn-secondary" onClick={() => setSelectedItem(null)}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            {showClearModal && (
                <div className="audit-modal" onClick={() => setShowClearModal(false)}>
                    <div className="audit-modal-content" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>⚠️ Vaciar Logs de Auditoría</h3>
                            <button className="close-btn" onClick={() => setShowClearModal(false)}>×</button>
                        </div>
                        <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                            <p style={{ color: '#ef4444', marginBottom: '15px' }}>
                                Esta acción eliminará permanentemente todos los registros de auditoría y accesos. Requiere verificación de seguridad.
                            </p>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Contraseña de Administrador:</label>
                            <input
                                type="password"
                                className="form-input"
                                value={clearPassword}
                                onChange={(e) => setClearPassword(e.target.value)}
                                placeholder="Ingresa tu contraseña"
                                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                            />
                        </div>
                        <div className="modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setShowClearModal(false)}>Cancelar</button>
                            <button className="btn" style={{ background: '#ef4444', color: 'white' }} onClick={handleClearLogs}>Confirmar Vaciado</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditSystem;
