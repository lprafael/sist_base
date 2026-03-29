import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './TiposGastos.css';

const CatalogoModelos = () => {
    const [rows, setRows] = useState([]);
    const [marcas, setMarcas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({ id_marca: '', nombre: '', activo: true });

    const API_URL = import.meta.env.VITE_REACT_APP_API_URL || '/api';

    const fetchRows = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const [resModelos, resMarcas] = await Promise.all([
                axios.get(`${API_URL}/playa/catalogo/modelos?todo=true`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get(`${API_URL}/playa/catalogo/marcas?todo=true`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);
            setRows(resModelos.data);
            setMarcas(resMarcas.data);
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

    const marcaNombre = (id) => {
        const m = marcas.find(x => x.id_marca === id);
        return m ? m.nombre : id;
    };

    const openCreate = async () => {
        setEditing(null);
        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.get(`${API_URL}/playa/catalogo/marcas?todo=true`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const list = res.data;
            setMarcas(list);
            const first = list[0]?.id_marca;
            setFormData({ id_marca: first ? String(first) : '', nombre: '', activo: true });
            setShowModal(true);
        } catch (e) {
            alert(e.response?.data?.detail || e.message);
        }
    };

    const openEdit = async (row) => {
        setEditing(row);
        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.get(`${API_URL}/playa/catalogo/marcas?todo=true`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMarcas(res.data);
            setFormData({
                id_marca: String(row.id_marca),
                nombre: row.nombre || '',
                activo: row.activo !== false
            });
            setShowModal(true);
        } catch (e) {
            alert(e.response?.data?.detail || e.message);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setEditing(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const id_marca = parseInt(formData.id_marca, 10);
        if (!id_marca) {
            alert('Seleccione una marca.');
            return;
        }
        try {
            const token = sessionStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            const payload = { id_marca, nombre: formData.nombre, activo: formData.activo };
            if (editing) {
                await axios.put(`${API_URL}/playa/catalogo/modelos/${editing.id_modelo}`, payload, { headers });
            } else {
                await axios.post(`${API_URL}/playa/catalogo/modelos`, payload, { headers });
            }
            closeModal();
            fetchRows();
        } catch (error) {
            alert(error.response?.data?.detail || error.message);
        }
    };

    const handleDelete = async (row) => {
        if (!confirm(`¿Eliminar el modelo "${row.nombre}"?`)) return;
        try {
            const token = sessionStorage.getItem('token');
            await axios.delete(`${API_URL}/playa/catalogo/modelos/${row.id_modelo}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchRows();
        } catch (error) {
            alert(error.response?.data?.detail || error.message);
        }
    };

    const term = searchTerm.trim().toLowerCase();
    const filtered = rows.filter(r => {
        if (!term) return true;
        const n = (r.nombre || '').toLowerCase();
        const m = (marcaNombre(r.id_marca) || '').toLowerCase();
        return n.includes(term) || m.includes(term);
    });

    return (
        <div className="tipos-gastos-container">
            <div className="header-actions">
                <h2>Modelos (catálogo general)</h2>
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Buscar marca o modelo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="btn-primary" onClick={openCreate} disabled={!marcas.length && !loading}>+ Nuevo</button>
            </div>

            {!marcas.length && !loading && (
                <p className="text-muted" style={{ padding: '8px 0' }}>Cree al menos una marca antes de agregar modelos.</p>
            )}

            {loading ? (
                <div className="loading">Cargando...</div>
            ) : (
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Marca</th>
                                <th>Modelo</th>
                                <th style={{ textAlign: 'center' }}>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(item => (
                                <tr key={item.id_modelo}>
                                    <td>{item.id_modelo}</td>
                                    <td>{marcaNombre(item.id_marca)}</td>
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
                        <h3>{editing ? 'Editar modelo' : 'Nuevo modelo'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Marca</label>
                                <select
                                    value={formData.id_marca}
                                    onChange={(e) => setFormData({ ...formData, id_marca: e.target.value })}
                                    required
                                >
                                    <option value="">— Seleccionar —</option>
                                    {marcas.map(m => (
                                        <option key={m.id_marca} value={m.id_marca}>{m.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Nombre del modelo</label>
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
                                    id="chkActivoModelo"
                                    checked={formData.activo}
                                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                                />
                                <label htmlFor="chkActivoModelo">Activo</label>
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

export default CatalogoModelos;
