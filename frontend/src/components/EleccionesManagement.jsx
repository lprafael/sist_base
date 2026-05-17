import React, { useState, useEffect } from 'react';
import { authFetch } from '../utils/authFetch';

const EleccionesManagement = () => {
    const [elecciones, setElecciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [formData, setFormData] = useState({
        nombre: '',
        tipo: 'Internas Municipales',
        fecha: '',
        partido: 'ANR',
        activo: true
    });

    const fetchElecciones = async () => {
        setLoading(true);
        try {
            const res = await authFetch('/api/electoral/elecciones');
            if (res.ok) setElecciones(await res.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchElecciones(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const method = editMode ? 'PUT' : 'POST';
            const url = editMode ? `/api/electoral/elecciones/${currentId}` : '/api/electoral/elecciones';
            const res = await authFetch(url, {
                method,
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setShowForm(false);
                setEditMode(false);
                fetchElecciones();
                alert('Operación exitosa');
            }
        } catch (e) { alert('Error'); }
    };

    const handleEdit = (ele) => {
        setFormData({
            nombre: ele.nombre,
            tipo: ele.tipo || '',
            fecha: ele.fecha || '',
            partido: ele.partido || '',
            activo: ele.activo
        });
        setCurrentId(ele.id);
        setEditMode(true);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar esta elección?')) return;
        try {
            const res = await authFetch(`/api/electoral/elecciones/${id}`, { method: 'DELETE' });
            if (res.ok) fetchElecciones();
        } catch (e) { alert('Error'); }
    };

    if (loading && elecciones.length === 0) return <div>Cargando elecciones...</div>;

    return (
        <div className="fade-in">
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>🗳️ Gestión de Elecciones</h2>
                <button className="btn-primary" onClick={() => { setEditMode(false); setShowForm(true); setFormData({ nombre: '', tipo: 'Internas Municipales', fecha: '', partido: '', activo: true }); }}>
                    ➕ Nueva Elección
                </button>
            </div>

            <div className="table-container card">
                <table>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Tipo / Ámbito</th>
                            <th>Fecha</th>
                            <th>Organización / Partido</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {elecciones.map(ele => (
                            <tr key={ele.id}>
                                <td><strong>{ele.nombre}</strong></td>
                                <td>{ele.tipo}</td>
                                <td>{ele.fecha}</td>
                                <td>{ele.partido || 'Independiente / Genérica'}</td>
                                <td>{ele.activo ? '✅ Activa' : '❌ Inactiva'}</td>
                                <td>
                                    <button className="action-btn" onClick={() => handleEdit(ele)}>✏️</button>
                                    <button className="action-btn" style={{ color: 'red' }} onClick={() => handleDelete(ele.id)}>🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showForm && (
                <div className="modal-overlay">
                    <div className="modal card" style={{ maxWidth: '450px' }}>
                        <div className="modal-header">
                            <h3>{editMode ? 'Editar Elección' : 'Crear Elección'}</h3>
                            <button className="close-btn" onClick={() => setShowForm(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '20px' }}>
                            <div className="form-group">
                                <label>Nombre de la Elección</label>
                                <input value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} required placeholder="Ej: Municipales 2026 / Elecciones Cooperativa" />
                            </div>
                            <div className="form-group">
                                <label>Tipo de Proceso o Ámbito</label>
                                <input value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value })} placeholder="Ej: Internas, Generales, Centro de Estudiantes, Gremial" />
                            </div>
                            <div className="form-group">
                                <label>Fecha de la Elección</label>
                                <input type="date" value={formData.fecha} onChange={e => setFormData({ ...formData, fecha: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Organización / Partido / Movimiento</label>
                                <input value={formData.partido} onChange={e => setFormData({ ...formData, partido: e.target.value })} placeholder="Ej: ANR, PLRA, Movimiento Independiente, Cooperativa X" />
                                <small style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                                    Indica la organización dueña de este padrón (admite partidos tradicionales, comisiones, gremios o cooperativas).
                                </small>
                            </div>
                            <div className="form-group checkbox-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={formData.activo} onChange={e => setFormData({ ...formData, activo: e.target.checked })} />
                                    ¿Elección Activa?
                                </label>
                            </div>
                            <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>
                                {editMode ? 'Guardar Cambios' : 'Crear'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EleccionesManagement;
