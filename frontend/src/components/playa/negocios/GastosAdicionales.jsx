import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './GastosAdicionales.css';

const GastosAdicionales = () => {
    const [gastos, setGastos] = useState([]);
    const [cuentas, setCuentas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        tipo: 'EGRESO',
        monto: '',
        fecha: new Date().toISOString().split('T')[0],
        concepto: '',
        id_cuenta: '1',
        observaciones: ''
    });

    const API_URL = import.meta.env.VITE_REACT_APP_API_URL || '/api';

    useEffect(() => {
        fetchData();
        fetchCuentas();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = sessionStorage.getItem('token');
            const res = await axios.get(`${API_URL}/playa/gastos-adicionales`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setGastos(res.data);
        } catch (error) {
            console.error('Error fetching gastos:', error);
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
            setCuentas(res.data.filter(c => c.activo));
        } catch (error) {
            console.error('Error fetching cuentas:', error);
        }
    };

    const openModal = (gasto = null) => {
        if (gasto) {
            setFormData({
                tipo: gasto.tipo,
                monto: gasto.monto,
                fecha: gasto.fecha,
                concepto: gasto.concepto,
                id_cuenta: gasto.id_cuenta,
                observaciones: gasto.observaciones || ''
            });
            setEditingId(gasto.id_gasto_adicional);
        } else {
            setFormData({
                tipo: 'EGRESO',
                monto: '',
                fecha: new Date().toISOString().split('T')[0],
                concepto: '',
                id_cuenta: '',
                observaciones: ''
            });
            setEditingId(null);
        }
        setShowModal(true);
    };

    const closeModal = () => setShowModal(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.id_cuenta) {
            alert('Debe seleccionar una cuenta');
            return;
        }

        try {
            const token = sessionStorage.getItem('token');
            const dataToSubmit = {
                ...formData,
                monto: parseFloat(formData.monto)
            };

            if (editingId) {
                await axios.put(`${API_URL}/playa/gastos-adicionales/${editingId}`, dataToSubmit, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${API_URL}/playa/gastos-adicionales`, dataToSubmit, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            
            closeModal();
            fetchData();
        } catch (error) {
            alert('Error: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Está seguro de eliminar este registro? El saldo de la cuenta se revertirá.')) return;
        
        try {
            const token = sessionStorage.getItem('token');
            await axios.delete(`${API_URL}/playa/gastos-adicionales/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch (error) {
            alert('Error al eliminar: ' + (error.response?.data?.detail || error.message));
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(val);
    };

    const filteredGastos = gastos.filter(g =>
        g.concepto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.cuenta_rel?.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="gastos-adicionales-container">
            <div className="header-actions">
                <div>
                    <h2>Gastos e Ingresos Adicionales</h2>
                    <p className="subtitle">Gestión de movimientos varios (donaciones, pérdidas, robos, etc.)</p>
                </div>
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Buscar por concepto o cuenta..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="btn-primary" onClick={() => openModal()}>
                    <span>➕</span> Nuevo Registro
                </button>
            </div>

            {loading ? (
                <div className="loading">Cargando registros...</div>
            ) : (
                <div className="table-wrapper">
                    <table className="gastos-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Tipo</th>
                                <th>Cuenta</th>
                                <th style={{ textAlign: 'right' }}>Monto</th>
                                <th>Concepto</th>
                                <th>Observaciones</th>
                                <th style={{ textAlign: 'center' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredGastos.length > 0 ? (
                                filteredGastos.map(g => (
                                    <tr key={g.id_gasto_adicional} className={g.tipo === 'INGRESO' ? 'row-ingreso' : 'row-egreso'}>
                                        <td>{new Date(g.fecha).toLocaleDateString('es-PY')}</td>
                                        <td>
                                            <span className={`badge ${g.tipo.toLowerCase()}`}>
                                                {g.tipo}
                                            </span>
                                        </td>
                                        <td>{g.cuenta_rel?.nombre || 'N/A'}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                            {g.tipo === 'INGRESO' ? '+' : '-'} {formatCurrency(g.monto)}
                                        </td>
                                        <td>{g.concepto}</td>
                                        <td className="truncate">{g.observaciones}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div className="action-buttons">
                                                <button className="btn-edit" onClick={() => openModal(g)} title="Editar">✏️</button>
                                                <button className="btn-delete" onClick={() => handleDelete(g.id_gasto_adicional)} title="Eliminar">🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No se encontraron registros activos.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingId ? 'Editar Registro' : 'Nuevo Registro Vario'}</h3>
                            <button className="btn-close-modal-top" onClick={closeModal}>&times;</button>
                        </div>
                        
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-row">
                                    <div className="form-group half">
                                        <label>Tipo de Movimiento</label>
                                        <select
                                            value={formData.tipo}
                                            onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                                            required
                                        >
                                            <option value="EGRESO">EGRESO (Salida / Pérdida / Gasto)</option>
                                            <option value="INGRESO">INGRESO (Entrada / Donación)</option>
                                        </select>
                                    </div>
                                    <div className="form-group half">
                                        <label>Fecha</label>
                                        <input
                                            type="date"
                                            value={formData.fecha}
                                            onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group half">
                                        <label>Cuenta</label>
                                        <select
                                            value={formData.id_cuenta}
                                            onChange={(e) => setFormData({ ...formData, id_cuenta: e.target.value })}
                                            required
                                        >
                                            <option value="">-- Seleccionar Cuenta --</option>
                                            {cuentas.map(c => (
                                                <option key={c.id_cuenta} value={c.id_cuenta}>
                                                    {c.nombre} (Saldo: {formatCurrency(c.saldo_actual)})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group half">
                                        <label>Monto</label>
                                        <input
                                            type="number"
                                            value={formData.monto}
                                            onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                                            required
                                            min="0"
                                            placeholder="Ingrese el monto"
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Concepto / Motivo</label>
                                    <input
                                        type="text"
                                        value={formData.concepto}
                                        onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                                        required
                                        placeholder="Ej: Donación recibida, Pérdida por robo, Ajuste de caja..."
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Observaciones Adicionales</label>
                                    <textarea
                                        value={formData.observaciones}
                                        onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                                        placeholder="Detalles adicionales del movimiento..."
                                        rows="3"
                                    ></textarea>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={closeModal}>Cancelar</button>
                                <button type="submit" className="btn-save">
                                    {editingId ? 'Guardar Cambios' : 'Registrar Movimiento'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GastosAdicionales;
