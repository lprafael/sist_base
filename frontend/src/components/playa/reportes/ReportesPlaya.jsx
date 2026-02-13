import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ReportesPlaya.css';

const ReportesPlaya = () => {
    const [reporteSeleccionado, setReporteSeleccionado] = useState('clientes_mora');
    const [datos, setDatos] = useState([]);
    const [datosDetallados, setDatosDetallados] = useState([]);
    const [datosVentas, setDatosVentas] = useState([]);
    const [datosExtracto, setDatosExtracto] = useState(null);
    const [cuentas, setCuentas] = useState([]);
    const [idCuentaSeleccionada, setIdCuentaSeleccionada] = useState('');
    const [loading, setLoading] = useState(false);
    const [fechaDesde, setFechaDesde] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().split('T')[0]);
    const [ordenMora, setOrdenMora] = useState('cliente'); // 'cliente' o 'dias_mora'
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
        } else if (reporteSeleccionado === 'ventas') {
            fetchVentas();
        } else if (reporteSeleccionado === 'extracto_cuenta') {
            fetchCuentas();
            if (idCuentaSeleccionada) fetchExtractoCuenta();
        }
    }, [reporteSeleccionado, ordenMora, idCuentaSeleccionada]);

    const fetchVentas = async () => {
        setLoading(true);
        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.get(`${API_URL}/playa/reportes/ventas?desde=${fechaDesde}&hasta=${fechaHasta}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDatosVentas(res.data);
        } catch (error) {
            console.error('Error fetching sales report:', error);
        } finally {
            setLoading(false);
        }
    };

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

    const fetchCuentas = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.get(`${API_URL}/playa/cuentas`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCuentas(res.data);
            if (res.data.length > 0 && !idCuentaSeleccionada) {
                setIdCuentaSeleccionada(res.data[0].id_cuenta);
            }
        } catch (error) {
            console.error('Error fetching accounts:', error);
        }
    };

    const fetchExtractoCuenta = async () => {
        if (!idCuentaSeleccionada) return;
        setLoading(true);
        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.get(`${API_URL}/playa/reportes/extracto-cuenta?id_cuenta=${idCuentaSeleccionada}&desde=${fechaDesde}&hasta=${fechaHasta}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDatosExtracto(res.data);
        } catch (error) {
            console.error('Error fetching extracto:', error);
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
            const resDetail = await axios.get(`${API_URL}/playa/reportes/cuotas-mora-detalle?desde=${fechaDesde}&hasta=${fechaHasta}&orden=${ordenMora}`, {
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
        if (reporteSeleccionado === 'extracto_cuenta') {
            await fetchExtractoCuenta();
        } else if (reporteSeleccionado === 'ventas') {
            await fetchVentas();
        } else {
            setLoading(true);
            try {
                const token = sessionStorage.getItem('token');
                await axios.post(`${API_URL}/playa/reportes/recalcular-mora`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                await fetchClientesEnMora();
                alert('Análisis de mora completado. Datos actualizados.');
            } catch (error) {
                console.error('Error recalculating arrears:', error);
                alert('Error al actualizar datos: ' + (error.response?.data?.detail || error.message));
            } finally {
                setLoading(false);
            }
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
                    <button
                        className={`tab-btn ${reporteSeleccionado === 'ventas' ? 'active' : ''}`}
                        onClick={() => setReporteSeleccionado('ventas')}
                    >
                        💰 Listado Ventas
                    </button>
                    <button
                        className={`tab-btn ${reporteSeleccionado === 'extracto_cuenta' ? 'active' : ''}`}
                        onClick={() => setReporteSeleccionado('extracto_cuenta')}
                    >
                        📊 Extracto Cuenta
                    </button>
                </div>
                <div className="reportes-actions">
                    {(reporteSeleccionado === 'clientes_mora' || reporteSeleccionado === 'ventas' || reporteSeleccionado === 'extracto_cuenta') && (
                        <div className="date-filter">
                            {reporteSeleccionado === 'extracto_cuenta' && (
                                <div className="filter-group">
                                    <label>Cuenta:</label>
                                    <select
                                        className="date-input"
                                        value={idCuentaSeleccionada}
                                        onChange={(e) => setIdCuentaSeleccionada(e.target.value)}
                                        style={{ minWidth: '150px' }}
                                    >
                                        <option value="">Seleccione Cuenta</option>
                                        {cuentas.map(c => (
                                            <option key={c.id_cuenta} value={c.id_cuenta}>{c.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
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

                    {reporteSeleccionado === 'clientes_mora' && (
                        <div className="order-filter no-print">
                            <span className="order-label">Ordenar por:</span>
                            <div className="radio-group">
                                <label className={`radio-btn ${ordenMora === 'cliente' ? 'selected' : ''}`}>
                                    <input
                                        type="radio"
                                        name="ordenMora"
                                        value="cliente"
                                        checked={ordenMora === 'cliente'}
                                        onChange={(e) => setOrdenMora(e.target.value)}
                                    />
                                    Cliente
                                </label>
                                <label className={`radio-btn ${ordenMora === 'dias_mora' ? 'selected' : ''}`}>
                                    <input
                                        type="radio"
                                        name="ordenMora"
                                        value="dias_mora"
                                        checked={ordenMora === 'dias_mora'}
                                        onChange={(e) => setOrdenMora(e.target.value)}
                                    />
                                    Días atraso
                                </label>
                            </div>
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
                        ) : reporteSeleccionado === 'ventas' ? (
                            <>
                                Listado Ventas {new Date(fechaDesde + 'T12:00:00').toLocaleDateString('es-PY')} al {new Date(fechaHasta + 'T12:00:00').toLocaleDateString('es-PY')}
                            </>
                        ) : reporteSeleccionado === 'extracto_cuenta' ? (
                            <>
                                Movimiento de Cuenta: {datosExtracto?.cuenta_nombre || 'N/A'} - Desde: {new Date(fechaDesde + 'T12:00:00').toLocaleDateString('es-PY')} al {new Date(fechaHasta + 'T12:00:00').toLocaleDateString('es-PY')}
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
                ) : reporteSeleccionado === 'ventas' ? (
                    <table className="reporte-table formal-table">
                        <thead>
                            <tr>
                                <th>Método de venta</th>
                                <th>Fecha</th>
                                <th>Código</th>
                                <th>Descripción</th>
                                <th>Cliente</th>
                                <th style={{ textAlign: 'right' }}>Gs. Entrega</th>
                                <th style={{ textAlign: 'right' }}>Total Venta</th>
                                <th style={{ textAlign: 'right' }}>Comision</th>
                                <th>Vendedor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {datosVentas.length > 0 ? (
                                datosVentas.map((row, index) => (
                                    <tr key={index}>
                                        <td>{row.tipo_venta}</td>
                                        <td>{new Date(row.fecha_venta + 'T12:00:00').toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
                                        <td>{row.numero_venta}</td>
                                        <td style={{ fontSize: '0.8em' }}>{row.vehiculo_descripcion}</td>
                                        <td>{row.cliente_nombre}</td>
                                        <td style={{ textAlign: 'right' }}>{Math.round(row.entrega_inicial).toLocaleString('es-PY')}</td>
                                        <td style={{ textAlign: 'right' }}>{Math.round(row.precio_final).toLocaleString('es-PY')}</td>
                                        <td style={{ textAlign: 'right' }}>{Math.round(row.comision).toLocaleString('es-PY')}</td>
                                        <td>{row.vendedor_nombre}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>No hay ventas en este rango.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                ) : reporteSeleccionado === 'extracto_cuenta' ? (
                    <div className="extracto-section">
                        <div style={{ marginBottom: '10px', fontSize: '0.9rem', textAlign: 'right' }}>
                            <strong>Saldo Anterior:</strong> Gs. {Math.round(datosExtracto?.saldo_anterior || 0).toLocaleString('es-PY')}
                        </div>
                        <table className="reporte-table formal-table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Concepto</th>
                                    <th>Referencia</th>
                                    <th style={{ textAlign: 'right' }}>Ingreso</th>
                                    <th style={{ textAlign: 'right' }}>Egreso</th>
                                    <th style={{ textAlign: 'right' }}>Saldo Acumulado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {datosExtracto?.movimientos?.length > 0 ? (
                                    datosExtracto.movimientos.map((row, index) => (
                                        <tr key={index}>
                                            <td>{new Date(row.fecha).toLocaleDateString('es-PY')}</td>
                                            <td style={{ fontSize: '0.85em' }}>{row.concepto}</td>
                                            <td>{row.referencia || '-'}</td>
                                            <td style={{ textAlign: 'right', color: '#16a34a' }}>
                                                {row.tipo === 'INGRESO' ? `Gs. ${Math.round(row.monto).toLocaleString('es-PY')}` : '-'}
                                            </td>
                                            <td style={{ textAlign: 'right', color: '#dc2626' }}>
                                                {row.tipo === 'EGRESO' ? `Gs. ${Math.round(row.monto).toLocaleString('es-PY')}` : '-'}
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                                Gs. {Math.round(row.saldo_acumulado).toLocaleString('es-PY')}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No hay movimientos en este periodo para esta cuenta.</td>
                                    </tr>
                                )}
                            </tbody>
                            {datosExtracto?.movimientos?.length > 0 && (
                                <tfoot>
                                    <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                                        <td colSpan="3" style={{ textAlign: 'right' }}>TOTAL DEL PERIODO:</td>
                                        <td style={{ textAlign: 'right', color: '#16a34a' }}>
                                            Gs. {Math.round(datosExtracto.movimientos.filter(m => m.tipo === 'INGRESO').reduce((acc, curr) => acc + curr.monto, 0)).toLocaleString('es-PY')}
                                        </td>
                                        <td style={{ textAlign: 'right', color: '#dc2626' }}>
                                            Gs. {Math.round(datosExtracto.movimientos.filter(m => m.tipo === 'EGRESO').reduce((acc, curr) => acc + curr.monto, 0)).toLocaleString('es-PY')}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            Gs. {Math.round(datosExtracto.saldo_final).toLocaleString('es-PY')}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                ) : (
                    <table className="reporte-table formal-table">
                        <thead>
                            <tr>
                                <th>VEHÍCULO</th>
                                <th>CHASIS</th>
                                <th>COLOR</th>
                                <th>UBICACIÓN</th>
                                <th style={{ textAlign: 'center' }}>DÍAS EN STOCK</th>
                                <th style={{ textAlign: 'right' }}>PRECIO CONTADO</th>
                                <th style={{ textAlign: 'right' }}>PRECIO FINANCIADO</th>
                                <th style={{ background: '#fef3c7', textAlign: 'right' }}>ENTREGA INICIAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {datos.length > 0 ? (
                                datos.map((row, index) => (
                                    <tr key={index}>
                                        <td>
                                            <strong>{row.marca} {row.modelo}</strong><br />
                                            <span style={{ fontSize: '0.80em', color: '#000' }}>Año: {row.año} {row.motor ? `Motor: ${row.motor}` : ''}</span>
                                        </td>
                                        <td style={{ fontFamily: 'monospace' }}>{row.chasis || '-'}</td>
                                        <td>{row.color || '-'}</td>
                                        <td>{row.ubicacion_actual || 'Playa Principal'}</td>
                                        <td style={{ textAlign: 'center' }}>{row.dias_en_stock ?? '-'}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            {row.precio_contado_sugerido && !isNaN(row.precio_contado_sugerido)
                                                ? Math.round(parseFloat(row.precio_contado_sugerido)).toLocaleString('es-PY')
                                                : '-'}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            {row.precio_financiado_sugerido && !isNaN(row.precio_financiado_sugerido)
                                                ? Math.round(parseFloat(row.precio_financiado_sugerido)).toLocaleString('es-PY')
                                                : '-'}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                            {row.entrega_inicial_sugerida && !isNaN(row.entrega_inicial_sugerida)
                                                ? Math.round(parseFloat(row.entrega_inicial_sugerida)).toLocaleString('es-PY')
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
        </div >
    );
};

export default ReportesPlaya;
