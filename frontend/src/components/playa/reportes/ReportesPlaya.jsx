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
            const token = localStorage.getItem('token');
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
            const token = localStorage.getItem('token');
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
            const token = localStorage.getItem('token');
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
                    <table className="reporte-table">
                        <thead>
                            <tr>
                                <th>Cliente / RUC</th>
                                <th>Teléfono</th>
                                <th>Vehículo</th>
                                <th>Cuotas Vencidas</th>
                                <th>Días Atraso (Máx)</th>
                                <th>Total Deuda Vencida</th>
                            </tr>
                        </thead>
                        <tbody>
                            {datos.length > 0 ? (
                                datos.map((row, index) => (
                                    <tr key={index}>
                                        <td>
                                            <strong>{row.cliente_nombre}</strong><br />
                                            <span style={{ fontSize: '0.85em', color: '#666' }}>{row.cliente_ruc}</span>
                                        </td>
                                        <td>{row.cliente_telefono}</td>
                                        <td>{row.vehiculo_info}</td>
                                        <td style={{ textAlign: 'center' }}>{row.cantidad_cuotas}</td>
                                        <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: 'bold' }}>{row.dias_atraso}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                            Gs. {Math.round(row.total_deuda).toLocaleString('es-PY')}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No hay clientes en mora actualmente.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
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
