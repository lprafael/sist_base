import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DashboardPlaya.css';

const DashboardPlaya = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('resumen'); // resumen, ventas, cartera, gastos
    const [gastosFiltrados, setGastosFiltrados] = useState(null);
    const [loadingGastos, setLoadingGastos] = useState(false);
    const [ventasFiltradas, setVentasFiltradas] = useState(null);

    // Filtros para gastos
    const [tipoGasto, setTipoGasto] = useState('ambos'); // 'empresa', 'vehiculo', 'ambos'
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [mesSeleccionado, setMesSeleccionado] = useState(''); // Formato: 'YYYY-MM'

    const API_URL = import.meta.env.VITE_REACT_APP_API_URL || '/api';

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(`${API_URL}/playa/dashboard/stats`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStats(response.data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    // Efecto para manejar la selección de mes
    useEffect(() => {
        if (mesSeleccionado) {
            // Calcular primer y último día del mes seleccionado
            const [year, month] = mesSeleccionado.split('-');
            const primerDia = `${year}-${month}-01`;
            const ultimoDia = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
            setFechaDesde(primerDia);
            setFechaHasta(ultimoDia);
        }
    }, [mesSeleccionado]);

    // Fetch gastos filtrados cuando cambian los filtros o se activa la pestaña de gastos
    useEffect(() => {
        if (activeTab === 'gastos') {
            fetchGastosFiltrados();
            // Si hay filtros de fecha, también obtener ventas filtradas
            if (fechaDesde || fechaHasta) {
                fetchVentasFiltradas();
            } else {
                // Si no hay filtros, resetear ventas filtradas
                setVentasFiltradas(null);
            }
        }
    }, [activeTab, tipoGasto, fechaDesde, fechaHasta]);

    const fetchGastosFiltrados = async () => {
        setLoadingGastos(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            if (tipoGasto) params.append('tipo_gasto', tipoGasto);
            if (fechaDesde) params.append('fecha_desde', fechaDesde);
            if (fechaHasta) params.append('fecha_hasta', fechaHasta);

            const response = await axios.get(`${API_URL}/playa/dashboard/gastos-filtrados?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setGastosFiltrados(response.data);
            setLoadingGastos(false);
        } catch (error) {
            console.error('Error fetching gastos filtrados:', error);
            setLoadingGastos(false);
        }
    };

    const fetchVentasFiltradas = async () => {
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            if (fechaDesde) params.append('fecha_desde', fechaDesde);
            if (fechaHasta) params.append('fecha_hasta', fechaHasta);

            const response = await axios.get(`${API_URL}/playa/dashboard/ventas-filtradas?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setVentasFiltradas(response.data);
        } catch (error) {
            console.error('Error fetching ventas filtradas:', error);
            setVentasFiltradas(null);
        }
    };

    const generateGastosPDF = (gastosData, tipoGastoFilter, fechaDesdeFilter, fechaHastaFilter) => {
        if (!gastosData || !gastosData.gastos || gastosData.gastos.length === 0) {
            alert('No hay gastos para generar el reporte');
            return;
        }

        // Preparar datos
        const gastosEmpresa = gastosData.gastos_empresa || [];
        const gastosVehiculo = gastosData.gastos_vehiculo || [];
        const detallesEmpresa = gastosData.detalles_empresa || [];
        const detallesVehiculo = gastosData.detalles_vehiculo || [];

        // Información de filtros
        const filtrosTexto = [];
        if (tipoGastoFilter) {
            const tipoTexto = tipoGastoFilter === 'empresa' ? 'Solo Empresa' :
                tipoGastoFilter === 'vehiculo' ? 'Solo Vehículo' : 'Ambos (Empresa + Vehículo)';
            filtrosTexto.push(`Tipo: ${tipoTexto}`);
        }
        if (fechaDesdeFilter) filtrosTexto.push(`Desde: ${new Date(fechaDesdeFilter).toLocaleDateString('es-PY')}`);
        if (fechaHastaFilter) filtrosTexto.push(`Hasta: ${new Date(fechaHastaFilter).toLocaleDateString('es-PY')}`);

        // Función para agrupar detalles por tipo
        const agruparDetallesPorTipo = (detalles) => {
            const agrupados = {};
            detalles.forEach(detalle => {
                if (!agrupados[detalle.tipo_nombre]) {
                    agrupados[detalle.tipo_nombre] = [];
                }
                agrupados[detalle.tipo_nombre].push(detalle);
            });
            return agrupados;
        };

        const detallesEmpresaPorTipo = agruparDetallesPorTipo(detallesEmpresa);
        const detallesVehiculoPorTipo = agruparDetallesPorTipo(detallesVehiculo);

        // Generar HTML
        const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte Detallado de Gastos</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 20px;
            background: #f8fafc;
            color: #1e293b;
        }
        .header {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            gap: 30px;
        }
        .header-logo {
            max-width: 250px;
            width: auto;
            height: auto;
            object-fit: contain;
            flex-shrink: 0;
        }
        .header-content {
            flex: 1;
        }
        .header h1 {
            font-size: 24px;
            margin-bottom: 10px;
        }
        .filtros {
            font-size: 14px;
            opacity: 0.9;
            margin-top: 10px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .section {
            background: white;
            padding: 25px;
            border-radius: 12px;
            margin-bottom: 25px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .section-title {
            font-size: 18px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e2e8f0;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 25px;
        }
        .summary-card {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #2563eb;
        }
        .summary-card label {
            display: block;
            font-size: 12px;
            color: #64748b;
            margin-bottom: 5px;
            text-transform: uppercase;
            font-weight: 600;
        }
        .summary-card .value {
            font-size: 20px;
            font-weight: 800;
            color: #1e293b;
        }
        .gasto-item {
            padding: 15px;
            margin-bottom: 15px;
            background: #f8fafc;
            border-radius: 8px;
            border-left: 4px solid #8b5cf6;
        }
        .gasto-item.vehiculo {
            border-left-color: #f59e0b;
        }
        .gasto-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .gasto-nombre {
            font-weight: 700;
            font-size: 16px;
            color: #1e293b;
        }
        .gasto-total {
            font-weight: 700;
            font-size: 16px;
            color: #2563eb;
        }
        .gasto-porcentaje {
            font-size: 12px;
            color: #64748b;
        }
        .detalle-tipo {
            margin-top: 25px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
        }
        .detalle-tipo-title {
            font-size: 14px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 15px;
        }
        .detalle-item {
            background: white;
            padding: 12px;
            margin-bottom: 10px;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
        }
        .detalle-item-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
        }
        .detalle-label {
            font-weight: 600;
            color: #64748b;
            font-size: 13px;
        }
        .detalle-value {
            color: #1e293b;
            font-size: 13px;
        }
        .detalle-descripcion {
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid #f1f5f9;
            color: #475569;
            font-size: 13px;
            line-height: 1.5;
        }
        .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2563eb;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            z-index: 1000;
        }
        .print-button:hover {
            background: #1d4ed8;
        }
        @media print {
            body {
                background: white;
                padding: 0;
            }
            .print-button {
                display: none;
            }
            .section {
                page-break-inside: avoid;
                box-shadow: none;
                border: 1px solid #e2e8f0;
            }
        }
    </style>
</head>
<body>
    <button class="print-button" onclick="window.print()">🖨️ Imprimir</button>
    
    <div class="container">
        <div class="header">
            <img src="/imágenes/Logo_actualizado2.png" alt="Peralta Automotores" class="header-logo" />
            <div class="header-content">
                <h1>REPORTE DETALLADO DE GASTOS</h1>
                ${filtrosTexto.length > 0 ? `<div class="filtros">Filtros aplicados: ${filtrosTexto.join(' | ')}</div>` : ''}
                <div class="filtros">Generado el ${new Date().toLocaleDateString('es-PY', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">RESUMEN DE TOTALES</div>
            <div class="summary-grid">
                ${tipoGastoFilter !== 'vehiculo' ? `
                <div class="summary-card">
                    <label>Total Gastos de Empresa</label>
                    <div class="value">Gs. ${Math.round(gastosData.total_empresa).toLocaleString('es-PY')}</div>
                </div>
                ` : ''}
                ${tipoGastoFilter !== 'empresa' ? `
                <div class="summary-card">
                    <label>Total Gastos de Vehículo</label>
                    <div class="value">Gs. ${Math.round(gastosData.total_vehiculo).toLocaleString('es-PY')}</div>
                </div>
                ` : ''}
                <div class="summary-card" style="border-left-color: #10b981;">
                    <label>Total General</label>
                    <div class="value">Gs. ${Math.round(gastosData.total_general).toLocaleString('es-PY')}</div>
                </div>
            </div>
        </div>

        ${gastosEmpresa.length > 0 ? `
        <div class="section">
            <div class="section-title">GASTOS DE EMPRESA</div>
            ${gastosEmpresa.map((gasto, index) => {
            const porcentaje = (gasto.total / (gastosData.total_empresa || 1)) * 100;
            return `
                <div class="gasto-item">
                    <div class="gasto-header">
                        <div class="gasto-nombre">${index + 1}. ${gasto.nombre}</div>
                        <div class="gasto-total">Gs. ${Math.round(gasto.total).toLocaleString('es-PY')}</div>
                    </div>
                    <div class="gasto-porcentaje">${porcentaje.toFixed(2)}% del total de gastos de empresa</div>
                </div>
                `;
        }).join('')}

            ${detallesEmpresa.length > 0 ? `
            <div style="margin-top: 30px;">
                <div class="section-title" style="font-size: 16px;">DETALLE INDIVIDUAL DE GASTOS DE EMPRESA</div>
                ${Object.keys(detallesEmpresaPorTipo).map(tipoNombre => `
                    <div class="detalle-tipo">
                        <div class="detalle-tipo-title">Tipo: ${tipoNombre}</div>
                        ${detallesEmpresaPorTipo[tipoNombre].map((detalle, idx) => {
            const fechaFormateada = detalle.fecha_gasto
                ? new Date(detalle.fecha_gasto).toLocaleDateString('es-PY')
                : 'Sin fecha';
            return `
                            <div class="detalle-item">
                                <div class="detalle-item-row">
                                    <span class="detalle-label">${idx + 1}. Fecha:</span>
                                    <span class="detalle-value">${fechaFormateada}</span>
                                </div>
                                <div class="detalle-item-row">
                                    <span class="detalle-label">Monto:</span>
                                    <span class="detalle-value" style="font-weight: 700; color: #2563eb;">Gs. ${Math.round(detalle.monto).toLocaleString('es-PY')}</span>
                                </div>
                                ${detalle.descripcion ? `
                                <div class="detalle-descripcion">
                                    <strong>Descripción:</strong> ${detalle.descripcion}
                                </div>
                                ` : ''}
                            </div>
                            `;
        }).join('')}
                    </div>
                `).join('')}
            </div>
            ` : ''}
        </div>
        ` : ''}

        ${gastosVehiculo.length > 0 ? `
        <div class="section">
            <div class="section-title">GASTOS DE VEHÍCULO</div>
            ${gastosVehiculo.map((gasto, index) => {
            const porcentaje = (gasto.total / (gastosData.total_vehiculo || 1)) * 100;
            return `
                <div class="gasto-item vehiculo">
                    <div class="gasto-header">
                        <div class="gasto-nombre">${index + 1}. ${gasto.nombre}</div>
                        <div class="gasto-total">Gs. ${Math.round(gasto.total).toLocaleString('es-PY')}</div>
                    </div>
                    <div class="gasto-porcentaje">${porcentaje.toFixed(2)}% del total de gastos de vehículo</div>
                </div>
                `;
        }).join('')}

            ${detallesVehiculo.length > 0 ? `
            <div style="margin-top: 30px;">
                <div class="section-title" style="font-size: 16px;">DETALLE INDIVIDUAL DE GASTOS DE VEHÍCULO</div>
                ${Object.keys(detallesVehiculoPorTipo).map(tipoNombre => `
                    <div class="detalle-tipo">
                        <div class="detalle-tipo-title">Tipo: ${tipoNombre}</div>
                        ${detallesVehiculoPorTipo[tipoNombre].map((detalle, idx) => {
            const fechaFormateada = detalle.fecha_gasto
                ? new Date(detalle.fecha_gasto).toLocaleDateString('es-PY')
                : 'Sin fecha';
            return `
                            <div class="detalle-item">
                                <div class="detalle-item-row">
                                    <span class="detalle-label">${idx + 1}. Fecha:</span>
                                    <span class="detalle-value">${fechaFormateada}</span>
                                </div>
                                <div class="detalle-item-row">
                                    <span class="detalle-label">Monto:</span>
                                    <span class="detalle-value" style="font-weight: 700; color: #f59e0b;">Gs. ${Math.round(detalle.monto).toLocaleString('es-PY')}</span>
                                </div>
                                ${detalle.descripcion ? `
                                <div class="detalle-descripcion">
                                    <strong>Descripción:</strong> ${detalle.descripcion}
                                </div>
                                ` : ''}
                            </div>
                            `;
        }).join('')}
                    </div>
                `).join('')}
            </div>
            ` : ''}
        </div>
        ` : ''}
    </div>
</body>
</html>
        `;

        // Abrir nueva ventana con el HTML
        const newWindow = window.open('', '_blank');
        newWindow.document.write(htmlContent);
        newWindow.document.close();
    };

    if (loading) return <div className="loading">Cargando métricas de negocio...</div>;
    if (!stats) return <div className="error">No se pudieron cargar las estadísticas.</div>;

    const renderResumenGeneral = () => (
        <>
            {/* Primera Fila: Operatividad y Ganancia */}
            <div className="stats-row">
                <div className="stat-card primary">
                    <div className="stat-icon">🏎️</div>
                    <div className="stat-info">
                        <h3>Valor del Stock Actual</h3>
                        <p className="stat-value">Gs. {Math.round(parseFloat(stats.valor_stock_actual)).toLocaleString('es-PY')}</p>
                        <span className="stat-detail">{stats.cant_disponibles} vehículos en playa</span>
                    </div>
                </div>

                <div className="stat-card success">
                    <div className="stat-icon">💰</div>
                    <div className="stat-info">
                        <h3>Ventas Acumuladas</h3>
                        <p className="stat-value">Gs. {Math.round(parseFloat(stats.total_ventas_acumuladas)).toLocaleString('es-PY')}</p>
                        <span className="stat-detail">{stats.cant_vendidos} {stats.cant_vendidos === 1 ? 'contrato realizado' : 'contratos realizados'}</span>
                    </div>
                </div>

                <div className="stat-card info">
                    <div className="stat-icon">📈</div>
                    <div className="stat-info">
                        <h3>Utilidad Proyectada</h3>
                        <p className="stat-value">Gs. {Math.round(parseFloat(stats.utilidad_proyectada)).toLocaleString('es-PY')}</p>
                        <span className="stat-detail">Ganancia neta (Venta - Gastos de Vehículo)</span>
                    </div>
                </div>
            </div>

            {/* Segunda Fila: Cartera y Gastos Operativos */}
            <div className="stats-row" style={{ marginTop: '20px' }}>
                <div className="stat-card warning">
                    <div className="stat-icon">📄</div>
                    <div className="stat-info">
                        <h3>Cartera Total</h3>
                        <p className="stat-value">Gs. {Math.round(parseFloat(stats.cartera_pendiente)).toLocaleString('es-PY')}</p>
                        <span className="stat-detail">Pendiente de cobro</span>
                    </div>
                </div>

                <div className="stat-card danger">
                    <div className="stat-icon">🚨</div>
                    <div className="stat-info">
                        <h3>Cartera en Mora</h3>
                        <p className="stat-value">Gs. {Math.round(parseFloat(stats.cartera_mora)).toLocaleString('es-PY')}</p>
                        <span className="stat-detail">Pagarés vencidos</span>
                    </div>
                </div>

                <div className="stat-card purple">
                    <div className="stat-icon">🏢</div>
                    <div className="stat-info">
                        <h3>Gastos de Empresa</h3>
                        <p className="stat-value">Gs. {Math.round(parseFloat(stats.total_gastos_empresa)).toLocaleString('es-PY')}</p>
                        <span className="stat-detail">Alquiler, personal, servicios, etc.</span>
                    </div>
                </div>
            </div>

            <div className="dashboard-charts-placeholder">
                <div className="chart-box">
                    <h4>Estado de la Playa</h4>
                    <div className="mini-chart">
                        <div className="chart-item">
                            <label>Disponibles</label>
                            <div className="bar-bg"><div className="bar-fill" style={{ width: `${(stats.cant_disponibles / (stats.cant_disponibles + stats.cant_vendidos || 1)) * 100}%` }}></div></div>
                            <span>{stats.cant_disponibles}</span>
                        </div>
                        <div className="chart-item">
                            <label>Vendidos</label>
                            <div className="bar-bg"><div className="bar-fill sold" style={{ width: `${(stats.cant_vendidos / (stats.cant_disponibles + stats.cant_vendidos || 1)) * 100}%` }}></div></div>
                            <span>{stats.cant_vendidos}</span>
                        </div>
                    </div>
                </div>

                <div className="welcome-message">
                    <h4>Información de Utilidad</h4>
                    <p>La <strong>Utilidad Proyectada</strong> se calcula restando el Costo Base y los Gastos Directos de cada vehículo vendido a su Precio de Venta. Los <strong>Gastos de Empresa</strong> son costos fijos y variables del local que no se imputan a un vehículo específico.</p>
                </div>
            </div>
        </>
    );

    const renderVentasUtilidad = () => (
        <div className="tab-reports-grid">
            <div className="report-card">
                <h4>Ventas Mensuales (Últimos 6 meses)</h4>
                <div className="bar-chart-container">
                    {stats.ventas_mensuales.map((m, idx) => (
                        <div key={idx} className="bar-wrapper">
                            <div className="bar-value">Gs. {(m.total / 1000000).toFixed(1)}M</div>
                            <div
                                className="bar-fill-vertical"
                                style={{ height: `${(m.total / (Math.max(...stats.ventas_mensuales.map(v => v.total)) || 1)) * 150}px` }}
                            ></div>
                            <div className="bar-label">{m.mes}</div>
                        </div>
                    ))}
                    {stats.ventas_mensuales.length === 0 && <p className="text-muted">Sin datos de ventas.</p>}
                </div>
            </div>

            <div className="report-card">
                <h4>Ventas por Categoría</h4>
                <div className="category-list">
                    {stats.ventas_por_categoria.map((c, idx) => (
                        <div key={idx} className="category-item">
                            <div className="cat-header">
                                <span>{c.nombre}</span>
                                <span>{c.cantidad} unidades</span>
                            </div>
                            <div className="cat-bar-bg">
                                <div
                                    className="cat-bar-fill"
                                    style={{ width: `${(c.total / (stats.total_ventas_acumuladas || 1)) * 100}%` }}
                                ></div>
                            </div>
                            <div className="cat-footer">
                                Gs. {Math.round(c.total).toLocaleString('es-PY')}
                            </div>
                        </div>
                    ))}
                    {stats.ventas_por_categoria.length === 0 && <p className="text-muted">Sin categorías registradas.</p>}
                </div>
            </div>
        </div>
    );

    const renderCarteraMora = () => (
        <div className="tab-reports-grid">
            <div className="report-card">
                <h4>Distribución de Cartera</h4>
                <div className="aging-cartera">
                    {Object.entries(stats.cartera_por_vencimiento).map(([rango, monto], idx) => (
                        <div key={idx} className="aging-item">
                            <div className="aging-info">
                                <span className="aging-label">{rango}</span>
                                <span className="aging-amount">Gs. {Math.round(monto).toLocaleString('es-PY')}</span>
                            </div>
                            <div className="cat-bar-bg">
                                <div
                                    className={`cat-bar-fill ${rango === 'Al día' ? 'success' : rango === '61+ días' ? 'danger' : 'warning'}`}
                                    style={{ width: `${(monto / (stats.cartera_pendiente || 1)) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="report-card summary-card">
                <h4>Resumen de Cartera</h4>
                <div className="mini-stats-grid">
                    <div className="mini-stat">
                        <label>Total Pendiente</label>
                        <p>Gs. {Math.round(stats.cartera_pendiente).toLocaleString('es-PY')}</p>
                    </div>
                    <div className="mini-stat">
                        <label>En Mora</label>
                        <p className="text-danger">Gs. {Math.round(stats.cartera_mora).toLocaleString('es-PY')}</p>
                    </div>
                </div>
                <div className="balance-info">
                    <p>El <strong>{(stats.cartera_mora / (stats.cartera_pendiente || 1) * 100).toFixed(1)}%</strong> de la cartera se encuentra actualmente en mora.</p>
                </div>
            </div>
        </div>
    );

    const renderGastosEmpresa = () => {
        const gastos = gastosFiltrados?.gastos || [];
        const totalGeneral = gastosFiltrados?.total_general || 0;
        const totalEmpresa = gastosFiltrados?.total_empresa || 0;
        const totalVehiculo = gastosFiltrados?.total_vehiculo || 0;

        // Usar ingresos filtrados si hay filtros de fecha, sino usar el total acumulado
        // Los ingresos incluyen: ventas + cobros de pagarés
        const totalIngresosParaBalance = (fechaDesde || fechaHasta) && ventasFiltradas
            ? ventasFiltradas.total_ingresos || (ventasFiltradas.total_ventas + ventasFiltradas.total_cobros_pagares)
            : stats.total_ventas_acumuladas;

        // Para mostrar el desglose cuando hay filtros
        const totalVentasPeriodo = (fechaDesde || fechaHasta) && ventasFiltradas
            ? ventasFiltradas.total_ventas
            : null;
        const totalCobrosPeriodo = (fechaDesde || fechaHasta) && ventasFiltradas
            ? ventasFiltradas.total_cobros_pagares || 0
            : null;

        return (
            <div>
                {/* Filtros */}
                <div className="gastos-filters-container">
                    <div className="filter-group">
                        <label>Tipo de Gasto:</label>
                        <select
                            value={tipoGasto}
                            onChange={(e) => setTipoGasto(e.target.value)}
                            className="filter-select"
                        >
                            <option value="ambos">Ambos (Empresa + Vehículo)</option>
                            <option value="empresa">Solo Empresa</option>
                            <option value="vehiculo">Solo Vehículo</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Seleccionar Mes:</label>
                        <input
                            type="month"
                            value={mesSeleccionado}
                            onChange={(e) => {
                                setMesSeleccionado(e.target.value);
                            }}
                            className="filter-input"
                        />
                    </div>
                    <div className="filter-group">
                        <label>Fecha Desde:</label>
                        <input
                            type="date"
                            value={fechaDesde}
                            onChange={(e) => {
                                setFechaDesde(e.target.value);
                                setMesSeleccionado(''); // Limpiar mes cuando se cambia fecha manualmente
                            }}
                            className="filter-input"
                            disabled={!!mesSeleccionado}
                        />
                    </div>
                    <div className="filter-group">
                        <label>Fecha Hasta:</label>
                        <input
                            type="date"
                            value={fechaHasta}
                            onChange={(e) => {
                                setFechaHasta(e.target.value);
                                setMesSeleccionado(''); // Limpiar mes cuando se cambia fecha manualmente
                            }}
                            className="filter-input"
                            disabled={!!mesSeleccionado}
                        />
                    </div>
                    <div className="filter-group">
                        <button
                            onClick={() => {
                                setFechaDesde('');
                                setFechaHasta('');
                                setMesSeleccionado('');
                                setTipoGasto('ambos');
                                setVentasFiltradas(null);
                            }}
                            className="btn-clear-filters"
                        >
                            Limpiar Filtros
                        </button>
                    </div>
                </div>

                {/* Resumen de Totales */}
                <div className="gastos-summary-cards">
                    <div className="summary-card-item">
                        <h5>Total General</h5>
                        <p className="summary-value">Gs. {Math.round(totalGeneral).toLocaleString('es-PY')}</p>
                    </div>
                    {tipoGasto !== 'vehiculo' && (
                        <div className="summary-card-item">
                            <h5>Gastos de Empresa</h5>
                            <p className="summary-value">Gs. {Math.round(totalEmpresa).toLocaleString('es-PY')}</p>
                        </div>
                    )}
                    {tipoGasto !== 'empresa' && (
                        <div className="summary-card-item">
                            <h5>Gastos de Vehículo</h5>
                            <p className="summary-value">Gs. {Math.round(totalVehiculo).toLocaleString('es-PY')}</p>
                        </div>
                    )}
                </div>

                {loadingGastos ? (
                    <div className="loading">Cargando gastos...</div>
                ) : (
                    <div className="tab-reports-grid">
                        <div className="report-card">
                            <div className="report-card-header">
                                <h4>Distribución de Gastos</h4>
                                <button
                                    onClick={() => generateGastosPDF(gastosFiltrados, tipoGasto, fechaDesde, fechaHasta)}
                                    className="btn-generar-detalle"
                                    disabled={!gastosFiltrados || gastos.length === 0}
                                >
                                    📄 Generar Detalle
                                </button>
                            </div>
                            <div className="category-list">
                                {gastos.map((g, idx) => (
                                    <div key={idx} className="category-item">
                                        <div className="cat-header">
                                            <span>
                                                {g.nombre}
                                                <span className="gasto-tipo-badge" style={{
                                                    backgroundColor: g.tipo === 'empresa' ? '#e0e7ff' : '#fef3c7',
                                                    color: g.tipo === 'empresa' ? '#4338ca' : '#92400e',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.75rem',
                                                    marginLeft: '8px'
                                                }}>
                                                    {g.tipo === 'empresa' ? 'Empresa' : 'Vehículo'}
                                                </span>
                                            </span>
                                            <span>Gs. {Math.round(g.total).toLocaleString('es-PY')}</span>
                                        </div>
                                        <div className="cat-bar-bg">
                                            <div
                                                className={`cat-bar-fill ${g.tipo === 'empresa' ? 'purple' : 'yellow'}`}
                                                style={{ width: `${(g.total / (totalGeneral || 1)) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                                {gastos.length === 0 && <p className="text-muted">No hay gastos registrados con los filtros seleccionados.</p>}
                            </div>
                        </div>

                        <div className="report-card">
                            <h4>Balance Operativo</h4>
                            {(fechaDesde || fechaHasta) && (
                                <div style={{ marginBottom: '10px', fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>
                                    {fechaDesde && fechaHasta
                                        ? `Período: ${new Date(fechaDesde).toLocaleDateString('es-PY')} - ${new Date(fechaHasta).toLocaleDateString('es-PY')}`
                                        : fechaDesde
                                            ? `Desde: ${new Date(fechaDesde).toLocaleDateString('es-PY')}`
                                            : `Hasta: ${new Date(fechaHasta).toLocaleDateString('es-PY')}`
                                    }
                                </div>
                            )}
                            <div className="balance-chart">
                                <div className="balance-item">
                                    <label>Ingresos {totalCobrosPeriodo !== null ? '(Ventas + Cobros)' : '(Ventas)'}</label>
                                    {totalCobrosPeriodo !== null && totalCobrosPeriodo > 0 && (
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '5px' }}>
                                            Ventas: Gs. {Math.round(totalVentasPeriodo || 0).toLocaleString('es-PY')} |
                                            Cobros: Gs. {Math.round(totalCobrosPeriodo).toLocaleString('es-PY')}
                                        </div>
                                    )}
                                    <div className="balance-bar-bg">
                                        <div className="balance-bar-fill income" style={{ width: '100%' }}></div>
                                    </div>
                                    <span>Gs. {Math.round(totalIngresosParaBalance).toLocaleString('es-PY')}</span>
                                </div>
                                <div className="balance-item">
                                    <label>Gastos {tipoGasto === 'empresa' ? 'de Empresa' : tipoGasto === 'vehiculo' ? 'de Vehículo' : 'Totales'}</label>
                                    <div className="balance-bar-bg">
                                        <div className="balance-bar-fill expense" style={{ width: `${(totalGeneral / (totalIngresosParaBalance || 1)) * 100}%` }}></div>
                                    </div>
                                    <span>Gs. {Math.round(totalGeneral).toLocaleString('es-PY')}</span>
                                </div>
                            </div>
                            <div className="balance-summary">
                                <p>Relación Gasto/Ingreso: <strong>{(totalGeneral / (totalIngresosParaBalance || 1) * 100).toFixed(1)}%</strong></p>
                                {totalIngresosParaBalance > 0 && (
                                    <p style={{ marginTop: '8px', fontSize: '0.9rem' }}>
                                        Balance Neto: <strong style={{ color: (totalIngresosParaBalance - totalGeneral) >= 0 ? '#10b981' : '#ef4444' }}>
                                            Gs. {Math.round(totalIngresosParaBalance - totalGeneral).toLocaleString('es-PY')}
                                        </strong>
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'resumen': return renderResumenGeneral();
            case 'ventas': return renderVentasUtilidad();
            case 'cartera': return renderCarteraMora();
            case 'gastos': return renderGastosEmpresa();
            default: return renderResumenGeneral();
        }
    };

    return (
        <div className="dashboard-playa">
            <div className="dashboard-header-with-tabs">
                <h2 className="dashboard-title">Dashboard del Negocio</h2>
                <div className="dashboard-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'resumen' ? 'active' : ''}`}
                        onClick={() => setActiveTab('resumen')}
                    >
                        Resumen General
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'ventas' ? 'active' : ''}`}
                        onClick={() => setActiveTab('ventas')}
                    >
                        Ventas & Utilidad
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'cartera' ? 'active' : ''}`}
                        onClick={() => setActiveTab('cartera')}
                    >
                        Cartera & Mora
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'gastos' ? 'active' : ''}`}
                        onClick={() => setActiveTab('gastos')}
                    >
                        Gastos Empresa
                    </button>
                </div>
            </div>

            <div className="dashboard-content-area">
                {renderContent()}
            </div>
        </div>
    );
};

export default DashboardPlaya;
