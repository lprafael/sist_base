import React, { useState, useEffect } from 'react';
import { authFetch } from '../utils/authFetch';

const VeedorGestion = ({ user }) => {
    const [users, setUsers] = useState([]);
    const [locales, setLocales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [assignment, setAssignment] = useState({
        local_id: '',
        seccional_id: '',
        mesas: ''
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            // 1. Cargar usuarios (potenciales veedores)
            const resUsers = await authFetch('/api/auth/users');
            if (resUsers.ok) setUsers(await resUsers.json());

            // 2. Cargar locales del distrito del usuario actual
            const resLocales = await authFetch(`/api/logistica/locales?dept_id=${user.departamento_id}&dist_id=${user.distrito_id}`);
            if (resLocales.ok) setLocales(await resLocales.json());

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSelectUser = (u) => {
        setSelectedUser(u);
        setAssignment({
            local_id: u.veedor_local_id || '',
            seccional_id: u.veedor_seccional_id || '',
            mesas: u.veedor_mesas ? u.veedor_mesas.join(',') : ''
        });
    };

    const handleSave = async () => {
        if (!selectedUser) return;
        
        try {
            // Convertir mesas de string "1,2,3" a array [1, 2, 3]
            const mesasArray = assignment.mesas.split(',')
                .map(m => parseInt(m.trim()))
                .filter(m => !isNaN(m));

            const response = await authFetch('/api/logistica/veedores/asignar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: selectedUser.id,
                    local_id: parseInt(assignment.local_id),
                    seccional_id: parseInt(assignment.seccional_id),
                    mesas: mesasArray
                })
            });

            if (response.ok) {
                alert("Asignación guardada con éxito");
                fetchData();
                setSelectedUser(null);
            } else {
                alert("Error al guardar asignación");
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div className="p-4">Cargando gestión de veedores...</div>;

    return (
        <div className="veedor-gestion p-4">
            <div className="row">
                <div className="col-md-6">
                    <h3>👥 Usuarios y Referentes</h3>
                    <p>Selecciona un usuario para asignarle un local y mesas de votación.</p>
                    <div className="user-list">
                        {users.filter(u => u.activo).map(u => (
                            <div 
                                key={u.id} 
                                className={`user-item ${selectedUser?.id === u.id ? 'active' : ''}`}
                                onClick={() => handleSelectUser(u)}
                            >
                                <strong>{u.nombre_completo}</strong>
                                <small>({u.rol})</small>
                                {u.veedor_local_id && <span className="badge-assigned">✅ Asignado</span>}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="col-md-6">
                    {selectedUser ? (
                        <div className="assignment-form fade-in">
                            <h3>Asignar a: {selectedUser.nombre_completo}</h3>
                            <div className="form-group">
                                <label>Local de Votación</label>
                                <select 
                                    className="form-control"
                                    value={assignment.local_id}
                                    onChange={(e) => {
                                        const loc = locales.find(l => l.id === parseInt(e.target.value));
                                        setAssignment({...assignment, local_id: e.target.value, seccional_id: loc?.seccional_id || ''});
                                    }}
                                >
                                    <option value="">-- Seleccionar Local --</option>
                                    {locales.map(l => (
                                        <option key={l.id} value={l.id}>{l.descripcion}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group mt-3">
                                <label>Mesas (Separadas por coma)</label>
                                <input 
                                    type="text" 
                                    className="form-control"
                                    placeholder="Ej: 1, 2, 5"
                                    value={assignment.mesas}
                                    onChange={(e) => setAssignment({...assignment, mesas: e.target.value})}
                                />
                                <small className="text-muted">Introduce los números de mesa asignados a este veedor.</small>
                            </div>

                            <div className="mt-4">
                                <button className="btn btn-primary w-100" onClick={handleSave}>
                                    💾 Guardar Asignación
                                </button>
                                <button className="btn btn-secondary w-100 mt-2" onClick={() => setSelectedUser(null)}>
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="no-selection">
                            <i className="icon-select">👈</i>
                            <p>Selecciona un usuario de la lista para ver o editar su asignación.</p>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .veedor-gestion { background: white; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
                .user-list { max-height: 60vh; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px; }
                .user-item { padding: 12px 15px; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background 0.2s; display: flex; align-items: center; justify-content: space-between; }
                .user-item:hover { background: #f8fafc; }
                .user-item.active { background: #eff6ff; border-left: 4px solid #3b82f6; }
                .user-item strong { display: block; color: #1e293b; }
                .user-item small { color: #64748b; font-size: 0.8rem; }
                
                .badge-assigned { background: #dcfce7; color: #166534; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
                
                .assignment-form { background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
                .form-group label { display: block; margin-bottom: 8px; font-weight: 600; color: #475569; }
                .form-control { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; }
                
                .no-selection { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; text-align: center; padding: 40px; }
                .icon-select { font-size: 3rem; margin-bottom: 10px; opacity: 0.5; }
                
                .row { display: flex; gap: 20px; }
                .col-md-6 { flex: 1; }
            `}</style>
        </div>
    );
};

export default VeedorGestion;
