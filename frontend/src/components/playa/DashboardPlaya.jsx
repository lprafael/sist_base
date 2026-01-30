import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DashboardPlaya.css';

const DashboardPlaya = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

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

    if (loading) return <div className="loading">Cargando métricas de negocio...</div>;
    if (!stats) return <div className="error">No se pudieron cargar las estadísticas.</div>;

    return (
        <div className="dashboard-playa">
            <h2 className="dashboard-title">Resumen Financiero del Negocio</h2>

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
                        <span className="stat-detail">{stats.cant_vendidos} contratos realizados</span>
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
                            <div className="bar-bg"><div className="bar-fill" style={{ width: `${(stats.cant_disponibles / (stats.cant_disponibles + stats.cant_vendidos)) * 100}%` }}></div></div>
                            <span>{stats.cant_disponibles}</span>
                        </div>
                        <div className="chart-item">
                            <label>Vendidos</label>
                            <div className="bar-bg"><div className="bar-fill sold" style={{ width: `${(stats.cant_vendidos / (stats.cant_disponibles + stats.cant_vendidos)) * 100}%` }}></div></div>
                            <span>{stats.cant_vendidos}</span>
                        </div>
                    </div>
                </div>

                <div className="welcome-message">
                    <h4>Información de Utilidad</h4>
                    <p>La <strong>Utilidad Proyectada</strong> se calcula restando el Costo Base y los Gastos Directos de cada vehículo vendido a su Precio de Venta. Los <strong>Gastos de Empresa</strong> son costos fijos y variables del local que no se imputan a un vehículo específico.</p>
                </div>
            </div>
        </div>
    );
};

export default DashboardPlaya;
