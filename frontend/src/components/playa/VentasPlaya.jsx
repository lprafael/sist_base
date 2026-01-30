import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './VentasPlaya.css';

const VentasPlaya = ({ preselectedVehicleId, setPreselectedVehicleId }) => {
    const [ventas, setVentas] = useState([]);
    const [vehiculos, setVehiculos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const [newVenta, setNewVenta] = useState({
        numero_venta: `VNT-${Date.now()}`,
        id_cliente: '',
        id_producto: '',
        fecha_venta: new Date().toISOString().split('T')[0],
        tipo_venta: 'CONTADO',
        precio_venta: 0,
        descuento: 0,
        precio_final: 0,
        entrega_inicial: 0,
        saldo_financiar: 0,
        cantidad_cuotas: 0,
        monto_cuota: 0
    });

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [vRes, cRes, vntRes] = await Promise.all([
                axios.get(`${API_URL}/playa/vehiculos?available_only=true`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/playa/clientes`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/playa/pagares/pendientes`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            const fetchedVehiculos = vRes.data;
            setVehiculos(fetchedVehiculos);
            setClientes(cRes.data);
            setVentas(vntRes.data);
            setLoading(false);

            // Manejar pre-selección desde inventario
            if (preselectedVehicleId) {
                const v = fetchedVehiculos.find(veh => veh.id_producto === parseInt(preselectedVehicleId));
                if (v) {
                    const precio = parseFloat(v.precio_venta_sugerido);
                    setNewVenta(prev => ({
                        ...prev,
                        id_producto: preselectedVehicleId,
                        precio_venta: precio,
                        precio_final: precio - prev.descuento
                    }));
                    setShowModal(true);
                }
                setPreselectedVehicleId(null);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setLoading(false);
        }
    };

    const handleVehiculoChange = (id) => {
        const v = vehiculos.find(veh => veh.id_producto === parseInt(id));
        if (v) {
            const precio = parseFloat(v.precio_venta_sugerido);
            setNewVenta({
                ...newVenta,
                id_producto: id,
                precio_venta: precio,
                precio_final: precio - newVenta.descuento
            });
        }
    };

    const calculateFinancing = (updatedVenta) => {
        const saldo = updatedVenta.precio_final - updatedVenta.entrega_inicial;
        const cuota = updatedVenta.cantidad_cuotas > 0 ? (saldo / updatedVenta.cantidad_cuotas).toFixed(2) : 0;
        return { ...updatedVenta, saldo_financiar: saldo, monto_cuota: cuota };
    };

    const handleCreateVenta = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/playa/ventas`, newVenta, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowModal(false);
            fetchData();
        } catch (error) {
            alert('Error al realizar venta: ' + (error.response?.data?.detail || error.message));
        }
    };

    return (
        <div className="ventas-container">
            <div className="header-actions">
                <h2>Ventas y Pagarés</h2>
                <button className="btn-primary" onClick={() => setShowModal(true)}>
                    Nueva Venta / Contrato
                </button>
            </div>

            <div className="ventas-grid">
                {ventas.map(v => (
                    <div key={v.id_venta} className="venta-card">
                        <div className="card-header">
                            <span className="vnt-number">{v.numero_venta}</span>
                            <span className="vnt-type">{v.tipo_venta}</span>
                        </div>
                        <div className="card-body">
                            <p><strong>Precio Final:</strong> Gs. {Math.round(parseFloat(v.precio_final)).toLocaleString('es-PY')}</p>
                            {v.tipo_venta === 'FINANCIADO' && (
                                <>
                                    <p><strong>Cuotas:</strong> {v.cantidad_cuotas} de Gs. {Math.round(parseFloat(v.monto_cuota)).toLocaleString('es-PY')}</p>
                                    <div className="pagares-summary">
                                        <strong>Pagarés Generados:</strong>
                                        <ul>
                                            {v.pagares?.map(p => (
                                                <li key={p.id_pagare} className={p.estado.toLowerCase()}>
                                                    Cuota {p.numero_cuota}: {p.fecha_vencimiento} ({p.estado})
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content large">
                        <h3>Nueva Venta de Vehículo</h3>
                        <form onSubmit={handleCreateVenta}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Cliente</label>
                                    <select required value={newVenta.id_cliente} onChange={(e) => setNewVenta({ ...newVenta, id_cliente: e.target.value })}>
                                        <option value="">Seleccione Cliente</option>
                                        {clientes.map(c => <option key={c.id_cliente} value={c.id_cliente}>{c.nombre} {c.apellido}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Vehículo Disponible</label>
                                    <select required value={newVenta.id_producto} onChange={(e) => handleVehiculoChange(e.target.value)}>
                                        <option value="">Seleccione Vehículo</option>
                                        {vehiculos.map(v => <option key={v.id_producto} value={v.id_producto}>{v.marca} {v.modelo} ({v.chasis})</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Tipo de Venta</label>
                                    <select value={newVenta.tipo_venta} onChange={(e) => setNewVenta({ ...newVenta, tipo_venta: e.target.value })}>
                                        <option value="CONTADO">Contado</option>
                                        <option value="FINANCIADO">Financiado</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Precio Venta (Gs.)</label>
                                    <input type="number" readOnly value={newVenta.precio_venta} />
                                </div>
                            </div>

                            {newVenta.tipo_venta === 'FINANCIADO' && (
                                <div className="financing-section">
                                    <h4>Detalle de Financiación</h4>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Entrega Inicial (Gs.)</label>
                                            <input type="number" value={newVenta.entrega_inicial}
                                                onChange={(e) => setNewVenta(calculateFinancing({ ...newVenta, entrega_inicial: parseFloat(e.target.value) || 0 }))} />
                                        </div>
                                        <div className="form-group">
                                            <label>Cant. Cuotas</label>
                                            <input type="number" value={newVenta.cantidad_cuotas}
                                                onChange={(e) => setNewVenta(calculateFinancing({ ...newVenta, cantidad_cuotas: parseInt(e.target.value) || 0 }))} />
                                        </div>
                                        <div className="form-group">
                                            <label>Monto Cuota Est.</label>
                                            <input type="number" readOnly value={newVenta.monto_cuota} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-save">Confirmar Venta y Generar Pagarés</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VentasPlaya;
