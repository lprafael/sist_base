import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './VentasPlaya.css';

const VentasPlaya = ({ preselectedVehicleId, setPreselectedVehicleId }) => {
    const [ventas, setVentas] = useState([]);
    const [vehiculos, setVehiculos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingVenta, setEditingVenta] = useState(null);

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
                axios.get(`${API_URL}/playa/ventas`, { headers: { Authorization: `Bearer ${token}` } })
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

    const handleAnularVenta = async (ventaId) => {
        if (!confirm('¿Desea anular esta venta? Se eliminarán los pagarés asociados si no existen pagos.')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/playa/ventas/${ventaId}/anular`, null, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch (error) {
            alert('Error al anular venta: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleEditVenta = async (venta) => {
        setEditingVenta(venta);

        const vehiculoId = parseInt(venta.id_producto);
        if (!vehiculos.find(v => v.id_producto === vehiculoId)) {
            try {
                const token = localStorage.getItem('token');
                const vRes = await axios.get(`${API_URL}/playa/vehiculos/${vehiculoId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setVehiculos(prev => [...prev, vRes.data]);
            } catch (e) {
                // Si falla, igual permitimos editar; el select podría quedar sin opción visible
            }
        }

        setNewVenta({
            numero_venta: venta.numero_venta,
            id_cliente: venta.id_cliente,
            id_producto: venta.id_producto,
            fecha_venta: venta.fecha_venta,
            tipo_venta: venta.tipo_venta,
            precio_venta: parseFloat(venta.precio_venta) || 0,
            descuento: parseFloat(venta.descuento) || 0,
            precio_final: parseFloat(venta.precio_final) || 0,
            entrega_inicial: parseFloat(venta.entrega_inicial) || 0,
            saldo_financiar: parseFloat(venta.saldo_financiar) || 0,
            cantidad_cuotas: parseInt(venta.cantidad_cuotas) || 0,
            monto_cuota: parseFloat(venta.monto_cuota) || 0,
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingVenta(null);
        setNewVenta({
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

    const handleSaveVenta = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            if (editingVenta) {
                await axios.put(`${API_URL}/playa/ventas/${editingVenta.id_venta}`, newVenta, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${API_URL}/playa/ventas`, newVenta, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            handleCloseModal();
            fetchData();
        } catch (error) {
            alert('Error: ' + (error.response?.data?.detail || error.message));
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

            {loading && (
                <div className="loading">Cargando...</div>
            )}

            <div className="ventas-grid">
                {ventas.map(v => (
                    <div key={v.id_venta} className="venta-card">
                        <div className="card-header">
                            <span className="vnt-number">{v.numero_venta}</span>
                            <span className="vnt-type">{v.tipo_venta}</span>
                        </div>
                        <div className="card-body">
                            <p><strong>Estado:</strong> <span className={`vnt-status ${(v.estado_venta || 'ACTIVA').toLowerCase()}`}>{v.estado_venta || 'ACTIVA'}</span></p>
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

                        <div className="venta-actions">
                            <button
                                type="button"
                                className="btn-edit-venta"
                                disabled={(v.estado_venta || 'ACTIVA') === 'ANULADA'}
                                onClick={() => handleEditVenta(v)}
                            >
                                Editar
                            </button>
                            <button
                                type="button"
                                className="btn-anular"
                                disabled={(v.estado_venta || 'ACTIVA') === 'ANULADA'}
                                onClick={() => handleAnularVenta(v.id_venta)}
                            >
                                Anular
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content large">
                        <h3>{editingVenta ? 'Editar Venta' : 'Nueva Venta de Vehículo'}</h3>
                        <form onSubmit={handleSaveVenta}>
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
                                    <select required disabled={!!editingVenta} value={newVenta.id_producto} onChange={(e) => handleVehiculoChange(e.target.value)}>
                                        <option value="">Seleccione Vehículo</option>
                                        {vehiculos.map(v => <option key={v.id_producto} value={v.id_producto}>{v.marca} {v.modelo} ({v.chasis})</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Fecha Venta</label>
                                    <input type="date" value={newVenta.fecha_venta} onChange={(e) => setNewVenta({ ...newVenta, fecha_venta: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Descuento (Gs.)</label>
                                    <input
                                        type="number"
                                        value={newVenta.descuento}
                                        onChange={(e) => {
                                            const descuento = parseFloat(e.target.value) || 0;
                                            const updated = { ...newVenta, descuento, precio_final: (newVenta.precio_venta - descuento) };
                                            setNewVenta(calculateFinancing(updated));
                                        }}
                                    />
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
                                <div className="form-group">
                                    <label>Precio Final (Gs.)</label>
                                    <input type="number" readOnly value={newVenta.precio_final} />
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
                                <button type="button" className="btn-cancel" onClick={handleCloseModal}>Cancelar</button>
                                <button type="submit" className="btn-save">{editingVenta ? 'Guardar Cambios' : 'Confirmar Venta y Generar Pagarés'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VentasPlaya;
