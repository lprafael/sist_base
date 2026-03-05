import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { authFetch } from '../utils/authFetch';
import './UserManagement.css';

const ROLES_CON_DISTRITO = ['intendente', 'concejal', 'referente'];
const ROLES_CANDIDATOS = ['intendente', 'concejal'];

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [newUser, setNewUser] = useState({
    username: '', email: '', nombre_completo: '', rol: 'referente',
    departamento_id: '', distrito_id: '', superior_usuario_id: '',
    restriccion_equipo: false
  });
  const [userDevices, setUserDevices] = useState([]);
  const [passwordFields, setPasswordFields] = useState({
    current_password: '', new_password: '', confirm_password: ''
  });

  // Catálogos geográficos
  const [departamentos, setDepartamentos] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [loadingDists, setLoadingDists] = useState(false);

  // Superiores disponibles (Intendentes para Concejales, Intendentes/Concejales para Referentes)
  const [superioresDisponibles, setSuperioresDisponibles] = useState([]);

  // Todos los roles posibles del sistema
  const ROLES_CONFIG = [
    { value: 'admin', label: '🔑 Administrador', crea: [] },
    { value: 'intendente', label: '🏛️ Candidato a Intendente', crea: ['concejal', 'referente'] },
    { value: 'concejal', label: '🏙️ Candidato a Concejal', crea: ['referente'] },
    { value: 'referente', label: '👥 Referente', crea: [] },
  ];

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = currentUser?.rol === 'admin';
  const canManageUsers = ['admin', 'intendente', 'concejal'].includes(currentUser?.rol);

  // Roles que el usuario actual puede asignar
  const meRol = ROLES_CONFIG.find(r => r.value === currentUser?.rol);
  const rolesQuePoedoCrear = isAdmin
    ? ROLES_CONFIG.filter(r => r.value !== 'admin')
    : ROLES_CONFIG.filter(r => meRol?.crea.includes(r.value));

  const fetchDepartamentos = async () => {
    setLoadingDepts(true);
    try {
      const res = await authFetch('/api/electoral/catalogos/departamentos');
      if (res.ok) setDepartamentos(await res.json());
    } catch (e) { console.error('Error cargando departamentos', e); }
    finally { setLoadingDepts(false); }
  };

  const fetchDistritos = async (departamentoId) => {
    if (!departamentoId) { setDistritos([]); return; }
    setLoadingDists(true);
    try {
      const res = await authFetch(`/api/electoral/catalogos/distritos/${departamentoId}`);
      if (res.ok) setDistritos(await res.json());
      else setDistritos([]);
    } catch (e) { console.error('Error cargando distritos', e); }
    finally { setLoadingDists(false); }
  };

  // Cargar posibles superiores basados en el rol que se está creando
  const fetchSuperioresDisponibles = async (rolACrear, distritoId = null) => {
    try {
      const res = await authFetch('/api/auth/users');
      if (res.ok) {
        const todos = await res.json();
        let filtrados = [];

        if (rolACrear === 'concejal') {
          // Un concejal responde a un Intendente
          filtrados = todos.filter(u => u.rol === 'intendente');
        } else if (rolACrear === 'referente') {
          // Un Referente responde a un Intendente o a un Concejal
          filtrados = todos.filter(u => u.rol === 'intendente' || u.rol === 'concejal');
        }

        // Si hay distrito seleccionado, filtrar por él
        if (distritoId) {
          filtrados = filtrados.filter(u => u.distrito_id === parseInt(distritoId));
        }

        setSuperioresDisponibles(filtrados);
      }
    } catch (e) { console.error('Error cargando superiores', e); }
  };

  const fetchUsers = async () => {
    try {
      const endpoint = canManageUsers ? `/api/auth/users` : `/api/auth/me`;
      const response = await authFetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setUsers(canManageUsers ? data : [data]);
      } else {
        setError(canManageUsers ? 'No tienes permisos para ver usuarios' : 'No se pudo cargar tu perfil');
      }
    } catch (err) {
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRolChange = (e, setter) => {
    const nuevoRol = e.target.value;
    setter(prev => ({
      ...prev,
      rol: nuevoRol,
      departamento_id: '',
      distrito_id: '',
      superior_usuario_id: ''
    }));
    setDistritos([]);
    setSuperioresDisponibles([]);

    if (ROLES_CANDIDATOS.includes(nuevoRol)) {
      fetchDepartamentos();
    } else if (nuevoRol === 'referente' && isAdmin) {
      // El admin debe elegir un superior para el referente
      fetchSuperioresDisponibles('referente');
    }
  };

  const handleDepartamentoChange = (e, setter) => {
    const deptId = e.target.value;
    setter(prev => ({ ...prev, departamento_id: deptId, distrito_id: '', superior_usuario_id: '' }));
    setSuperioresDisponibles([]);
    fetchDistritos(deptId);
  };

  const handleDistritoChange = (e, setter, rolActual) => {
    const distId = e.target.value;
    setter(prev => ({ ...prev, distrito_id: distId, superior_usuario_id: '' }));
    if (isAdmin) {
      fetchSuperioresDisponibles(rolActual, distId);
    }
  };

  const handleSuperiorChange = (e, setter) => {
    const superiorId = e.target.value;
    const superior = superioresDisponibles.find(s => s.id === parseInt(superiorId));

    if (superior) {
      setter(prev => ({
        ...prev,
        superior_usuario_id: superiorId,
        // Si es un referente siendo creado por admin, hereda el distrito del superior inmediatamente en el form
        departamento_id: superior.departamento_id,
        distrito_id: superior.distrito_id
      }));
    } else {
      setter(prev => ({ ...prev, superior_usuario_id: '' }));
    }
  };

  const handleChange = (e, setter) => {
    const { name, value } = e.target;
    setter((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditClick = (user) => {
    setEditUser(user);
    setPasswordFields({ current_password: '', new_password: '', confirm_password: '' });
    setShowCreateForm(false);
    setShowEditModal(true);
    if (user.restriccion_equipo) {
      fetchUserDevices(user.id);
    }
  };

  const fetchUserDevices = async (userId) => {
    try {
      const res = await authFetch(`/api/auth/users/${userId}/devices`);
      if (res.ok) setUserDevices(await res.json());
    } catch (e) { console.error('Error devices', e); }
  };

  const removeDevice = async (deviceId) => {
    if (!window.confirm('¿Eliminar esta autorización/solicitud?')) return;
    try {
      const res = await authFetch(`/api/auth/devices/${deviceId}`, { method: 'DELETE' });
      if (res.ok) fetchUserDevices(editUser.id);
    } catch (e) { console.error('Error remove device', e); }
  };

  const approveDevice = async (deviceId) => {
    try {
      const res = await authFetch(`/api/auth/devices/${deviceId}/approve`, { method: 'PUT' });
      if (res.ok) {
        fetchUserDevices(editUser.id);
        alert("Equipo aprobado con éxito");
      }
    } catch (e) { console.error('Error approve device', e); }
  };

  const openCreateForm = () => {
    const rolInicial = rolesQuePoedoCrear[0]?.value || 'referente';
    const initialData = {
      username: '', email: '', nombre_completo: '',
      rol: rolInicial,
      departamento_id: '', distrito_id: '', superior_usuario_id: ''
    };

    // Si NO es admin (es Intendente o Concejal), hereda automáticamente el territorio
    if (!isAdmin) {
      initialData.departamento_id = currentUser.departamento_id || '';
      initialData.distrito_id = currentUser.distrito_id || '';
    }

    setNewUser(initialData);
    setDistritos([]);
    setSuperioresDisponibles([]);

    // Si es Admin, debe cargar catálogos para elegir territorio
    if (isAdmin && ROLES_CANDIDATOS.includes(rolInicial)) {
      fetchDepartamentos();
    } else if (rolInicial === 'referente' && isAdmin) {
      fetchSuperioresDisponibles('referente');
    }

    // Si NO es admin, ya tenemos el territorio, pero podríamos querer cargar
    // superiores disponibles para ese distrito específico
    if (!isAdmin && initialData.distrito_id) {
      fetchSuperioresDisponibles(rolInicial, initialData.distrito_id);
    }

    setShowCreateForm(true);
  };


  const handleCreateUser = async (e) => {
    e.preventDefault();

    // Validaciones de negocio
    if (newUser.rol === 'intendente' && (!newUser.departamento_id || !newUser.distrito_id)) {
      alert('El Intendente debe tener un Departamento y Distrito.'); return;
    }
    if (newUser.rol === 'concejal' && (!newUser.departamento_id || !newUser.distrito_id)) {
      alert('El Concejal debe tener un Distrito asignado.'); return;
    }
    if (newUser.rol === 'referente' && isAdmin && !newUser.superior_usuario_id) {
      alert('Un Referente creado por el Administrador siempre debe tener un superior asignado.'); return;
    }

    setLoading(true);
    try {
      const payload = {
        username: newUser.username,
        email: newUser.email,
        nombre_completo: newUser.nombre_completo,
        rol: newUser.rol,
      };
      if (newUser.departamento_id) payload.departamento_id = parseInt(newUser.departamento_id);
      if (newUser.distrito_id) payload.distrito_id = parseInt(newUser.distrito_id);
      if (newUser.superior_usuario_id) payload.superior_usuario_id = parseInt(newUser.superior_usuario_id);
      payload.restriccion_equipo = newUser.restriccion_equipo;

      const response = await authFetch(`/api/auth/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setShowCreateForm(false);
        fetchUsers();
        alert('Usuario creado exitosamente.');
      } else {
        const data = await response.json();
        alert(data.detail || 'Error al crear usuario');
      }
    } catch (err) { alert('Error de conexión'); }
    finally { setLoading(false); }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (currentUser.id === editUser.id && passwordFields.new_password) {
        if (passwordFields.new_password !== passwordFields.confirm_password) {
          alert('Las contraseñas no coinciden');
          setLoading(false);
          return;
        }
        await authFetch(`/api/auth/change-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            current_password: passwordFields.current_password,
            new_password: passwordFields.new_password
          })
        });
      }
      const response = await authFetch(`/api/auth/users/${editUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: editUser.email,
          nombre_completo: editUser.nombre_completo,
          rol: editUser.rol,
          restriccion_equipo: editUser.restriccion_equipo
        })
      });
      if (response.ok) {
        setShowEditModal(false);
        fetchUsers();
        alert('Usuario actualizado');
      }
    } catch (err) { alert('Error al actualizar'); }
    finally { setLoading(false); }
  };

  const handleStatusChange = async (user, action) => {
    const url = action === 'reactivate'
      ? `/api/auth/users/${user.id}/reactivate`
      : `/api/auth/users/${user.id}${action === 'hard' ? '/hard' : ''}`;

    if (!window.confirm(`¿Seguro que deseas ${action} a ${user.username}?`)) return;

    try {
      await authFetch(url, { method: action === 'reactivate' ? 'POST' : 'DELETE' });
      fetchUsers();
    } catch (err) { alert('Error en la operación'); }
  };

  const handleResendPassword = async () => {
    if (!window.confirm(`¿Seguro que deseas generar y enviar una nueva contraseña temporal a ${editUser.username}?`)) return;
    setLoading(true);
    try {
      const response = await authFetch(`/api/notify/resend-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: editUser.username })
      });
      if (response.ok) alert('Contraseña temporal enviada.');
      else {
        const data = await response.json();
        alert(data.detail || 'Error al reenviar');
      }
    } catch (err) { alert('Error de conexión'); }
    finally { setLoading(false); }
  };

  const getRolLabel = (rol) => ROLES_CONFIG.find(r => r.value === rol)?.label || rol;

  if (loading && users.length === 0) return <div className="loading">Cargando...</div>;

  return (
    <div className="fade-in">
      <div className="user-management-header">
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          {isAdmin ? 'Gestión de Usuarios' : canManageUsers ? 'Mi Equipo' : 'Mi Perfil'}
        </h1>
        {canManageUsers && (
          <button className="btn btn-primary" onClick={openCreateForm}>
            ➕ Crear Usuario
          </button>
        )}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Email</th>
              <th>Nombre</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td style={{ fontWeight: 600 }}>{user.username}</td>
                <td>{user.email}</td>
                <td>{user.nombre_completo}</td>
                <td><span className={`role-badge role-${user.rol}`}>{getRolLabel(user.rol)}</span></td>
                <td><span className={`status-badge ${user.activo ? 'active' : 'inactive'}`}>{user.activo ? 'Activo' : 'Inactivo'}</span></td>
                <td>
                  <div className="actions-cell">
                    <button className="action-btn action-btn-edit" onClick={() => handleEditClick(user)} title="Editar Perfil">✏️</button>
                    {isAdmin && user.username !== 'admin' && (
                      user.activo ?
                        <button className="action-btn action-btn-delete" onClick={() => handleStatusChange(user, 'soft')} title="Desactivar">🚫</button> :
                        <button className="action-btn action-btn-edit" style={{ color: '#22c55e' }} onClick={() => handleStatusChange(user, 'reactivate')} title="Reactivar">✅</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(showCreateForm || showEditModal) && ReactDOM.createPortal(
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowCreateForm(false); setShowEditModal(false); } }}>
          <div className="modal fade-in">
            <div className="modal-header">
              <h3>{showCreateForm ? 'Crear Nuevo Usuario' : 'Editar Usuario'}</h3>
              <button className="close-btn" onClick={() => { setShowCreateForm(false); setShowEditModal(false); }}>×</button>
            </div>

            <form id="user-modal-form" onSubmit={showCreateForm ? handleCreateUser : handleEditUser} className="create-user-form">
              {showCreateForm && (
                <div className="form-group">
                  <label className="form-label">Usuario</label>
                  <input name="username" value={newUser.username} onChange={(e) => handleChange(e, setNewUser)} required autoFocus />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Email</label>
                <input name="email" value={showCreateForm ? newUser.email : editUser.email} onChange={(e) => (showCreateForm ? handleChange(e, setNewUser) : handleChange(e, setEditUser))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Nombre Completo</label>
                <input name="nombre_completo" value={showCreateForm ? newUser.nombre_completo : editUser.nombre_completo} onChange={(e) => (showCreateForm ? handleChange(e, setNewUser) : handleChange(e, setEditUser))} required />
              </div>

              <div className="form-group">
                <label className="form-label">Rol</label>
                <select
                  name="rol"
                  value={showCreateForm ? newUser.rol : editUser.rol}
                  onChange={showCreateForm ? (e) => handleRolChange(e, setNewUser) : (e) => handleChange(e, setEditUser)}
                  disabled={!canManageUsers}
                >
                  {(showCreateForm ? rolesQuePoedoCrear : ROLES_CONFIG).map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '15px 0', padding: '10px', background: '#fff7ed', borderRadius: '8px', border: '1px solid #ffedd5' }}>
                <input
                  type="checkbox"
                  id="restriccion_equipo"
                  name="restriccion_equipo"
                  checked={showCreateForm ? newUser.restriccion_equipo : editUser.restriccion_equipo}
                  onChange={(e) => {
                    const val = e.target.checked;
                    if (showCreateForm) setNewUser(prev => ({ ...prev, restriccion_equipo: val }));
                    else setEditUser(prev => ({ ...prev, restriccion_equipo: val }));
                  }}
                />
                <label htmlFor="restriccion_equipo" style={{ fontSize: '0.9rem', fontWeight: 600, color: '#9a3412', cursor: 'pointer' }}>
                  🛡️ Restringir acceso solo a equipos habilitados
                </label>
              </div>

              {/* SECCIÓN DE JERARQUÍA Y TERRITORIO (Solo creación) */}
              {showCreateForm && ROLES_CON_DISTRITO.includes(newUser.rol) && (
                <div style={{
                  marginTop: '16px',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
                  borderRadius: '12px',
                  border: '1px solid #bfdbfe'
                }}>
                  <p style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '12px', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🏛️ Estructura Política
                  </p>

                  {/* PARA INTENDENTE Y CONCEJAL: Selección de distrito */}
                  {ROLES_CANDIDATOS.includes(newUser.rol) && isAdmin && (
                    <>
                      <div className="form-group">
                        <label className="form-label">Departamento</label>
                        <select name="departamento_id" value={newUser.departamento_id} onChange={(e) => handleDepartamentoChange(e, setNewUser)} required>
                          <option value="">— Seleccionar —</option>
                          {departamentos.map(d => <option key={d.id} value={d.id}>{d.descripcion}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Distrito</label>
                        <select name="distrito_id" value={newUser.distrito_id} onChange={(e) => handleDistritoChange(e, setNewUser, newUser.rol)} required disabled={!newUser.departamento_id}>
                          <option value="">— Primero elige departamento —</option>
                          {distritos.map(d => <option key={d.id} value={d.id}>{d.descripcion}</option>)}
                        </select>
                      </div>
                    </>
                  )}

                  {/* PARA CONCEJAL: Superior (Intendente) Opcional */}
                  {newUser.rol === 'concejal' && isAdmin && newUser.distrito_id && (
                    <div className="form-group">
                      <label className="form-label">Intendente Superior (Opcional)</label>
                      <select name="superior_usuario_id" value={newUser.superior_usuario_id} onChange={(e) => handleChange(e, setNewUser)}>
                        <option value="">— Ninguno —</option>
                        {superioresDisponibles.map(s => <option key={s.id} value={s.id}>{s.nombre_completo} ({s.username})</option>)}
                      </select>
                    </div>
                  )}

                  {/* PARA REFERENTE: Superior Obligatorio */}
                  {newUser.rol === 'referente' && isAdmin && (
                    <div className="form-group">
                      <label className="form-label">Pertenece al Candidato / Intendente</label>
                      <select name="superior_usuario_id" value={newUser.superior_usuario_id} onChange={(e) => handleSuperiorChange(e, setNewUser)} required>
                        <option value="">— Seleccionar Superior —</option>
                        {superioresDisponibles.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.nombre_completo} ({getRolLabel(s.rol)})
                          </option>
                        ))}
                      </select>
                      {newUser.superior_usuario_id && (
                        <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '4px', fontWeight: 500 }}>
                          ✅ Heredará el distrito del superior seleccionado.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mensaje herencia automática para no-admins */}
                  {!isAdmin && (
                    <div style={{ fontSize: '0.8125rem', color: '#1e40af', background: '#dbeafe', padding: '10px', borderRadius: '8px' }}>
                      ℹ️ El nuevo usuario colgará directamente de ti y heredará automáticamente tu departamento y distrito.
                    </div>
                  )}
                </div>
              )}

              {/* SEGURIDAD */}
              {!showCreateForm && currentUser.id === editUser?.id && (
                <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '12px' }}>Cambiar Contraseña</p>
                  <div className="form-group"><input type="password" name="current_password" placeholder="Actual" onChange={(e) => handleChange(e, setPasswordFields)} /></div>
                  <div className="form-group"><input type="password" name="new_password" placeholder="Nueva" onChange={(e) => handleChange(e, setPasswordFields)} /></div>
                  <div className="form-group"><input type="password" name="confirm_password" placeholder="Confirmar" onChange={(e) => handleChange(e, setPasswordFields)} /></div>
                </div>
              )}
              {/* REENVIAR CREDENCIALES (Solo para Admins editando a otros) */}
              {!showCreateForm && isAdmin && currentUser.id !== editUser?.id && (
                <div style={{ marginTop: '20px', padding: '16px', border: '1px dashed #3b82f6', borderRadius: '12px', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '10px' }}>
                    Si el usuario no recibió su contraseña o la olvidó, puedes generar una nueva.
                  </p>
                  <button type="button" className="btn" style={{ background: '#eff6ff', color: '#3b82f6', border: '1px solid #3b82f6', width: '100%' }} onClick={handleResendPassword}>
                    📧 Reenviar Credenciales Temporales
                  </button>
                </div>
              )}

              {!showCreateForm && editUser?.restriccion_equipo && (
                <div style={{ marginTop: '20px', padding: '16px', background: '#f0f9ff', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                  <p style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '12px', color: '#0369a1' }}>💻 Equipos Autorizados</p>
                  {userDevices.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>No hay equipos registrados aún.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {userDevices.sort((a, b) => b.activo - a.activo).map(dev => (
                        <div key={dev.id} style={{
                          display: 'flex',
                          flexDirection: 'column',
                          padding: '10px',
                          background: dev.activo ? 'white' : '#fff7ed',
                          borderRadius: '8px',
                          border: `1px solid ${dev.activo ? '#e0f2fe' : '#fed7aa'}`,
                          position: 'relative'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ fontSize: '0.8rem' }}>
                              <div style={{ fontWeight: 700, color: dev.activo ? '#0369a1' : '#c2410c' }}>
                                {dev.activo ? '✅ ' : '⏳ PENDIENTE: '}{dev.descripcion}
                              </div>
                              <code style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                                {dev.device_id.substring(0, 20)}...
                              </code>
                              {dev.ip_solicitud && (
                                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                                  📍 IP: {dev.ip_solicitud}
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '5px' }}>
                              {!dev.activo && (
                                <button type="button" onClick={() => approveDevice(dev.id)} style={{ color: '#059669', border: '1px solid #059669', background: '#ecfdf5', cursor: 'pointer', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px' }}>Habilitar</button>
                              )}
                              <button type="button" onClick={() => removeDevice(dev.id)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '1rem' }}>🗑️</button>
                            </div>
                          </div>
                          {!dev.activo && dev.user_agent && (
                            <div style={{ fontSize: '0.65rem', color: '#9a3412', marginTop: '6px', fontStyle: 'italic', background: '#ffedd5', padding: '4px', borderRadius: '4px' }}>
                              💻 {dev.user_agent.substring(0, 100)}...
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: '12px', textAlign: 'center' }}>
                    <button
                      type="button"
                      className="btn-link"
                      style={{ fontSize: '0.8rem', color: '#0284c7', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={async () => {
                        const desc = window.prompt("Descripción del equipo (ej: PC Oficina):", "Mi Equipo");
                        if (desc) {
                          const devId = localStorage.getItem('deviceId') || ('device_' + Math.random().toString(36).substr(2, 9));
                          const res = await authFetch(`/api/auth/users/${editUser.id}/devices`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ device_id: devId, descripcion: desc })
                          });
                          if (res.ok) fetchUserDevices(editUser.id);
                          else alert("Error al registrar equipo");
                        }
                      }}
                    >
                      ➕ Autorizar este equipo actual
                    </button>
                  </div>
                </div>
              )}
            </form>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => { setShowCreateForm(false); setShowEditModal(false); }}>Cancelar</button>
              <button type="submit" form="user-modal-form" className="btn btn-primary">{showCreateForm ? 'Crear' : 'Guardar'}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default UserManagement;