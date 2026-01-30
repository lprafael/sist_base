import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './GastosVehiculo.css';

const GastosVehiculo = () => {
    const [vehiculos, setVehiculos] = useState([]);
    const [tiposGastos, setTiposGastos] = useState([]);
    const [selectedVehiculo, setSelectedVehiculo] = useState(null);
    const [gastos, setGastos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showTypesModal, setShowTypesModal] = useState(false);
    const [costoResumen, setCostoResumen] = useState(null);
    const [newType, setNewType] = useState({ nombre: '', descripcion: '' });

    const [newGasto, setNewGasto] = useState({
        id_producto: '',
        id_tipo_gasto: '',
        descripcion: '',
        monto: '',
        fecha_gasto: new Date().toISOString().split('T')[0],
        proveedor: '',
        numero_factura: ''
    });

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [vRes, tRes] = await Promise.all([
                axios.get(`${API_URL}/playa/vehiculos`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/playa/tipos-gastos`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setVehiculos(vRes.data);
            setTiposGastos(tRes.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching initial data:', error);
            setLoading(false);
        }
    };

    const handleSelectVehiculo = async (vehiculo) => {
        setSelectedVehiculo(vehiculo);
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const [gRes, cRes] = await Promise.all([
                axios.get(`${API_URL}/playa/vehiculos/${vehiculo.id_producto}/gastos`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/playa/vehiculos/${vehiculo.id_producto}/costo-total`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setGastos(gRes.data);
            setCostoResumen(cRes.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching vehicle expenses:', error);
            setLoading(false);
        }
    };

    const handleSaveGasto = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const payload = { ...newGasto, id_producto: selectedVehiculo.id_producto };
            await axios.post(`${API_URL}/playa/gastos`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowModal(false);
            handleSelectVehiculo(selectedVehiculo); // Refresh
            setNewGasto({
                id_producto: '',
                id_tipo_gasto: '',
                descripcion: '',
                monto: '',
                fecha_gasto: new Date().toISOString().split('T')[0],
                proveedor: '',
                numero_factura: ''
            });
        } catch (error) {
            alert('Error al registrar gasto: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleCreateType = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/playa/tipos-gastos`, newType, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNewType({ nombre: '', descripcion: '' });
            fetchInitialData(); // Refresh list
            alert('Nuevo concepto guardado');
        } catch (error) {
            alert('Error: ' + (error.response?.data?.detail || error.message));
        }
    };


    return (
        <div className="expenses-container">
            <div className="layout-split">
                {/* Sidebar: Vehicle List */}
                <div className="vehicle-sidebar">
                    <h3>Vehículos</h3>
                    <div className="v-list">
                        {vehiculos.map(v => (
                            <div
                                key={v.id_producto}
                                className={`v-item ${selectedVehiculo?.id_producto === v.id_producto ? 'active' : ''}`}
                                onClick={() => handleSelectVehiculo(v)}
                            >
                                <span className="v-title">{v.marca} {v.modelo}</span>
                                <span className="v-chassis">{v.chasis}</span>
                                <span className={`v-status ${v.estado_disponibilidad.toLowerCase()}`}>{v.estado_disponibilidad}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content: Expenses Details */}
                <div className="expense-details">
                    {!selectedVehiculo ? (
                        <div className="no-selection">
                            <p>Seleccione un vehículo para ver o registrar gastos.</p>
                        </div>
                    ) : (
                        <div className="details-content">
                            <div className="details-header">
                                <div>
                                    <h2>{selectedVehiculo.marca} {selectedVehiculo.modelo}</h2>
                                    <p className="subtitle">Chasis: {selectedVehiculo.chasis}</p>
                                </div>
                                <button className="btn-primary" onClick={() => setShowModal(true)}>
                                    + Agregar Gasto
                                </button>
                            </div>

                            {costoResumen && (
                                <div className="cost-summary-cards">
                                    <div className="cost-card">
                                        <span>Costo Base</span>
                                        <p>Gs. {Math.round(parseFloat(costoResumen.costo_base)).toLocaleString('es-PY')}</p>
                                    </div>
                                    <div className="cost-card warning">
                                        <span>Total Gastos</span>
                                        <p>Gs. {Math.round(parseFloat(costoResumen.total_gastos)).toLocaleString('es-PY')}</p>
                                    </div>
                                    <div className="cost-card total">
                                        <span>Costo Final (Inversión)</span>
                                        <p>Gs. {Math.round(parseFloat(costoResumen.costo_final)).toLocaleString('es-PY')}</p>
                                    </div>
                                </div>
                            )}

                            <h3>Historial de Gastos</h3>
                            {loading ? <p>Cargando gastos...</p> : (
                                <table className="expenses-table">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Categoría</th>
                                            <th>Descripción</th>
                                            <th>Proveedor</th>
                                            <th>Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {gastos.length === 0 ? (
                                            <tr><td colSpan="5" className="text-center">No hay gastos registrados para este vehículo.</td></tr>
                                        ) : gastos.map(g => (
                                            <tr key={g.id_gasto_producto}>
                                                <td>{g.fecha_gasto}</td>
                                                <td><span className="type-badge">{g.tipo_gasto?.nombre}</span></td>
                                                <td>{g.descripcion}</td>
                                                <td>{g.proveedor}</td>
                                                <td className="monto-cell">Gs. {Math.round(parseFloat(g.monto)).toLocaleString('es-PY')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Registrar Gasto del Vehículo</h3>
                        <form onSubmit={handleSaveGasto}>
                            <div className="form-group">
                                <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    Tipo de Gasto
                                    <button type="button" className="btn-link" onClick={() => setShowTypesModal(true)}>+ Crear Concepto</button>
                                </label>
                                <select
                                    required
                                    value={newGasto.id_tipo_gasto}
                                    onChange={(e) => setNewGasto({ ...newGasto, id_tipo_gasto: e.target.value })}
                                >
                                    <option value="">Seleccione tipo...</option>
                                    {tiposGastos.map(t => <option key={t.id_tipo_gasto} value={t.id_tipo_gasto}>{t.nombre}</option>)}
                                </select>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Monto (Gs.)</label>
                                    <input type="number" step="1" required value={newGasto.monto} onChange={(e) => setNewGasto({ ...newGasto, monto: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Fecha</label>
                                    <input type="date" required value={newGasto.fecha_gasto} onChange={(e) => setNewGasto({ ...newGasto, fecha_gasto: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Descripción / Concepto</label>
                                <input type="text" value={newGasto.descripcion} onChange={(e) => setNewGasto({ ...newGasto, descripcion: e.target.value })} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Proveedor</label>
                                    <input type="text" value={newGasto.proveedor} onChange={(e) => setNewGasto({ ...newGasto, proveedor: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>N° Factura</label>
                                    <input type="text" value={newGasto.numero_factura} onChange={(e) => setNewGasto({ ...newGasto, numero_factura: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-save">Registrar Gasto</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal para Crear Tipos de Gastos */}
            {showTypesModal && (
                <div className="modal-overlay" style={{ zIndex: 1100 }}>
                    <div className="modal-content">
                        <h3>Gestionar Conceptos de Gasto</h3>
                        <form onSubmit={handleCreateType}>
                            <div className="form-group">
                                <label>Nombre del Concepto (Ej: Flete, Chapería)</label>
                                <input type="text" required value={newType.nombre} onChange={(e) => setNewType({ ...newType, nombre: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Descripción (Opcional)</label>
                                <input type="text" value={newType.descripcion} onChange={(e) => setNewType({ ...newType, descripcion: e.target.value })} />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowTypesModal(false)}>Cerrar</button>
                                <button type="submit" className="btn-save">Guardar Concepto</button>
                            </div>
                        </form>

                        <div className="existing-types" style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                            <h4>Conceptos Existentes</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                {tiposGastos.map(t => (
                                    <span key={t.id_tipo_gasto} className="type-badge">{t.nombre}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GastosVehiculo;
