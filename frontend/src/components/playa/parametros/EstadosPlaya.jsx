import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './CategoriasPlaya.css'; // Reutilizamos estilos

const EstadosPlaya = () => {
    const [estados, setEstados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingEstado, setEditingEstado] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'id_estado', direction: 'asc' });

    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        color_hex: '#000000',
        activo: true
    });

    const API_URL = import.meta.env.VITE_REACT_APP_API_URL || '/api';

    useEffect(() => {
        fetchEstados();
    }, []);

    const fetchEstados = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.get(`${API_URL}/playa/estados`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEstados(res.data);
        } catch (error) {
            console.error('Error fetching estados:', error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingEstado(null);
        setFormData({ nombre: '', descripcion: '', color_hex: '#000000', activo: true });
        setShowModal(true);
    };

    const openEditModal = (est) => {
        setEditingEstado(est);
        setFormData({
            nombre: est.nombre || '',
            descripcion: est.descripcion || '',
            color_hex: est.color_hex || '#000000',
            activo: est.activo ?? true
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingEstado(null);
        setFormData({ nombre: '', descripcion: '', color_hex: '#000000', activo: true });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = sessionStorage.getItem('token');
            if (editingEstado) {
                await axios.put(`${API_URL}/playa/estados/${editingEstado.id_estado}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${API_URL}/playa/estados`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            closeModal();
            fetchEstados();
        } catch (error) {
            alert('Error: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleDelete = async (est) => {
        if (!confirm(`¿Eliminar el estado "${est.nombre}"?`)) return;
        try {
            const token = sessionStorage.getItem('token');
            await axios.delete(`${API_URL}/playa/estados/${est.id_estado}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchEstados();
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

    const filteredEstados = estados.filter(est => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return true;
        const nombre = (est.nombre || '').toLowerCase();
        const descripcion = (est.descripcion || '').toLowerCase();
        return nombre.includes(term) || descripcion.includes(term);
    });

    const sortedEstados = [...filteredEstados].sort((a, b) => {
        const { key, direction } = sortConfig;
        const multiplier = direction === 'asc' ? 1 : -1;

        if (key === 'id_estado') {
            return (a.id_estado - b.id_estado) * multiplier;
        }

        const av = (a[key] || '').toString().toLowerCase();
        const bv = (b[key] || '').toString().toLowerCase();
        return av.localeCompare(bv) * multiplier;
    });

    return (
        <div className="categorias-container">
            <div className="header-actions">
                <h2>Estados de Pagarés</h2>
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Filtrar por nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="btn-primary" onClick={openCreateModal}>
                    + Nuevo Estado
                </button>
            </div>

            {loading ? (
                <div className="loading">Cargando estados...</div>
            ) : (
                <div className="categorias-table-wrapper">
                    <table className="categorias-table">
                        <thead>
                            <tr>
                                <th onClick={() => requestSort('id_estado')}>ID {getSortIndicator('id_estado')}</th>
                                <th onClick={() => requestSort('nombre')}>Nombre {getSortIndicator('nombre')}</th>
                                <th>Descripción</th>
                                <th>Color</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedEstados.map(est => (
                                <tr key={est.id_estado}>
                                    <td>{est.id_estado}</td>
                                    <td><strong>{est.nombre}</strong></td>
                                    <td>{est.descripcion || ''}</td>
                                    <td>
                                        <div style={{
                                            width: '20px',
                                            height: '20px',
                                            backgroundColor: est.color_hex || '#eee',
                                            borderRadius: '50%',
                                            border: '1px solid #ccc'
                                        }}></div>
                                    </td>
                                    <td>{est.activo ? '✅ Activo' : '❌ Inactivo'}</td>
                                    <td>
                                        <div className="actions-cell">
                                            <button className="btn-edit" onClick={() => openEditModal(est)} title="Editar">✏️</button>
                                            <button className="btn-delete" onClick={() => handleDelete(est)} title="Eliminar">🗑️</button>
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
                        <h3>{editingEstado ? 'Editar Estado' : 'Nuevo Estado'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Nombre</label>
                                <input
                                    type="text"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    required
                                    placeholder="Ej: PAGADO, PENDIENTE..."
                                />
                            </div>

                            <div className="form-group">
                                <label>Descripción</label>
                                <textarea
                                    value={formData.descripcion}
                                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                    rows="2"
                                />
                            </div>

                            <div className="form-group">
                                <label>Color Identificador</label>
                                <input
                                    type="color"
                                    value={formData.color_hex}
                                    onChange={(e) => setFormData({ ...formData, color_hex: e.target.value })}
                                />
                            </div>

                            <div className="form-group checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={formData.activo}
                                        onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                                    /> Activo
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

export default EstadosPlaya;
