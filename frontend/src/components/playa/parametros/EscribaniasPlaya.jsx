import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TiposGastos.css'; // Reutilizamos estilos

const EscribaniasPlaya = () => {
    const [escribanias, setEscribanias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingEscribania, setEditingEscribania] = useState(null);
    const [formData, setFormData] = useState({
        nombre: '',
        telefono: '',
        email: '',
        direccion: '',
        activo: true
    });

    const API_URL = import.meta.env.VITE_REACT_APP_API_URL || '/api';

    useEffect(() => {
        fetchEscribanias();
    }, []);

    const fetchEscribanias = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.get(`${API_URL}/playa/escribanias`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEscribanias(res.data);
        } catch (error) {
            console.error('Error fetching escribanias:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = sessionStorage.getItem('token');
            if (editingEscribania) {
                await axios.put(`${API_URL}/playa/escribanias/${editingEscribania.id_escribania}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${API_URL}/playa/escribanias`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            fetchEscribanias();
            closeModal();
        } catch (error) {
            console.error('Error saving escribania:', error);
            alert('Error al guardar la escribanía: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Está seguro de eliminar esta escribanía?')) return;
        try {
            const token = sessionStorage.getItem('token');
            await axios.delete(`${API_URL}/playa/escribanias/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchEscribanias();
        } catch (error) {
            console.error('Error deleting escribania:', error);
            alert('Error al eliminar escribanía: ' + (error.response?.data?.detail || error.message));
        }
    };

    const openModal = (escribania = null) => {
        if (escribania) {
            setEditingEscribania(escribania);
            setFormData({
                nombre: escribania.nombre,
                telefono: escribania.telefono || '',
                email: escribania.email || '',
                direccion: escribania.direccion || '',
                activo: escribania.activo
            });
        } else {
            setEditingEscribania(null);
            setFormData({
                nombre: '',
                telefono: '',
                email: '',
                direccion: '',
                activo: true
            });
        }
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingEscribania(null);
    };

    return (
        <div className="tipos-gastos-container">
            <div className="header-actions">
                <h2>Gestión de Escribanías</h2>
                <button className="btn-primary" onClick={() => openModal()}>
                    + Nueva Escribanía
                </button>
            </div>

            {loading ? (
                <div className="loading">Cargando...</div>
            ) : (
                <div className="table-container">
                    <table className="tipos-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Teléfono</th>
                                <th>Email</th>
                                <th>Dirección</th>
                                <th style={{ textAlign: 'center' }}>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {escribanias.map(e => (
                                <tr key={e.id_escribania}>
                                    <td><strong>{e.nombre}</strong></td>
                                    <td>{e.telefono || '-'}</td>
                                    <td>{e.email || '-'}</td>
                                    <td>{e.direccion || '-'}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className={`tg-status-badge ${e.activo ? 'active' : 'inactive'}`}>
                                            {e.activo ? 'Activa' : 'Inactiva'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="actions">
                                            <button className="btn-edit" onClick={() => openModal(e)}>✏️</button>
                                            <button className="btn-delete" onClick={() => handleDelete(e.id_escribania)}>🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {escribanias.length === 0 && (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No hay escribanías registradas</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {modalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>{editingEscribania ? 'Editar Escribanía' : 'Nueva Escribanía'}</h3>
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
                            <div className="form-group">
                                <label>Dirección</label>
                                <textarea
                                    value={formData.direccion}
                                    onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                                    rows="2"
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

export default EscribaniasPlaya;
