import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './GastosEmpresa.css';

const GastosEmpresa = () => {
    const [gastos, setGastos] = useState([]);
    const [tipos, setTipos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showTypesModal, setShowTypesModal] = useState(false);

    const [newGasto, setNewGasto] = useState({
        id_tipo_gasto_empresa: '',
        descripcion: '',
        monto: '',
        fecha_gasto: new Date().toISOString().split('T')[0],
        proveedor: '',
        numero_factura: ''
    });

    const [editingGasto, setEditingGasto] = useState(null);

    const [newType, setNewType] = useState({
        nombre: '',
        descripcion: '',
        es_fijo: false
    });

    const API_URL = import.meta.env.VITE_REACT_APP_API_URL || '/api';

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const [gRes, tRes] = await Promise.all([
                axios.get(`${API_URL}/playa/gastos-empresa`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/playa/tipos-gastos-empresa`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setGastos(gRes.data);
            setTipos(tRes.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching data:', error);
            setLoading(false);
        }
    };

    const handleSaveGasto = async (e) => {
        e.preventDefault();
        try {
            const token = sessionStorage.getItem('token');
            if (editingGasto) {
                await axios.put(`${API_URL}/playa/gastos-empresa/${editingGasto.id_gasto_empresa}`, newGasto, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${API_URL}/playa/gastos-empresa`, newGasto, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setShowModal(false);
            setEditingGasto(null);
            fetchData();
            setNewGasto({
                id_tipo_gasto_empresa: '',
                descripcion: '',
                monto: '',
                fecha_gasto: new Date().toISOString().split('T')[0],
                proveedor: '',
                numero_factura: ''
            });
        } catch (error) {
            alert('Error: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleEditGasto = (gasto) => {
        setEditingGasto(gasto);
        setNewGasto({
            id_tipo_gasto_empresa: gasto.id_tipo_gasto_empresa,
            descripcion: gasto.descripcion,
            monto: gasto.monto,
            fecha_gasto: gasto.fecha_gasto,
            proveedor: gasto.proveedor || '',
            numero_factura: gasto.numero_factura || ''
        });
        setShowModal(true);
    };

    const handleDeleteGasto = async (id) => {
        if (!confirm('¿Está seguro de eliminar este gasto?')) return;
        try {
            const token = sessionStorage.getItem('token');
            await axios.delete(`${API_URL}/playa/gastos-empresa/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch (error) {
            alert('Error: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingGasto(null);
        setNewGasto({
            id_tipo_gasto_empresa: '',
            descripcion: '',
            monto: '',
            fecha_gasto: new Date().toISOString().split('T')[0],
            proveedor: '',
            numero_factura: ''
        });
    };

    const handleSaveType = async (e) => {
        e.preventDefault();
        try {
            const token = sessionStorage.getItem('token');
            await axios.post(`${API_URL}/playa/tipos-gastos-empresa`, newType, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowTypesModal(false);
            fetchData();
            setNewType({ nombre: '', descripcion: '', es_fijo: false });
        } catch (error) {
            alert('Error: ' + (error.response?.data?.detail || error.message));
        }
    };

    const totalAcumulado = gastos.reduce((acc, curr) => acc + parseFloat(curr.monto), 0);

    return (
        <div className="gastos-empresa-container">
            <div className="header-actions">
                <div>
                    <h2>Gastos Operativos de la Empresa</h2>
                    <p className="subtitle">Alquiler, Personal, Impuestos, Servicios y otros costos indirectos.</p>
                </div>
                <div className="header-buttons">
                    <button className="btn-secondary" onClick={() => setShowTypesModal(true)}>Gestionar Conceptos</button>
                    <button className="btn-primary" onClick={() => setShowModal(true)}>+ Registrar Gasto</button>
                </div>
            </div>

            <div className="summary-banner">
                <div className="summary-item">
                    <span>Total Egresos Operativos</span>
                    <h3>Gs. {Math.round(totalAcumulado).toLocaleString('es-PY')}</h3>
                </div>
            </div>

            {loading ? <p>Cargando registros...</p> : (
                <div className="table-responsive">
                    <table className="gastos-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Concepto</th>
                                <th>Descripción</th>
                                <th>Proveedor / Detalle</th>
                                <th>Monto</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {gastos.length === 0 ? (
                                <tr><td colSpan="6" className="text-center">No hay gastos registrados.</td></tr>
                            ) : gastos.map(g => (
                                <tr key={g.id_gasto_empresa}>
                                    <td>{g.fecha_gasto}</td>
                                    <td><span className="type-badge">{g.tipo_gasto?.nombre}</span></td>
                                    <td>{g.descripcion}</td>
                                    <td>
                                        <div className="prov-info">
                                            <strong>{g.proveedor || 'N/A'}</strong>
                                            <span>{g.numero_factura}</span>
                                        </div>
                                    </td>
                                    <td className="monto-cell">Gs. {Math.round(parseFloat(g.monto)).toLocaleString('es-PY')}</td>
                                    <td className="actions-cell">
                                        <button className="btn-edit" onClick={() => handleEditGasto(g)} title="Editar">
                                            ✏️
                                        </button>
                                        <button className="btn-delete" onClick={() => handleDeleteGasto(g.id_gasto_empresa)} title="Eliminar">
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal Nuevo Gasto */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>{editingGasto ? 'Editar Gasto Administrativo' : 'Registrar Nuevo Gasto Administrativo'}</h3>
                        <form onSubmit={handleSaveGasto}>
                            <div className="form-group">
                                <label>Concepto de Gasto</label>
                                <select
                                    required
                                    value={newGasto.id_tipo_gasto_empresa}
                                    onChange={(e) => setNewGasto({ ...newGasto, id_tipo_gasto_empresa: e.target.value })}
                                >
                                    <option value="">Seleccione concepto...</option>
                                    {tipos.map(t => <option key={t.id_tipo_gasto_empresa} value={t.id_tipo_gasto_empresa}>{t.nombre}</option>)}
                                </select>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Monto (Gs.)</label>
                                    <input type="number" required value={newGasto.monto} onChange={(e) => setNewGasto({ ...newGasto, monto: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Fecha</label>
                                    <input type="date" required value={newGasto.fecha_gasto} onChange={(e) => setNewGasto({ ...newGasto, fecha_gasto: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Descripción / Observación</label>
                                <input type="text" value={newGasto.descripcion} onChange={(e) => setNewGasto({ ...newGasto, descripcion: e.target.value })} placeholder="Ej: Pago mes de Febrero" />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Proveedor / Beneficiario</label>
                                    <input type="text" value={newGasto.proveedor} onChange={(e) => setNewGasto({ ...newGasto, proveedor: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>N° Comprobante</label>
                                    <input type="text" value={newGasto.numero_factura} onChange={(e) => setNewGasto({ ...newGasto, numero_factura: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={handleCloseModal}>Cancelar</button>
                                <button type="submit" className="btn-save">{editingGasto ? 'Actualizar Gasto' : 'Guardar Gasto'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Gestión de Tipos */}
            {showTypesModal && (
                <div className="modal-overlay" style={{ zIndex: 1100 }}>
                    <div className="modal-content">
                        <h3>Configurar Conceptos Operativos</h3>
                        <form onSubmit={handleSaveType}>
                            <div className="form-group">
                                <label>Nombre del Concepto</label>
                                <input type="text" required value={newType.nombre} onChange={(e) => setNewType({ ...newType, nombre: e.target.value })} placeholder="Ej: Alquiler Local" />
                            </div>
                            <div className="form-group">
                                <label>Descripción Corta</label>
                                <input type="text" value={newType.descripcion} onChange={(e) => setNewType({ ...newType, descripcion: e.target.value })} />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowTypesModal(false)}>Cerrar</button>
                                <button type="submit" className="btn-save">Crear Concepto</button>
                            </div>
                        </form>
                        <div className="type-list-mini">
                            <h4>Conceptos Registrados:</h4>
                            <div className="badges">
                                {tipos.map(t => <span key={t.id_tipo_gasto_empresa} className="type-badge">{t.nombre}</span>)}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GastosEmpresa;
