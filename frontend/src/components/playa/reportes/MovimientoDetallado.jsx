import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ReportesPlaya.css';

const MovimientoDetallado = () => {
    const [datos, setDatos] = useState([]);
    const [totales, setTotales] = useState({});
    const [cuentas, setCuentas] = useState([]);
    const [idCuentasSeleccionadas, setIdCuentasSeleccionadas] = useState([]);
    const [subcatsSeleccionadas, setSubcatsSeleccionadas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fechaDesde, setFechaDesde] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().split('T')[0]);
    const [filtroTipo, setFiltroTipo] = useState('AMBOS'); // 'AMBOS', 'INGRESO', 'EGRESO'
    const [horaEmision, setHoraEmision] = useState(new Date().toLocaleTimeString('es-PY'));
    const [playaInfo, setPlayaInfo] = useState(null);

    const API_URL = import.meta.env.VITE_REACT_APP_API_URL || '/api';

    const ALL_SUBCATS = [
        { id: 'ENTREGA', label: 'Entregas', tipo: 'INGRESO' },
        { id: 'CUOTA', label: 'Cuotas', tipo: 'INGRESO' },
        { id: 'INTERES', label: 'Intereses', tipo: 'INGRESO' },
        { id: 'OTROS_IN', label: 'Otros (In)', tipo: 'INGRESO' },
        { id: 'GASTO_VEHICULO', label: 'Gasto Veh.', tipo: 'EGRESO' },
        { id: 'GASTO_EMPRESA', label: 'Gasto Emp.', tipo: 'EGRESO' },
        { id: 'OTROS_EG', label: 'Otros (Eg)', tipo: 'EGRESO' },
    ];

    useEffect(() => {
        const fetchPlayaInfo = async () => {
            try {
                const token = sessionStorage.getItem('token');
                const res = await axios.get(`${API_URL}/playa/mi-playa`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setPlayaInfo(res.data);
            } catch (error) {
                console.error('Error fetching playa info:', error);
            }
        };
        fetchPlayaInfo();

        const timer = setInterval(() => {
            setHoraEmision(new Date().toLocaleTimeString('es-PY'));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        fetchCuentas();
    }, []);

    useEffect(() => {
        if (idCuentasSeleccionadas.length > 0) {
            fetchMovimientos();
        }
    }, [JSON.stringify(idCuentasSeleccionadas), JSON.stringify(subcatsSeleccionadas), fechaDesde, fechaHasta, filtroTipo]);

    const fetchCuentas = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.get(`${API_URL}/playa/cuentas`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCuentas(res.data);
            if (res.data.length > 0) {
                setIdCuentasSeleccionadas(res.data.map(c => c.id_cuenta));
            }
        } catch (error) {
            console.error('Error fetching accounts:', error);
        }
    };

    const fetchMovimientos = async () => {
        setLoading(true);
        try {
            const token = sessionStorage.getItem('token');
            const params = new URLSearchParams();
            idCuentasSeleccionadas.forEach(id => params.append('id_cuentas', id));
            subcatsSeleccionadas.forEach(sc => params.append('subcategorias', sc));
            params.append('desde', fechaDesde);
            params.append('hasta', fechaHasta);
            params.append('tipo_filtro', filtroTipo);

            const res = await axios.get(`${API_URL}/playa/reportes/movimiento-detallado?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDatos(res.data.movimientos);
            setTotales(res.data.totales);
        } catch (error) {
            console.error('Error fetching detailed movements:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const toggleSubcat = (id) => {
        if (subcatsSeleccionadas.includes(id)) {
            setSubcatsSeleccionadas(subcatsSeleccionadas.filter(s => s !== id));
        } else {
            setSubcatsSeleccionadas([...subcatsSeleccionadas, id]);
        }
    };

    return (
        <div className="reportes-container">
            <div className="reportes-header no-print">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%' }}>
                    <div className="reportes-actions" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                        <div className="filter-group multiselect-group">
                            <label>Cuentas ({idCuentasSeleccionadas.length}):</label>
                            <div className="multiselect-chips no-print">
                                {cuentas.map(c => (
                                    <label key={c.id_cuenta} className={`chip-item ${idCuentasSeleccionadas.includes(c.id_cuenta) ? 'selected' : ''}`}>
                                        <input
                                            type="checkbox"
                                            checked={idCuentasSeleccionadas.includes(c.id_cuenta)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setIdCuentasSeleccionadas([...idCuentasSeleccionadas, c.id_cuenta]);
                                                } else {
                                                    setIdCuentasSeleccionadas(idCuentasSeleccionadas.filter(id => id !== c.id_cuenta));
                                                }
                                            }}
                                        />
                                        {c.nombre}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="filter-group multiselect-group" style={{ marginTop: '10px' }}>
                            <label>Subcategorías ({subcatsSeleccionadas.length || 'Todas'}):</label>
                            <div className="multiselect-chips no-print">
                                {ALL_SUBCATS.map(sc => (
                                    <label key={sc.id} className={`chip-item subcat-chip ${subcatsSeleccionadas.includes(sc.id) ? 'selected' : ''}`} 
                                        style={{ backgroundColor: sc.tipo === 'INGRESO' ? '#f0fdf4' : '#fef2f2' }}>
                                        <input
                                            type="checkbox"
                                            checked={subcatsSeleccionadas.includes(sc.id)}
                                            onChange={() => toggleSubcat(sc.id)}
                                        />
                                        {sc.label}
                                    </label>
                                ))}
                                {subcatsSeleccionadas.length > 0 && (
                                    <button className="btn-clear-filters" onClick={() => setSubcatsSeleccionadas([])} 
                                        style={{ marginLeft: '10px', fontSize: '0.75rem', padding: '2px 8px' }}>
                                        Limpiar
                                    </button>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '15px', marginTop: '10px', width: '100%', alignItems: 'center' }}>
                            <div className="filter-group">
                                <label>Desde:</label>
                                <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="date-input" />
                            </div>
                            <div className="filter-group">
                                <label>Hasta:</label>
                                <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="date-input" />
                            </div>
                            <div className="filter-group">
                                <label>Tipo Filtro:</label>
                                <select className="date-input" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                                    <option value="AMBOS">Todos</option>
                                    <option value="INGRESO">Solo Ingresos</option>
                                    <option value="EGRESO">Solo Egresos</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
                                <button className="btn-refresh" onClick={fetchMovimientos} disabled={loading}>🔄 Actualizar</button>
                                <button className="btn-print" onClick={handlePrint}>🖨️ Imprimir</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="reporte-content printable-area" style={{ maxWidth: '100%' }}>
                <div className="report-header-formal">
                    <div className="header-left">
                        <img 
                            src={playaInfo?.logo ? 
                                (playaInfo.logo.startsWith('http') ? playaInfo.logo : `${window.location.origin.replace(':3004', ':8001')}${playaInfo.logo}`) 
                                : "/imágenes/Logo_oficial2.jpg"} 
                            alt="Logo" 
                            className="report-logo" 
                            onError={(e) => { e.target.src = "/imágenes/Logo_oficial2.jpg" }}
                        />
                        <div className="company-info">
                            <h2 className="company-name">{playaInfo?.razon_social || playaInfo?.nombre || 'Cargando...'}</h2>
                            <p>{playaInfo?.direccion || ''}</p>
                            <p>RUC: {playaInfo?.ruc || ''}</p>
                            <p>Correo: {playaInfo?.email || ''}</p>
                        </div>
                    </div>
                    <div className="header-right">
                        <p>{new Date().toLocaleDateString('es-PY')}</p>
                        <p>{horaEmision}</p>
                    </div>
                </div>

                <div className="report-title-section">
                    <h1 className="report-title" style={{ fontSize: '1.2rem' }}>
                        EXTRACTO DETALLADO: {fechaDesde} al {fechaHasta}
                    </h1>
                </div>

                {loading ? (
                    <div className="loading">Cargando datos...</div>
                ) : (
                    <>
                        <table className="reporte-table formal-table" style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th style={{ width: '80px' }}>Fecha</th>
                                    <th>Concepto</th>
                                    <th style={{ width: '100px' }}>Cuenta</th>
                                    {/* Columnas Ingresos */}
                                    <th style={{ backgroundColor: '#f0fdf4', textAlign: 'right', width: '90px' }}>Entregas</th>
                                    <th style={{ backgroundColor: '#f0fdf4', textAlign: 'right', width: '90px' }}>Cuotas</th>
                                    <th style={{ backgroundColor: '#f0fdf4', textAlign: 'right', width: '90px' }}>Interés</th>
                                    <th style={{ backgroundColor: '#f0fdf4', textAlign: 'right', width: '90px' }}>Otros (In)</th>
                                    {/* Columnas Egresos */}
                                    <th style={{ backgroundColor: '#fef2f2', textAlign: 'right', width: '90px' }}>Gasto Veh.</th>
                                    <th style={{ backgroundColor: '#fef2f2', textAlign: 'right', width: '90px' }}>Gasto Emp.</th>
                                    <th style={{ backgroundColor: '#fef2f2', textAlign: 'right', width: '90px' }}>Otros (Eg)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {datos.length > 0 ? (
                                    datos.map((row, index) => (
                                        <tr key={index}>
                                            <td style={{ fontSize: '0.75rem' }}>{new Date(row.fecha).toLocaleDateString('es-PY')}</td>
                                            <td style={{ 
                                                fontSize: '0.7rem', 
                                                lineHeight: '1.1',
                                                wordWrap: 'break-word',
                                                overflowWrap: 'break-word',
                                                whiteSpace: 'normal',
                                                padding: '4px'
                                            }}>
                                                {row.concepto}
                                            </td>
                                            <td style={{ fontSize: '0.75rem' }}>{row.cuenta_nom}</td>
                                            {/* Ingresos */}
                                            <td style={{ textAlign: 'right', fontSize: '0.75rem' }}>{row.ingreso_entrega > 0 ? Math.round(row.ingreso_entrega).toLocaleString('es-PY') : '-'}</td>
                                            <td style={{ textAlign: 'right', fontSize: '0.75rem' }}>{row.ingreso_cuota > 0 ? Math.round(row.ingreso_cuota).toLocaleString('es-PY') : '-'}</td>
                                            <td style={{ textAlign: 'right', fontSize: '0.75rem' }}>{row.ingreso_interes > 0 ? Math.round(row.ingreso_interes).toLocaleString('es-PY') : '-'}</td>
                                            <td style={{ textAlign: 'right', fontSize: '0.75rem' }}>{row.ingreso_otros > 0 ? Math.round(row.ingreso_otros).toLocaleString('es-PY') : '-'}</td>
                                            {/* Egresos */}
                                            <td style={{ textAlign: 'right', fontSize: '0.75rem' }}>{row.egreso_vehiculo > 0 ? Math.round(row.egreso_vehiculo).toLocaleString('es-PY') : '-'}</td>
                                            <td style={{ textAlign: 'right', fontSize: '0.75rem' }}>{row.egreso_empresa > 0 ? Math.round(row.egreso_empresa).toLocaleString('es-PY') : '-'}</td>
                                            <td style={{ textAlign: 'right', fontSize: '0.75rem' }}>{row.egreso_otros > 0 ? Math.round(row.egreso_otros).toLocaleString('es-PY') : '-'}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="10" style={{ textAlign: 'center', padding: '20px' }}>Sin movimientos.</td></tr>
                                )}
                            </tbody>
                            <tfoot>
                                <tr style={{ fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
                                    <td colSpan="3" style={{ textAlign: 'right' }}>TOTALES Gs.:</td>
                                    <td style={{ textAlign: 'right' }}>{Math.round(totales.entregas || 0).toLocaleString('es-PY')}</td>
                                    <td style={{ textAlign: 'right' }}>{Math.round(totales.cuotas || 0).toLocaleString('es-PY')}</td>
                                    <td style={{ textAlign: 'right' }}>{Math.round(totales.interes || 0).toLocaleString('es-PY')}</td>
                                    <td style={{ textAlign: 'right' }}>{Math.round(totales.ingreso_otros || 0).toLocaleString('es-PY')}</td>
                                    <td style={{ textAlign: 'right' }}>{Math.round(totales.egreso_vehiculo || 0).toLocaleString('es-PY')}</td>
                                    <td style={{ textAlign: 'right' }}>{Math.round(totales.egreso_empresa || 0).toLocaleString('es-PY')}</td>
                                    <td style={{ textAlign: 'right' }}>{Math.round(totales.egreso_otros || 0).toLocaleString('es-PY')}</td>
                                </tr>
                                <tr style={{ fontWeight: 'bold' }}>
                                    <td colSpan="3" style={{ textAlign: 'right' }}>RESUMEN FINAL:</td>
                                    <td colSpan="4" style={{ textAlign: 'center', backgroundColor: '#dcfce7', color: '#166534' }}>
                                        TOTAL INGRESOS: Gs. {Math.round(totales.total_ingreso || 0).toLocaleString('es-PY')}
                                    </td>
                                    <td colSpan="3" style={{ textAlign: 'center', backgroundColor: '#fee2e2', color: '#991b1b' }}>
                                        TOTAL EGRESOS: Gs. {Math.round(totales.total_egreso || 0).toLocaleString('es-PY')}
                                    </td>
                                </tr>
                                <tr style={{ fontWeight: 'bold' }}>
                                    <td colSpan="3" style={{ textAlign: 'right' }}>SALDO DEL PERIODO:</td>
                                    <td colSpan="7" style={{ textAlign: 'center', fontSize: '1.2rem', backgroundColor: '#f1f5f9' }}>
                                        Gs. {Math.round((totales.total_ingreso || 0) - (totales.total_egreso || 0)).toLocaleString('es-PY')}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </>
                )}
            </div>
        </div>
    );
};

export default MovimientoDetallado;
