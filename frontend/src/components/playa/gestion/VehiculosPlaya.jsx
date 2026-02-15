import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './VehiculosPlaya.css';
import ImagenesVehiculo from './ImagenesVehiculo.jsx';

const VehiculosPlaya = ({ setTab, setPreselectedVehicleId, preselectedCategoryId, setPreselectedCategoryId }) => {
    const [vehiculos, setVehiculos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategoriaId, setSelectedCategoriaId] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedVehiculo, setSelectedVehiculo] = useState(null);
    const [categorias, setCategorias] = useState([]);
    const [activeTabModal, setActiveTabModal] = useState('general'); // 'general' o 'tecnico'
    const [availabilityFilter, setAvailabilityFilter] = useState('DISPONIBLE'); // 'DISPONIBLE', 'TODOS'
    const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [newVehiculo, setNewVehiculo] = useState({
        id_categoria: '',
        codigo_interno: '',
        tipo_vehiculo: '',
        marca: '',
        modelo: '',
        año: new Date().getFullYear(),
        color: '',
        chasis: '',
        motor: '',
        kilometraje: '',
        combustible: '',
        transmision: '',
        numero_puertas: '',
        capacidad_pasajeros: '',
        estado: '',
        procedencia: '',
        ubicacion_actual: '',
        costo_base: '',
        precio_contado_sugerido: '',
        precio_financiado_sugerido: '',
        precio_venta_minimo: '',
        entrega_inicial_sugerida: '',
        estado_disponibilidad: 'DISPONIBLE',
        observaciones: '',
        fecha_ingreso: new Date().toISOString().split('T')[0]
    });

    const API_URL = import.meta.env.VITE_REACT_APP_API_URL || '/api';
    const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
    const isAdmin = userData.rol === 'admin';

    const handleDelete = async (id, name) => {
        if (!window.confirm(`¿Estás seguro de que deseas eliminar el vehículo ${name}?`)) {
            return;
        }

        try {
            const token = sessionStorage.getItem('token');
            await axios.delete(`${API_URL}/playa/vehiculos/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Vehículo eliminado correctamente');
            fetchVehiculos();
        } catch (error) {
            console.error('Error al eliminar el vehículo:', error);
            const detail = error.response?.data?.detail;
            alert(detail || 'Ocurrió un error al intentar eliminar el vehículo. Es posible que tenga registros relacionados.');
        }
    };

    const formatCurrency = (value) => {
        if (value === null || value === undefined || value === '') return '';
        // Convert to string and take only digits or parse as float and floor it
        const number = Math.floor(parseFloat(String(value).replace(/[^0-9.]/g, '')));
        if (isNaN(number)) return '';
        return number.toLocaleString('es-PY');
    };

    const handleCurrencyChange = (e, field, isNew = false) => {
        // Only keep digits
        const rawValue = e.target.value.replace(/\D/g, '');
        if (isNew) {
            setNewVehiculo(prev => ({ ...prev, [field]: rawValue }));
        } else {
            setSelectedVehiculo(prev => ({ ...prev, [field]: rawValue }));
        }
    };

    useEffect(() => {
        fetchVehiculos();
        fetchCategorias();
    }, []);

    useEffect(() => {
        if (preselectedCategoryId) {
            setSelectedCategoriaId(String(preselectedCategoryId));
            if (setPreselectedCategoryId) {
                setPreselectedCategoryId(null);
            }
        }
    }, [preselectedCategoryId]);

    const fetchVehiculos = async () => {
        try {
            const token = sessionStorage.getItem('token');
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
            const token = sessionStorage.getItem('token');
            const response = await axios.get(`${API_URL}/playa/categorias`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCategorias(response.data);
        } catch (error) {
            console.error('Error fetching categorias:', error);
        }
    };

    // Helper function to clean vehicle data before sending to backend
    const cleanVehiculoData = (data) => {
        const cleaned = { ...data };

        // Convert empty strings to null for optional fields
        Object.keys(cleaned).forEach(key => {
            if (cleaned[key] === '') {
                cleaned[key] = null;
            }
        });

        // Ensure numeric fields are properly typed
        const numericFields = ['id_categoria', 'año', 'kilometraje', 'numero_puertas', 'capacidad_pasajeros'];
        numericFields.forEach(field => {
            if (cleaned[field] !== null && cleaned[field] !== undefined) {
                const num = parseInt(cleaned[field]);
                cleaned[field] = isNaN(num) ? null : num;
            }
        });

        // Ensure decimal fields are properly typed
        const decimalFields = ['costo_base', 'precio_contado_sugerido', 'precio_financiado_sugerido', 'precio_venta_minimo', 'entrega_inicial_sugerida'];
        decimalFields.forEach(field => {
            if (cleaned[field] !== null && cleaned[field] !== undefined) {
                const num = parseFloat(cleaned[field]);
                cleaned[field] = isNaN(num) ? null : num;
            }
        });

        return cleaned;
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const token = sessionStorage.getItem('token');
            const cleanedData = cleanVehiculoData(newVehiculo);
            await axios.post(`${API_URL}/playa/vehiculos`, cleanedData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowModal(false);
            fetchVehiculos();
            setNewVehiculo({
                id_categoria: '',
                codigo_interno: '',
                tipo_vehiculo: '',
                marca: '',
                modelo: '',
                año: new Date().getFullYear(),
                color: '',
                chasis: '',
                motor: '',
                kilometraje: '',
                combustible: '',
                transmision: '',
                numero_puertas: '',
                capacidad_pasajeros: '',
                estado: '',
                procedencia: '',
                ubicacion_actual: '',
                costo_base: '',
                precio_contado_sugerido: '',
                precio_financiado_sugerido: '',
                precio_venta_minimo: '',
                entrega_inicial_sugerida: '',
                estado_disponibilidad: 'DISPONIBLE',
                observaciones: '',
                fecha_ingreso: new Date().toISOString().split('T')[0]
            });
        } catch (error) {
            let errorMessage = 'Error al crear vehículo: ';
            if (error.response?.data?.detail) {
                if (Array.isArray(error.response.data.detail)) {
                    // FastAPI validation errors
                    errorMessage += error.response.data.detail.map(err =>
                        `${err.loc.join(' -> ')}: ${err.msg}`
                    ).join(', ');
                } else {
                    errorMessage += error.response.data.detail;
                }
            } else {
                errorMessage += error.message;
            }
            alert(errorMessage);
        }
    };

    const filteredVehiculos = vehiculos.filter(v => {
        const term = searchTerm.toLowerCase();
        const matchText =
            (v.marca || '').toLowerCase().includes(term) ||
            (v.modelo || '').toLowerCase().includes(term) ||
            (v.chasis || '').toLowerCase().includes(term);

        const matchCategoria = selectedCategoriaId
            ? (v.id_categoria === parseInt(selectedCategoriaId))
            : true;

        const matchAvailability = availabilityFilter === 'TODOS'
            ? true
            : v.estado_disponibilidad === 'DISPONIBLE';

        return matchText && matchCategoria && matchAvailability;
    });

    const handleVerDetalles = (v) => {
        setSelectedVehiculo({ ...v });
        setActiveTabModal('general');
        setShowDetailsModal(true);
    };

    const openNewModal = () => {
        setActiveTabModal('general');
        setShowModal(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const token = sessionStorage.getItem('token');
            const cleanedData = cleanVehiculoData(selectedVehiculo);
            await axios.put(`${API_URL}/playa/vehiculos/${selectedVehiculo.id_producto}`, cleanedData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowDetailsModal(false);
            fetchVehiculos();
            alert('Vehículo actualizado correctamente');
        } catch (error) {
            let errorMessage = 'Error al actualizar vehículo: ';
            if (error.response?.data?.detail) {
                if (Array.isArray(error.response.data.detail)) {
                    // FastAPI validation errors
                    errorMessage += error.response.data.detail.map(err =>
                        `${err.loc.join(' -> ')}: ${err.msg}`
                    ).join(', ');
                } else {
                    errorMessage += error.response.data.detail;
                }
            } else {
                errorMessage += error.message;
            }
            alert(errorMessage);
        }
    };

    const handleVenderClick = (v) => {
        setPreselectedVehicleId(v.id_producto);
        setTab('ventas_playa');
    };

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return null;
        return <span className="sort-indicator">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
    };

    const sortedVehiculos = React.useMemo(() => {
        let sortableItems = [...filteredVehiculos];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Custom sorting for Marca/Modelo composite
                if (sortConfig.key === 'marca_modelo') {
                    aValue = `${a.marca} ${a.modelo}`.toLowerCase();
                    bValue = `${b.marca} ${b.modelo}`.toLowerCase();
                } else if (typeof aValue === 'string') {
                    aValue = aValue.toLowerCase();
                    bValue = bValue.toLowerCase();
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredVehiculos, sortConfig]);

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
                <div className="category-filter">
                    <select value={selectedCategoriaId} onChange={(e) => setSelectedCategoriaId(e.target.value)}>
                        <option value="">Todas las categorías</option>
                        {categorias.map(c => (
                            <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
                        ))}
                    </select>
                </div>

                <div className="availability-radios">
                    <label className={`radio-label ${availabilityFilter === 'DISPONIBLE' ? 'active' : ''}`}>
                        <input
                            type="radio"
                            name="availability"
                            value="DISPONIBLE"
                            checked={availabilityFilter === 'DISPONIBLE'}
                            onChange={(e) => setAvailabilityFilter(e.target.value)}
                        />
                        Disponibles
                    </label>
                    <label className={`radio-label ${availabilityFilter === 'TODOS' ? 'active' : ''}`}>
                        <input
                            type="radio"
                            name="availability"
                            value="TODOS"
                            checked={availabilityFilter === 'TODOS'}
                            onChange={(e) => setAvailabilityFilter(e.target.value)}
                        />
                        Todos
                    </label>
                </div>

                <div className="availability-radios">
                    <label className={`radio-label ${viewMode === 'cards' ? 'active' : ''}`}>
                        <input
                            type="radio"
                            name="viewMode"
                            value="cards"
                            checked={viewMode === 'cards'}
                            onChange={(e) => setViewMode(e.target.value)}
                        />
                        Tarjetas
                    </label>
                    <label className={`radio-label ${viewMode === 'table' ? 'active' : ''}`}>
                        <input
                            type="radio"
                            name="viewMode"
                            value="table"
                            checked={viewMode === 'table'}
                            onChange={(e) => setViewMode(e.target.value)}
                        />
                        Tabla
                    </label>
                </div>

                <button className="btn-primary" onClick={openNewModal}>
                    + Nuevo Vehículo
                </button>
            </div>

            {loading ? (
                <div className="loading">Cargando unidades...</div>
            ) : (
                viewMode === 'cards' ? (
                    <div className="vehiculos-grid">
                        {filteredVehiculos.map(v => (
                            <div key={v.id_producto} className="vehiculo-card">
                                <div className="card-header">
                                    <span className={`status-badge ${v.estado_disponibilidad.toLowerCase()}`}>
                                        {v.estado_disponibilidad}
                                    </span>
                                    <h3>{v.marca} {v.modelo}</h3>
                                    <p className="year">Año: {v.año}</p>
                                    <p className="engine">Motor: {v.motor || '-'}</p>
                                </div>
                                <div className="card-body">
                                    <p><strong>Entrega Inicial:</strong>
                                        <span className="price"> Gs. {v.entrega_inicial_sugerida ? Math.round(parseFloat(v.entrega_inicial_sugerida)).toLocaleString('es-PY') : '0'}</span>
                                    </p>
                                    <p><strong>Precio Financ.:</strong>
                                        <span className="price"> Gs. {v.precio_financiado_sugerido ? Math.round(parseFloat(v.precio_financiado_sugerido)).toLocaleString('es-PY') : '0'}</span>
                                    </p>
                                </div>
                                <div className="card-footer">
                                    <button className="btn-outline" onClick={() => handleVerDetalles(v)}>Ver Detalles</button>
                                    <button
                                        className="btn-sell"
                                        onClick={() => handleVenderClick(v)}
                                        disabled={v.estado_disponibilidad !== 'DISPONIBLE'}
                                    >
                                        {v.estado_disponibilidad === 'DISPONIBLE' ? 'Vender' : 'No Disponible'}
                                    </button>
                                    {isAdmin && (
                                        <button
                                            className="btn-delete-card"
                                            title="Eliminar Vehículo"
                                            onClick={() => handleDelete(v.id_producto, `${v.marca} ${v.modelo}`)}
                                        >
                                            🗑️
                                        </button>
                                    )}
                                </div>

                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table className="vehiculos-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th className="sortable" onClick={() => requestSort('marca_modelo')}>
                                        Marca / Modelo {getSortIndicator('marca_modelo')}
                                    </th>
                                    <th className="sortable" onClick={() => requestSort('año')}>
                                        Año {getSortIndicator('año')}
                                    </th>
                                    <th>Color</th>
                                    <th>Chasis</th>
                                    <th>Motor</th>
                                    <th className="sortable" onClick={() => requestSort('entrega_inicial_sugerida')}>
                                        Entrega Inicial (Gs.) {getSortIndicator('entrega_inicial_sugerida')}
                                    </th>
                                    <th className="sortable" onClick={() => requestSort('precio_financiado_sugerido')}>
                                        Precio Financiado (Gs.) {getSortIndicator('precio_financiado_sugerido')}
                                    </th>
                                    <th className="sortable" onClick={() => requestSort('estado_disponibilidad')}>
                                        Estado {getSortIndicator('estado_disponibilidad')}
                                    </th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedVehiculos.map(v => (
                                    <tr key={v.id_producto}>
                                        <td>{v.id_producto}</td>
                                        <td>
                                            <strong>{v.marca}</strong> <br />
                                            {v.modelo}
                                        </td>
                                        <td>{v.año}</td>
                                        <td>{v.color || '-'}</td>
                                        <td style={{ fontFamily: 'monospace' }}>{v.chasis}</td>
                                        <td>{v.motor || '-'}</td>
                                        <td style={{ fontWeight: 'bold', color: '#059669' }}>
                                            Gs. {v.entrega_inicial_sugerida ? Math.round(parseFloat(v.entrega_inicial_sugerida)).toLocaleString('es-PY') : '0'}
                                        </td>
                                        <td style={{ fontWeight: 'bold', color: '#2563eb' }}>
                                            Gs. {v.precio_financiado_sugerido ? Math.round(parseFloat(v.precio_financiado_sugerido)).toLocaleString('es-PY') : '0'}
                                        </td>
                                        <td>
                                            <span className={`status-badge ${v.estado_disponibilidad.toLowerCase()}`}>
                                                {v.estado_disponibilidad}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="table-actions">
                                                <button
                                                    className="btn-icon"
                                                    title="Ver Detalles"
                                                    onClick={() => handleVerDetalles(v)}
                                                >
                                                    👁️
                                                </button>
                                                <button
                                                    className="btn-icon sell"
                                                    title="Vender"
                                                    disabled={v.estado_disponibilidad !== 'DISPONIBLE'}
                                                    onClick={() => handleVenderClick(v)}
                                                >
                                                    💲
                                                </button>
                                                {isAdmin && (
                                                    <button
                                                        className="btn-icon delete"
                                                        title="Eliminar"
                                                        onClick={() => handleDelete(v.id_producto, `${v.marca} ${v.modelo}`)}
                                                    >
                                                        🗑️
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Registrar Nuevo Vehículo</h3>
                        <div className="modal-tabs">
                            <button
                                type="button"
                                className={`tab-btn ${activeTabModal === 'general' ? 'active' : ''}`}
                                onClick={() => setActiveTabModal('general')}
                            >
                                Información General
                            </button>
                            <button
                                type="button"
                                className={`tab-btn ${activeTabModal === 'tecnico' ? 'active' : ''}`}
                                onClick={() => setActiveTabModal('tecnico')}
                            >
                                Detalles Técnicos
                            </button>
                        </div>

                        <form onSubmit={handleCreate}>
                            {activeTabModal === 'general' ? (
                                <div className="tab-content">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Categoría</label>
                                            <select
                                                value={newVehiculo.id_categoria}
                                                onChange={(e) => setNewVehiculo({ ...newVehiculo, id_categoria: e.target.value })}
                                                required
                                            >
                                                <option value="">Seleccione categoría</option>
                                                {categorias.map(c => (
                                                    <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Código Interno</label>
                                            <input type="text" value={newVehiculo.codigo_interno} readOnly className="read-only-input" title="Se completa automáticamente con el chasis" />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Marca</label>
                                            <input type="text" required value={newVehiculo.marca} onChange={(e) => setNewVehiculo({ ...newVehiculo, marca: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Modelo</label>
                                            <input type="text" required value={newVehiculo.modelo} onChange={(e) => setNewVehiculo({ ...newVehiculo, modelo: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Año</label>
                                            <input type="number" required value={newVehiculo.año} onChange={(e) => setNewVehiculo({ ...newVehiculo, año: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Color</label>
                                            <input type="text" value={newVehiculo.color} onChange={(e) => setNewVehiculo({ ...newVehiculo, color: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Costo Base (Gs.)</label>
                                            <input type="text" required value={formatCurrency(newVehiculo.costo_base)} onChange={(e) => handleCurrencyChange(e, 'costo_base', true)} />
                                        </div>
                                        <div className="form-group">
                                            <label>Precio Contado Sugerido (Gs.)</label>
                                            <input type="text" required value={formatCurrency(newVehiculo.precio_contado_sugerido)} onChange={(e) => handleCurrencyChange(e, 'precio_contado_sugerido', true)} />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Precio Financiado Sugerido (Gs.)</label>
                                            <input type="text" value={formatCurrency(newVehiculo.precio_financiado_sugerido)} onChange={(e) => handleCurrencyChange(e, 'precio_financiado_sugerido', true)} />
                                        </div>
                                        <div className="form-group">
                                            <label>Entrega Inicial Sugerida (Gs.)</label>
                                            <input type="text" value={formatCurrency(newVehiculo.entrega_inicial_sugerida)} onChange={(e) => handleCurrencyChange(e, 'entrega_inicial_sugerida', true)} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Observaciones</label>
                                        <textarea value={newVehiculo.observaciones} onChange={(e) => setNewVehiculo({ ...newVehiculo, observaciones: e.target.value })} />
                                    </div>
                                </div>
                            ) : (
                                <div className="tab-content">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Chasis</label>
                                            <input type="text" required value={newVehiculo.chasis} onChange={(e) => setNewVehiculo({ ...newVehiculo, chasis: e.target.value, codigo_interno: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Motor</label>
                                            <input type="text" value={newVehiculo.motor} onChange={(e) => setNewVehiculo({ ...newVehiculo, motor: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Kilometraje</label>
                                            <input type="number" value={newVehiculo.kilometraje} onChange={(e) => setNewVehiculo({ ...newVehiculo, kilometraje: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Combustible</label>
                                            <select value={newVehiculo.combustible} onChange={(e) => setNewVehiculo({ ...newVehiculo, combustible: e.target.value })}>
                                                <option value="">Seleccione...</option>
                                                <option value="NAFTA">NAFTA</option>
                                                <option value="DIESEL">DIESEL</option>
                                                <option value="HÍBRIDO">HÍBRIDO</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Transmisión</label>
                                            <select value={newVehiculo.transmision} onChange={(e) => setNewVehiculo({ ...newVehiculo, transmision: e.target.value })}>
                                                <option value="">Seleccione...</option>
                                                <option value="MEC">MEC</option>
                                                <option value="AUT">AUT</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Tipo Vehículo</label>
                                            <input type="text" value={newVehiculo.tipo_vehiculo} onChange={(e) => setNewVehiculo({ ...newVehiculo, tipo_vehiculo: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Nro. Puertas</label>
                                            <input type="number" value={newVehiculo.numero_puertas} onChange={(e) => setNewVehiculo({ ...newVehiculo, numero_puertas: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Capacidad Pasajeros</label>
                                            <input type="number" value={newVehiculo.capacidad_pasajeros} onChange={(e) => setNewVehiculo({ ...newVehiculo, capacidad_pasajeros: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Procedencia</label>
                                            <input type="text" value={newVehiculo.procedencia} onChange={(e) => setNewVehiculo({ ...newVehiculo, procedencia: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Ubicación Actual</label>
                                            <input type="text" value={newVehiculo.ubicacion_actual} onChange={(e) => setNewVehiculo({ ...newVehiculo, ubicacion_actual: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Precio Mínimo (Gs.)</label>
                                            <input type="text" value={formatCurrency(newVehiculo.precio_venta_minimo)} onChange={(e) => handleCurrencyChange(e, 'precio_venta_minimo', true)} />
                                        </div>
                                        <div className="form-group">
                                            <label>Fecha Ingreso</label>
                                            <input type="date" value={newVehiculo.fecha_ingreso} onChange={(e) => setNewVehiculo({ ...newVehiculo, fecha_ingreso: e.target.value })} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-save">Guardar Vehículo</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {showDetailsModal && selectedVehiculo && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header-detail">
                            <h3 style={{ margin: 0 }}>Editar Vehículo: {selectedVehiculo.marca} {selectedVehiculo.modelo}</h3>
                            <button className="close-btn" style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setShowDetailsModal(false)}>&times;</button>
                        </div>
                        <div className="modal-tabs">
                            <button
                                type="button"
                                className={`tab-btn ${activeTabModal === 'general' ? 'active' : ''}`}
                                onClick={() => setActiveTabModal('general')}
                            >
                                Información General
                            </button>
                            <button
                                type="button"
                                className={`tab-btn ${activeTabModal === 'tecnico' ? 'active' : ''}`}
                                onClick={() => setActiveTabModal('tecnico')}
                            >
                                Detalles Técnicos
                            </button>
                            <button
                                type="button"
                                className={`tab-btn ${activeTabModal === 'imagenes' ? 'active' : ''}`}
                                onClick={() => setActiveTabModal('imagenes')}
                            >
                                Imágenes
                            </button>
                        </div>

                        <form onSubmit={handleUpdate}>
                            {activeTabModal === 'general' && (
                                <div className="tab-content">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Categoría</label>
                                            <select
                                                value={selectedVehiculo.id_categoria}
                                                onChange={(e) => setSelectedVehiculo({ ...selectedVehiculo, id_categoria: e.target.value })}
                                                required
                                            >
                                                <option value="">Seleccione categoría</option>
                                                {categorias.map(c => (
                                                    <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Código Interno</label>
                                            <input type="text" value={selectedVehiculo.codigo_interno || ''} readOnly className="read-only-input" title="Se completa automáticamente con el chasis" />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Marca</label>
                                            <input type="text" required value={selectedVehiculo.marca} onChange={(e) => setSelectedVehiculo({ ...selectedVehiculo, marca: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Modelo</label>
                                            <input type="text" required value={selectedVehiculo.modelo} onChange={(e) => setSelectedVehiculo({ ...selectedVehiculo, modelo: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Año</label>
                                            <input type="number" required value={selectedVehiculo.año} onChange={(e) => setSelectedVehiculo({ ...selectedVehiculo, año: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Color</label>
                                            <input type="text" value={selectedVehiculo.color || ''} onChange={(e) => setSelectedVehiculo({ ...selectedVehiculo, color: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Costo Base (Gs.)</label>
                                            <input type="text" required value={formatCurrency(selectedVehiculo.costo_base)} onChange={(e) => handleCurrencyChange(e, 'costo_base')} />
                                        </div>
                                        <div className="form-group">
                                            <label>Precio Contado Sugerido (Gs.)</label>
                                            <input type="text" required value={formatCurrency(selectedVehiculo.precio_contado_sugerido)} onChange={(e) => handleCurrencyChange(e, 'precio_contado_sugerido')} />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Precio Financiado Sugerido (Gs.)</label>
                                            <input type="text" value={formatCurrency(selectedVehiculo.precio_financiado_sugerido)} onChange={(e) => handleCurrencyChange(e, 'precio_financiado_sugerido')} />
                                        </div>
                                        <div className="form-group">
                                            <label>Entrega Inicial Sugerida (Gs.)</label>
                                            <input type="text" value={formatCurrency(selectedVehiculo.entrega_inicial_sugerida)} onChange={(e) => handleCurrencyChange(e, 'entrega_inicial_sugerida')} />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Estado Disponibilidad</label>
                                            <select value={selectedVehiculo.estado_disponibilidad} onChange={(e) => setSelectedVehiculo({ ...selectedVehiculo, estado_disponibilidad: e.target.value })}>
                                                <option value="DISPONIBLE">DISPONIBLE</option>
                                                <option value="RESERVADO">RESERVADO</option>
                                                <option value="VENDIDO">VENDIDO</option>
                                                <option value="MANTENIMIENTO">MANTENIMIENTO</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Activo</label>
                                            <select value={String(selectedVehiculo.activo)} onChange={(e) => setSelectedVehiculo({ ...selectedVehiculo, activo: e.target.value === 'true' })}>
                                                <option value="true">Sí</option>
                                                <option value="false">No</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Observaciones</label>
                                        <textarea value={selectedVehiculo.observaciones || ''} onChange={(e) => setSelectedVehiculo({ ...selectedVehiculo, observaciones: e.target.value })} />
                                    </div>
                                </div>
                            )}
                            {activeTabModal === 'tecnico' && (
                                <div className="tab-content">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Chasis</label>
                                            <input type="text" required value={selectedVehiculo.chasis} onChange={(e) => setSelectedVehiculo({ ...selectedVehiculo, chasis: e.target.value, codigo_interno: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Motor</label>
                                            <input type="text" value={selectedVehiculo.motor || ''} onChange={(e) => setSelectedVehiculo({ ...selectedVehiculo, motor: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Kilometraje</label>
                                            <input type="number" value={selectedVehiculo.kilometraje || ''} onChange={(e) => setSelectedVehiculo({ ...selectedVehiculo, kilometraje: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Combustible</label>
                                            <select value={selectedVehiculo.combustible || ''} onChange={(e) => setSelectedVehiculo({ ...selectedVehiculo, combustible: e.target.value })}>
                                                <option value="">Seleccione...</option>
                                                <option value="NAFTA">NAFTA</option>
                                                <option value="DIESEL">DIESEL</option>
                                                <option value="HÍBRIDO">HÍBRIDO</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Transmisión</label>
                                            <select value={selectedVehiculo.transmision || ''} onChange={(e) => setSelectedVehiculo({ ...selectedVehiculo, transmision: e.target.value })}>
                                                <option value="">Seleccione...</option>
                                                <option value="MEC">MEC</option>
                                                <option value="AUT">AUT</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Tipo Vehículo</label>
                                            <input type="text" value={selectedVehiculo.tipo_vehiculo || ''} onChange={(e) => setSelectedVehiculo({ ...selectedVehiculo, tipo_vehiculo: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Nro. Puertas</label>
                                            <input type="number" value={selectedVehiculo.numero_puertas || ''} onChange={(e) => setSelectedVehiculo({ ...selectedVehiculo, numero_puertas: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Capacidad Pasajeros</label>
                                            <input type="number" value={selectedVehiculo.capacidad_pasajeros || ''} onChange={(e) => setSelectedVehiculo({ ...selectedVehiculo, capacidad_pasajeros: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Procedencia</label>
                                            <input type="text" value={selectedVehiculo.procedencia || ''} onChange={(e) => setSelectedVehiculo({ ...selectedVehiculo, procedencia: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Ubicación Actual</label>
                                            <input type="text" value={selectedVehiculo.ubicacion_actual || ''} onChange={(e) => setSelectedVehiculo({ ...selectedVehiculo, ubicacion_actual: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Precio Mínimo (Gs.)</label>
                                            <input type="text" value={formatCurrency(selectedVehiculo.precio_venta_minimo)} onChange={(e) => handleCurrencyChange(e, 'precio_venta_minimo')} />
                                        </div>
                                        <div className="form-group">
                                            <label>Fecha Ingreso</label>
                                            <input type="date" value={selectedVehiculo.fecha_ingreso || ''} onChange={(e) => setSelectedVehiculo({ ...selectedVehiculo, fecha_ingreso: e.target.value })} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTabModal === 'imagenes' && (
                                <div className="tab-content" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                    <ImagenesVehiculo id_producto={selectedVehiculo.id_producto} />
                                </div>
                            )}
                            <div className="modal-actions">
                                <button type="submit" className="btn-save">Guardar Cambios</button>
                                <button type="button" className="btn-primary" onClick={() => handleVenderClick(selectedVehiculo)}>Ir a Vender</button>
                                <button type="button" className="btn-cancel" onClick={() => setShowDetailsModal(false)}>Cerrar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VehiculosPlaya;
