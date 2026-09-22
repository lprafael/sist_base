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

const VoterRegistration = ({ user, currentEleccionId }) => {
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
        movilidad_propia: false,
        telefono: '',
        telefono_tipo: 'Celular',
        telefono_observacion: ''
    });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [fetchingLocation, setFetchingLocation] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [editingVoter, setEditingVoter] = useState(null);
    const [showCercaniasModal, setShowCercaniasModal] = useState(false);
    const [cercaniasResults, setCercaniasResults] = useState([]);
    const [selectedForCercania, setSelectedForCercania] = useState(null);
    const [loadingCercanias, setLoadingCercanias] = useState(false);

    // Estados para el Modal de Historial de Teléfonos
    const [showPhonesModal, setShowPhonesModal] = useState(false);
    const [selectedPersonForPhones, setSelectedPersonForPhones] = useState(null);
    const [personPhonesList, setPersonPhonesList] = useState([]);
    const [loadingPhones, setLoadingPhones] = useState(false);
    const [newPhoneData, setNewPhoneData] = useState({
        telefono: '',
        tipo: 'Celular',
        observacion: ''
    });
    const [phoneActionLoading, setPhoneActionLoading] = useState(false);

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
    const isRestricted = ['candidato_principal', 'equipo_electoral', 'referente'].includes(currentUser?.rol);

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
            const effectiveElec = currentEleccionId || currentUser?.eleccion_id;
            if (effectiveElec) {
                url += `&eleccion_id=${effectiveElec}`;
            }
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
            movilidad_propia: voter.movilidad_propia || false,
            telefono: voter.telefono || '',
            telefono_tipo: 'Celular',
            telefono_observacion: ''
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
            console.error('Error en búsqueda de cercanías:', error);
            setMessage({ type: 'error', text: `Error al buscar cercanías: ${error.message}` });
        } finally {
            setLoadingCercanias(false);
        }
    };

    // Funciones para el Modal de Historial de Teléfonos
    const handleOpenPhonesModal = (voterOrPerson) => {
        const cedula = voterOrPerson.cedula_votante || voterOrPerson.cedula;
        const nombre = voterOrPerson.nombre_votante 
            ? `${voterOrPerson.nombre_votante} ${voterOrPerson.apellido_votante || ''}`
            : `${voterOrPerson.nombres || ''} ${voterOrPerson.apellidos || ''}`;
        
        setSelectedPersonForPhones({
            cedula,
            nombre: nombre.trim() || 'Simpatizante'
        });
        setNewPhoneData({
            telefono: '',
            tipo: 'Celular',
            observacion: ''
        });
        setShowPhonesModal(true);
        fetchPersonPhones(cedula);
    };

    const fetchPersonPhones = async (cedula) => {
        setLoadingPhones(true);
        try {
            const res = await authFetch(`/electoral/personas/${cedula}/telefonos`);
            if (res.ok) {
                const data = await res.json();
                setPersonPhonesList(data);
            } else {
                setPersonPhonesList([]);
            }
        } catch (err) {
            console.error('Error al cargar teléfonos:', err);
        } finally {
            setLoadingPhones(false);
        }
    };

    const handleAddNewPhone = async (e) => {
        e.preventDefault();
        if (!selectedPersonForPhones || !newPhoneData.telefono.trim()) return;

        setPhoneActionLoading(true);
        try {
            const res = await authFetch(`/electoral/personas/${selectedPersonForPhones.cedula}/telefonos`, {
                method: 'POST',
                body: JSON.stringify(newPhoneData)
            });
            if (res.ok) {
                setNewPhoneData({ telefono: '', tipo: 'Celular', observacion: '' });
                await fetchPersonPhones(selectedPersonForPhones.cedula);
                fetchMyVoters();
                setMessage({ type: 'success', text: 'Nuevo número de teléfono registrado como actual.' });
            } else {
                const err = await res.json();
                alert(err.detail || 'Error al guardar el teléfono');
            }
        } catch (err) {
            console.error('Error al agregar teléfono:', err);
            alert('Error de conexión al guardar el teléfono');
        } finally {
            setPhoneActionLoading(false);
        }
    };

    const handleDeletePhone = async (phoneId) => {
        if (!window.confirm('¿Deseas eliminar este número de teléfono?')) return;
        setPhoneActionLoading(true);
        try {
            const res = await authFetch(`/electoral/personas/${selectedPersonForPhones.cedula}/telefonos/${phoneId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                await fetchPersonPhones(selectedPersonForPhones.cedula);
                fetchMyVoters();
            } else {
                const err = await res.json();
                alert(err.detail || 'Error al eliminar el teléfono');
            }
        } catch (err) {
            console.error('Error al eliminar teléfono:', err);
        } finally {
            setPhoneActionLoading(false);
        }
    };

    const handleSetPhoneActual = async (phoneId) => {
        setPhoneActionLoading(true);
        try {
            const res = await authFetch(`/electoral/personas/${selectedPersonForPhones.cedula}/telefonos/${phoneId}/marcar-actual`, {
                method: 'PUT'
            });
            if (res.ok) {
                await fetchPersonPhones(selectedPersonForPhones.cedula);
                fetchMyVoters();
            } else {
                const err = await res.json();
                alert(err.detail || 'Error al marcar teléfono como actual');
            }
        } catch (err) {
            console.error('Error al marcar teléfono como actual:', err);
        } finally {
            setPhoneActionLoading(false);
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
            movilidad_propia: false,
            telefono: person.telefono || '',
            telefono_tipo: 'Celular',
            telefono_observacion: ''
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
                (voter.parentesco || '').toLowerCase().includes(query) ||
                (voter.telefono || '').toLowerCase().includes(query)
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
            } else if (sortConfig.key === 'telefono') {
                aVal = (a.telefono || '').toLowerCase();
                bVal = (b.telefono || '').toLowerCase();
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
                    {(p.nombres || '').trim()} {(p.apellidos || '').trim()}
                    <span className={`cerca-reason-badge ${label.toLowerCase().trim().replace(/\s+/g, '-')}`}>{label}</span>
                </div>
                <div className="cerca-details">CI: {p.cedula} | 📍 {p.nombre_local || 'S/L'} - Mesa: {p.mesa || 'S/M'}</div>
                {p.direccion && <div className="cerca-address">🏠 {p.direccion}</div>}
            </div>
            <button className="cerca-add-btn" title={`Agregar como ${label}`} onClick={() => {
                handleSelectPerson(p);
                setFormData(prev => ({
                    ...prev,
                    parentesco: label,
                    observaciones: `Captado por cercanía a ${selectedForCercania?.nombre_votante || ''} ${selectedForCercania?.apellido_votante || ''}`
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

            const effectiveElec = currentEleccionId || currentUser?.eleccion_id;
            const payload = {
                cedula_votante: selectedPerson.cedula,
                eleccion_id: effectiveElec || null,
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
                    longitud: null,
                    movilidad_propia: false,
                    telefono: '',
                    telefono_tipo: 'Celular',
                    telefono_observacion: ''
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
                                <div className="label-with-action">
                                    <label>📱 Teléfono / Celular</label>
                                    {editingVoter && (
                                        <button 
                                            type="button" 
                                            className="link-subtle-btn"
                                            onClick={() => handleOpenPhonesModal(editingVoter)}
                                        >
                                            📜 Historial ({editingVoter.total_telefonos || 1})
                                        </button>
                                    )}
                                </div>
                                <div className="phone-input-row">
                                    <input
                                        type="tel"
                                        placeholder="Ej: 0981 123456"
                                        value={formData.telefono}
                                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                    />
                                    <select
                                        className="phone-type-select"
                                        value={formData.telefono_tipo}
                                        onChange={(e) => setFormData({ ...formData, telefono_tipo: e.target.value })}
                                    >
                                        <option value="Celular">Celular</option>
                                        <option value="WhatsApp">WhatsApp</option>
                                        <option value="Casa">Casa</option>
                                        <option value="Laboral">Laboral</option>
                                        <option value="Familiar">Familiar</option>
                                        <option value="Otro">Otro</option>
                                    </select>
                                </div>
                                {editingVoter && formData.telefono !== (editingVoter.telefono || '') && formData.telefono.trim() !== '' && (
                                    <small className="field-hint text-success">
                                        💡 Se registrará este nuevo número con fecha actual y pasará a ser el vigente.
                                    </small>
                                )}
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
                                    <th className="sortable" onClick={() => handleSort('telefono')}>
                                        Teléfono {sortConfig.key === 'telefono' && (sortConfig.direction === 'asc' ? '🔼' : '🔽')}
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
                                        <td>
                                            {voter.telefono ? (
                                                <div className="table-phone-cell">
                                                    <span className="phone-number" title="Teléfono actual">{voter.telefono}</span>
                                                    <div className="phone-quick-actions">
                                                        <a 
                                                            href={`https://wa.me/595${voter.telefono.replace(/\D/g, '').replace(/^0/, '')}`}
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="phone-action-icon whatsapp" 
                                                            title="Abrir WhatsApp"
                                                        >
                                                            💬
                                                        </a>
                                                        <a 
                                                            href={`tel:${voter.telefono}`} 
                                                            className="phone-action-icon call" 
                                                            title="Llamar"
                                                        >
                                                            📞
                                                        </a>
                                                        {voter.total_telefonos > 1 && (
                                                            <button 
                                                                className="phone-badge-history" 
                                                                title={`Ver los ${voter.total_telefonos} teléfonos registrados`}
                                                                onClick={() => handleOpenPhonesModal(voter)}
                                                            >
                                                                +{voter.total_telefonos - 1}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <button 
                                                    className="add-phone-quick-btn"
                                                    onClick={() => handleOpenPhonesModal(voter)}
                                                    title="Agregar teléfono"
                                                >
                                                    + Teléfono
                                                </button>
                                            )}
                                        </td>
                                        <td>{voter.parentesco}</td>
                                        <td>{voter.grado_seguridad}</td>
                                        <td>{voter.validacion_candidato ? '✓' : '⏳'}</td>
                                        <td>{voter.movilidad_propia ? '🚗' : '🚶'}</td>
                                        <td>
                                            <div className="table-actions">
                                                {['candidato_principal', 'admin', 'equipo_electoral'].includes(currentUser?.rol || currentUser?.role) && !voter.validacion_candidato && (
                                                    <button className="action-btn validate" title="Validar oficialmente" onClick={() => handleValidateVoter(voter.id)}>✅</button>
                                                )}
                                                <button className="action-btn edit" title="Editar datos" onClick={() => handleEditClick(voter)}>✏️</button>
                                                <button className="action-btn phone" title="Gestionar teléfonos e historial" onClick={() => handleOpenPhonesModal(voter)}>📱</button>
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
                                const baseVoter = selectedForCercania;
                                if (!baseVoter || !Array.isArray(cercaniasResults)) return null;

                                const baseCedula = parseInt(baseVoter.cedula_votante);
                                const baseApellidos = (baseVoter.apellido_votante || "").toLowerCase().trim();

                                // Con la nueva lógica, todos los resultados del backend son parientes directos (+/- 5 y mismos apellidos)
                                const sugerencias = cercaniasResults.filter(p => {
                                    const pCedula = parseInt(p.cedula);
                                    return pCedula !== baseCedula;
                                });

                                return (
                                    <>
                                        {sugerencias.length > 0 ? (
                                            <div className="cerca-section">
                                                <h4>👨‍👩‍👧 Familiares Directos (Mismo Apellido y C.I. Cercana)</h4>
                                                <div className="cerca-results-list">
                                                    {sugerencias.map(p => renderCercaItem(p, 'Familia Directa'))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="empty-state">No se encontraron familiares directos con cédulas contiguas en el padrón.</div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {showPhonesModal && (
                <div className="phone-modal-overlay">
                    <div className="phone-modal card">
                        <div className="phone-modal-header">
                            <div>
                                <h3>📱 Teléfonos de {selectedPersonForPhones?.nombre}</h3>
                                <p className="phone-modal-subtitle">
                                    C.I.: <strong>{selectedPersonForPhones?.cedula}</strong> • El número más nuevo se considera automáticamente el actual
                                </p>
                            </div>
                            <button className="close-modal" onClick={() => setShowPhonesModal(false)}>×</button>
                        </div>

                        <div className="phone-modal-body">
                            {/* Formulario para registrar un nuevo número */}
                            <form onSubmit={handleAddNewPhone} className="add-phone-form-box">
                                <h4>➕ Agregar Nuevo Número</h4>
                                <div className="add-phone-fields">
                                    <div className="input-group">
                                        <label>Número de Teléfono / Celular *</label>
                                        <input
                                            type="tel"
                                            placeholder="Ej: 0981 123456"
                                            value={newPhoneData.telefono}
                                            onChange={(e) => setNewPhoneData({ ...newPhoneData, telefono: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Tipo de Línea</label>
                                        <select
                                            value={newPhoneData.tipo}
                                            onChange={(e) => setNewPhoneData({ ...newPhoneData, tipo: e.target.value })}
                                        >
                                            <option value="Celular">Celular</option>
                                            <option value="WhatsApp">WhatsApp</option>
                                            <option value="Casa">Casa / Fijo</option>
                                            <option value="Laboral">Laboral</option>
                                            <option value="Familiar">Familiar</option>
                                            <option value="Otro">Otro</option>
                                        </select>
                                    </div>
                                    <div className="input-group full-width">
                                        <label>Observación / Nota (Opcional)</label>
                                        <input
                                            type="text"
                                            placeholder="Ej: Hermano, llamar en horario de la tarde..."
                                            value={newPhoneData.observacion}
                                            onChange={(e) => setNewPhoneData({ ...newPhoneData, observacion: e.target.value })}
                                        />
                                    </div>
                                    <div className="input-group btn-col">
                                        <button type="submit" className="btn-add-phone" disabled={phoneActionLoading}>
                                            {phoneActionLoading ? 'Guardando...' : '⭐ Guardar como Actual'}
                                        </button>
                                    </div>
                                </div>
                            </form>

                            {/* Historial cronológico */}
                            <div className="phone-history-container">
                                <h4>📜 Historial de Teléfonos ({personPhonesList.length})</h4>
                                {loadingPhones ? (
                                    <div className="empty-state">Cargando historial telefónico...</div>
                                ) : personPhonesList.length === 0 ? (
                                    <div className="empty-state">No hay teléfonos registrados aún para esta persona.</div>
                                ) : (
                                    <div className="phone-cards-list">
                                        {personPhonesList.map((item) => (
                                            <div key={item.id} className={`phone-item-card ${item.es_actual ? 'is-actual' : ''}`}>
                                                <div className="phone-item-main">
                                                    <div className="phone-number-line">
                                                        <span className="phone-val">{item.telefono}</span>
                                                        <span className="phone-badge-type">{item.tipo}</span>
                                                        {item.es_actual && (
                                                            <span className="badge-actual">⭐ ACTUAL</span>
                                                        )}
                                                    </div>
                                                    {item.observacion && (
                                                        <div className="phone-item-obs">📝 {item.observacion}</div>
                                                    )}
                                                    <div className="phone-item-date">
                                                        <span>📅 {new Date(item.fecha_registro).toLocaleString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                        {item.nombre_usuario_registro && (
                                                            <span> • Agregado por: <strong>{item.nombre_usuario_registro}</strong></span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="phone-item-actions">
                                                    <a 
                                                        href={`https://wa.me/595${item.telefono.replace(/\D/g, '').replace(/^0/, '')}`}
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="phone-btn-icon wa" 
                                                        title="Enviar WhatsApp"
                                                    >
                                                        💬
                                                    </a>
                                                    <a 
                                                        href={`tel:${item.telefono}`} 
                                                        className="phone-btn-icon call" 
                                                        title="Llamar"
                                                    >
                                                        📞
                                                    </a>
                                                    {!item.es_actual && (
                                                        <button 
                                                            type="button"
                                                            className="btn-set-actual"
                                                            title="Marcar este número histórico como el actual"
                                                            disabled={phoneActionLoading}
                                                            onClick={() => handleSetPhoneActual(item.id)}
                                                        >
                                                            Hacer Actual
                                                        </button>
                                                    )}
                                                    <button 
                                                        type="button"
                                                        className="btn-del-phone"
                                                        title="Eliminar número"
                                                        disabled={phoneActionLoading}
                                                        onClick={() => handleDeletePhone(item.id)}
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VoterRegistration;
