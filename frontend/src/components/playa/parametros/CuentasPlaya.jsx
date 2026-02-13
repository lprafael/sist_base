import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './CategoriasPlaya.css';

const CuentasPlaya = () => {
    const [cuentas, setCuentas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCuenta, setEditingCuenta] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'nombre', direction: 'asc' });

    const [formData, setFormData] = useState({
        nombre: '',
        tipo: 'CAJA',
        banco: '',
        numero_cuenta: '',
        saldo_actual: 0,
        activo: true
    });

    const API_URL = import.meta.env.VITE_REACT_APP_API_URL || '/api';

    useEffect(() => {
        fetchCuentas();
    }, []);

    const fetchCuentas = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.get(`${API_URL}/playa/cuentas`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCuentas(res.data);
        } catch (error) {
            console.error('Error fetching cuentas:', error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingCuenta(null);
        setFormData({ nombre: '', tipo: 'CAJA', banco: '', numero_cuenta: '', saldo_actual: 0, activo: true });
        setShowModal(true);
    };

    const openEditModal = (cta) => {
        setEditingCuenta(cta);
        setFormData({
            nombre: cta.nombre || '',
            tipo: cta.tipo || 'CAJA',
            banco: cta.banco || '',
            numero_cuenta: cta.numero_cuenta || '',
            saldo_actual: cta.saldo_actual || 0,
            activo: cta.activo ?? true
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingCuenta(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = sessionStorage.getItem('token');
            if (editingCuenta) {
                await axios.put(`${API_URL}/playa/cuentas/${editingCuenta.id_cuenta}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${API_URL}/playa/cuentas`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            closeModal();
            fetchCuentas();
        } catch (error) {
            alert('Error: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleDelete = async (cta) => {
        if (!confirm(`¿Eliminar la cuenta "${cta.nombre}"?`)) return;
        try {
            const token = sessionStorage.getItem('token');
            await axios.delete(`${API_URL}/playa/cuentas/${cta.id_cuenta}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchCuentas();
        } catch (error) {
            alert('Error: ' + (error.response?.data?.detail || error.message));
        }
    };

    const requestSort = (key) => {
        setSortConfig(prev => {
            if (prev.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return '';
        return sortConfig.direction === 'asc' ? '▲' : '▼';
    };

    const sortedCuentas = [...cuentas].filter(c =>
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.banco && c.banco.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => {
        const { key, direction } = sortConfig;
        const multiplier = direction === 'asc' ? 1 : -1;

        if (key === 'saldo_actual') {
            return (a.saldo_actual - b.saldo_actual) * multiplier;
        }

        const av = (a[key] || '').toString().toLowerCase();
        const bv = (b[key] || '').toString().toLowerCase();
        return av.localeCompare(bv) * multiplier;
    });

    const formatGuranies = (val) => {
        return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(val);
    };

    return (
        <div className="categorias-container">
            <div className="header-actions">
                <h2>Cuentas (Cajas y Bancos)</h2>
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Buscar cuenta o banco..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="btn-primary" onClick={openCreateModal}>
                    + Nueva Cuenta
                </button>
            </div>

            {loading ? (
                <div className="loading">Cargando cuentas...</div>
            ) : (
                <div className="categorias-table-wrapper">
                    <table className="categorias-table">
                        <thead>
                            <tr>
                                <th onClick={() => requestSort('nombre')}>Nombre {getSortIndicator('nombre')}</th>
                                <th onClick={() => requestSort('tipo')}>Tipo {getSortIndicator('tipo')}</th>
                                <th onClick={() => requestSort('banco')}>Banco {getSortIndicator('banco')}</th>
                                <th>Nº Cuenta</th>
                                <th onClick={() => requestSort('saldo_actual')}>Saldo Actual {getSortIndicator('saldo_actual')}</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedCuentas.map(cta => (
                                <tr key={cta.id_cuenta}>
                                    <td><strong>{cta.nombre}</strong></td>
                                    <td>{cta.tipo}</td>
                                    <td>{cta.banco || '-'}</td>
                                    <td>{cta.numero_cuenta || '-'}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatGuranies(cta.saldo_actual)}</td>
                                    <td>{cta.activo ? '✅ Activa' : '❌ Inactiva'}</td>
                                    <td>
                                        <div className="actions-cell">
                                            <button className="btn-edit" onClick={() => openEditModal(cta)} title="Editar">✏️</button>
                                            <button className="btn-delete" onClick={() => handleDelete(cta)} title="Eliminar">🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>{editingCuenta ? 'Editar Cuenta' : 'Nueva Cuenta'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Nombre de la Cuenta</label>
                                <input
                                    type="text"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    required
                                    placeholder="Ej: Caja Chica, Banco Itaú Gs..."
                                />
                            </div>

                            <div className="form-group">
                                <label>Tipo</label>
                                <select
                                    value={formData.tipo}
                                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                                >
                                    <option value="CAJA">CAJA</option>
                                    <option value="BANCO">BANCO</option>
                                    <option value="OTRO">OTRO</option>
                                </select>
                            </div>

                            {formData.tipo === 'BANCO' && (
                                <>
                                    <div className="form-group">
                                        <label>Banco</label>
                                        <input
                                            type="text"
                                            value={formData.banco}
                                            onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Número de Cuenta</label>
                                        <input
                                            type="text"
                                            value={formData.numero_cuenta}
                                            onChange={(e) => setFormData({ ...formData, numero_cuenta: e.target.value })}
                                        />
                                    </div>
                                </>
                            )}

                            <div className="form-group">
                                <label>Saldo Actual</label>
                                <input
                                    type="number"
                                    value={formData.saldo_actual}
                                    onChange={(e) => setFormData({ ...formData, saldo_actual: e.target.value })}
                                    step="0.01"
                                />
                            </div>

                            <div className="form-group checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={formData.activo}
                                        onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                                    /> Activa
                                </label>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={closeModal}>Cancelar</button>
                                <button type="submit" className="btn-save">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CuentasPlaya;
