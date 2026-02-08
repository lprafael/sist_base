import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './CategoriasPlaya.css';

const CategoriasPlaya = ({ setTab, setPreselectedCategoryId }) => {
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCategoria, setEditingCategoria] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'id_categoria', direction: 'asc' });

    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: ''
    });

    const API_URL = import.meta.env.VITE_REACT_APP_API_URL || '/api';

    useEffect(() => {
        fetchCategorias();
    }, []);

    const fetchCategorias = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/playa/categorias`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCategorias(res.data);
        } catch (error) {
            console.error('Error fetching categorias:', error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingCategoria(null);
        setFormData({ nombre: '', descripcion: '' });
        setShowModal(true);
    };

    const openEditModal = (cat) => {
        setEditingCategoria(cat);
        setFormData({
            nombre: cat.nombre || '',
            descripcion: cat.descripcion || ''
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingCategoria(null);
        setFormData({ nombre: '', descripcion: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            if (editingCategoria) {
                await axios.put(`${API_URL}/playa/categorias/${editingCategoria.id_categoria}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${API_URL}/playa/categorias`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            closeModal();
            fetchCategorias();
        } catch (error) {
            alert('Error: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleDelete = async (cat) => {
        if (!confirm(`¿Eliminar la categoría "${cat.nombre}"?`)) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/playa/categorias/${cat.id_categoria}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchCategorias();
        } catch (error) {
            alert('Error: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleVerInventario = (cat) => {
        if (setPreselectedCategoryId) {
            setPreselectedCategoryId(cat.id_categoria);
        }
        if (setTab) {
            setTab('inventario');
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

    const filteredCategorias = categorias.filter(cat => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return true;
        const nombre = (cat.nombre || '').toLowerCase();
        const descripcion = (cat.descripcion || '').toLowerCase();
        return nombre.includes(term) || descripcion.includes(term);
    });

    const sortedCategorias = [...filteredCategorias].sort((a, b) => {
        const { key, direction } = sortConfig;
        const multiplier = direction === 'asc' ? 1 : -1;

        if (key === 'id_categoria') {
            const av = Number(a.id_categoria) || 0;
            const bv = Number(b.id_categoria) || 0;
            return (av - bv) * multiplier;
        }

        const av = (a[key] || '').toString().toLowerCase();
        const bv = (b[key] || '').toString().toLowerCase();
        return av.localeCompare(bv) * multiplier;
    });

    return (
        <div className="categorias-container">
            <div className="header-actions">
                <h2>Categorías de Vehículos</h2>
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Filtrar por nombre o descripción..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="btn-primary" onClick={openCreateModal}>
                    + Nueva Categoría
                </button>
            </div>

            {loading ? (
                <div className="loading">Cargando categorías...</div>
            ) : (
                <div className="categorias-table-wrapper">
                    <table className="categorias-table">
                        <thead>
                            <tr>
                                <th className="sortable" onClick={() => requestSort('id_categoria')}>
                                    ID <span className="sort-indicator">{getSortIndicator('id_categoria')}</span>
                                </th>
                                <th className="sortable" onClick={() => requestSort('nombre')}>
                                    Nombre <span className="sort-indicator">{getSortIndicator('nombre')}</span>
                                </th>
                                <th className="sortable" onClick={() => requestSort('descripcion')}>
                                    Descripción <span className="sort-indicator">{getSortIndicator('descripcion')}</span>
                                </th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedCategorias.map(cat => (
                                <tr key={cat.id_categoria}>
                                    <td>{cat.id_categoria}</td>
                                    <td>{cat.nombre}</td>
                                    <td>{cat.descripcion || ''}</td>
                                    <td>
                                        <div className="actions-cell">
                                            <button className="btn-inventario" onClick={() => handleVerInventario(cat)} title="Ver Inventario">🚗</button>
                                            <button className="btn-edit" onClick={() => openEditModal(cat)} title="Editar">✏️</button>
                                            <button className="btn-delete" onClick={() => handleDelete(cat)} title="Eliminar">🗑️</button>
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
                        <h3>{editingCategoria ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
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

export default CategoriasPlaya;
