import React, { useState, useEffect } from 'react';
import { authFetch } from '../utils/authFetch';
import './Logistica.css';

const ChoferGestion = ({ user }) => {
    const [choferes, setChoferes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const canManageDrivers = ['admin', 'intendente', 'concejal'].includes(user?.rol || user?.role);

    const [nuevoChofer, setNuevoChofer] = useState({
        nombre: '',
        telefono: '',
        vehiculo_info: '',
        departamento_id: user.departamento_id || '',
        distrito_id: user.distrito_id || ''
    });

    useEffect(() => {
        fetchChoferes();
    }, []);

    const fetchChoferes = async () => {
        if (!canManageDrivers) {
            setLoading(false);
            return;
        }
        try {
            const res = await authFetch(`/api/logistica/choferes`);
            const data = await res.json();
            setChoferes(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Estás seguro de eliminar este chofer del sistema?")) return;
        try {
            const res = await authFetch(`/api/logistica/choferes/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchChoferes();
            } else {
                const err = await res.json();
                alert(err.detail || "Error al eliminar");
            }
        } catch (err) {
            alert("Error de conexión");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await authFetch(`/api/logistica/choferes`, {
                method: 'POST',
                body: JSON.stringify(nuevoChofer)
            });
            if (res.ok) {
                setShowForm(false);
                setNuevoChofer({ ...nuevoChofer, nombre: '', telefono: '', vehiculo_info: '' });
                fetchChoferes();
            }
        } catch (err) {
            alert("Error al registrar chofer");
        }
    };

    const copyLink = (token) => {
        const link = `${window.location.origin}/chofer/${token}`;
        navigator.clipboard.writeText(link);
        alert("Enlace copiado al portapapeles. Pásalo a tu chofer.");
    };

    const printQR = (chofer) => {
        const link = `${window.location.origin}/chofer/${chofer.token_seguimiento}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`;

        const printWindow = window.open('', '_blank', 'width=400,height=600');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Ticket Chofer - ${chofer.nombre}</title>
                    <style>
                        body { font-family: sans-serif; text-align: center; padding: 40px; }
                        .ticket { border: 2px dashed #000; padding: 20px; display: inline-block; }
                        h1 { font-size: 24px; margin-bottom: 10px; }
                        p { font-size: 14px; color: #666; }
                        img { margin: 20px 0; border: 1px solid #eee; }
                        .footer { margin-top: 20px; font-size: 12px; font-weight: bold; border-top: 1px solid #ccc; padding-top: 10px; }
                    </style>
                </head>
                <body>
                    <div class="ticket">
                        <h1>SIGEL - Logística</h1>
                        <p>Chofer: <strong>${chofer.nombre}</strong></p>
                        <p>Vehículo: ${chofer.vehiculo_info || 'No especificado'}</p>
                        <img src="${qrUrl}" alt="QR Code" />
                        <div class="footer">
                            ESCANEE PARA INICIAR SEGUIMIENTO<br/>
                            Válido para el Día D
                        </div>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();

        // Esperar a que cargue la imagen
        const img = printWindow.document.querySelector('img');
        img.onload = () => {
            console.log("Ticket QR listo");
            // printWindow.print(); // Se comenta por solicitud del usuario: Solo abrir ventana, no imprimir aún
        };
    };

    return (
        <div className="logistica-container">
            <header className="section-header">
                <h2>📇 Gestión de Choferes</h2>
                {canManageDrivers && (
                    <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
                        {showForm ? 'Cancelar' : '+ Nuevo Chofer'}
                    </button>
                )}
            </header>

            {showForm && (
                <form className="chofer-form" onSubmit={handleSubmit}>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Nombre Completo</label>
                            <input
                                type="text"
                                required
                                value={nuevoChofer.nombre}
                                onChange={e => setNuevoChofer({ ...nuevoChofer, nombre: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Teléfono / Celular</label>
                            <input
                                type="text"
                                required
                                value={nuevoChofer.telefono}
                                onChange={e => setNuevoChofer({ ...nuevoChofer, telefono: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Información del Vehículo</label>
                            <input
                                type="text"
                                placeholder="Ej: Toyota Hilux - ABC 123"
                                value={nuevoChofer.vehiculo_info}
                                onChange={e => setNuevoChofer({ ...nuevoChofer, vehiculo_info: e.target.value })}
                            />
                        </div>
                        <button type="submit" className="btn-success">Guardar Chofer</button>
                    </div>
                </form>
            )}

            {!canManageDrivers ? (
                <div className="alert warning">No tienes permisos para gestionar choferes. Esta sección es exclusiva para candidatos y administradores.</div>
            ) : (
                <div className="choferes-list">
                    {loading ? <p>Cargando lista...</p> : (
                        <table className="sigel-table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Vehículo</th>
                                    <th>Responsable</th>
                                    <th>Estado</th>
                                    <th>Última Conexión</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {choferes.map(c => (
                                    <tr key={c.id}>
                                        <td>
                                            <strong>{c.nombre}</strong><br />
                                            <small>{c.telefono}</small>
                                        </td>
                                        <td>{c.vehiculo_info}</td>
                                        <td>
                                            <span className="owner-badge" style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                {c.creador_nombre || 'Sistema'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${c.latitud ? 'online' : 'offline'}`}>
                                                {c.latitud ? '📡 Operando' : '💤 Inactivo'}
                                            </span>
                                        </td>
                                        <td>{c.ultima_conexion ? new Date(c.ultima_conexion).toLocaleString() : 'Nunca'}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                <button className="btn-small" title="Copiar enlace de seguimiento" onClick={() => copyLink(c.token_seguimiento)}>
                                                    🔗
                                                </button>
                                                <button className="btn-small" title="Imprimir QR" style={{ background: '#3b82f6', color: 'white', borderColor: '#3b82f6' }} onClick={() => printQR(c)}>
                                                    🖨️
                                                </button>
                                                {(['admin', 'administrador'].includes(user?.rol?.toLowerCase() || user?.role?.toLowerCase()) || c.creado_por === (user?.user_id || user?.id)) && (
                                                    <button className="btn-small" title="Eliminar Chofer" style={{ background: '#ef4444', color: 'white', borderColor: '#ef4444' }} onClick={() => handleDelete(c.id)}>
                                                        🗑️
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
};

export default ChoferGestion;
