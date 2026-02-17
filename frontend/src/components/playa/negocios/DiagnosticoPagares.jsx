import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DiagnosticoPagares.css';

const DiagnosticoPagares = () => {
    const [pagaresInconsistentes, setPagaresInconsistentes] = useState([]);
    const [triggerInfo, setTriggerInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingTriggers, setLoadingTriggers] = useState(false);
    const [mensaje, setMensaje] = useState('');
    const [activeTab, setActiveTab] = useState('inconsistentes'); // 'inconsistentes' o 'triggers'

    const API_URL = import.meta.env.VITE_REACT_APP_API_URL || '/api';

    const fetchInconsistentes = async () => {
        setLoading(true);
        setMensaje('');
        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.get(`${API_URL}/playa/diagnostico/pagares-inconsistentes`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPagaresInconsistentes(res.data.pagares);
            setMensaje(`Se encontraron ${res.data.total_inconsistentes} pagarés con inconsistencias.`);
        } catch (error) {
            console.error('Error al diagnosticar:', error);
            setMensaje('Error al obtener diagnóstico: ' + (error.response?.data?.detail || error.message));
        } finally {
            setLoading(false);
        }
    };

    const fetchTriggerInfo = async () => {
        setLoadingTriggers(true);
        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.get(`${API_URL}/playa/diagnostico/triggers-info`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTriggerInfo(res.data);
        } catch (error) {
            console.error('Error al obtener info de triggers:', error);
            alert('Error al obtener información de triggers: ' + (error.response?.data?.detail || error.message));
        } finally {
            setLoadingTriggers(false);
        }
    };

    const eliminarTriggerAntiguo = async () => {
        if (!window.confirm('¿Está seguro de que desea ELIMINAR el trigger antiguo?\n\nEsto es RECOMENDADO ya que la lógica de estados ahora se maneja desde el código de la aplicación.\n\nLa operación quedará registrada en auditoría.')) {
            return;
        }

        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.post(
                `${API_URL}/playa/diagnostico/eliminar-trigger-antiguo`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert(res.data.mensaje + '\n\n' + res.data.detalles);
            // Refrescar información
            fetchTriggerInfo();
        } catch (error) {
            console.error('Error al eliminar trigger:', error);
            alert('Error al eliminar trigger: ' + (error.response?.data?.detail || error.message));
        }
    };

    const actualizarTrigger = async () => {
        if (!window.confirm('¿Está seguro de que desea ACTUALIZAR el trigger?\n\nNOTA: Es preferible ELIMINAR el trigger completamente y manejar la lógica desde el código.\n\n¿Desea continuar con la actualización?')) {
            return;
        }

        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.post(
                `${API_URL}/playa/diagnostico/actualizar-trigger-estado`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert(res.data.mensaje + '\n\n' + res.data.detalles);
            // Refrescar información
            fetchTriggerInfo();
        } catch (error) {
            console.error('Error al actualizar trigger:', error);
            alert('Error al actualizar trigger: ' + (error.response?.data?.detail || error.message));
        }
    };

    const corregirPagare = async (idPagare, accion) => {
        if (!window.confirm(`¿Está seguro de que desea ${accion === 'restaurar_saldo' ? 'RESTAURAR EL SALDO' : 'MARCAR COMO PAGADO'} este pagaré?`)) {
            return;
        }

        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.post(
                `${API_URL}/playa/diagnostico/corregir-pagare/${idPagare}?accion=${accion}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert(res.data.mensaje);
            // Refrescar la lista
            fetchInconsistentes();
        } catch (error) {
            console.error('Error al corregir:', error);
            alert('Error al corregir: ' + (error.response?.data?.detail || error.message));
        }
    };

    useEffect(() => {
        fetchInconsistentes();
        fetchTriggerInfo();
    }, []);

    const getNivelColor = (nivel) => {
        switch (nivel) {
            case 'CRÍTICO': return '#dc2626';
            case 'ADVERTENCIA': return '#f59e0b';
            case 'INFO': return '#3b82f6';
            default: return '#6b7280';
        }
    };

    return (
        <div className="diagnostico-container">
            <div className="diagnostico-header">
                <h2>🔍 Diagnóstico del Sistema</h2>
                <div className="header-buttons">
                    <button className="btn-refresh" onClick={fetchInconsistentes} disabled={loading}>
                        {loading ? '⌛ Cargando...' : '🔄 Actualizar Pagarés'}
                    </button>
                    <button className="btn-refresh" onClick={fetchTriggerInfo} disabled={loadingTriggers}>
                        {loadingTriggers ? '⌛ Cargando...' : '🔄 Actualizar Triggers'}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs-container">
                <button
                    className={`tab ${activeTab === 'inconsistentes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('inconsistentes')}
                >
                    📋 Pagarés Inconsistentes
                    {pagaresInconsistentes.length > 0 && (
                        <span className="badge-count">{pagaresInconsistentes.length}</span>
                    )}
                </button>
                <button
                    className={`tab ${activeTab === 'triggers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('triggers')}
                >
                    ⚙️ Triggers de Base de Datos
                    {triggerInfo?.recomendaciones?.some(r => r.nivel === 'CRÍTICO') && (
                        <span className="badge-alert">!</span>
                    )}
                </button>
            </div>

            {/* Tab Content: Pagarés Inconsistentes */}
            {activeTab === 'inconsistentes' && (
                <div className="tab-content">
                    {mensaje && (
                        <div className={`mensaje ${pagaresInconsistentes.length > 0 ? 'warning' : 'success'}`}>
                            {mensaje}
                        </div>
                    )}

                    <div className="info-box">
                        <h3>¿Qué son pagarés inconsistentes?</h3>
                        <p>Son pagarés que tienen <strong>saldo pendiente = 0</strong> pero <strong>NO tienen pagos registrados</strong>.</p>
                        <p>Esto puede ocurrir por:</p>
                        <ul>
                            <li>Datos migrados de sistemas anteriores</li>
                            <li>Actualizaciones manuales en la base de datos</li>
                            <li>Errores en versiones anteriores del sistema</li>
                        </ul>
                        <h4>Opciones de corrección:</h4>
                        <ul>
                            <li><strong>Restaurar Saldo:</strong> Vuelve el saldo al monto original de la cuota para que puedas registrar pagos normalmente</li>
                            <li><strong>Marcar como Pagado:</strong> Confirma que el pagaré está pagado y lo marca como cancelado definitivamente</li>
                        </ul>
                    </div>

                    {pagaresInconsistentes.length === 0 && !loading ? (
                        <div className="no-data">
                            ✅ No se encontraron pagarés inconsistentes. ¡Todo está en orden!
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="diagnostico-table">
                                <thead>
                                    <tr>
                                        <th>ID Pagaré</th>
                                        <th>N° Pagaré</th>
                                        <th>Cuota</th>
                                        <th>Monto Cuota</th>
                                        <th>Saldo</th>
                                        <th>Estado</th>
                                        <th>Cancelado</th>
                                        <th>Problema</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagaresInconsistentes.map(p => (
                                        <tr key={p.id_pagare}>
                                            <td>{p.id_pagare}</td>
                                            <td>{p.numero_pagare}</td>
                                            <td>{p.numero_cuota}</td>
                                            <td>Gs. {Math.round(p.monto_cuota).toLocaleString('es-PY')}</td>
                                            <td>Gs. {Math.round(p.saldo_pendiente).toLocaleString('es-PY')}</td>
                                            <td>
                                                <span className={`badge estado-${p.estado.toLowerCase()}`}>
                                                    {p.estado}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${p.cancelado ? 'cancelado-si' : 'cancelado-no'}`}>
                                                    {p.cancelado ? 'SÍ' : 'NO'}
                                                </span>
                                            </td>
                                            <td className="problema-cell">{p.problema}</td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button
                                                        className="btn-restaurar"
                                                        onClick={() => corregirPagare(p.id_pagare, 'restaurar_saldo')}
                                                        title="Restaurar el saldo al monto original"
                                                    >
                                                        🔄 Restaurar Saldo
                                                    </button>
                                                    <button
                                                        className="btn-marcar-pagado"
                                                        onClick={() => corregirPagare(p.id_pagare, 'marcar_pagado')}
                                                        title="Marcar como pagado y bloquear"
                                                    >
                                                        🔒 Finalizar (Pagado)
                                                    </button>
                                                    <button
                                                        className="btn-recalcular"
                                                        onClick={() => corregirPagare(p.id_pagare, 'recalcular_estado')}
                                                        title="Recalcular estado según saldo"
                                                    >
                                                        ⚖️ Recalcular Estado
                                                    </button>
                                                    {p.cancelado && (
                                                        <button
                                                            className="btn-desbloquear"
                                                            onClick={() => corregirPagare(p.id_pagare, 'desmarcar_cancelado')}
                                                            title="Permitir agregar más pagos"
                                                        >
                                                            🔓 Desbloquear
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )
            }

            {/* Tab Content: Triggers */}
            {
                activeTab === 'triggers' && triggerInfo && (
                    <div className="tab-content">
                        <div className="info-box">
                            <h3>⚙️ Gestión de Triggers de Base de Datos</h3>
                            <p>Los <strong>triggers</strong> son funciones automáticas que se ejecutan cuando ocurren ciertos eventos en la base de datos.</p>
                            <p><strong>Recomendación:</strong> Es mejor manejar la lógica de negocio desde el código de la aplicación en lugar de usar triggers, porque:</p>
                            <ul>
                                <li>✅ Mayor control y visibilidad del flujo de negocio</li>
                                <li>✅ Más fácil de debuggear y mantener</li>
                                <li>✅ Mejor auditoría de cambios</li>
                                <li>✅ Evita conflictos entre triggers y código</li>
                            </ul>
                        </div>

                        {/* Recomendaciones */}
                        {triggerInfo.recomendaciones && triggerInfo.recomendaciones.length > 0 && (
                            <div className="recomendaciones-section">
                                <h3>📌 Recomendaciones</h3>
                                {triggerInfo.recomendaciones.map((rec, idx) => (
                                    <div
                                        key={idx}
                                        className="recomendacion-card"
                                        style={{ borderLeftColor: getNivelColor(rec.nivel) }}
                                    >
                                        <div className="rec-header">
                                            <span className="rec-nivel" style={{ backgroundColor: getNivelColor(rec.nivel) }}>
                                                {rec.nivel}
                                            </span>
                                            <span className="rec-mensaje">{rec.mensaje}</span>
                                        </div>
                                        <div className="rec-accion">
                                            <strong>Acción:</strong> {rec.accion}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Triggers en tabla pagos */}
                        <div className="triggers-section">
                            <h3>🔧 Triggers Activos en tabla "pagos"</h3>
                            {triggerInfo.triggers_en_pagos && triggerInfo.triggers_en_pagos.length > 0 ? (
                                <div className="triggers-list">
                                    {triggerInfo.triggers_en_pagos.map((trigger, idx) => (
                                        <div key={idx} className="trigger-card">
                                            <div className="trigger-info">
                                                <div className="trigger-name">
                                                    <strong>{trigger.trigger_name}</strong>
                                                    <span className={`status-badge ${trigger.status.toLowerCase()}`}>
                                                        {trigger.status}
                                                    </span>
                                                </div>
                                                <div className="trigger-function">
                                                    Función: <code>{trigger.function_name}()</code>
                                                </div>
                                            </div>
                                            {trigger.trigger_name === 'trg_actualizar_estado_pagare' && (
                                                <div className="trigger-actions">
                                                    <button
                                                        className="btn-danger"
                                                        onClick={eliminarTriggerAntiguo}
                                                    >
                                                        🗑️ Eliminar Trigger (Recomendado)
                                                    </button>
                                                    <button
                                                        className="btn-warning"
                                                        onClick={actualizarTrigger}
                                                    >
                                                        🔄 Actualizar Trigger
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="no-data">
                                    ✅ No hay triggers activos en la tabla "pagos"
                                </div>
                            )}
                        </div>

                        {/* Estructura de tabla */}
                        <div className="estructura-section">
                            <h3>📊 Estructura de tabla "pagares"</h3>
                            <table className="diagnostico-table">
                                <thead>
                                    <tr>
                                        <th>Columna</th>
                                        <th>Tipo de Dato</th>
                                        <th>Nullable</th>
                                        <th>Valor por Defecto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {triggerInfo.columnas_pagares && triggerInfo.columnas_pagares.map((col, idx) => (
                                        <tr key={idx}>
                                            <td><code>{col.column_name}</code></td>
                                            <td>{col.data_type}</td>
                                            <td>{col.is_nullable === 'YES' ? 'Sí' : 'No'}</td>
                                            <td>{col.column_default || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Estadísticas */}
                        {triggerInfo.estadisticas_inconsistentes && (
                            <div className="stats-section">
                                <h3>📈 Estadísticas</h3>
                                <div className="stats-grid">
                                    <div className="stat-card">
                                        <div className="stat-value">{triggerInfo.estadisticas_inconsistentes.total_inconsistentes || 0}</div>
                                        <div className="stat-label">Pagarés Inconsistentes</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">{triggerInfo.estadisticas_inconsistentes.con_id_estado || 0}</div>
                                        <div className="stat-label">Con id_estado</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">{triggerInfo.estadisticas_inconsistentes.marcados_cancelado || 0}</div>
                                        <div className="stat-label">Marcados Cancelado</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )
            }
        </div >
    );
};

export default DiagnosticoPagares;
