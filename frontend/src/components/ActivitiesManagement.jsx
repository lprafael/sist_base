import React, { useState, useEffect, useRef } from 'react';
import { authFetch } from '../utils/authFetch';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, GeoJSON, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './ActivitiesManagement.css';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const ActivitiesManagement = ({ user }) => {
    const [activities, setActivities] = useState([]);
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [geoData, setGeoData] = useState(null);
    const [mapCenter, setMapCenter] = useState([-25.33, -57.52]);

    // Form state for NEW/EDIT Activity
    const [formData, setFormData] = useState({
        titulo: '',
        tipo: 'Caminata',
        fecha_programada: '',
        fecha_prevista: '',
        observaciones: '',
        latitud: -25.33, // Default San Lorenzo approx
        longitud: -57.52,
        radio_influencia: 200,
        estado: 'pendiente'
    });

    // State for participants
    const [participants, setParticipants] = useState([]);
    const [newParticipant, setNewParticipant] = useState({
        cedula: '',
        nombre: '',
        apellido: '',
        telefono: '',
        observaciones: ''
    });

    const [photos, setPhotos] = useState([]);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchActivities();
        if (user?.departamento_id && user?.distrito_id) {
            fetchCartografia(user.departamento_id, user.distrito_id);
        }
    }, [user]);

    const fetchCartografia = async (dptoId, distId) => {
        try {
            const response = await authFetch(`/electoral/geo/cartografia/distrito/${dptoId}/${distId}`);
            if (response.ok) {
                const data = await response.json();
                if (data && data.features && data.features.length > 0) {
                    setGeoData(data);
                }
            }
        } catch (error) {
            console.error("Error fetching cartografia", error);
        }
    };

    useEffect(() => {
        if (selectedActivity) {
            fetchParticipants(selectedActivity.id);
            // In a real app we'd fetch photos too
        }
    }, [selectedActivity]);

    const fetchActivities = async () => {
        setLoading(true);
        try {
            const response = await authFetch('/actividades/');
            if (response.ok) {
                const data = await response.json();
                setActivities(data);
            }
        } catch (error) {
            console.error("Error fetching activities", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchParticipants = async (actId) => {
        try {
            const response = await authFetch(`/actividades/${actId}/participantes`);
            if (response.ok) {
                const data = await response.json();
                setParticipants(data);
            }
        } catch (error) {
            console.error("Error fetching participants", error);
        }
    };

    const handleCreateActivity = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                fecha_programada: formData.fecha_programada || null,
                fecha_prevista: formData.fecha_prevista || null
            };
            const isEdit = !!selectedActivity;
            const method = isEdit ? 'PUT' : 'POST';
            const url = isEdit ? `/actividades/${selectedActivity.id}` : '/actividades/';

            const response = await authFetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                const actData = await response.json();
                setMessage({ type: 'success', text: isEdit ? 'Actividad actualizada.' : 'Actividad creada correctamente.' });
                setIsCreating(false);
                if (isEdit) setSelectedActivity(actData);
                fetchActivities();
            } else {
                setMessage({ type: 'error', text: 'Error al crear la actividad.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error de servidor.' });
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = () => {
        if (!selectedActivity) return;
        setFormData({
            titulo: selectedActivity.titulo,
            tipo: selectedActivity.tipo || 'Caminata',
            fecha_programada: selectedActivity.fecha_programada ? selectedActivity.fecha_programada.slice(0, 16) : '',
            fecha_prevista: selectedActivity.fecha_prevista ? selectedActivity.fecha_prevista.slice(0, 16) : '',
            observaciones: selectedActivity.observaciones || '',
            latitud: selectedActivity.latitud || -25.33,
            longitud: selectedActivity.longitud || -57.52,
            radio_influencia: selectedActivity.radio_influencia || 200,
            estado: selectedActivity.estado || 'pendiente'
        });
        setIsCreating(true);
    };

    const handleDeleteActivity = async () => {
        if (!selectedActivity) return;
        if (!window.confirm('¿Estás seguro de que deseas eliminar esta actividad?')) return;
        setLoading(true);
        try {
            const response = await authFetch(`/actividades/${selectedActivity.id}`, { method: 'DELETE' });
            if (response.ok) {
                setMessage({ type: 'success', text: 'Actividad eliminada correctamente.' });
                setSelectedActivity(null);
                fetchActivities();
            } else {
                setMessage({ type: 'error', text: 'Error al eliminar actividad.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error de servidor.' });
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (newStatus) => {
        if (!selectedActivity) return;
        setLoading(true);
        try {
            const payload = { estado: newStatus };
            const response = await authFetch(`/actividades/${selectedActivity.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                const updatedAct = await response.json();
                setSelectedActivity(updatedAct);
                fetchActivities();
            }
        } catch (error) {
            console.error("Error updating status", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddParticipant = async (e) => {
        e.preventDefault();
        if (!selectedActivity) return;
        setLoading(true);
        try {
            const response = await authFetch(`/actividades/${selectedActivity.id}/participantes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newParticipant)
            });
            if (response.ok) {
                setMessage({ type: 'success', text: 'Persona registrada con éxito.' });
                setNewParticipant({ cedula: '', nombre: '', apellido: '', telefono: '', observaciones: '' });
                fetchParticipants(selectedActivity.id);
            } else {
                const err = await response.json();
                setMessage({ type: 'error', text: err.detail || 'Error al registrar.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error de conexión.' });
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const files = e.target.files || e.dataTransfer.files;
        if (!files.length || !selectedActivity) return;

        const formDataFile = new FormData();
        formDataFile.append('file', files[0]);
        formDataFile.append('descripcion', 'Foto de actividad');

        try {
            const response = await fetch(`/api/actividades/${selectedActivity.id}/fotos`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: formDataFile
            });
            if (response.ok) {
                setMessage({ type: 'success', text: 'Foto subida correctamente.' });
                // Re-fetch to update photos list
                const actResponse = await authFetch(`/actividades/${selectedActivity.id}`);
                if (actResponse.ok) {
                    const updatedAct = await actResponse.json();
                    setSelectedActivity(updatedAct);
                    fetchActivities();
                }
            }
        } catch (error) {
            console.error("Error uploading photo", error);
        }
    };

    // Component to handle Map click to set location
    const LocationPicker = () => {
        useMapEvents({
            click(e) {
                setFormData(prev => ({
                    ...prev,
                    latitud: e.latlng.lat,
                    longitud: e.latlng.lng
                }));
            },
        });
        return formData.latitud ? <Marker position={[formData.latitud, formData.longitud]} /> : null;
    };

    return (
        <div className="activities-container">
            <header className="section-header">
                <h2>🚩 Gestión de Actividades de Captación</h2>
                <div className="header-actions">
                    <button className="primary-btn" onClick={() => { setIsCreating(true); setSelectedActivity(null); }}>
                        ➕ Nueva Actividad
                    </button>
                    <button className="secondary-btn" onClick={fetchActivities}>🔄 Actualizar</button>
                </div>
            </header>

            {message.text && <div className={`message ${message.type}`}>{message.text}</div>}

            <div className="global-map-view card" style={{ position: 'relative', zIndex: 1 }}>
                <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                    {geoData && (
                        <GeoJSON
                            data={geoData}
                            key={JSON.stringify(geoData)}
                            style={() => ({
                                fillColor: '#cbd5e1',
                                weight: 2,
                                opacity: 0.8,
                                color: '#64748b',
                                dashArray: '3',
                                fillOpacity: 0.15
                            })}
                            onEachFeature={(feature, layer) => {
                                if (feature.properties && feature.properties.nombre) {
                                    const popTotal = feature.properties.poblacion_total || 0;
                                    const captados = feature.properties.captados_count || 0;
                                    layer.bindTooltip(
                                        `<strong>${feature.properties.nombre}</strong><br/>
                                        <em>Población: ${popTotal}</em><br/>
                                        <em>Captados Votantes: ${captados}</em>`,
                                        { sticky: true }
                                    );
                                }
                            }}
                        />
                    )}

                    {activities.filter(a => a.latitud != null && a.longitud != null).map(act => (
                        <React.Fragment key={act.id}>
                            <Marker position={[act.latitud, act.longitud]}>
                                <Tooltip>
                                    <strong>{act.titulo}</strong><br />
                                    <em>{act.tipo}</em><br />
                                    <span>Estado: {act.estado}</span>
                                </Tooltip>
                            </Marker>
                            <Circle
                                center={[act.latitud, act.longitud]}
                                radius={act.radio_influencia || 200}
                                pathOptions={{
                                    color: act.estado === 'concluída' ? '#10b981' : (act.estado === 'en_curso' ? '#3b82f6' : (act.estado === 'cancelada' ? '#ef4444' : '#f59e0b')),
                                    fillColor: act.estado === 'concluída' ? '#10b981' : (act.estado === 'en_curso' ? '#3b82f6' : (act.estado === 'cancelada' ? '#ef4444' : '#f59e0b')),
                                    fillOpacity: 0.25
                                }}
                            />
                        </React.Fragment>
                    ))}
                </MapContainer>
                <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,0.9)', padding: '0.5rem', borderRadius: '8px', zIndex: 1000, fontSize: '0.85rem' }}>
                    <strong>Leyenda de Estados:</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ display: 'inline-block', width: 10, height: 10, background: '#f59e0b', borderRadius: '50%' }}></span> Pendiente/Agendada</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ display: 'inline-block', width: 10, height: 10, background: '#3b82f6', borderRadius: '50%' }}></span> En Curso</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ display: 'inline-block', width: 10, height: 10, background: '#10b981', borderRadius: '50%' }}></span> Concluida</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ display: 'inline-block', width: 10, height: 10, background: '#ef4444', borderRadius: '50%' }}></span> Cancelada</div>
                </div>
            </div>

            <div className="activities-content">
                {/* List of Activities */}
                <aside className="activities-sidebar card">
                    <h3>Lista de Actividades</h3>
                    {loading && <p>Cargando...</p>}
                    <div className="activity-list">
                        {activities.map(act => (
                            <div
                                key={act.id}
                                className={`activity-item ${selectedActivity?.id === act.id ? 'active' : ''}`}
                                onClick={() => { setSelectedActivity(act); setIsCreating(false); }}
                            >
                                <span className="act-icon">📍</span>
                                <div className="act-info">
                                    <strong>{act.titulo}</strong>
                                    <span>{new Date(act.fecha_programada).toLocaleDateString()}</span>
                                    <span className={`status-badge ${act.estado}`}>{act.estado}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                <main className="activity-detail-view card">
                    {isCreating ? (
                        <div className="create-activity-form">
                            <h3>{selectedActivity ? 'Editar Actividad' : 'Crear Nueva Actividad'}</h3>
                            <form onSubmit={handleCreateActivity}>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Título de la Actividad</label>
                                        <input
                                            type="text" required
                                            value={formData.titulo}
                                            onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                                            placeholder="Ej: Caminata Barrio San Pablo"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Tipo</label>
                                        <select value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value })}>
                                            <option value="Caminata">Caminata</option>
                                            <option value="Lanzamiento">Lanzamiento</option>
                                            <option value="Reunión">Reunión</option>
                                            <option value="Presentación">Presentación</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Fecha Programada</label>
                                        <input type="datetime-local" value={formData.fecha_programada} onChange={e => setFormData({ ...formData, fecha_programada: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Radio de Influencia (metros)</label>
                                        <input type="number" value={formData.radio_influencia} onChange={e => setFormData({ ...formData, radio_influencia: parseInt(e.target.value) })} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Ubicación y Zona de Influencia (Haz clic en el mapa)</label>
                                    <div style={{ height: '300px', width: '100%', marginBottom: '1rem' }}>
                                        <MapContainer center={[-25.33, -57.52]} zoom={13} style={{ height: '100%' }}>
                                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                            <LocationPicker />
                                            {formData.latitud && (
                                                <Circle center={[formData.latitud, formData.longitud]} radius={formData.radio_influencia} />
                                            )}
                                        </MapContainer>
                                    </div>
                                </div>
                                <div className="form-actions">
                                    <button type="submit" className="save-btn" disabled={loading}>Guardar Actividad</button>
                                    <button type="button" className="cancel-btn" onClick={() => setIsCreating(false)}>Cancelar</button>
                                </div>
                            </form>
                        </div>
                    ) : selectedActivity ? (
                        <div className="selected-activity-view">
                            <div className="act-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h3>{selectedActivity.titulo}</h3>
                                    <p>{selectedActivity.observaciones}</p>
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <select
                                            value={selectedActivity.estado}
                                            onChange={(e) => handleStatusChange(e.target.value)}
                                            style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid #ccc' }}
                                        >
                                            <option value="pendiente">Pendiente</option>
                                            <option value="agendada">Agendada</option>
                                            <option value="en_curso">En Curso</option>
                                            <option value="concluída">Concluida</option>
                                            <option value="cancelada">Cancelada</option>
                                            <option value="reprogramada">Reprogramada</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className="secondary-btn" onClick={handleEditClick}>🖊️ Editar</button>
                                    <button className="secondary-btn" onClick={handleDeleteActivity} style={{ color: 'red', borderColor: 'red' }}>🗑️ Borrar</button>
                                </div>
                            </div>

                            <div className="activity-tabs">
                                {/* Tab: Registro de Personas */}
                                <section className="register-participants-section">
                                    <h4>👥 Registro de Concurrencia</h4>
                                    <form className="quick-add-form" onSubmit={handleAddParticipant}>
                                        <input
                                            type="text" placeholder="Cédula" required
                                            value={newParticipant.cedula}
                                            onChange={e => setNewParticipant({ ...newParticipant, cedula: e.target.value })}
                                        />
                                        <input
                                            type="text" placeholder="Nombre"
                                            value={newParticipant.nombre}
                                            onChange={e => setNewParticipant({ ...newParticipant, nombre: e.target.value })}
                                        />
                                        <input
                                            type="text" placeholder="Apellido"
                                            value={newParticipant.apellido}
                                            onChange={e => setNewParticipant({ ...newParticipant, apellido: e.target.value })}
                                        />
                                        <button type="submit" disabled={loading}>Registrar</button>
                                    </form>

                                    <div className="participants-table-container">
                                        <table className="participants-table">
                                            <thead>
                                                <tr>
                                                    <th>CI</th>
                                                    <th>Nombre</th>
                                                    <th>ANR</th>
                                                    <th>PLRA</th>
                                                    <th>Fecha</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {participants.map(p => (
                                                    <tr key={p.id}>
                                                        <td>{parseInt(p.cedula).toLocaleString('es-PY')}</td>
                                                        <td>{p.nombre} {p.apellido}</td>
                                                        <td>{p.en_padron_anr ? '✅' : '❌'}</td>
                                                        <td>{p.en_padron_plra ? '🔵' : '⚪'}</td>
                                                        <td>{new Date(p.fecha_registro).toLocaleTimeString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>

                                {/* Tab: Fotos */}
                                <section className="photos-section">
                                    <h4>📸 Evidencia Fotográfica</h4>
                                    <div
                                        className="drop-zone"
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => { e.preventDefault(); handleFileUpload(e); }}
                                        onClick={() => fileInputRef.current.click()}
                                    >
                                        <p>Arrastra fotos aquí o haz clic para subir</p>
                                        <input
                                            type="file" accept="image/*" capture="environment"
                                            style={{ display: 'none' }}
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                        />
                                    </div>

                                    {/* Photo Collage */}
                                    {selectedActivity.fotos && selectedActivity.fotos.length > 0 && (
                                        <div className="photo-collage">
                                            {selectedActivity.fotos.map(foto => (
                                                <div key={foto.id} className="photo-item">
                                                    <img
                                                        src={`/api/${foto.ruta_archivo}`}
                                                        alt={foto.descripcion || "Foto de actividad"}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-state">
                            <p>Selecciona una actividad de la lista, o crea una nueva.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default ActivitiesManagement;
