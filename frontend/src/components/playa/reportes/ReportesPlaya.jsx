import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ReportesPlaya.css';

const ReportesPlaya = () => {
    const [reporteSeleccionado, setReporteSeleccionado] = useState('clientes_mora');
    const [datos, setDatos] = useState([]);
    const [loading, setLoading] = useState(false);

    const API_URL = import.meta.env.VITE_REACT_APP_API_URL || '/api';

    useEffect(() => {
        if (reporteSeleccionado === 'clientes_mora') {
            fetchClientesEnMora();
        } else if (reporteSeleccionado === 'stock_disponible') {
            fetchStockDisponible();
        }
    }, [reporteSeleccionado]);

    const fetchStockDisponible = async () => {
        setLoading(true);
        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.get(`${API_URL}/playa/reportes/stock-disponible`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDatos(res.data);
        } catch (error) {
            console.error('Error fetching stock report:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchClientesEnMora = async () => {
        setLoading(true);
        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.get(`${API_URL}/playa/reportes/clientes-mora`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDatos(res.data);
        } catch (error) {
            console.error('Error fetching report:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRecalculate = async () => {
        setLoading(true);
        try {
            const token = sessionStorage.getItem('token');
            await axios.post(`${API_URL}/playa/reportes/recalcular-mora`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Una vez recalculado, refrescamos los datos del reporte
            await fetchClientesEnMora();
            alert('Análisis de mora completado. Datos actualizados.');
        } catch (error) {
            console.error('Error recalculating arrears:', error);
            alert('Error al actualizar datos: ' + (error.response?.data?.detail || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="reportes-container">
            <div className="reportes-header no-print">
                <div className="report-selector">
                    <button
                        className={`tab-btn ${reporteSeleccionado === 'clientes_mora' ? 'active' : ''}`}
                        onClick={() => setReporteSeleccionado('clientes_mora')}
                    >
                        👥 Clientes en Mora
                    </button>
                    <button
                        className={`tab-btn ${reporteSeleccionado === 'stock_disponible' ? 'active' : ''}`}
                        onClick={() => setReporteSeleccionado('stock_disponible')}
                    >
                        🚗 Stock Disponible
                    </button>
                </div>
                <div className="reportes-actions">
                    {reporteSeleccionado === 'clientes_mora' && (
                        <button className="btn-refresh" onClick={handleRecalculate} disabled={loading}>
                            🔄 Actualizar datos
                        </button>
                    )}
                    <button className="btn-print" onClick={handlePrint} disabled={loading}>
                        🖨️ Imprimir Reporte
                    </button>
                </div>
            </div>

            <div className="reporte-content printable-area">
                <div className="print-header">
                    <h1>Peralta Automotores</h1>
                    <h2>{reporteSeleccionado === 'clientes_mora' ? 'Reporte de Clientes en Mora' : 'Reporte de Stock Disponible'}</h2>
                    <p>Fecha de emisión: {new Date().toLocaleDateString('es-PY')}</p>
                </div>

                {loading ? (
                    <div className="loading">Generando reporte...</div>
                ) : reporteSeleccionado === 'clientes_mora' ? (
                    <div className="reporte-mora-sections">
                        {(() => {
                            const mora30 = datos.filter(d => d.dias_atraso <= 30);
                            const mora60 = datos.filter(d => d.dias_atraso > 30 && d.dias_atraso <= 60);
                            const mora60Plus = datos.filter(d => d.dias_atraso > 60);

                            const renderMoraTable = (titulo, items, color) => (
                                <div className="mora-section">
                                    <h3 style={{ borderLeft: `5px solid ${color}`, paddingLeft: '10px', margin: '20px 0 10px 0', fontSize: '1.2rem' }}>
                                        {titulo} ({items.length})
                                    </h3>
                                    <table className="reporte-table compact">
                                        <thead>
                                            <tr>
                                                <th>Cliente / RUC / Teléfono</th>
                                                <th>Vehículo</th>
                                                <th style={{ textAlign: 'center' }}>Cuotas</th>
                                                <th style={{ textAlign: 'center' }}>Atraso</th>
                                                <th style={{ textAlign: 'right' }}>Deuda Vencida</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.length > 0 ? (
                                                items.map((row, index) => (
                                                    <tr key={index}>
                                                        <td>
                                                            <div className="client-info">
                                                                <strong>{row.cliente_nombre}</strong>
                                                                <span className="subtext">{row.cliente_ruc} | {row.cliente_telefono}</span>
                                                            </div>
                                                        </td>
                                                        <td className="subtext">{row.vehiculo_info}</td>
                                                        <td style={{ textAlign: 'center' }}>{row.cantidad_cuotas}</td>
                                                        <td style={{ textAlign: 'center', color: color, fontWeight: 'bold' }}>{row.dias_atraso}d</td>
                                                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                                            Gs. {Math.round(row.total_deuda).toLocaleString('es-PY')}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="5" style={{ textAlign: 'center', padding: '10px', color: '#666' }}>No hay registros en esta categoría.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                        {items.length > 0 && (
                                            <tfoot>
                                                <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                                                    <td colSpan="4" style={{ textAlign: 'right' }}>SUBTOTAL {titulo}:</td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        Gs. {Math.round(items.reduce((acc, curr) => acc + curr.total_deuda, 0)).toLocaleString('es-PY')}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            );

                            return (
                                <>
                                    <div className="mora-summary-badges">
                                        <div className="summary-badge">
                                            <span className="label">Mora 30</span>
                                            <span className="value">{mora30.length}</span>
                                        </div>
                                        <div className="summary-badge">
                                            <span className="label">Mora 60</span>
                                            <span className="value">{mora60.length}</span>
                                        </div>
                                        <div className="summary-badge">
                                            <span className="label">Mora 60+</span>
                                            <span className="value">{mora60Plus.length}</span>
                                        </div>
                                        <div className="summary-badge total">
                                            <span className="label">Deuda Total</span>
                                            <span className="value">Gs. {Math.round(datos.reduce((acc, curr) => acc + curr.total_deuda, 0)).toLocaleString('es-PY')}</span>
                                        </div>
                                    </div>

                                    {renderMoraTable('MORA 30 DÍAS', mora30, '#10b981')}
                                    {renderMoraTable('MORA 60 DÍAS', mora60, '#f59e0b')}
                                    {renderMoraTable('MORA 60+ DÍAS', mora60Plus, '#ef4444')}
                                </>
                            );
                        })()}
                    </div>
                ) : (
                    <table className="reporte-table">
                        <thead>
                            <tr>
                                <th>Vehículo</th>
                                <th>Chasis</th>
                                <th>Color</th>
                                <th>Ubicación</th>
                                <th>Días en Stock</th>
                                <th>Precio Contado</th>
                                <th>Precio Financiado</th>
                                <th style={{ background: '#fef3c7' }}>Entrega Inicial</th>
                            </tr>
                        </thead>
                        <tbody>
                            {datos.length > 0 ? (
                                datos.map((row, index) => (
                                    <tr key={index}>
                                        <td>
                                            <strong>{row.marca} {row.modelo}</strong><br />
                                            <span style={{ fontSize: '0.85em', color: '#666' }}>Año: {row.año}</span>
                                        </td>
                                        <td style={{ fontFamily: 'monospace' }}>{row.chasis || '-'}</td>
                                        <td>{row.color || '-'}</td>
                                        <td>{row.ubicacion_actual || 'Playa Principal'}</td>
                                        <td style={{ textAlign: 'center' }}>{row.dias_en_stock ?? '-'}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            {row.precio_contado_sugerido && !isNaN(row.precio_contado_sugerido)
                                                ? `Gs. ${Math.round(parseFloat(row.precio_contado_sugerido)).toLocaleString('es-PY')}`
                                                : '-'}
                                        </td>
                                        <td style={{ textAlign: 'right', color: '#2563eb' }}>
                                            {row.precio_financiado_sugerido && !isNaN(row.precio_financiado_sugerido)
                                                ? `Gs. ${Math.round(parseFloat(row.precio_financiado_sugerido)).toLocaleString('es-PY')}`
                                                : '-'}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold', background: '#fffbeb' }}>
                                            {row.entrega_inicial_sugerida && !isNaN(row.entrega_inicial_sugerida)
                                                ? `Gs. ${Math.round(parseFloat(row.entrega_inicial_sugerida)).toLocaleString('es-PY')}`
                                                : '-'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>No hay vehículos disponibles en stock.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}

                <div className="print-footer">
                    <p>Fin del reporte.</p>
                </div>
            </div>
        </div>
    );
};

export default ReportesPlaya;
