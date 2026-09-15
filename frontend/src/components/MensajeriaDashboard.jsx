// MensajeriaDashboard.jsx
// Panel para la parametrización, programación y monitoreo de envíos de mensajería electoral

import React, { useState, useEffect, useRef } from 'react';
import { authFetch } from '../utils/authFetch';
import './MensajeriaDashboard.css';

export default function MensajeriaDashboard({ user }) {
    const [campanias, setCampanias] = useState([]);
    const [elecciones, setElecciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Listas para filtros geográficos
    const [departamentos, setDepartamentos] = useState([]);
    const [distritos, setDistritos] = useState([]);
    const [locales, setLocales] = useState([]);

    // Estado del Modal de Creación / Edición
    const [showModal, setShowModal] = useState(false);
    const [editingCampaniaId, setEditingCampaniaId] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        nombre_campania: '',
        tipo_destinatario: 'seguidores', // seguidores / padron_completo
        canal: 'sms', // sms / whatsapp / email / n8n
        plantilla_mensaje: 'Sr/a {nombre_apellido},\n\nLe recordamos que en las próximas elecciones votará en el local {local}, mesa {mesa}.\n\nApoye a {candidato}.',
        fecha_programada: '',
        eleccion_id: '',
        n8n_webhook_url: '',
        departamento_id: '',
        distrito_id: '',
        local_id: ''
    });

    // Estado para envío de prueba
    const [testContact, setTestContact] = useState('');
    const [sendingTest, setSendingTest] = useState(false);

    // Detalle de Logs de Envíos de una Campaña Seleccionada
    const [selectedCampania, setSelectedCampania] = useState(null);
    const [destinatarios, setDestinatarios] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Referencia al textarea para inserción de etiquetas
    const textareaRef = useRef(null);

    // Cargar campañas, elecciones y departamentos al montar
    useEffect(() => {
        cargarDatosIniciales();
    }, []);

    const cargarDatosIniciales = async () => {
        setLoading(true);
        try {
            // 1. Obtener Campañas
            const resCamp = await authFetch('/mensajeria/campanias');
            const dataCamp = await resCamp.json();
            setCampanias(dataCamp);

            // 2. Obtener Elecciones
            const resElec = await authFetch('/electoral/elecciones');
            const dataElec = await resElec.json();
            setElecciones(dataElec);
            
            if (dataElec.length > 0) {
                setFormData(prev => ({ ...prev, eleccion_id: dataElec[0].id }));
            }

            // 3. Obtener Departamentos
            const resDep = await authFetch('/electoral/geo/stats/departamentos');
            const dataDep = await resDep.json();
            setDepartamentos(dataDep);

        } catch (err) {
            console.error("Error al cargar datos iniciales:", err);
            setError("No se pudieron cargar los datos del servidor.");
        } finally {
            setLoading(false);
        }
    };

    // Recargar lista de campañas en segundo plano para ver progreso de envíos
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const resCamp = await authFetch('/mensajeria/campanias');
                const dataCamp = await resCamp.json();
                setCampanias(dataCamp);
            } catch (err) {
                console.error("Error en sondeo de campañas:", err);
            }
        }, 15000); // Cada 15 segundos

        return () => clearInterval(interval);
    }, []);

    // Cargar distritos cuando cambia departamento
    useEffect(() => {
        if (!formData.departamento_id) {
            setDistritos([]);
            setLocales([]);
            setFormData(prev => ({ ...prev, distrito_id: '', local_id: '' }));
            return;
        }
        
        const cargarDistritos = async () => {
            try {
                const resDist = await authFetch(`/electoral/geo/stats/distritos/${formData.departamento_id}`);
                const dataDist = await resDist.json();
                setDistritos(dataDist);
                setLocales([]);
                setFormData(prev => ({ ...prev, distrito_id: '', local_id: '' }));
            } catch (err) {
                console.error("Error al cargar distritos:", err);
            }
        };

        cargarDistritos();
    }, [formData.departamento_id]);

    // Cargar locales cuando cambia distrito
    useEffect(() => {
        if (!formData.distrito_id || !formData.departamento_id) {
            setLocales([]);
            setFormData(prev => ({ ...prev, local_id: '' }));
            return;
        }

        const cargarLocales = async () => {
            try {
                const resLoc = await authFetch(`/electoral/geo/locales?departamento_id=${formData.departamento_id}&distrito_id=${formData.distrito_id}`);
                const dataLoc = await resLoc.json();
                setLocales(dataLoc);
                setFormData(prev => ({ ...prev, local_id: '' }));
            } catch (err) {
                console.error("Error al cargar locales de votación:", err);
            }
        };

        cargarLocales();
    }, [formData.distrito_id, formData.departamento_id]);

    // Inserción inteligente de placeholders en el cursor
    const insertarEtiqueta = (tag) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = formData.plantilla_mensaje;

        const nuevoMensaje = text.substring(0, start) + tag + text.substring(end);

        setFormData(prev => ({ ...prev, plantilla_mensaje: nuevoMensaje }));

        // Devolver foco y restaurar cursor después de la etiqueta insertada
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + tag.length, start + tag.length);
        }, 10);
    };

    // Crear o guardar cambios de la campaña programada
    const handleGuardarCampania = async (e) => {
        e.preventDefault();
        if (!formData.nombre_campania || !formData.plantilla_mensaje || !formData.fecha_programada || !formData.eleccion_id) {
            alert("Por favor completa los campos requeridos.");
            return;
        }

        setSubmitting(true);
        try {
            // Construir los filtros JSONB geográficos
            const filtros = {};
            if (formData.departamento_id) filtros.departamento_id = formData.departamento_id;
            if (formData.distrito_id) filtros.distrito_id = formData.distrito_id;
            if (formData.local_id) filtros.local_id = formData.local_id;
            if (formData.canal === 'n8n' && formData.n8n_webhook_url) {
                filtros.n8n_webhook_url = formData.n8n_webhook_url;
            }

            const bodyPayload = {
                nombre_campania: formData.nombre_campania,
                tipo_destinatario: formData.tipo_destinatario,
                canal: formData.canal,
                plantilla_mensaje: formData.plantilla_mensaje,
                fecha_programada: new Date(formData.fecha_programada).toISOString(),
                eleccion_id: parseInt(formData.eleccion_id),
                filtros: Object.keys(filtros).length > 0 ? filtros : null
            };

            const isEditing = editingCampaniaId !== null;
            const url = isEditing ? `/mensajeria/campanias/${editingCampaniaId}` : '/mensajeria/campanias';
            const method = isEditing ? 'PUT' : 'POST';

            const response = await authFetch(url, {
                method: method,
                body: JSON.stringify(bodyPayload)
            });

            if (response.ok) {
                setShowModal(false);
                setEditingCampaniaId(null);
                setFormData({
                    nombre_campania: '',
                    tipo_destinatario: 'seguidores',
                    canal: 'sms',
                    plantilla_mensaje: 'Sr/a {nombre_apellido},\n\nLe recordamos que en las próximas elecciones votará en el local {local}, mesa {mesa}.\n\nApoye a {candidato}.',
                    fecha_programada: '',
                    eleccion_id: elecciones.length > 0 ? elecciones[0].id : '',
                    n8n_webhook_url: '',
                    departamento_id: '',
                    distrito_id: '',
                    local_id: ''
                });
                cargarDatosIniciales();
            } else {
                const data = await response.json();
                alert(`Error al ${isEditing ? 'guardar' : 'crear'} campaña: ` + (data.detail || "Error desconocido"));
            }

        } catch (err) {
            console.error("Error al guardar campaña:", err);
            alert("Error de conexión al servidor.");
        } finally {
            setSubmitting(false);
        }
    };

    // Iniciar edición de una campaña programada
    const handleEditarCampania = (camp) => {
        setEditingCampaniaId(camp.id);
        
        // Convertir fecha programada UTC a formato local para input datetime-local
        const dateLocal = new Date(camp.fecha_programada);
        const tzOffset = dateLocal.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(dateLocal - tzOffset)).toISOString().slice(0, 16);

        setFormData({
            nombre_campania: camp.nombre_campania,
            tipo_destinatario: camp.tipo_destinatario,
            canal: camp.canal,
            plantilla_mensaje: camp.plantilla_mensaje,
            fecha_programada: localISOTime,
            eleccion_id: camp.eleccion_id || '',
            n8n_webhook_url: camp.filtros?.n8n_webhook_url || '',
            departamento_id: camp.filtros?.departamento_id || '',
            distrito_id: camp.filtros?.distrito_id || '',
            local_id: camp.filtros?.local_id || ''
        });
        setShowModal(true);
    };

    // Eliminar / Cancelar campaña pendiente
    const handleCancelarCampania = async (id) => {
        if (!window.confirm("¿Seguro que deseas eliminar/cancelar esta campaña programada?")) {
            return;
        }

        try {
            const response = await authFetch(`/mensajeria/campanias/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                if (selectedCampania?.id === id) {
                    setSelectedCampania(null);
                    setDestinatarios([]);
                }
                cargarDatosIniciales();
            } else {
                const data = await response.json();
                alert("No se pudo cancelar: " + (data.detail || "Error del sistema"));
            }
        } catch (err) {
            console.error("Error al cancelar campaña:", err);
            alert("Error de conexión.");
        }
    };

    // Ver destinatarios y bitácora de envío individual
    const handleVerLogs = async (camp) => {
        setSelectedCampania(camp);
        setLoadingLogs(true);
        try {
            const res = await authFetch(`/mensajeria/campanias/${camp.id}/destinatarios?limit=150`);
            const data = await res.json();
            setDestinatarios(data);
        } catch (err) {
            console.error("Error cargando destinatarios:", err);
        } finally {
            setLoadingLogs(false);
        }
    };

    // Enviar mensaje de prueba individual de forma inmediata
    const handleSendTestMessage = async () => {
        if (!testContact) {
            alert("Por favor ingresa un contacto (teléfono o correo) para enviar la prueba.");
            return;
        }

        setSendingTest(true);
        try {
            const bodyPayload = {
                canal: formData.canal,
                plantilla_mensaje: formData.plantilla_mensaje,
                destinatario_contacto: testContact,
                n8n_webhook_url: formData.canal === 'n8n' ? formData.n8n_webhook_url : null,
                eleccion_id: parseInt(formData.eleccion_id)
            };

            const response = await authFetch('/mensajeria/test-send', {
                method: 'POST',
                body: JSON.stringify(bodyPayload)
            });

            alert("¡Mensaje de prueba enviado con éxito!");
        } catch (err) {
            console.error("Error al enviar prueba:", err);
            if (err.response) {
                try {
                    const data = await err.response.json();
                    alert("Error al enviar prueba: " + (data.detail || "Error del servidor"));
                } catch (e) {
                    alert(`Error al enviar prueba: Estado ${err.status} (${err.message})`);
                }
            } else {
                alert("Error al enviar prueba: " + err.message);
            }
        } finally {
            setSendingTest(false);
        }
    };

    // Renderizar simulación de texto
    const obtenerMensajeVistaPrevia = () => {
        return formData.plantilla_mensaje
            .replace(/{nombre_apellido}/g, "Juan Manuel Pérez")
            .replace(/{local}/g, "Colegio Nacional de la Capital (CNC)")
            .replace(/{mesa}/g, "7")
            .replace(/{candidato}/g, "Candidato Lista 1");
    };

    const abrirModalCrear = () => {
        setEditingCampaniaId(null);
        setFormData({
            nombre_campania: '',
            tipo_destinatario: 'seguidores',
            canal: 'sms',
            plantilla_mensaje: 'Sr/a {nombre_apellido},\n\nLe recordamos que en las próximas elecciones votará en el local {local}, mesa {mesa}.\n\nApoye a {candidato}.',
            fecha_programada: '',
            eleccion_id: elecciones.length > 0 ? elecciones[0].id : '',
            n8n_webhook_url: '',
            departamento_id: '',
            distrito_id: '',
            local_id: ''
        });
        setShowModal(true);
    };

    return (
        <div className="mensajeria-dashboard">
            <header className="mensajeria-header">
                <div>
                    <h2>💬 Campañas de Mensajería</h2>
                    <p>Crea, agenda y monitorea los envíos de comunicación masiva y personalizada a tu padrón o simpatizantes.</p>
                </div>
                <button className="btn-primary-mensajeria" onClick={abrirModalCrear}>
                    ➕ Crear Campaña Programada
                </button>
            </header>

            {error && <div className="error-panel" style={{ color: '#ef4444', marginBottom: '20px' }}>{error}</div>}

            {/* MÉTRIQUES CLAVE GENERALES */}
            <div className="metrics-grid-mensajeria">
                <div className="metric-card-mensajeria">
                    <div className="metric-info">
                        <h4>Campañas</h4>
                        <p className="metric-value-mensajeria">{campanias.length}</p>
                    </div>
                    <span className="metric-icon-mensajeria">📦</span>
                </div>
                <div className="metric-card-mensajeria success">
                    <div className="metric-info">
                        <h4>Mensajes Enviados</h4>
                        <p className="metric-value-mensajeria">
                            {campanias.reduce((acc, curr) => acc + curr.enviados_exito, 0)}
                        </p>
                    </div>
                    <span className="metric-icon-mensajeria">✅</span>
                </div>
                <div className="metric-card-mensajeria danger">
                    <div className="metric-info">
                        <h4>Errores de Entrega</h4>
                        <p className="metric-value-mensajeria">
                            {campanias.reduce((acc, curr) => acc + curr.enviados_fallido, 0)}
                        </p>
                    </div>
                    <span className="metric-icon-mensajeria">⚠️</span>
                </div>
            </div>

            {/* LISTADO DE CAMPAÑAS */}
            <div className="campaigns-table-container">
                <table className="campaigns-table">
                    <thead>
                        <tr>
                            <th>Nombre de Campaña</th>
                            <th>Canal</th>
                            <th>Universo</th>
                            <th>Programación</th>
                            <th>Destinatarios</th>
                            <th>Progreso</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {campanias.map((c) => {
                            const total = c.total_destinatarios || 0;
                            const procesados = c.enviados_exito + c.enviados_fallido;
                            const porcentaje = total > 0 ? Math.round((procesados / total) * 100) : 0;
                            
                            return (
                                <tr key={c.id}>
                                    <td style={{ fontWeight: '600' }}>{c.nombre_campania}</td>
                                    <td>
                                        <span className={`badge-canal ${c.canal}`}>
                                            {c.canal === 'whatsapp' ? '🟢 WA' : 
                                             c.canal === 'sms' ? '📱 SMS' : 
                                             c.canal === 'email' ? '✉️ Email' : '🔗 Webhook'}
                                        </span>
                                    </td>
                                    <td style={{ textTransform: 'capitalize' }}>
                                        {c.tipo_destinatario.replace('_', ' ')}
                                    </td>
                                    <td>{new Date(c.fecha_programada).toLocaleString()}</td>
                                    <td>{total}</td>
                                    <td style={{ width: '180px' }}>
                                        <div>{porcentaje}% ({procesados}/{total})</div>
                                        <div className="progress-bar-container">
                                            <div 
                                                className="progress-bar-fill" 
                                                style={{ width: `${porcentaje}%`, background: c.enviados_fallido > 0 ? '#f59e0b' : '#10b981' }} 
                                            />
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${c.estado}`}>
                                            {c.estado.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button 
                                                className="placeholder-btn" 
                                                onClick={() => handleVerLogs(c)}
                                                style={{ fontSize: '0.85rem', padding: '4px 8px' }}
                                            >
                                                👁️ Ver Bitácora
                                            </button>
                                            {c.estado === 'pendiente' && (
                                                <>
                                                    <button 
                                                        className="placeholder-btn"
                                                        onClick={() => handleEditarCampania(c)}
                                                        style={{ padding: '4px 8px', fontSize: '0.85rem', background: '#3b82f6', color: 'white', borderColor: '#3b82f6' }}
                                                    >
                                                        ✏️ Editar
                                                    </button>
                                                    <button 
                                                        className="btn-cancelar"
                                                        onClick={() => handleCancelarCampania(c.id)}
                                                        style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                                                    >
                                                        ❌ Cancelar
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {campanias.length === 0 && (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>
                                    No hay campañas electorales programadas aún.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* DETALLES DE ENVÍOS INDIVIDUALES */}
            {selectedCampania && (
                <div className="destinatarios-logs-container fade-in">
                    <div className="destinatarios-header">
                        <h3>📋 Bitácora de Envíos: {selectedCampania.nombre_campania}</h3>
                        <button className="placeholder-btn" onClick={() => setSelectedCampania(null)}>Cerrar Bitácora</button>
                    </div>

                    {loadingLogs ? (
                        <div>Cargando logs de destinatarios...</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="destinatarios-table">
                                <thead>
                                    <tr>
                                        <th>Cédula</th>
                                        <th>Contacto Destinatario</th>
                                        <th>Mensaje Personalizado</th>
                                        <th>Estado</th>
                                        <th>Fecha Envío</th>
                                        <th>Resultado / Error</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {destinatarios.map((d) => (
                                        <tr key={d.id}>
                                            <td style={{ fontFamily: 'monospace' }}>{d.cedula || 'N/A'}</td>
                                            <td>{selectedCampania.canal === 'email' ? d.email : d.telefono}</td>
                                            <td style={{ fontSize: '0.82rem', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={d.mensaje_personalizado}>
                                                {d.mensaje_personalizado}
                                            </td>
                                            <td>
                                                <span className={`status-badge ${d.estado}`} style={{ fontSize: '0.75rem', padding: '2px 6px' }}>
                                                    {d.estado}
                                                </span>
                                            </td>
                                            <td>{d.fecha_envio ? new Date(d.fecha_envio).toLocaleString() : '-'}</td>
                                            <td style={{ color: d.estado === 'fallido' ? '#ef4444' : '#64748b', fontSize: '0.85rem' }}>
                                                {d.error_mensaje || (d.estado === 'enviado' ? 'Enviado con éxito' : 'Pendiente')}
                                            </td>
                                        </tr>
                                    ))}
                                    {destinatarios.length === 0 && (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', color: '#64748b' }}>
                                                No hay logs disponibles para esta campaña (se poblarán una vez inicie el proceso).
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL CREAR CAMPAÑA */}
            {showModal && (
                <div className="modal-overlay-mensajeria">
                    <div className="modal-content-mensajeria">
                        <div className="modal-header" style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>{editingCampaniaId ? 'Editar Campaña Programada' : 'Crear Campaña de Envío'}</h3>
                            <button onClick={() => { setShowModal(false); setEditingCampaniaId(null); }} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                        </div>

                        <form onSubmit={handleGuardarCampania} className="modal-body-mensajeria">
                            {/* Panel Formulario */}
                            <div>
                                <div className="form-group-mensajeria">
                                    <label>Nombre identificatorio de la Campaña *</label>
                                    <input 
                                        type="text" 
                                        required 
                                        placeholder="Ej. Recordatorio de Votación Local CNC"
                                        value={formData.nombre_campania}
                                        onChange={e => setFormData({ ...formData, nombre_campania: e.target.value })}
                                    />
                                </div>

                                <div className="form-group-mensajeria" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label>Elección Asociada *</label>
                                        <select 
                                            required 
                                            value={formData.eleccion_id}
                                            onChange={e => setFormData({ ...formData, eleccion_id: e.target.value })}
                                        >
                                            {elecciones.map(el => (
                                                <option key={el.id} value={el.id}>{el.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label>Fecha y Hora de Envío *</label>
                                        <input 
                                            type="datetime-local" 
                                            required
                                            value={formData.fecha_programada}
                                            onChange={e => setFormData({ ...formData, fecha_programada: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="form-group-mensajeria" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label>Destinatarios (Universo) *</label>
                                        <select 
                                            value={formData.tipo_destinatario}
                                            onChange={e => setFormData({ ...formData, tipo_destinatario: e.target.value })}
                                        >
                                            <option value="seguidores">Mis Seguidores (Simpatizantes Asignados)</option>
                                            {['admin', 'candidato_principal'].includes(user.rol) && (
                                                <option value="padron_completo">Padrón Completo (Filtrado)</option>
                                            )}
                                        </select>
                                    </div>
                                    <div>
                                        <label>Canal de Envío *</label>
                                        <select 
                                            value={formData.canal}
                                            onChange={e => setFormData({ ...formData, canal: e.target.value })}
                                        >
                                            <option value="sms">SMS Masivo</option>
                                            <option value="whatsapp">WhatsApp API</option>
                                            <option value="email">Correo Electrónico</option>
                                            <option value="n8n">Webhook n8n (Integración Externa)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* URL de n8n Webhook opcional */}
                                {formData.canal === 'n8n' && (
                                    <div className="form-group-mensajeria">
                                        <label>URL Webhook de n8n</label>
                                        <input 
                                            type="url" 
                                            placeholder="http://tu-instancia-n8n:5678/webhook/sigel-envios"
                                            value={formData.n8n_webhook_url}
                                            onChange={e => setFormData({ ...formData, n8n_webhook_url: e.target.value })}
                                        />
                                    </div>
                                )}

                                {/* FILTROS TERRITORIALES PARA EL PADRÓN */}
                                {formData.tipo_destinatario === 'padron_completo' && (
                                    <fieldset style={{ border: '1px solid #cbd5e1', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <legend style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569', padding: '0 6px' }}>📍 Segmentación Geográfica</legend>
                                        
                                        <div className="form-group-mensajeria" style={{ gridColumn: 'span 2' }}>
                                            <label>Departamento</label>
                                            <select 
                                                value={formData.departamento_id}
                                                onChange={e => setFormData({ ...formData, departamento_id: e.target.value })}
                                            >
                                                <option value="">-- Todos los Departamentos --</option>
                                                {departamentos.map(d => (
                                                    <option key={d.id} value={d.id}>{d.nombre}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="form-group-mensajeria">
                                            <label>Distrito</label>
                                            <select 
                                                value={formData.distrito_id}
                                                disabled={!formData.departamento_id}
                                                onChange={e => setFormData({ ...formData, distrito_id: e.target.value })}
                                            >
                                                <option value="">-- Todos los Distritos --</option>
                                                {distritos.map(di => (
                                                    <option key={di.id} value={di.id}>{di.nombre}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="form-group-mensajeria">
                                            <label>Local de Votación</label>
                                            <select 
                                                value={formData.local_id}
                                                disabled={!formData.distrito_id}
                                                onChange={e => setFormData({ ...formData, local_id: e.target.value })}
                                            >
                                                <option value="">-- Todos los Locales --</option>
                                                {locales.map((l, idx) => (
                                                    <option key={idx} value={l.local_id}>{l.descripcion}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </fieldset>
                                )}

                                <div className="form-group-mensajeria">
                                    <label>Cuerpo del Mensaje (Editable) *</label>
                                    <div className="placeholder-buttons-container">
                                        <button type="button" className="placeholder-btn" onClick={() => insertarEtiqueta("{nombre_apellido}")}>＋ {`{nombre_apellido}`}</button>
                                        <button type="button" className="placeholder-btn" onClick={() => insertarEtiqueta("{local}")}>＋ {`{local}`}</button>
                                        <button type="button" className="placeholder-btn" onClick={() => insertarEtiqueta("{mesa}")}>＋ {`{mesa}`}</button>
                                        <button type="button" className="placeholder-btn" onClick={() => insertarEtiqueta("{candidato}")}>＋ {`{candidato}`}</button>
                                    </div>
                                    <textarea 
                                        ref={textareaRef}
                                        rows="6" 
                                        required 
                                        value={formData.plantilla_mensaje}
                                        onChange={e => setFormData({ ...formData, plantilla_mensaje: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Panel Vista Previa Celular */}
                            <div className="phone-simulator-container">
                                <h4 style={{ margin: '0 0 16px 0', fontSize: '0.95rem' }}>📱 Vista Previa Dinámica</h4>
                                <div className="phone-mockup-frame">
                                    <div className="phone-camera-notch" />
                                    <div className="phone-screen">
                                        {formData.canal === 'email' ? (
                                            <div className="email-chat-bubble">
                                                <div className="email-header-preview">
                                                    <div>De: SIGEL Electoral</div>
                                                    <div>Asunto: {formData.nombre_campania || 'Recordatorio Electoral'}</div>
                                                </div>
                                                {obtenerMensajeVistaPrevia()}
                                            </div>
                                        ) : formData.canal === 'whatsapp' ? (
                                            <div className="whatsapp-chat-bubble">
                                                {obtenerMensajeVistaPrevia()}
                                            </div>
                                        ) : (
                                            <div className="sms-chat-bubble">
                                                {obtenerMensajeVistaPrevia()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '16px', textAlign: 'center', lineHeight: '1.4' }}>
                                    Los campos entre llaves se resolverán en tiempo real para cada votante al momento de ejecutarse el envío.
                                </p>
                                
                                {/* Sección de Envío de Prueba Rápido */}
                                <div style={{ width: '100%', marginTop: '8px', marginBottom: '16px', borderTop: '1px dashed #cbd5e1', paddingTop: '12px' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>
                                        🧪 Enviar Mensaje de Prueba:
                                    </label>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <input 
                                            type="text" 
                                            placeholder={formData.canal === 'email' ? 'ejemplo@correo.com' : '0981123456'}
                                            value={testContact}
                                            onChange={e => setTestContact(e.target.value)}
                                            style={{ flex: 1, padding: '6px 10px', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                                        />
                                        <button 
                                            type="button" 
                                            className="placeholder-btn" 
                                            onClick={handleSendTestMessage}
                                            disabled={sendingTest}
                                            style={{ background: '#10b981', color: '#ffffff', borderColor: '#10b981', padding: '6px 12px', fontWeight: '600' }}
                                        >
                                            {sendingTest ? 'Enviando...' : 'Enviar'}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ marginTop: 'auto', display: 'flex', gap: '12px', width: '100%' }}>
                                    <button 
                                        type="button" 
                                        className="placeholder-btn" 
                                        style={{ flex: 1, padding: '10px' }} 
                                        onClick={() => { setShowModal(false); setEditingCampaniaId(null); }}
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="btn-primary-mensajeria" 
                                        style={{ flex: 1, padding: '10px', justifyContent: 'center' }}
                                        disabled={submitting}
                                    >
                                        {submitting ? (editingCampaniaId ? 'Guardando...' : 'Programando...') : (editingCampaniaId ? 'Guardar Cambios' : 'Programar')}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
