import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './ConfigCalificacionesPlaya.css';

const ConfigCalificacionesPlaya = ({ setTab, setPreselectedCalificacion }) => {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingConfig, setEditingConfig] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'id_config', direction: 'asc' });

    const [formData, setFormData] = useState({
        nombre: '',
        dias_atraso_desde: '',
        dias_atraso_hasta: '',
        calificacion: '',
        descripcion: '',
        activo: true
    });

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/playa/config-calificaciones`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setConfigs(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching configs:', error);
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingConfig(null);
        setFormData({
            nombre: '',
            dias_atraso_desde: '',
            dias_atraso_hasta: '',
            calificacion: '',
            descripcion: '',
            activo: true
        });
        setShowModal(true);
    };

    const openEditModal = (config) => {
        setEditingConfig(config);
        setFormData({
            nombre: config.nombre,
            dias_atraso_desde: config.dias_atraso_desde,
            dias_atraso_hasta: config.dias_atraso_hasta || '',
            calificacion: config.calificacion,
            descripcion: config.descripcion || '',
            activo: config.activo
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingConfig(null);
        setFormData({
            nombre: '',
            dias_atraso_desde: '',
            dias_atraso_hasta: '',
            calificacion: '',
            descripcion: '',
            activo: true
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const payload = {
                ...formData,
                dias_atraso_desde: parseInt(formData.dias_atraso_desde),
                dias_atraso_hasta: formData.dias_atraso_hasta ? parseInt(formData.dias_atraso_hasta) : null,
                activo: Boolean(formData.activo)
            };
            if (editingConfig) {
                await axios.put(`${API_URL}/playa/config-calificaciones/${editingConfig.id_config}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${API_URL}/playa/config-calificaciones`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            fetchConfigs();
            closeModal();
        } catch (error) {
            alert('Error: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleDelete = async (config) => {
        if (!confirm(`¿Eliminar la configuración "${config.nombre}"?`)) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/playa/config-calificaciones/${config.id_config}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchConfigs();
        } catch (error) {
            alert('Error: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleVerClientes = (config) => {
        if (setPreselectedCalificacion) {
            setPreselectedCalificacion(config.calificacion);
        }
        if (setTab) {
            setTab('clientes_playa');
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
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
    };

    const sortedConfigs = React.useMemo(() => {
        let sortable = [...configs];
        if (sortConfig.key) {
            sortable.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];
                if (typeof aVal === 'string') aVal = aVal.toLowerCase();
                if (typeof bVal === 'string') bVal = bVal.toLowerCase();
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortable;
    }, [configs, sortConfig]);

    const filteredConfigs = sortedConfigs.filter(config =>
        config.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        config.calificacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (config.descripcion && config.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) {
        return <div className="loading">Cargando configuraciones...</div>;
    }

    return (
        <div className="config-calificaciones-container">
            <div className="header-actions">
                <h2>Configuración de Calificaciones</h2>
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Buscar por nombre, calificación o descripción..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="btn-primary" onClick={openCreateModal}>
                    + Nueva Configuración
                </button>
            </div>

            {filteredConfigs.length === 0 ? (
                <div className="no-data">
                    {searchTerm ? 'No se encontraron configuraciones que coincidan con la búsqueda.' : 'No hay configuraciones registradas.'}
                </div>
            ) : (
                <div className="config-calificaciones-table-wrapper">
                    <table className="config-calificaciones-table">
                        <thead>
                            <tr>
                                <th className="sortable" onClick={() => requestSort('id_config')}>
                                    ID{getSortIndicator('id_config')}
                                </th>
                                <th className="sortable" onClick={() => requestSort('nombre')}>
                                    Nombre{getSortIndicator('nombre')}
                                </th>
                                <th className="sortable" onClick={() => requestSort('dias_atraso_desde')}>
                                    Días Atraso Desde{getSortIndicator('dias_atraso_desde')}
                                </th>
                                <th className="sortable" onClick={() => requestSort('dias_atraso_hasta')}>
                                    Días Atraso Hasta{getSortIndicator('dias_atraso_hasta')}
                                </th>
                                <th className="sortable" onClick={() => requestSort('calificacion')}>
                                    Calificación{getSortIndicator('calificacion')}
                                </th>
                                <th>Descripción</th>
                                <th className="sortable" onClick={() => requestSort('activo')}>
                                    Activo{getSortIndicator('activo')}
                                </th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredConfigs.map(config => (
                                <tr key={config.id_config}>
                                    <td>{config.id_config}</td>
                                    <td>{config.nombre}</td>
                                    <td>{config.dias_atraso_desde}</td>
                                    <td>{config.dias_atraso_hasta || '∞'}</td>
                                    <td>{config.calificacion}</td>
                                    <td>{config.descripcion || ''}</td>
                                    <td>{config.activo ? 'Sí' : 'No'}</td>
                                    <td>
                                        <div className="actions-cell">
                                            <button className="btn-clientes" onClick={() => handleVerClientes(config)} title="Ver Clientes">👥</button>
                                            <button className="btn-edit" onClick={() => openEditModal(config)} title="Editar">✏️</button>
                                            <button className="btn-delete" onClick={() => handleDelete(config)} title="Eliminar">🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>{editingConfig ? 'Editar Configuración' : 'Nueva Configuración'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Nombre</label>
                                <input
                                    type="text"
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Días Atraso Desde</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.dias_atraso_desde}
                                        onChange={e => setFormData({ ...formData, dias_atraso_desde: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Días Atraso Hasta (opcional)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.dias_atraso_hasta}
                                        onChange={e => setFormData({ ...formData, dias_atraso_hasta: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Calificación</label>
                                <input
                                    type="text"
                                    value={formData.calificacion}
                                    onChange={e => setFormData({ ...formData, calificacion: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Descripción</label>
                                <textarea
                                    value={formData.descripcion}
                                    onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <div className="form-group">
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
                                <button type="submit" className="btn-save">
                                    {editingConfig ? 'Actualizar' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConfigCalificacionesPlaya;
