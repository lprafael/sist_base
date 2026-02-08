import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TiposGastos.css'; // Reutilizamos estilos

const VendedoresPlaya = () => {
    const [vendedores, setVendedores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingVendedor, setEditingVendedor] = useState(null);
    const [formData, setFormData] = useState({
        nombre: '',
        apellido: '',
        telefono: '',
        email: '',
        activo: true
    });

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

    useEffect(() => {
        fetchVendedores();
    }, []);

    const fetchVendedores = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/playa/vendedores`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setVendedores(res.data);
        } catch (error) {
            console.error('Error fetching vendedores:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            if (editingVendedor) {
                await axios.put(`${API_URL}/playa/vendedores/${editingVendedor.id_vendedor}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${API_URL}/playa/vendedores`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            fetchVendedores();
            closeModal();
        } catch (error) {
            console.error('Error saving vendedor:', error);
            alert('Error al guardar el vendedor');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Está seguro de eliminar este vendedor?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/playa/vendedores/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchVendedores();
        } catch (error) {
            console.error('Error deleting vendedor:', error);
            alert('Error al eliminar vendedor');
        }
    };

    const openModal = (vendedor = null) => {
        if (vendedor) {
            setEditingVendedor(vendedor);
            setFormData({
                nombre: vendedor.nombre,
                apellido: vendedor.apellido,
                telefono: vendedor.telefono || '',
                email: vendedor.email || '',
                activo: vendedor.activo
            });
        } else {
            setEditingVendedor(null);
            setFormData({
                nombre: '',
                apellido: '',
                telefono: '',
                email: '',
                activo: true
            });
        }
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingVendedor(null);
    };

    return (
        <div className="tipos-gastos-container">
            <div className="header-actions">
                <h2>Gestión de Vendedores</h2>
                <button className="btn-primary" onClick={() => openModal()}>
                    + Nuevo Vendedor
                </button>
            </div>

            {loading ? (
                <div className="loading">Cargando...</div>
            ) : (
                <div className="table-container">
                    <table className="tipos-table">
                        <thead>
                            <tr>
                                <th>Nombre Completo</th>
                                <th>Teléfono</th>
                                <th>Email</th>
                                <th style={{ textAlign: 'center' }}>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vendedores.map(v => (
                                <tr key={v.id_vendedor}>
                                    <td><strong>{v.nombre} {v.apellido}</strong></td>
                                    <td>{v.telefono || '-'}</td>
                                    <td>{v.email || '-'}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className={`tg-status-badge ${v.activo ? 'active' : 'inactive'}`}>
                                            {v.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="actions">
                                            <button className="btn-edit" onClick={() => openModal(v)}>✏️</button>
                                            <button className="btn-delete" onClick={() => handleDelete(v.id_vendedor)}>🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {modalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>{editingVendedor ? 'Editar Vendedor' : 'Nuevo Vendedor'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Nombre *</label>
                                <input
                                    type="text"
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Apellido *</label>
                                <input
                                    type="text"
                                    value={formData.apellido}
                                    onChange={e => setFormData({ ...formData, apellido: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Teléfono</label>
                                <input
                                    type="text"
                                    value={formData.telefono}
                                    onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="form-group checkbox">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={formData.activo}
                                        onChange={e => setFormData({ ...formData, activo: e.target.checked })}
                                    />
                                    Activo
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

export default VendedoresPlaya;
