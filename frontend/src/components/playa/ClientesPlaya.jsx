import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ClientesPlaya.css';

const ClientesPlaya = ({ preselectedCalificacion, setPreselectedCalificacion }) => {
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCalificacion, setSelectedCalificacion] = useState('');
    const [calificaciones, setCalificaciones] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [newCliente, setNewCliente] = useState({
        tipo_documento: 'CI',
        numero_documento: '',
        nombre: '',
        apellido: '',
        fecha_nacimiento: '',
        telefono: '',
        celular: '',
        email: '',
        direccion: '',
        ciudad: '',
        departamento: '',
        codigo_postal: '',
        estado_civil: '',
        profesion: '',
        lugar_trabajo: '',
        telefono_trabajo: '',
        ingreso_mensual: '',
        observaciones: '',
        activo: true
    });
    
    const [editingCliente, setEditingCliente] = useState(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

    useEffect(() => {
        fetchClientes();
        fetchCalificaciones();
    }, []);

    useEffect(() => {
        if (preselectedCalificacion) {
            setSelectedCalificacion(preselectedCalificacion);
            if (setPreselectedCalificacion) {
                setPreselectedCalificacion(null);
            }
        }
    }, [preselectedCalificacion]);

    const fetchCalificaciones = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/playa/config-calificaciones`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCalificaciones(response.data);
        } catch (error) {
            console.error('Error fetching calificaciones:', error);
        }
    };

    const fetchClientes = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/playa/clientes`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setClientes(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching clientes:', error);
            setLoading(false);
        }
    };

    const handleSaveCliente = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            
            // Limpiar datos vacíos antes de enviar
            const cleanedData = {};
            Object.keys(newCliente).forEach(key => {
                if (newCliente[key] !== '' && newCliente[key] !== null && newCliente[key] !== undefined) {
                    cleanedData[key] = newCliente[key];
                }
            });
            
            if (editingCliente) {
                await axios.put(`${API_URL}/playa/clientes/${editingCliente.id_cliente}`, cleanedData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${API_URL}/playa/clientes`, cleanedData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setShowModal(false);
            setEditingCliente(null);
            fetchClientes();
            setNewCliente({
                tipo_documento: 'CI',
                numero_documento: '',
                nombre: '',
                apellido: '',
                fecha_nacimiento: '',
                telefono: '',
                celular: '',
                email: '',
                direccion: '',
                ciudad: '',
                departamento: '',
                codigo_postal: '',
                estado_civil: '',
                profesion: '',
                lugar_trabajo: '',
                telefono_trabajo: '',
                ingreso_mensual: '',
                observaciones: '',
                activo: true
            });
        } catch (error) {
            alert('Error: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleEditCliente = (cliente) => {
        setEditingCliente(cliente);
        setNewCliente({
            tipo_documento: cliente.tipo_documento || 'CI',
            numero_documento: cliente.numero_documento || '',
            nombre: cliente.nombre || '',
            apellido: cliente.apellido || '',
            fecha_nacimiento: cliente.fecha_nacimiento || '',
            telefono: cliente.telefono || '',
            celular: cliente.celular || '',
            email: cliente.email || '',
            direccion: cliente.direccion || '',
            ciudad: cliente.ciudad || '',
            departamento: cliente.departamento || '',
            codigo_postal: cliente.codigo_postal || '',
            estado_civil: cliente.estado_civil || '',
            profesion: cliente.profesion || '',
            lugar_trabajo: cliente.lugar_trabajo || '',
            telefono_trabajo: cliente.telefono_trabajo || '',
            ingreso_mensual: cliente.ingreso_mensual || '',
            observaciones: cliente.observaciones || '',
            activo: cliente.activo !== undefined ? cliente.activo : true
        });
        setShowModal(true);
    };

    const handleDeleteCliente = async (id) => {
        if (!confirm('¿Está seguro de eliminar este cliente?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/playa/clientes/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchClientes();
        } catch (error) {
            alert('Error: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingCliente(null);
        setNewCliente({
            tipo_documento: 'CI',
            numero_documento: '',
            nombre: '',
            apellido: '',
            fecha_nacimiento: '',
            telefono: '',
            celular: '',
            email: '',
            direccion: '',
            ciudad: '',
            departamento: '',
            codigo_postal: '',
            estado_civil: '',
            profesion: '',
            lugar_trabajo: '',
            telefono_trabajo: '',
            ingreso_mensual: '',
            observaciones: '',
            activo: true
        });
    };

    const filteredClientes = clientes.filter(c => {
        const term = searchTerm.toLowerCase();
        const matchText =
            (c.nombre || '').toLowerCase().includes(term) ||
            (c.apellido || '').toLowerCase().includes(term) ||
            (c.numero_documento || '').toLowerCase().includes(term);
        const matchCalificacion = selectedCalificacion
            ? (c.calificacion_actual || '').toLowerCase() === selectedCalificacion.toLowerCase()
            : true;
        return matchText && matchCalificacion;
    });

    const getRowColorByCalificacion = (calificacion) => {
        if (!calificacion) return '';
        
        const calif = calificacion.toLowerCase();
        switch(calif) {
            case 'malo':
                return 'row-red'; // Rojo
            case 'regular':
                return 'row-light-red'; // Rojo claro
            case 'regular-bajo':
                return 'row-orange'; // Naranja
            case 'bueno':
                return 'row-yellow'; // Amarillo
            case 'excelente':
                return 'row-green'; // Verde
            default:
                return ''; // Sin color para NUEVO u otros
        }
    };

    return (
        <div className="clientes-container">
            <div className="header-actions">
                <h2>Directorio de Clientes</h2>
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Buscar por nombre, apellido o documento..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="calificacion-filter">
                    <select value={selectedCalificacion} onChange={(e) => setSelectedCalificacion(e.target.value)}>
                        <option value="">Todas las calificaciones</option>
                        {calificaciones.map(cal => (
                            <option key={cal.id_config} value={cal.calificacion}>
                                {cal.calificacion}
                            </option>
                        ))}
                    </select>
                </div>
                <button className="btn-primary" onClick={() => setShowModal(true)}>
                    + Nuevo Cliente
                </button>
            </div>

            {loading ? (
                <div className="loading">Cargando clientes...</div>
            ) : (
                <div className="table-responsive">
                    <table className="clientes-table">
                        <thead>
                            <tr>
                                <th>Nombre Completo</th>
                                <th>Documento</th>
                                <th>Celular</th>
                                <th>Ciudad</th>
                                <th>Calificación</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClientes.map(c => (
                                <tr key={c.id_cliente} className={getRowColorByCalificacion(c.calificacion_actual)}>
                                    <td>
                                        <div className="client-info">
                                            <span className="client-name">{c.nombre || ''} {c.apellido || ''}</span>
                                            <span className="client-email">{c.email || ''}</span>
                                        </div>
                                    </td>
                                    <td>{c.tipo_documento || ''}: {c.numero_documento || ''}</td>
                                    <td>{c.celular || ''}</td>
                                    <td>{c.ciudad || ''}</td>
                                    <td>
                                        <span className={`calif-badge ${(c.calificacion_actual || 'NUEVO').toLowerCase()}`}>
                                            {c.calificacion_actual || 'NUEVO'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="actions-cell">
                                            <button className="btn-edit" onClick={() => handleEditCliente(c)} title="Editar">
                                                ✏️
                                            </button>
                                            <button className="btn-delete" onClick={() => handleDeleteCliente(c.id_cliente)} title="Eliminar">
                                                🗑️
                                            </button>
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
                        <h3>{editingCliente ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}</h3>
                        <form onSubmit={handleSaveCliente}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Tipo Doc.</label>
                                    <select value={newCliente.tipo_documento} onChange={(e) => setNewCliente({ ...newCliente, tipo_documento: e.target.value })}>
                                        <option value="CI">CI</option>
                                        <option value="RUC">RUC</option>
                                        <option value="PASAPORTE">Pasaporte</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Número Documento</label>
                                    <input type="text" required value={newCliente.numero_documento} onChange={(e) => setNewCliente({ ...newCliente, numero_documento: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Nombre</label>
                                    <input type="text" required value={newCliente.nombre} onChange={(e) => setNewCliente({ ...newCliente, nombre: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Apellido</label>
                                    <input type="text" required value={newCliente.apellido} onChange={(e) => setNewCliente({ ...newCliente, apellido: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Fecha Nacimiento</label>
                                    <input type="date" value={newCliente.fecha_nacimiento} onChange={(e) => setNewCliente({ ...newCliente, fecha_nacimiento: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Estado Civil</label>
                                    <select value={newCliente.estado_civil} onChange={(e) => setNewCliente({ ...newCliente, estado_civil: e.target.value })}>
                                        <option value="">Seleccionar</option>
                                        <option value="Soltero/a">Soltero/a</option>
                                        <option value="Casado/a">Casado/a</option>
                                        <option value="Divorciado/a">Divorciado/a</option>
                                        <option value="Viudo/a">Viudo/a</option>
                                        <option value="Unión Libre">Unión Libre</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Teléfono</label>
                                    <input type="text" value={newCliente.telefono} onChange={(e) => setNewCliente({ ...newCliente, telefono: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Celular</label>
                                    <input type="text" value={newCliente.celular} onChange={(e) => setNewCliente({ ...newCliente, celular: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Email</label>
                                    <input type="email" value={newCliente.email} onChange={(e) => setNewCliente({ ...newCliente, email: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Código Postal</label>
                                    <input type="text" value={newCliente.codigo_postal} onChange={(e) => setNewCliente({ ...newCliente, codigo_postal: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Dirección</label>
                                <input type="text" value={newCliente.direccion} onChange={(e) => setNewCliente({ ...newCliente, direccion: e.target.value })} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Ciudad</label>
                                    <input type="text" value={newCliente.ciudad} onChange={(e) => setNewCliente({ ...newCliente, ciudad: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Departamento</label>
                                    <input type="text" value={newCliente.departamento} onChange={(e) => setNewCliente({ ...newCliente, departamento: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Profesión</label>
                                    <input type="text" value={newCliente.profesion} onChange={(e) => setNewCliente({ ...newCliente, profesion: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Lugar Trabajo</label>
                                    <input type="text" value={newCliente.lugar_trabajo} onChange={(e) => setNewCliente({ ...newCliente, lugar_trabajo: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Teléfono Trabajo</label>
                                    <input type="text" value={newCliente.telefono_trabajo} onChange={(e) => setNewCliente({ ...newCliente, telefono_trabajo: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Ingreso Mensual</label>
                                    <input type="number" step="0.01" value={newCliente.ingreso_mensual} onChange={(e) => setNewCliente({ ...newCliente, ingreso_mensual: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Observaciones</label>
                                <textarea value={newCliente.observaciones} onChange={(e) => setNewCliente({ ...newCliente, observaciones: e.target.value })} rows="3"></textarea>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={handleCloseModal}>Cancelar</button>
                                <button type="submit" className="btn-save">{editingCliente ? 'Actualizar Cliente' : 'Registrar Cliente'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientesPlaya;
