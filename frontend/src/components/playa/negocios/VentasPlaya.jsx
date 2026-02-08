import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './VentasPlaya.css';

const VentasPlaya = ({ setTab, preselectedVehicleId, setPreselectedVehicleId }) => {
    const [ventas, setVentas] = useState([]);
    const [vehiculos, setVehiculos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingVenta, setEditingVenta] = useState(null);
    const [activeTab, setActiveTab] = useState('datos'); // 'datos' o 'financiamiento'
    const [showAfterSalePagares, setShowAfterSalePagares] = useState(false);
    const [justCreatedPagares, setJustCreatedPagares] = useState([]);

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
        monto_cuota: 0,
        cantidad_refuerzos: 0,
        monto_refuerzo: 0,
        periodo_int_mora: 'D',
        monto_int_mora: 0
    });

    const API_URL = import.meta.env.VITE_REACT_APP_API_URL || '/api';

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
                    // Usar precio_contado_sugerido por defecto (tipo_venta inicial es CONTADO)
                    const precio = parseFloat(v.precio_contado_sugerido);
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
            cantidad_refuerzos: parseInt(venta.cantidad_refuerzos) || 0,
            monto_refuerzo: parseFloat(venta.monto_refuerzo) || 0,
            periodo_int_mora: venta.periodo_int_mora || 'D',
            monto_int_mora: parseFloat(venta.monto_int_mora) || 0,
            dias_gracia: parseInt(venta.dias_gracia) || 0
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingVenta(null);
        setActiveTab('datos');
        setShowAfterSalePagares(false);
        setJustCreatedPagares([]);
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
            monto_cuota: 0,
            cantidad_refuerzos: 0,
            monto_refuerzo: 0,
            periodo_int_mora: 'D',
            monto_int_mora: 0,
            dias_gracia: 0
        });
    };

    const handleVehiculoChange = (id) => {
        const v = vehiculos.find(veh => veh.id_producto === parseInt(id));
        if (v) {
            // Usar precio_financiado_sugerido si es venta financiada, sino precio_contado_sugerido
            const precio = newVenta.tipo_venta === 'FINANCIADO' && v.precio_financiado_sugerido
                ? parseFloat(v.precio_financiado_sugerido)
                : parseFloat(v.precio_contado_sugerido);
            setNewVenta({
                ...newVenta,
                id_producto: id,
                precio_venta: precio,
                precio_final: precio - newVenta.descuento
            });
        }
    };

    const calculateFinancing = (updatedVenta) => {
        if (updatedVenta.tipo_venta === 'CONTADO') {
            return {
                ...updatedVenta,
                entrega_inicial: updatedVenta.precio_final,
                saldo_financiar: 0,
                cantidad_cuotas: 0,
                monto_cuota: 0,
                cantidad_refuerzos: 0,
                monto_refuerzo: 0
            };
        }

        // Suma de partes: Entrega + (Cuotas * Monto) + (Refuerzos * Monto) = Precio Final
        const totalCuotas = (updatedVenta.cantidad_cuotas || 0) * (updatedVenta.monto_cuota || 0);
        const totalRefuerzos = (updatedVenta.cantidad_refuerzos || 0) * (updatedVenta.monto_refuerzo || 0);
        const calculadoFinal = (updatedVenta.entrega_inicial || 0) + totalCuotas + totalRefuerzos;

        return {
            ...updatedVenta,
            precio_final: calculadoFinal,
            saldo_financiar: calculadoFinal - (updatedVenta.entrega_inicial || 0)
        };
    };

    const handleSaveVenta = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');

            // Construir detalles
            const detalles = [];
            if (newVenta.entrega_inicial > 0 || newVenta.tipo_venta === 'CONTADO') {
                detalles.push({
                    concepto: 'Entrega Inicial',
                    monto_unitario: newVenta.entrega_inicial,
                    cantidad: 1,
                    subtotal: newVenta.entrega_inicial
                });
            }

            if (newVenta.tipo_venta === 'FINANCIADO') {
                if (newVenta.cantidad_cuotas > 0) {
                    detalles.push({
                        concepto: 'Cuotas',
                        monto_unitario: newVenta.monto_cuota,
                        cantidad: newVenta.cantidad_cuotas,
                        subtotal: newVenta.monto_cuota * newVenta.cantidad_cuotas
                    });
                }
                if (newVenta.cantidad_refuerzos > 0) {
                    detalles.push({
                        concepto: 'Refuerzos',
                        monto_unitario: newVenta.monto_refuerzo,
                        cantidad: newVenta.cantidad_refuerzos,
                        subtotal: newVenta.monto_refuerzo * newVenta.cantidad_refuerzos
                    });
                }
            }

            const payload = { ...newVenta, detalles };

            let response;
            if (editingVenta) {
                response = await axios.put(`${API_URL}/playa/ventas/${editingVenta.id_venta}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                response = await axios.post(`${API_URL}/playa/ventas`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            const savedVenta = response.data;

            if (!editingVenta && savedVenta.tipo_venta === 'FINANCIADO' && savedVenta.pagares?.length > 0) {
                setJustCreatedPagares(savedVenta.pagares);
                setShowAfterSalePagares(true);
                setShowModal(false); // Close the main sale modal
            } else {
                handleCloseModal();
            }
            fetchData();
        } catch (error) {
            alert('Error: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleUpdateJustCreatedPagare = async (id, updatedData) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`${API_URL}/playa/pagares/${id}`, updatedData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setJustCreatedPagares(prev => prev.map(p => p.id_pagare === id ? res.data : p));
        } catch (error) {
            alert('Error al actualizar pagaré: ' + (error.response?.data?.detail || error.message));
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
                            {newVenta.tipo_venta === 'FINANCIADO' && (
                                <div className="modal-tabs">
                                    <button
                                        type="button"
                                        className={`tab-btn ${activeTab === 'datos' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('datos')}
                                    >
                                        Datos de Venta
                                    </button>
                                    <button
                                        type="button"
                                        className={`tab-btn ${activeTab === 'financiamiento' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('financiamiento')}
                                    >
                                        Financiación
                                    </button>
                                </div>
                            )}

                            <div className="tab-content">
                                {activeTab === 'datos' ? (
                                    <>
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
                                                <select value={newVenta.tipo_venta} onChange={(e) => {
                                                    const val = e.target.value;
                                                    // Si hay un vehículo seleccionado, actualizar el precio según el tipo de venta
                                                    let updatedVenta = { ...newVenta, tipo_venta: val };
                                                    if (newVenta.id_producto) {
                                                        const v = vehiculos.find(veh => veh.id_producto === parseInt(newVenta.id_producto));
                                                        if (v) {
                                                            const precio = val === 'FINANCIADO' && v.precio_financiado_sugerido
                                                                ? parseFloat(v.precio_financiado_sugerido)
                                                                : parseFloat(v.precio_contado_sugerido);
                                                            updatedVenta.precio_venta = precio;
                                                            updatedVenta.precio_final = precio - updatedVenta.descuento;
                                                        }
                                                    }
                                                    setNewVenta(calculateFinancing(updatedVenta));
                                                }}>
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
                                    </>
                                ) : (
                                    <div className="financing-section">
                                        <h4>Configuración de Cuotas y Refuerzos</h4>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Entrega Inicial (Gs.)</label>
                                                <input type="number" value={newVenta.entrega_inicial}
                                                    onChange={(e) => setNewVenta(calculateFinancing({ ...newVenta, entrega_inicial: parseFloat(e.target.value) || 0 }))} />
                                            </div>
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Cant. Cuotas</label>
                                                <input type="number" value={newVenta.cantidad_cuotas}
                                                    onChange={(e) => setNewVenta(calculateFinancing({ ...newVenta, cantidad_cuotas: parseInt(e.target.value) || 0 }))} />
                                            </div>
                                            <div className="form-group">
                                                <label>Monto Cuota (Gs.)</label>
                                                <input type="number" value={newVenta.monto_cuota}
                                                    onChange={(e) => setNewVenta(calculateFinancing({ ...newVenta, monto_cuota: parseFloat(e.target.value) || 0 }))} />
                                            </div>
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Cant. Refuerzos</label>
                                                <input type="number" value={newVenta.cantidad_refuerzos}
                                                    onChange={(e) => setNewVenta(calculateFinancing({ ...newVenta, cantidad_refuerzos: parseInt(e.target.value) || 0 }))} />
                                            </div>
                                            <div className="form-group">
                                                <label>Monto Refuerzo (Gs.)</label>
                                                <input type="number" value={newVenta.monto_refuerzo}
                                                    onChange={(e) => setNewVenta(calculateFinancing({ ...newVenta, monto_refuerzo: parseFloat(e.target.value) || 0 }))} />
                                            </div>
                                        </div>
                                        <div className="form-row" style={{ marginTop: '10px', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc' }}>
                                            <div className="form-group">
                                                <label>Calcular Mora cada:</label>
                                                <select value={newVenta.periodo_int_mora} onChange={(e) => setNewVenta({ ...newVenta, periodo_int_mora: e.target.value })}>
                                                    <option value="D">Día</option>
                                                    <option value="S">Semana</option>
                                                    <option value="M">Mes</option>
                                                    <option value="A">Año</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label>Interés Mora (%)</label>
                                                <input
                                                    type="number"
                                                    value={newVenta.tasa_interes}
                                                    onChange={(e) => setNewVenta({ ...newVenta, tasa_interes: parseFloat(e.target.value) || 0 })}
                                                    placeholder="% sobre saldo"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Cargo Fijo por Período</label>
                                                <input
                                                    type="number"
                                                    value={newVenta.monto_int_mora}
                                                    onChange={(e) => setNewVenta({ ...newVenta, monto_int_mora: parseFloat(e.target.value) || 0 })}
                                                    placeholder="Gs. por período de atraso"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Días Gracia</label>
                                                <input
                                                    type="number"
                                                    value={newVenta.dias_gracia}
                                                    onChange={(e) => setNewVenta({ ...newVenta, dias_gracia: parseInt(e.target.value) || 0 })}
                                                />
                                            </div>
                                        </div>
                                        <div className="info-resumen" style={{ marginTop: '20px', padding: '15px', background: '#e2e8f0', borderRadius: '10px' }}>
                                            <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Entrega Inicial: Gs. {(newVenta.entrega_inicial || 0).toLocaleString('es-PY')}</p>
                                            <p style={{ margin: '0', fontWeight: 'bold', color: '#444' }}>Total Financiado (Cuotas + Refuerzos): Gs. {((newVenta.cantidad_cuotas * newVenta.monto_cuota) + (newVenta.cantidad_refuerzos * newVenta.monto_refuerzo)).toLocaleString('es-PY')}</p>
                                            <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', borderTop: '1px solid #cbd5e1', paddingTop: '5px' }}>Total Venta: Gs. {(newVenta.precio_final || 0).toLocaleString('es-PY')}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={handleCloseModal}>Cancelar</button>
                                <button type="submit" className="btn-save">{editingVenta ? 'Guardar Cambios' : 'Confirmar Venta y Generar Pagarés'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showAfterSalePagares && (
                <div className="modal-overlay">
                    <div className="modal-content large">
                        <h3>Venta Registrada - Editar Pagarés Generados</h3>
                        <p>A continuación puede ajustar las fechas y números de los pagarés generados automáticamente.</p>

                        <div className="pagares-edit-list" style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '20px' }}>
                            <table className="custom-table">
                                <thead>
                                    <tr>
                                        <th>Nro. Pagaré</th>
                                        <th>Cuota</th>
                                        <th>Monto</th>
                                        <th>Vencimiento</th>
                                        <th>Observaciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {justCreatedPagares.map(p => (
                                        <tr key={p.id_pagare}>
                                            <td>
                                                <input
                                                    type="text"
                                                    value={p.numero_pagare}
                                                    onChange={(e) => handleUpdateJustCreatedPagare(p.id_pagare, { ...p, numero_pagare: e.target.value })}
                                                    style={{ width: '120px' }}
                                                />
                                            </td>
                                            <td>{p.numero_cuota} ({p.tipo_pagare})</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={p.monto_cuota}
                                                    onChange={(e) => handleUpdateJustCreatedPagare(p.id_pagare, { ...p, monto_cuota: e.target.value })}
                                                    style={{ width: '100px' }}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="date"
                                                    value={p.fecha_vencimiento}
                                                    onChange={(e) => handleUpdateJustCreatedPagare(p.id_pagare, { ...p, fecha_vencimiento: e.target.value })}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    value={p.observaciones || ''}
                                                    placeholder="Opcional"
                                                    onChange={(e) => handleUpdateJustCreatedPagare(p.id_pagare, { ...p, observaciones: e.target.value })}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="modal-actions">
                            <button type="button" className="btn-save" onClick={handleCloseModal}>Finalizar y Guardar Todo</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VentasPlaya;
