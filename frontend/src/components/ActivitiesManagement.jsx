import React, { useState, useEffect, useRef } from 'react';
import { authFetch } from '../utils/authFetch';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
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
    }, []);

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
            const response = await authFetch('/actividades/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (response.ok) {
                setMessage({ type: 'success', text: 'Actividad creada correctamente.' });
                setIsCreating(false);
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
            const response = await fetch(`${import.meta.env.VITE_REACT_APP_API_URL}/actividades/${selectedActivity.id}/fotos`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: formDataFile
            });
            if (response.ok) {
                setMessage({ type: 'success', text: 'Foto subida correctamente.' });
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
        <div className="activities-management">
            <header className="section-header">
                <h2>🚩 Gestión de Actividades de Captación</h2>
                <p>Organiza eventos, define zonas de influencia y registra la concurrencia en tiempo real.</p>
            </header>

            {message.text && <div className={`message ${message.type}`}>{message.text}</div>}

            <div className="activities-grid">
                {/* List of Activities Sidebar */}
                <aside className="activities-sidebar card">
                    <h3>
                        Lista de Actividades
                        <button className="primary-btn" onClick={() => { setIsCreating(true); setSelectedActivity(null); }}>
                            ➕ Nueva
                        </button>
                    </h3>

                    {loading && <p>Cargando actividades...</p>}

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
                                    <span>📅 {new Date(act.fecha_programada).toLocaleDateString()}</span>
                                    <span className={`status-badge ${act.estado}`}>{act.estado}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {!loading && activities.length === 0 && (
                        <div className="empty-state">
                            <p>No hay actividades registradas.</p>
                        </div>
                    )}
                </aside>

                <main className="activity-detail-view card">
                    {isCreating ? (
                        <div className="create-activity-form">
                            <h3>🆕 Crear Nueva Actividad</h3>
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
                                        <label>Tipo de Evento</label>
                                        <select value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value })}>
                                            <option value="Caminata">Caminata</option>
                                            <option value="Lanzamiento">Lanzamiento</option>
                                            <option value="Reunión">Reunión</option>
                                            <option value="Presentación">Presentación</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Fecha y Hora Programada</label>
                                        <input
                                            type="datetime-local"
                                            value={formData.fecha_programada}
                                            onChange={e => setFormData({ ...formData, fecha_programada: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Radio de Influencia (metros)</label>
                                        <input
                                            type="number"
                                            value={formData.radio_influencia}
                                            onChange={e => setFormData({ ...formData, radio_influencia: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Ubicación y Área de Cobertura (Haz clic en el mapa)</label>
                                    <div style={{ height: '350px', width: '100%', marginBottom: '1.5rem', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                        <MapContainer center={[-25.33, -57.52]} zoom={13} style={{ height: '100%' }}>
                                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                            <LocationPicker />
                                            {formData.latitud && (
                                                <Circle
                                                    center={[formData.latitud, formData.longitud]}
                                                    radius={formData.radio_influencia}
                                                    pathOptions={{ color: '#2b6cb0', fillColor: '#2b6cb0', fillOpacity: 0.2 }}
                                                />
                                            )}
                                        </MapContainer>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Observaciones Iniciales</label>
                                    <textarea
                                        value={formData.observaciones}
                                        onChange={e => setFormData({ ...formData, observaciones: e.target.value })}
                                        placeholder="Descripción de la actividad..."
                                        rows="3"
                                    />
                                </div>

                                <div className="form-actions">
                                    <button type="submit" className="save-btn" disabled={loading}>
                                        {loading ? 'Guardando...' : 'Guardar Actividad'}
                                    </button>
                                    <button type="button" className="cancel-btn" onClick={() => setIsCreating(false)}>
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : selectedActivity ? (
                        <div className="selected-activity-view">
                            <div className="act-header">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h3>{selectedActivity.titulo}</h3>
                                        <p style={{ color: '#718096', marginTop: '-10px' }}>
                                            📅 {new Date(selectedActivity.fecha_programada).toLocaleString()} | 🚩 {selectedActivity.tipo}
                                        </p>
                                    </div>
                                    <span className={`status-badge ${selectedActivity.estado}`}>{selectedActivity.estado}</span>
                                </div>
                                {selectedActivity.observaciones && (
                                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '20px' }}>
                                        {selectedActivity.observaciones}
                                    </div>
                                )}
                            </div>

                            <div className="activity-tabs">
                                <section className="register-participants-section">
                                    <h4>👥 Registro de Concurrencia (Check-in)</h4>
                                    <form className="quick-add-form" onSubmit={handleAddParticipant}>
                                        <input
                                            type="text" placeholder="Cédula (C.I. nro)" required
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
                                        <button type="submit" disabled={loading}>
                                            {loading ? '...' : 'Registrar'}
                                        </button>
                                    </form>

                                    <div className="participants-table-container">
                                        <table className="participants-table">
                                            <thead>
                                                <tr>
                                                    <th>Cédula</th>
                                                    <th>Nombre Completo</th>
                                                    <th>ANR 🔴</th>
                                                    <th>PLRA 🔵</th>
                                                    <th>Registro</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {participants.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#a0aec0' }}>
                                                            Aún no hay participantes registrados en esta actividad.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    participants.map(p => (
                                                        <tr key={p.id}>
                                                            <td style={{ fontWeight: 'bold' }}>{parseInt(p.cedula).toLocaleString('es-PY')}</td>
                                                            <td>{p.nombre} {p.apellido}</td>
                                                            <td style={{ textAlign: 'center', fontSize: '1.2rem' }}>{p.en_padron_anr ? '🔴' : '⚪'}</td>
                                                            <td style={{ textAlign: 'center', fontSize: '1.2rem' }}>{p.en_padron_plra ? '🔵' : '⚪'}</td>
                                                            <td style={{ fontSize: '0.8rem', color: '#718096' }}>{new Date(p.fecha_registro).toLocaleTimeString()}</td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>

                                <section className="photos-section">
                                    <h4>📸 Evidencia Fotográfica / Fotos del Evento</h4>
                                    <div
                                        className="drop-zone"
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => { e.preventDefault(); handleFileUpload(e); }}
                                        onClick={() => fileInputRef.current.click()}
                                    >
                                        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📷</div>
                                        <p>Arrastra fotos aquí, toma una captura con la cámara o haz clic para seleccionar</p>
                                        <input
                                            type="file" accept="image/*" capture="environment"
                                            style={{ display: 'none' }}
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                        />
                                    </div>
                                </section>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div style={{ fontSize: '4rem', opacity: 0.2 }}>🚩</div>
                            <p>Selecciona una actividad del listado lateral para ver su detalle y registrar personas.</p>
                            <button className="primary-btn" style={{ marginTop: '20px' }} onClick={() => setIsCreating(true)}>
                                Crear Primera Actividad
                            </button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default ActivitiesManagement;
