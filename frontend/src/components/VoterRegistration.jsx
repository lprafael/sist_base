import React, { useState, useEffect } from 'react';
import { authFetch } from '../utils/authFetch';
import './VoterRegistration.css';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const VoterRegistration = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [myVoters, setMyVoters] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [formData, setFormData] = useState({
        parentesco: '',
        grado_seguridad: 3,
        observaciones: '',
        domicilio: '',
        latitud: null,
        longitud: null,
        movilidad_propia: false
    });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [fetchingLocation, setFetchingLocation] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [editingVoter, setEditingVoter] = useState(null);
    const [showCercaniasModal, setShowCercaniasModal] = useState(false);
    const [cercaniasResults, setCercaniasResults] = useState([]);
    const [selectedForCercania, setSelectedForCercania] = useState(null);
    const [loadingCercanias, setLoadingCercanias] = useState(false);

    // Estados para la Tabla (Filtrado y Ordenación)
    const [tableFilter, setTableFilter] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'fecha_captacion', direction: 'desc' });

    const getLocation = () => {
        if (!navigator.geolocation) {
            setMessage({ type: 'error', text: 'Geolocalización no soportada por el navegador.' });
            return;
        }

        setFetchingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setFormData(prev => ({
                    ...prev,
                    latitud: pos.coords.latitude,
                    longitud: pos.coords.longitude
                }));
                setMessage({ type: 'success', text: 'Ubicación capturada correctamente.' });
                setFetchingLocation(false);
            },
            (err) => {
                console.error(err);
                setMessage({ type: 'error', text: 'Error al obtener ubicación. Asegúrate de dar permisos.' });
                setFetchingLocation(false);
            },
            { enableHighAccuracy: true }
        );
    };

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isRestricted = ['intendente', 'concejal', 'referente'].includes(currentUser?.rol);

    useEffect(() => {
        fetchMyVoters();
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchQuery.length >= 3) {
                performSearch();
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const performSearch = async () => {
        setLoading(true);
        try {
            let url = `/electoral/padron/search?query=${searchQuery}`;
            if (isRestricted) {
                if (currentUser.departamento_id) url += `&departamento_id=${currentUser.departamento_id}`;
                if (currentUser.distrito_id) url += `&distrito_id=${currentUser.distrito_id}`;
            }

            const response = await authFetch(url);
            const data = await response.json();
            setSearchResults(data);

            if (data.length === 0) {
                setMessage({ type: 'warning', text: 'No se encontraron resultados en tu distrito.' });
            } else {
                setMessage({ type: '', text: '' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error al buscar en el padrón.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.length >= 3) performSearch();
    };

    const fetchMyVoters = async () => {
        try {
            const response = await authFetch('/electoral/mis-votantes');
            const data = await response.json();
            setMyVoters(data);
        } catch (error) {
            console.error('Error fetching voters:', error);
        }
    };

    const handleDeleteVoter = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este simpatizante de tu lista?')) return;
        try {
            const response = await authFetch(`/electoral/votante/${id}`, { method: 'DELETE' });
            if (response.ok) {
                setMessage({ type: 'success', text: 'Votante eliminado correctamente.' });
                fetchMyVoters();
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error al eliminar el votante.' });
        }
    };

    const handleEditClick = (voter) => {
        setEditingVoter(voter);
        setSelectedPerson({
            cedula: voter.cedula_votante,
            nombres: voter.nombre_votante,
            apellidos: voter.apellido_votante
        });
        setFormData({
            parentesco: voter.parentesco || '',
            grado_seguridad: voter.grado_seguridad || 3,
            observaciones: voter.observaciones || '',
            domicilio: voter.domicilio || '',
            latitud: voter.latitud || null,
            longitud: voter.longitud || null,
            movilidad_propia: voter.movilidad_propia || false
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleValidateVoter = async (id) => {
        if (!window.confirm('¿Confirmas la validación oficial de este simpatizante?')) return;
        try {
            const response = await authFetch(`/electoral/votante/${id}/validar`, { method: 'POST' });
            if (response.ok) {
                setMessage({ type: 'success', text: 'Simpatizante validado oficialmente.' });
                fetchMyVoters();
            } else {
                const err = await response.json();
                setMessage({ type: 'error', text: err.detail || 'Error al validar.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error de conexión.' });
        }
    };

    const handleSearchCercanias = async (voter) => {
        setLoadingCercanias(true);
        setSelectedForCercania(voter);
        try {
            const response = await authFetch(`/electoral/padron/cercanias/${voter.cedula_votante}`);
            const data = await response.json();
            setCercaniasResults(data);
            setShowCercaniasModal(true);
        } catch (error) {
            setMessage({ type: 'error', text: 'Error al buscar cercanías.' });
        } finally {
            setLoadingCercanias(false);
        }
    };

    const handleSelectPerson = (person) => {
        setEditingVoter(null);
        setSelectedPerson(person);
        setFormData({
            parentesco: '',
            grado_seguridad: 3,
            observaciones: '',
            domicilio: '',
            latitud: null,
            longitud: null,
            movilidad_propia: false
        });
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Lógica de procesamiento de la tabla (filtrado y ordenación)
    const processedVoters = [...myVoters]
        .filter(voter => {
            const query = tableFilter.toLowerCase();
            return (
                voter.cedula_votante.toLowerCase().includes(query) ||
                voter.nombre_votante.toLowerCase().includes(query) ||
                voter.apellido_votante.toLowerCase().includes(query) ||
                (voter.parentesco || '').toLowerCase().includes(query)
            );
        })
        .sort((a, b) => {
            if (!sortConfig.key) return 0;

            let aVal, bVal;
            if (sortConfig.key === 'nombre') {
                aVal = `${a.nombre_votante} ${a.apellido_votante}`.toLowerCase();
                bVal = `${b.nombre_votante} ${b.apellido_votante}`.toLowerCase();
            } else if (sortConfig.key === 'estado') {
                aVal = a.validacion_candidato ? 1 : 0;
                bVal = b.validacion_candidato ? 1 : 0;
            } else {
                aVal = a[sortConfig.key];
                bVal = b[sortConfig.key];
                // Manejar valores nulos
                if (aVal === null) aVal = '';
                if (bVal === null) bVal = '';
            }

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

    const renderCercaItem = (p, label) => (
        <div key={p.cedula} className="cerca-item">
            <div className="cerca-person">
                <div className="cerca-name">
                    {p.nombres} {p.apellidos}
                    <span className={`cerca-reason-badge ${label.toLowerCase()}`}>{label}</span>
                </div>
                <div className="cerca-details">CI: {p.cedula} | 📍 {p.nombre_local} - Mesa: {p.mesa}</div>
            </div>
            <button className="cerca-add-btn" title={`Agregar como ${label}`} onClick={() => {
                handleSelectPerson(p);
                setFormData(prev => ({
                    ...prev,
                    parentesco: label,
                    observaciones: `Captado por cercanía a ${selectedForCercania?.nombre_votante} ${selectedForCercania?.apellido_votante}`
                }));
                setShowCercaniasModal(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }}>
                + {label}
            </button>
        </div>
    );

    const handleAddVoter = async () => {
        if (!selectedPerson) return;
        setLoading(true);

        try {
            const method = editingVoter ? 'PUT' : 'POST';
            const url = editingVoter ? `/electoral/votante/${editingVoter.id}` : '/electoral/captacion';

            const payload = {
                cedula_votante: selectedPerson.cedula,
                ...formData
            };

            const response = await authFetch(url, {
                method,
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setMessage({
                    type: 'success',
                    text: editingVoter ? 'Datos actualizados correctamente.' : 'Simpatizante registrado exitosamente.'
                });
                setSelectedPerson(null);
                setEditingVoter(null);
                setFormData({
                    parentesco: '',
                    grado_seguridad: 3,
                    observaciones: '',
                    domicilio: '',
                    latitud: null,
                    longitud: null
                });
                fetchMyVoters();
                setSearchResults([]);
                setSearchQuery('');
            } else {
                const errData = await response.json();
                setMessage({ type: 'error', text: errData.detail || 'Error al procesar la solicitud.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error de conexión con el servidor.' });
        } finally {
            setLoading(false);
        }
    };
    // Subcomponent to sync map with formData and handle clicks
    const MapHandler = () => {
        const map = useMapEvents({
            click(e) {
                setFormData(prev => ({ ...prev, latitud: e.latlng.lat, longitud: e.latlng.lng }));
            },
            locationfound(e) {
                // Only auto-center if user hasn't manual selected or GPS-captured yet
                if (!formData.latitud) {
                    map.setView(e.latlng, map.getZoom());
                }
            },
        });

        // Auto-locate view when map opens for the first time without coords
        useEffect(() => {
            if (!formData.latitud) {
                map.locate();
            }
        }, [map]);

        // When lat/lng changes (e.g. via GPS button or click), ensure marker is visible
        useEffect(() => {
            if (formData.latitud && formData.longitud) {
                map.setView([formData.latitud, formData.longitud], map.getZoom());
            }
        }, [formData.latitud, formData.longitud]);

        return formData.latitud && formData.longitud ? <Marker position={[formData.latitud, formData.longitud]} /> : null;
    };

    return (
        <div className="voter-registration">
            <header className="section-header">
                <h2>🗳️ Carga de Simpatizantes</h2>
                <p>Busca personas en el padrón y agrégalas a tu red de apoyo.</p>
            </header>

            {message.text && (
                <div className={`alert ${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="registration-grid">
                <div className="search-panel card">
                    <h3>🔍 Buscar en Padrón {isRestricted && '(Distrito Asignado)'}</h3>
                    <form onSubmit={handleSearchSubmit} className="search-box">
                        <input
                            type="text"
                            placeholder="Escribe cédula o nombre..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button type="submit" disabled={loading}>
                            {loading ? '...' : 'Buscar'}
                        </button>
                    </form>

                    <div className="results-list">
                        {searchResults.map((person) => {
                            const isAlreadyAdded = myVoters.some(v => String(v.cedula_votante) === String(person.cedula));
                            return (
                                <div
                                    key={person.cedula}
                                    className={`result-item ${selectedPerson?.cedula === person.cedula ? 'selected' : ''} ${isAlreadyAdded ? 'already-added disabled' : ''}`}
                                    onClick={() => !isAlreadyAdded && handleSelectPerson(person)}
                                    title={isAlreadyAdded ? 'Votante ya registrado en tu lista' : 'Seleccionar para registrar'}
                                >
                                    <div className="person-info">
                                        <div className="fullname">
                                            {person.nombres} {person.apellidos}
                                            {isAlreadyAdded && <span className="already-tag">⭐ Ya registrado</span>}
                                        </div>
                                        <div className="cedula-mesa">
                                            <div className="main-id">C.I.: {person.cedula} ({person.nacimiento})</div>
                                            <div className="electoral-data">
                                                <span className="tag-local">📍 {person.nombre_local || 'S/L'}</span>
                                                <span className="tag-mesa">🗳️ Mesa: {person.mesa}</span>
                                                <span className="tag-orden">🆔 Orden: {person.orden}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className={`form-panel card ${!selectedPerson ? 'disabled' : ''}`}>
                    <h3>📋 Detalles del Simpatizante</h3>
                    {!selectedPerson ? (
                        <div className="empty-state">
                            <p>Selecciona una persona para completar el registro.</p>
                        </div>
                    ) : (
                        <div className="registration-form">
                            <div className="selected-badge">
                                <strong>{editingVoter ? 'Editando a:' : 'Registrando a:'}</strong> {selectedPerson.nombres} {selectedPerson.apellidos}
                            </div>

                            <div className="form-group">
                                <label>Vínculo / Parentesco</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Vecino, Pariente..."
                                    value={formData.parentesco}
                                    onChange={(e) => setFormData({ ...formData, parentesco: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Grado de Seguridad ({formData.grado_seguridad})</label>
                                <input
                                    type="range" min="1" max="5"
                                    value={formData.grado_seguridad}
                                    onChange={(e) => setFormData({ ...formData, grado_seguridad: parseInt(e.target.value) })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Domicilio / Dirección</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Calle Principal y 14 de Mayo..."
                                    value={formData.domicilio}
                                    onChange={(e) => setFormData({ ...formData, domicilio: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Ubicación GPS</label>
                                <div className="location-btn-row">
                                    <button
                                        type="button"
                                        onClick={getLocation}
                                        className={`geo-btn ${formData.latitud ? 'active' : ''}`}
                                        disabled={fetchingLocation}
                                    >
                                        {fetchingLocation ? '🛰️ Capturando...' : formData.latitud ? '📍 Ubicación Capturada' : '🛰️ Usar Ubicación Actual'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowMap(!showMap)}
                                        className={`map-toggle-btn ${showMap ? 'active' : ''}`}
                                    >
                                        {showMap ? '❌ Cerrar Mapa' : '🗺️ Seleccionar en Mapa'}
                                    </button>
                                </div>

                                {showMap && (
                                    <div className="mini-map-container">
                                        <p className="map-hint">Toca en el mapa para marcar la ubicación exacta</p>
                                        <MapContainer
                                            center={formData.latitud ? [formData.latitud, formData.longitud] : [-25.2867, -57.6470]}
                                            zoom={15}
                                            scrollWheelZoom={true}
                                            className="picker-map"
                                        >
                                            <TileLayer
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                            />
                                            <MapHandler />
                                        </MapContainer>
                                    </div>
                                )}
                                <div className="coords-manual-row">
                                    <div className="coord-field">
                                        <span>Lat:</span>
                                        <input
                                            type="number" step="any"
                                            value={formData.latitud || ''}
                                            onChange={(e) => setFormData({ ...formData, latitud: parseFloat(e.target.value) || null })}
                                            placeholder="-25.123"
                                        />
                                    </div>
                                    <div className="coord-field">
                                        <span>Lng:</span>
                                        <input
                                            type="number" step="any"
                                            value={formData.longitud || ''}
                                            onChange={(e) => setFormData({ ...formData, longitud: parseFloat(e.target.value) || null })}
                                            placeholder="-57.456"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Observaciones</label>
                                <textarea
                                    placeholder="Detalles adicionales..."
                                    value={formData.observaciones}
                                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                                />
                            </div>

                            <div className="form-group checkbox-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={formData.movilidad_propia}
                                        onChange={(e) => setFormData({ ...formData, movilidad_propia: e.target.checked })}
                                    />
                                    <span className="checkbox-text">🚗 Tiene Movilidad Propia</span>
                                </label>
                            </div>

                            <button className="add-btn" onClick={handleAddVoter}>
                                {editingVoter ? 'Actualizar' : 'Confirmar'}
                            </button>
                            {editingVoter && (
                                <button className="cancel-btn" onClick={() => { setEditingVoter(null); setSelectedPerson(null); }}>
                                    Cancelar
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="my-voters-panel card">
                    <div className="table-header-row">
                        <h3>⭐ Mis Simpatizantes ({myVoters.length})</h3>
                        <div className="table-filter-box">
                            <input
                                type="text"
                                placeholder="Filtrar por nombre o cédula..."
                                value={tableFilter}
                                onChange={(e) => setTableFilter(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="voters-table-container">
                        <table className="voters-table">
                            <thead>
                                <tr>
                                    <th className="sortable" onClick={() => handleSort('cedula_votante')}>
                                        Cédula {sortConfig.key === 'cedula_votante' && (sortConfig.direction === 'asc' ? '🔼' : '🔽')}
                                    </th>
                                    <th className="sortable" onClick={() => handleSort('nombre')}>
                                        Nombre {sortConfig.key === 'nombre' && (sortConfig.direction === 'asc' ? '🔼' : '🔽')}
                                    </th>
                                    <th className="sortable" onClick={() => handleSort('parentesco')}>
                                        Parentesco {sortConfig.key === 'parentesco' && (sortConfig.direction === 'asc' ? '🔼' : '🔽')}
                                    </th>
                                    <th className="sortable" onClick={() => handleSort('grado_seguridad')}>
                                        Seguridad {sortConfig.key === 'grado_seguridad' && (sortConfig.direction === 'asc' ? '🔼' : '🔽')}
                                    </th>
                                    <th className="sortable" onClick={() => handleSort('estado')}>
                                        Estado {sortConfig.key === 'estado' && (sortConfig.direction === 'asc' ? '🔼' : '🔽')}
                                    </th>
                                    <th>Movilidad</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processedVoters.map(voter => (
                                    <tr key={voter.id}>
                                        <td>{voter.cedula_votante}</td>
                                        <td>{voter.nombre_votante} {voter.apellido_votante}</td>
                                        <td>{voter.parentesco}</td>
                                        <td>{voter.grado_seguridad}</td>
                                        <td>{voter.validacion_candidato ? '✓' : '⏳'}</td>
                                        <td>{voter.movilidad_propia ? '🚗' : '🚶'}</td>
                                        <td>
                                            <div className="table-actions">
                                                {['intendente', 'admin', 'concejal'].includes(currentUser?.rol || currentUser?.role) && !voter.validacion_candidato && (
                                                    <button className="action-btn validate" title="Validar oficialmente" onClick={() => handleValidateVoter(voter.id)}>✅</button>
                                                )}
                                                <button className="action-btn edit" title="Editar datos" onClick={() => handleEditClick(voter)}>✏️</button>
                                                <button className="action-btn delete" title="Eliminar de mi lista" onClick={() => handleDeleteVoter(voter.id)}>🗑️</button>
                                                <button className="action-btn family" title="Buscar parientes y vecinos" onClick={() => handleSearchCercanias(voter)}>🔍</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showCercaniasModal && (
                <div className="cerca-modal-overlay">
                    <div className="cerca-modal">
                        <div className="cerca-header">
                            <h3>🔍 Cercanías: {selectedForCercania?.nombre_votante}</h3>
                            <button className="close-modal" onClick={() => setShowCercaniasModal(false)}>×</button>
                        </div>
                        <div className="cerca-body">
                            {(() => {
                                const parientes = cercaniasResults.filter(p =>
                                    p.apellidos.split(' ')[0] === (selectedForCercania?.apellido_votante || '').split(' ')[0]
                                );
                                const vecinos = cercaniasResults.filter(p =>
                                    p.apellidos.split(' ')[0] !== (selectedForCercania?.apellido_votante || '').split(' ')[0]
                                );

                                return (
                                    <>
                                        {parientes.length > 0 && (
                                            <div className="cerca-section">
                                                <h4>👨‍👩‍👧 Posibles Parientes (Mismo Apellido)</h4>
                                                <div className="cerca-results-list">
                                                    {parientes.map(p => renderCercaItem(p, 'Pariente'))}
                                                </div>
                                            </div>
                                        )}
                                        {vecinos.length > 0 && (
                                            <div className="cerca-section">
                                                <h4>🏠 Vecinos (Misma Mesa de Votación)</h4>
                                                <div className="cerca-results-list">
                                                    {vecinos.map(p => renderCercaItem(p, 'Vecino'))}
                                                </div>
                                            </div>
                                        )}
                                        {cercaniasResults.length === 0 && (
                                            <div className="empty-state">No se encontraron parientes o vecinos cercanos en el padrón.</div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VoterRegistration;
