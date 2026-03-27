
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TiposGastos.css';

const HistorialPropietarios = () => {
    const [registros, setRegistros] = useState([]);
    const [vehiculos, setVehiculos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRegistro, setEditingRegistro] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [formData, setFormData] = useState({
        id_producto: '',
        nombre_propietario: '',
        documento: '',
        matricula: '',
        tipo_documentacion: '',
        documentacion_detalle: '',
        observaciones: '',
        fecha_adquisicion: '',
        fecha_venta: '',
        activo: true
    });

    const API_URL = import.meta.env.VITE_REACT_APP_API_URL || '/api';

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = sessionStorage.getItem('token');
            const [regRes, vehRes] = await Promise.all([
                axios.get(`${API_URL}/playa/propietarios`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get(`${API_URL}/playa/vehiculos`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);
            setRegistros(regRes.data);
            setVehiculos(vehRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = sessionStorage.getItem('token');
            const dataToSave = {
                ...formData,
                id_producto: formData.id_producto ? parseInt(formData.id_producto) : null,
                fecha_adquisicion: formData.fecha_adquisicion || null,
                fecha_venta: formData.fecha_venta || null
            };

            if (editingRegistro) {
                await axios.put(`${API_URL}/playa/propietarios/${editingRegistro.id_historial}`, dataToSave, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${API_URL}/playa/propietarios`, dataToSave, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            fetchData();
            closeModal();
        } catch (error) {
            console.error('Error saving owner history:', error);
            alert('Error al guardar el registro');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Está seguro de eliminar este registro?')) return;
        try {
            const token = sessionStorage.getItem('token');
            await axios.delete(`${API_URL}/playa/propietarios/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch (error) {
            console.error('Error deleting record:', error);
            alert('Error al eliminar el registro');
        }
    };

    const openModal = (reg = null) => {
        if (reg) {
            setEditingRegistro(reg);
            setFormData({
                id_producto: reg.id_producto || '',
                nombre_propietario: reg.nombre_propietario,
                documento: reg.documento || '',
                matricula: reg.matricula || '',
                tipo_documentacion: reg.tipo_documentacion || '',
                documentacion_detalle: reg.documentacion_detalle || '',
                observaciones: reg.observaciones || '',
                fecha_adquisicion: reg.fecha_adquisicion || '',
                fecha_venta: reg.fecha_venta || '',
                activo: reg.activo
            });
        } else {
            setEditingRegistro(null);
            setFormData({
                id_producto: '',
                nombre_propietario: '',
                documento: '',
                matricula: '',
                tipo_documentacion: '',
                documentacion_detalle: '',
                observaciones: '',
                fecha_adquisicion: '',
                fecha_venta: '',
                activo: true
            });
        }
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingRegistro(null);
    };

    const filteredRegistros = registros.filter(r => 
        r.nombre_propietario.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.documento && r.documento.includes(searchTerm)) ||
        (r.matricula && r.matricula.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getVehiculoLabel = (id) => {
        const v = vehiculos.find(veh => veh.id_producto === id);
        return v ? `${v.marca} ${v.modelo} (${v.año}) - ${v.chasis}` : 'No vinculado';
    };

    return (
        <div className="tipos-gastos-container">
            <div className="header-actions">
                <div className="title-section">
                    <h2>Historial de Propietarios</h2>
                    <p className="subtitle">Gestión de la documentación y propiedad histórica de los vehículos</p>
                </div>
                <button className="btn-primary" onClick={() => openModal()}>
                    + Agregar Registro
                </button>
            </div>

            <div className="search-bar" style={{ marginBottom: '20px' }}>
                <input 
                    type="text" 
                    placeholder="Buscar por nombre, documento o matrícula..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="loading">Cargando datos...</div>
            ) : (
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Propietario</th>
                                <th>Documento</th>
                                <th>Vehículo</th>
                                <th>Matrícula</th>
                                <th>Documentación</th>
                                <th>Periodo</th>
                                <th className="text-center">Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRegistros.map(r => (
                                <tr key={r.id_historial}>
                                    <td><strong>{r.nombre_propietario}</strong></td>
                                    <td>{r.documento || '-'}</td>
                                    <td style={{ fontSize: '0.85em' }}>{getVehiculoLabel(r.id_producto)}</td>
                                    <td><span className="badge-matricula">{r.matricula || '-'}</span></td>
                                    <td>
                                        <div style={{ fontWeight: '600', color: '#0369a1' }}>{r.tipo_documentacion}</div>
                                        <div style={{ fontSize: '0.8em', color: '#64748b' }}>{r.documentacion_detalle}</div>
                                    </td>
                                    <td style={{ fontSize: '0.85em' }}>
                                        {r.fecha_adquisicion ? new Date(r.fecha_adquisicion).toLocaleDateString() : '?'} 
                                        {' ➔ '} 
                                        {r.fecha_venta ? new Date(r.fecha_venta).toLocaleDateString() : 'Presente'}
                                    </td>
                                    <td className="text-center">
                                        <span className={`tg-status-badge ${r.activo ? 'active' : 'inactive'}`}>
                                            {r.activo ? 'Vigente' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="actions-cell">
                                            <button className="btn-edit" onClick={() => openModal(r)} title="Editar">✏️</button>
                                            <button className="btn-delete" onClick={() => handleDelete(r.id_historial)} title="Eliminar">🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredRegistros.length === 0 && (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                        No se encontraron registros de propiedad.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {modalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ width: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3>{editingRegistro ? 'Editar Registro de Propiedad' : 'Nuevo Registro de Propiedad'}</h3>
                        <form onSubmit={handleSubmit} className="owner-form">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="form-group">
                                    <label>Nombre del Propietario *</label>
                                    <input
                                        type="text"
                                        value={formData.nombre_propietario}
                                        onChange={e => setFormData({ ...formData, nombre_propietario: e.target.value })}
                                        required
                                        placeholder="Nombre completo o Razón Social"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Documento (Cédula/RUC)</label>
                                    <input
                                        type="text"
                                        value={formData.documento}
                                        onChange={e => setFormData({ ...formData, documento: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Vehículo Asociado</label>
                                    <select
                                        value={formData.id_producto}
                                        onChange={e => setFormData({ ...formData, id_producto: e.target.value })}
                                    >
                                        <option value="">-- Seleccionar Vehículo --</option>
                                        {vehiculos.map(v => (
                                            <option key={v.id_producto} value={v.id_producto}>
                                                {v.marca} {v.modelo} ({v.año}) - {v.chasis}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Matrícula / Chapa</label>
                                    <input
                                        type="text"
                                        value={formData.matricula}
                                        onChange={e => setFormData({ ...formData, matricula: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Tipo de Documentación</label>
                                    <select
                                        value={formData.tipo_documentacion}
                                        onChange={e => setFormData({ ...formData, tipo_documentacion: e.target.value })}
                                    >
                                        <option value="">-- Seleccionar --</option>
                                        <option value="CONTRATO PRIVADO">Contrato Privado</option>
                                        <option value="TITULO DE PROPIEDAD">Título de Propiedad</option>
                                        <option value="CESION DE DERECHOS">Cesión de Derechos</option>
                                        <option value="ESCRITURA PUBLICA">Escritura Pública</option>
                                        <option value="OTROS">Otros</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Detalle de Documentación</label>
                                    <input
                                        type="text"
                                        value={formData.documentacion_detalle}
                                        onChange={e => setFormData({ ...formData, documentacion_detalle: e.target.value })}
                                        placeholder="Ej: Contrato Nro 123, Firmado en fecha..."
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Fecha Adquisición</label>
                                    <input
                                        type="date"
                                        value={formData.fecha_adquisicion}
                                        onChange={e => setFormData({ ...formData, fecha_adquisicion: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Fecha Venta / Fin Propiedad</label>
                                    <input
                                        type="date"
                                        value={formData.fecha_venta}
                                        onChange={e => setFormData({ ...formData, fecha_venta: e.target.value })}
                                    />
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label>Observaciones</label>
                                <textarea
                                    value={formData.observaciones}
                                    onChange={e => setFormData({ ...formData, observaciones: e.target.value })}
                                    rows="3"
                                />
                            </div>

                            <div className="form-check">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={formData.activo}
                                        onChange={e => setFormData({ ...formData, activo: e.target.checked })}
                                    />
                                    Registro Vigente
                                </label>
                            </div>

                            <div className="modal-actions" style={{ marginTop: '20px' }}>
                                <button type="button" className="btn-cancel" onClick={closeModal}>Cancelar</button>
                                <button type="submit" className="btn-save">Guardar Registro</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            <style jsx="true">{`
                .badge-matricula {
                    background: #f1f5f9;
                    padding: 2px 8px;
                    border-radius: 4px;
                    border: 1px solid #e2e8f0;
                    font-family: monospace;
                    font-weight: bold;
                }
                .owner-form label {
                    font-weight: 600;
                    color: #475569;
                }
                .subtitle {
                    color: #64748b;
                    font-size: 0.9em;
                    margin: 0;
                }
            `}</style>
        </div>
    );
};

export default HistorialPropietarios;
