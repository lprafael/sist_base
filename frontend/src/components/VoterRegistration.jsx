import React, { useState, useEffect } from 'react';
import { authFetch } from '../utils/authFetch';
import './VoterRegistration.css';

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
        latitud: null,
        longitud: null
    });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [fetchingLocation, setFetchingLocation] = useState(false);

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


    useEffect(() => {
        fetchMyVoters();
    }, []);

    const fetchMyVoters = async () => {
        try {
            const response = await authFetch('/electoral/mis-votantes');
            const data = await response.json();
            setMyVoters(data);
        } catch (error) {
            console.error('Error fetching voters:', error);
        }
    };



    const handleSearch = async (e) => {
        e.preventDefault();
        if (searchQuery.length < 3) return;

        setLoading(true);
        try {
            const response = await authFetch(`/electoral/padron/search?query=${searchQuery}`);
            const data = await response.json();
            console.log("DEBUG: Datos del padrón recibidos:", data);
            setSearchResults(data);

            if (data.length === 0) {
                setMessage({ type: 'warning', text: 'No se encontraron resultados en el padrón.' });
            } else {
                setMessage({ type: '', text: '' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error al buscar en el padrón.' });
        } finally {
            setLoading(false);
        }
    };

    const handleAddVoter = async () => {
        try {
            const response = await authFetch('/electoral/captacion', {
                method: 'POST',
                body: JSON.stringify({
                    cedula_votante: selectedPerson.cedula,
                    ...formData
                })
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Simpatizante registrado exitosamente.' });
                setSelectedPerson(null);
                setFormData({ parentesco: '', grado_seguridad: 3, observaciones: '' });
                fetchMyVoters();
                setSearchResults([]);
                setSearchQuery('');
            } else {
                const errorData = await response.json();
                setMessage({ type: 'error', text: errorData.detail || 'Error al registrar.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error de conexión.' });
        }
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
                {/* Panel de Búsqueda */}
                <div className="search-panel card">
                    <h3>🔍 Buscar en Padrón</h3>
                    <form onSubmit={handleSearch} className="search-box">
                        <input
                            type="text"
                            placeholder="Cédula o nombre completo..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button type="submit" disabled={loading}>
                            {loading ? 'Cargando...' : 'Buscar'}
                        </button>
                    </form>

                    <div className="results-list">
                        {searchResults.map((person) => (
                            <div
                                key={person.cedula}
                                className={`result-item ${selectedPerson?.cedula === person.cedula ? 'selected' : ''}`}
                                onClick={() => setSelectedPerson(person)}
                            >
                                <div className="person-info">
                                    <div className="fullname">
                                        {person.nombres || person.nombre || 'Sin nombre'} {person.apellidos || person.apellido_paterno || ''}
                                    </div>
                                    <div className="cedula-mesa">
                                        <span className="cedula">C.I.: {person.cedula}</span>
                                        <span className="mesa"> - Mesa: {person.mesa || 'S/M'}</span>
                                    </div>
                                </div>
                                <div className="person-location">
                                    {person.distrito ? `Dist. ${person.distrito}` : ''}
                                </div>

                            </div>
                        ))}

                    </div>
                </div>

                {/* Formulario de Registro */}
                <div className={`form-panel card ${!selectedPerson ? 'disabled' : ''}`}>
                    <h3>📋 Detalles del Simpatizante</h3>
                    {!selectedPerson ? (
                        <div className="empty-state">
                            <p>Selecciona una persona de los resultados de búsqueda para completar el registro.</p>
                        </div>
                    ) : (
                        <div className="registration-form">
                            <div className="selected-badge">
                                <strong>Registrando a:</strong> {selectedPerson.nombres} {selectedPerson.apellidos}
                            </div>


                            <div className="form-group">
                                <label>Vínculo / Parentesco</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Vecino, Pariente, Compañero..."
                                    value={formData.parentesco}
                                    onChange={(e) => setFormData({ ...formData, parentesco: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Grado de Seguridad (1-5)</label>
                                <div className="range-container">
                                    <input
                                        type="range"
                                        min="1"
                                        max="5"
                                        value={formData.grado_seguridad}
                                        onChange={(e) => setFormData({ ...formData, grado_seguridad: parseInt(e.target.value) })}
                                    />
                                    <div className="range-labels">
                                        <span>Dudoso (1)</span>
                                        <span>Seguro (5)</span>
                                    </div>
                                    <div className="current-val">Valor: {formData.grado_seguridad}</div>
                                </div>
                            </div>

                            <div className="form-group location-group">
                                <label>Ubicación (Geolocalización)</label>
                                <div className="location-btn-row">
                                    <button
                                        type="button"
                                        onClick={getLocation}
                                        className={`geo-btn ${formData.latitud ? 'active' : ''}`}
                                        disabled={fetchingLocation}
                                    >
                                        {fetchingLocation ? '🛰️ Obteniendo...' :
                                            formData.latitud ? '✅ Ubicación Lista' : '📍 Obtener Mi Ubicación'}
                                    </button>
                                </div>
                                {formData.latitud && (
                                    <span className="coord-info">
                                        Coord: {formData.latitud.toFixed(4)}, {formData.longitud.toFixed(4)}
                                    </span>
                                )}
                            </div>

                            <div className="form-group">

                                <label>Observaciones</label>
                                <textarea
                                    placeholder="Datos adicionales importantes..."
                                    value={formData.observaciones}
                                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                                />
                            </div>

                            <button className="add-btn" onClick={handleAddVoter}>
                                Confirmar Captación
                            </button>
                        </div>
                    )}
                </div>

                {/* Lista de mis captados */}
                <div className="my-voters-panel card">
                    <h3>⭐ Mis Simpatizantes ({myVoters.length})</h3>
                    <div className="voters-table-container">
                        <table className="voters-table">
                            <thead>
                                <tr>
                                    <th>Cédula</th>
                                    <th>Nombre</th>
                                    <th>Parentesco</th>
                                    <th>Seguridad</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {myVoters.map(voter => (
                                    <tr key={voter.id}>
                                        <td>{voter.cedula_votante}</td>
                                        <td>{voter.nombre_votante} {voter.apellido_votante}</td>
                                        <td>{voter.parentesco}</td>
                                        <td>
                                            <span className={`badge-security s${voter.grado_seguridad}`}>
                                                {voter.grado_seguridad}
                                            </span>
                                        </td>
                                        <td>
                                            {voter.validacion_candidato ?
                                                <span className="status ok">✓ Validado</span> :
                                                <span className="status pending">⏳ Pendiente</span>
                                            }
                                        </td>
                                    </tr>
                                ))}
                                {myVoters.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="text-center">Aún no has registrado simpatizantes.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VoterRegistration;
