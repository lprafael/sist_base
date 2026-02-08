import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './TiposGastos.css';

const TiposGastosEmpresa = () => {
    const [tipos, setTipos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTipo, setEditingTipo] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'id_tipo_gasto_empresa', direction: 'asc' });

    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        es_fijo: false,
        activo: true
    });

    const API_URL = import.meta.env.VITE_REACT_APP_API_URL || '/api';

    useEffect(() => {
        fetchTipos();
    }, []);

    const fetchTipos = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/playa/tipos-gastos-empresa?todo=true`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTipos(res.data);
        } catch (error) {
            console.error('Error fetching tipos gastos empresa:', error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingTipo(null);
        setFormData({ nombre: '', descripcion: '', es_fijo: false, activo: true });
        setShowModal(true);
    };

    const openEditModal = (tipo) => {
        setEditingTipo(tipo);
        setFormData({
            nombre: tipo.nombre || '',
            descripcion: tipo.descripcion || '',
            es_fijo: tipo.es_fijo || false,
            activo: tipo.activo !== undefined ? tipo.activo : true
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingTipo(null);
        setFormData({ nombre: '', descripcion: '', es_fijo: false, activo: true });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            if (editingTipo) {
                await axios.put(`${API_URL}/playa/tipos-gastos-empresa/${editingTipo.id_tipo_gasto_empresa}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${API_URL}/playa/tipos-gastos-empresa`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            closeModal();
            fetchTipos();
        } catch (error) {
            alert('Error: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleDelete = async (tipo) => {
        if (!confirm(`¿Eliminar el concepto "${tipo.nombre}"?`)) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/playa/tipos-gastos-empresa/${tipo.id_tipo_gasto_empresa}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchTipos();
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

    const filteredTipos = tipos.filter(t => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return true;
        const nombre = (t.nombre || '').toLowerCase();
        const descripcion = (t.descripcion || '').toLowerCase();
        return nombre.includes(term) || descripcion.includes(term);
    });

    const sortedTipos = [...filteredTipos].sort((a, b) => {
        const { key, direction } = sortConfig;
        const multiplier = direction === 'asc' ? 1 : -1;

        if (key === 'id_tipo_gasto_empresa') {
            return (a.id_tipo_gasto_empresa - b.id_tipo_gasto_empresa) * multiplier;
        }

        const av = (a[key] || '').toString().toLowerCase();
        const bv = (b[key] || '').toString().toLowerCase();
        return av.localeCompare(bv) * multiplier;
    });

    return (
        <div className="tipos-gastos-container">
            <div className="header-actions">
                <h2>Tipos de Gastos (Empresa)</h2>
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="btn-primary" onClick={openCreateModal}>
                    + Nuevo Concepto
                </button>
            </div>

            {loading ? (
                <div className="loading">Cargando...</div>
            ) : (
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th className="sortable" onClick={() => requestSort('id_tipo_gasto_empresa')}>
                                    ID <span className="sort-indicator">{getSortIndicator('id_tipo_gasto_empresa')}</span>
                                </th>
                                <th className="sortable" onClick={() => requestSort('nombre')}>
                                    Nombre <span className="sort-indicator">{getSortIndicator('nombre')}</span>
                                </th>
                                <th className="sortable" onClick={() => requestSort('descripcion')}>
                                    Descripción <span className="sort-indicator">{getSortIndicator('descripcion')}</span>
                                </th>
                                <th className="sortable" style={{ textAlign: 'center' }} onClick={() => requestSort('es_fijo')}>
                                    Fijo <span className="sort-indicator">{getSortIndicator('es_fijo')}</span>
                                </th>
                                <th className="sortable" style={{ textAlign: 'center' }} onClick={() => requestSort('activo')}>
                                    Estado <span className="sort-indicator">{getSortIndicator('activo')}</span>
                                </th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTipos.map(item => (
                                <tr key={item.id_tipo_gasto_empresa}>
                                    <td>{item.id_tipo_gasto_empresa}</td>
                                    <td>{item.nombre}</td>
                                    <td>{item.descripcion || ''}</td>
                                    <td style={{ textAlign: 'center' }}>{item.es_fijo ? 'Sí' : 'No'}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className={`tg-status-badge ${item.activo ? 'active' : 'inactive'}`}>
                                            {item.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="actions-cell">
                                            <button className="btn-edit" onClick={() => openEditModal(item)} title="Editar">✏️</button>
                                            <button className="btn-delete" onClick={() => handleDelete(item)} title="Eliminar">🗑️</button>
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
                        <h3>{editingTipo ? 'Editar Concepto' : 'Nuevo Concepto'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Nombre</label>
                                <input
                                    type="text"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Descripción</label>
                                <textarea
                                    value={formData.descripcion}
                                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                    rows="3"
                                />
                            </div>

                            <div className="form-check">
                                <input
                                    type="checkbox"
                                    id="chkFijo"
                                    checked={formData.es_fijo}
                                    onChange={(e) => setFormData({ ...formData, es_fijo: e.target.checked })}
                                />
                                <label htmlFor="chkFijo">Es Gasto Fijo</label>
                            </div>

                            <div className="form-check">
                                <input
                                    type="checkbox"
                                    id="chkActivo"
                                    checked={formData.activo}
                                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                                />
                                <label htmlFor="chkActivo">Activo</label>
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

export default TiposGastosEmpresa;
