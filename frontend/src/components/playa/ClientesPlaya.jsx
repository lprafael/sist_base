import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ClientesPlaya.css';

const ClientesPlaya = () => {
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [newCliente, setNewCliente] = useState({
        tipo_documento: 'CI',
        numero_documento: '',
        nombre: '',
        apellido: '',
        celular: '',
        email: '',
        direccion: '',
        ciudad: ''
    });

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

    useEffect(() => {
        fetchClientes();
    }, []);

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

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/playa/clientes`, newCliente, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowModal(false);
            fetchClientes();
            setNewCliente({
                tipo_documento: 'CI',
                numero_documento: '',
                nombre: '',
                apellido: '',
                celular: '',
                email: '',
                direccion: '',
                ciudad: ''
            });
        } catch (error) {
            alert('Error al crear cliente: ' + (error.response?.data?.detail || error.message));
        }
    };

    const filteredClientes = clientes.filter(c =>
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.numero_documento.includes(searchTerm)
    );

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
                                <tr key={c.id_cliente}>
                                    <td>
                                        <div className="client-info">
                                            <span className="client-name">{c.nombre} {c.apellido}</span>
                                            <span className="client-email">{c.email}</span>
                                        </div>
                                    </td>
                                    <td>{c.tipo_documento}: {c.numero_documento}</td>
                                    <td>{c.celular}</td>
                                    <td>{c.ciudad}</td>
                                    <td>
                                        <span className={`calif-badge ${c.calificacion_actual.toLowerCase()}`}>
                                            {c.calificacion_actual}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="btn-action">Ver Perfil</button>
                                        <button className="btn-action">Ventas</button>
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
                        <h3>Registrar Nuevo Cliente</h3>
                        <form onSubmit={handleCreate}>
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
                                    <label>Celular</label>
                                    <input type="text" value={newCliente.celular} onChange={(e) => setNewCliente({ ...newCliente, celular: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input type="email" value={newCliente.email} onChange={(e) => setNewCliente({ ...newCliente, email: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Ciudad</label>
                                <input type="text" value={newCliente.ciudad} onChange={(e) => setNewCliente({ ...newCliente, ciudad: e.target.value })} />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-save">Registrar Cliente</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientesPlaya;
