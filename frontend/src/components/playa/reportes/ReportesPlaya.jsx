import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ReportesPlaya.css';

const ReportesPlaya = () => {
    const [reporteSeleccionado, setReporteSeleccionado] = useState('clientes_mora');
    const [datos, setDatos] = useState([]);
    const [datosDetallados, setDatosDetallados] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fechaDesde, setFechaDesde] = useState('2020-01-01');
    const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().split('T')[0]);
    const [horaEmision, setHoraEmision] = useState(new Date().toLocaleTimeString('es-PY'));

    const API_URL = import.meta.env.VITE_REACT_APP_API_URL || '/api';

    useEffect(() => {
        const timer = setInterval(() => {
            setHoraEmision(new Date().toLocaleTimeString('es-PY'));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

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
            // Fetch summary for UI
            const resSummary = await axios.get(`${API_URL}/playa/reportes/clientes-mora?desde=${fechaDesde}&hasta=${fechaHasta}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDatos(resSummary.data);

            // Fetch detailed for Print/Detailed View
            const resDetail = await axios.get(`${API_URL}/playa/reportes/cuotas-mora-detalle?desde=${fechaDesde}&hasta=${fechaHasta}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDatosDetallados(resDetail.data);
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
                        <div className="date-filter">
                            <div className="filter-group">
                                <label>Desde:</label>
                                <input
                                    type="date"
                                    value={fechaDesde}
                                    onChange={(e) => setFechaDesde(e.target.value)}
                                    className="date-input"
                                />
                            </div>
                            <div className="filter-group">
                                <label>Hasta:</label>
                                <input
                                    type="date"
                                    value={fechaHasta}
                                    onChange={(e) => setFechaHasta(e.target.value)}
                                    className="date-input"
                                />
                            </div>
                            <button className="btn-refresh" onClick={handleRecalculate} disabled={loading}>
                                🔄 Actualizar
                            </button>
                        </div>
                    )}
                    <button className="btn-print" onClick={handlePrint} disabled={loading}>
                        🖨️ Imprimir Reporte
                    </button>
                </div>
            </div>

            <div className="reporte-content printable-area">
                <div className="report-header-formal">
                    <div className="header-left">
                        <img src="/imágenes/Logo_oficial2.jpg" alt="Logo" className="report-logo" />
                        <div className="company-info">
                            <h2 className="company-name">PERALTA AUTOMOTORES</h2>
                            <p>Ingavi, Fernando de la Mora</p>
                            <p>RUC: 2349334-8</p>
                            <p>Correo: peraltaautomotores@gmail.com</p>
                        </div>
                    </div>
                    <div className="header-right">
                        <p>{new Date().toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: '2-digit' })}</p>
                        <p>{horaEmision}</p>
                    </div>
                </div>

                <div className="report-title-section">
                    <h1 className="report-title">
                        {reporteSeleccionado === 'clientes_mora' ? (
                            <>
                                Listado Cuotas a Cobrar desde Fecha: <span className="date-field">{new Date(fechaDesde + 'T12:00:00').toLocaleDateString('es-PY')}</span> hasta: <span className="date-field">{new Date(fechaHasta + 'T12:00:00').toLocaleDateString('es-PY')}</span>
                            </>
                        ) : (
                            'Listado de Vehículos Disponibles en Stock'
                        )}
                    </h1>
                </div>

                {loading ? (
                    <div className="loading">Generando reporte...</div>
                ) : reporteSeleccionado === 'clientes_mora' ? (
                    <div className="reporte-mora-sections">
                        {/* Vista Resumen (UI) */}
                        <div className="no-print">
                            {(() => {
                                const mora30 = datos.filter(d => d.dias_atraso <= 30);
                                const mora60 = datos.filter(d => d.dias_atraso > 30 && d.dias_atraso <= 60);
                                const mora60Plus = datos.filter(d => d.dias_atraso > 60);

                                return (
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
                                );
                            })()}
                        </div>

                        {/* Vista Detallada (Print & Detailed) */}
                        <table className="reporte-table formal-table">
                            <thead>
                                <tr>
                                    <th>Nombre Cliente</th>
                                    <th>C.I.Nro.</th>
                                    <th style={{ textAlign: 'center' }}>Nro. Cuota</th>
                                    <th style={{ textAlign: 'center' }}>Fecha Vencimiento</th>
                                    <th style={{ textAlign: 'right' }}>Saldo cuota</th>
                                    <th style={{ textAlign: 'right' }}>Cuota Mensual</th>
                                    <th style={{ textAlign: 'center' }}>Dias Mora</th>
                                    <th style={{ textAlign: 'right' }}>Total Mora</th>
                                    <th style={{ textAlign: 'right' }}>Total Pago Cuota</th>
                                </tr>
                            </thead>
                            <tbody>
                                {datosDetallados.length > 0 ? (
                                    datosDetallados.map((row, index) => (
                                        <tr key={index}>
                                            <td>{row.cliente_nombre}</td>
                                            <td>{row.cliente_ruc}</td>
                                            <td style={{ textAlign: 'center' }}>{row.numero_cuota}/{row.cantidad_cuotas_total}</td>
                                            <td style={{ textAlign: 'center' }}>{new Date(row.fecha_vencimiento).toLocaleDateString('es-PY')}</td>
                                            <td style={{ textAlign: 'right' }}>{Math.round(row.saldo_total_venta).toLocaleString('es-PY')}</td>
                                            <td style={{ textAlign: 'right' }}>{Math.round(row.monto_cuota).toLocaleString('es-PY')}</td>
                                            <td style={{ textAlign: 'center' }}>{row.dias_mora}</td>
                                            <td style={{ textAlign: 'right' }}>{Math.round(row.interes_mora).toLocaleString('es-PY')}</td>
                                            <td style={{ textAlign: 'right' }}>{Math.round(row.total_pago).toLocaleString('es-PY')}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>No hay registros que coincidan con la fecha seleccionada.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
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
