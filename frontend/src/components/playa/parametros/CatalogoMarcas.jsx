import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './TiposGastos.css';

const CatalogoMarcas = () => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({ nombre: '', activo: true });

    const API_URL = import.meta.env.VITE_REACT_APP_API_URL || '/api';

    const fetchRows = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.get(`${API_URL}/playa/catalogo/marcas?todo=true`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRows(res.data);
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.detail || error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRows();
    }, []);

    const openCreate = () => {
        setEditing(null);
        setFormData({ nombre: '', activo: true });
        setShowModal(true);
    };

    const openEdit = (row) => {
        setEditing(row);
        setFormData({ nombre: row.nombre || '', activo: row.activo !== false });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditing(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = sessionStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            if (editing) {
                await axios.put(`${API_URL}/playa/catalogo/marcas/${editing.id_marca}`, formData, { headers });
            } else {
                await axios.post(`${API_URL}/playa/catalogo/marcas`, formData, { headers });
            }
            closeModal();
            fetchRows();
        } catch (error) {
            alert(error.response?.data?.detail || error.message);
        }
    };

    const handleDelete = async (row) => {
        if (!confirm(`¿Eliminar la marca "${row.nombre}"?`)) return;
        try {
            const token = sessionStorage.getItem('token');
            await axios.delete(`${API_URL}/playa/catalogo/marcas/${row.id_marca}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchRows();
        } catch (error) {
            alert(error.response?.data?.detail || error.message);
        }
    };

    const term = searchTerm.trim().toLowerCase();
    const filtered = rows.filter(r => !term || (r.nombre || '').toLowerCase().includes(term));

    return (
        <div className="tipos-gastos-container">
            <div className="header-actions">
                <h2>Marcas (catálogo general)</h2>
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="btn-primary" onClick={openCreate}>+ Nueva</button>
            </div>

            {loading ? (
                <div className="loading">Cargando...</div>
            ) : (
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nombre</th>
                                <th style={{ textAlign: 'center' }}>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(item => (
                                <tr key={item.id_marca}>
                                    <td>{item.id_marca}</td>
                                    <td>{item.nombre}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className={`tg-status-badge ${item.activo ? 'active' : 'inactive'}`}>
                                            {item.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="actions-cell">
                                            <button className="btn-edit" onClick={() => openEdit(item)} title="Editar">✏️</button>
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
                        <h3>{editing ? 'Editar marca' : 'Nueva marca'}</h3>
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
                            <div className="form-check">
                                <input
                                    type="checkbox"
                                    id="chkActivoMarca"
                                    checked={formData.activo}
                                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                                />
                                <label htmlFor="chkActivoMarca">Activo</label>
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

export default CatalogoMarcas;
