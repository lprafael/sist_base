import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './VehiculosPlaya.css';

const VehiculosPlaya = () => {
    const [vehiculos, setVehiculos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [categorias, setCategorias] = useState([]);
    const [newVehiculo, setNewVehiculo] = useState({
        id_categoria: '',
        marca: '',
        modelo: '',
        año: new Date().getFullYear(),
        chasis: '',
        costo_base: '',
        precio_venta_sugerido: '',
        estado_disponibilidad: 'DISPONIBLE'
    });

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

    useEffect(() => {
        fetchVehiculos();
        fetchCategorias();
    }, []);

    const fetchVehiculos = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/playa/vehiculos`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setVehiculos(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching vehiculos:', error);
            setLoading(false);
        }
    };

    const fetchCategorias = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/playa/categorias`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCategorias(response.data);
        } catch (error) {
            console.error('Error fetching categorias:', error);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/playa/vehiculos`, newVehiculo, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowModal(false);
            fetchVehiculos();
            setNewVehiculo({
                id_categoria: '',
                marca: '',
                modelo: '',
                año: new Date().getFullYear(),
                chasis: '',
                costo_base: '',
                precio_venta_sugerido: '',
                estado_disponibilidad: 'DISPONIBLE'
            });
        } catch (error) {
            alert('Error al crear vehículo: ' + (error.response?.data?.detail || error.message));
        }
    };

    const filteredVehiculos = vehiculos.filter(v => 
        v.marca.toLowerCase().includes(searchTerm.toLowerCase()) || 
        v.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.chasis.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="playa-container">
            <div className="header-actions">
                <h2>Inventario de Vehículos</h2>
                <div className="search-bar">
                    <input 
                        type="text" 
                        placeholder="Buscar por marca, modelo o chasis..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="btn-primary" onClick={() => setShowModal(true)}>
                    + Nuevo Vehículo
                </button>
            </div>

            {loading ? (
                <div className="loading">Cargando unidades...</div>
            ) : (
                <div className="vehiculos-grid">
                    {filteredVehiculos.map(v => (
                        <div key={v.id_producto} className="vehiculo-card">
                            <div className="card-header">
                                <span className={`status-badge ${v.estado_disponibilidad.toLowerCase()}`}>
                                    {v.estado_disponibilidad}
                                </span>
                                <h3>{v.marca} {v.modelo}</h3>
                                <p className="year">{v.año}</p>
                            </div>
                            <div className="card-body">
                                <p><strong>Chasis:</strong> {v.chasis}</p>
                                <p><strong>Precio Sugerido:</strong> 
                                    <span className="price"> ${parseFloat(v.precio_venta_sugerido).toLocaleString()}</span>
                                </p>
                            </div>
                            <div className="card-footer">
                                <button className="btn-outline">Ver Detalles</button>
                                <button className="btn-sell">Vender</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Registrar Nuevo Vehículo</h3>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label>Categoría</label>
                                <select 
                                    value={newVehiculo.id_categoria} 
                                    onChange={(e) => setNewVehiculo({...newVehiculo, id_categoria: e.target.value})}
                                    required
                                >
                                    <option value="">Seleccione categoría</option>
                                    {categorias.map(c => (
                                        <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Marca</label>
                                    <input type="text" required value={newVehiculo.marca} onChange={(e) => setNewVehiculo({...newVehiculo, marca: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>Modelo</label>
                                    <input type="text" required value={newVehiculo.modelo} onChange={(e) => setNewVehiculo({...newVehiculo, modelo: e.target.value})} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Año</label>
                                    <input type="number" required value={newVehiculo.año} onChange={(e) => setNewVehiculo({...newVehiculo, año: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>Chasis</label>
                                    <input type="text" required value={newVehiculo.chasis} onChange={(e) => setNewVehiculo({...newVehiculo, chasis: e.target.value})} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Costo Base ($)</label>
                                    <input type="number" step="0.01" required value={newVehiculo.costo_base} onChange={(e) => setNewVehiculo({...newVehiculo, costo_base: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>Precio Sugerido ($)</label>
                                    <input type="number" step="0.01" required value={newVehiculo.precio_venta_sugerido} onChange={(e) => setNewVehiculo({...newVehiculo, precio_venta_sugerido: e.target.value})} />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-save">Guardar Vehículo</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VehiculosPlaya;
