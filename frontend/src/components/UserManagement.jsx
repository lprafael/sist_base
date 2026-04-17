import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { authFetch } from '../utils/authFetch';
import { Info, ChevronRight, ChevronDown, User, Users, Shield, Car, Eye } from 'lucide-react';
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
  const [expandedNodes, setExpandedNodes] = useState({ 1: true });
  const [showInfoModal, setShowInfoModal] = useState(false);

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

  // Construir el árbol de jerarquía
  const buildTree = (data) => {
    const map = {};
    const roots = [];
    
    data.forEach(u => {
      map[u.id] = { ...u, children: [] };
    });

    data.forEach(u => {
      const superiorId = u.superior_usuario_id;
      if (superiorId && map[superiorId] && superiorId !== u.id) {
        map[superiorId].children.push(map[u.id]);
      } else {
        roots.push(map[u.id]);
      }
    });

    return roots;
  };

  // Aplastar el árbol con niveles
  const getFlattenedTree = (nodes, level = 0) => {
    let result = [];
    const sortedNodes = [...nodes].sort((a, b) => {
      const roleOrder = { 'admin': 1, 'intendente': 2, 'concejal': 3, 'referente': 4, 'chofer': 5, 'veedor': 6 };
      if (roleOrder[a.rol] !== roleOrder[b.rol]) return (roleOrder[a.rol] || 99) - (roleOrder[b.rol] || 99);
      return (a.nombre_completo || '').localeCompare(b.nombre_completo || '');
    });

    sortedNodes.forEach(node => {
      result.push({ ...node, level });
      if (expandedNodes[node.id] && node.children.length > 0) {
        result = result.concat(getFlattenedTree(node.children, level + 1));
      }
    });
    return result;
  };

  const toggleNode = (id) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Roles que el usuario actual puede asignar
  const meRol = ROLES_CONFIG.find(r => r.value === currentUser?.rol);
  const rolesQuePoedoCrear = isAdmin
    ? ROLES_CONFIG
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
    if (departamentoId === undefined || departamentoId === null || departamentoId === '') { setDistritos([]); return; }
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

        // Si hay distrito seleccionado, filtrar por él y por el departamento para evitar colisiones
        const targetDptoId = newUser.departamento_id || editUser?.departamento_id;
        if (distritoId) {
          filtrados = filtrados.filter(u =>
            u.distrito_id === parseInt(distritoId) &&
            (!targetDptoId || u.departamento_id === parseInt(targetDptoId))
          );
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
        console.warn('DEBUG UserManagement: Fetched data:', data, 'canManageUsers:', canManageUsers);
        setUsers(canManageUsers ? data : [data]);
      } else {
        const errorMsg = canManageUsers ? 'No tienes permisos para ver usuarios' : 'No se pudo cargar tu perfil';
        console.error('UserManagement: API Error', errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      console.error('UserManagement: Fetch error', err);
      setError('Error al cargar datos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRolChange = (e, setter) => {
    const nuevoRol = e.target.value;
    const isEdit = setter === setEditUser;
    
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
    
    // Cargar catálogos si el rol los necesita
    if (ROLES_CANDIDATOS.includes(user.rol)) {
      fetchDepartamentos();
      if (user.departamento_id) {
        fetchDistritos(user.departamento_id);
      }
    } else if (user.rol === 'referente' && isAdmin) {
      fetchSuperioresDisponibles('referente', user.distrito_id);
    }

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
      initialData.departamento_id = (currentUser.departamento_id !== undefined && currentUser.departamento_id !== null) ? currentUser.departamento_id : '';
      initialData.distrito_id = (currentUser.distrito_id !== undefined && currentUser.distrito_id !== null) ? currentUser.distrito_id : '';
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
      fetchDepartamentos();
      fetchDistritos(initialData.departamento_id);
      fetchSuperioresDisponibles(rolInicial, initialData.distrito_id);
    }

    setShowCreateForm(true);
  };


  const handleCreateUser = async (e) => {
    e.preventDefault();

    // Validaciones de negocio
    if (newUser.rol === 'intendente' && (newUser.departamento_id === '' || newUser.distrito_id === '')) {
      alert('El Intendente debe tener un Departamento y Distrito.'); return;
    }
    if (newUser.rol === 'concejal' && (newUser.departamento_id === '' || newUser.distrito_id === '')) {
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
      if (newUser.departamento_id !== '') payload.departamento_id = parseInt(newUser.departamento_id);
      if (newUser.distrito_id !== '') payload.distrito_id = parseInt(newUser.distrito_id);
      if (newUser.superior_usuario_id !== '') payload.superior_usuario_id = parseInt(newUser.superior_usuario_id);
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
          restriccion_equipo: editUser.restriccion_equipo,
          departamento_id: editUser.departamento_id ? parseInt(editUser.departamento_id) : null,
          distrito_id: editUser.distrito_id ? parseInt(editUser.distrito_id) : null,
          superior_usuario_id: editUser.superior_usuario_id ? parseInt(editUser.superior_usuario_id) : null,
          public_slug: editUser.public_slug || null
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

    let confirmMsg = `¿Seguro que deseas ${action === 'soft' ? 'desactivar' : action === 'hard' ? 'ELIMINAR DEFINITIVAMENTE (con todos sus datos)' : 'reactivar'} a ${user.username}?`;
    if (action === 'hard') {
      confirmMsg += "\n\nESTA ACCIÓN NO SE PUEDE DESHACER Y BORRARÁ TODOS LOS REGISTROS VINCULADOS.";
    }

    if (!window.confirm(confirmMsg)) return;

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
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isAdmin ? 'Gestión de Usuarios' : canManageUsers ? 'Mi Equipo' : 'Mi Perfil'}
          <button 
            className="info-trigger" 
            onClick={() => setShowInfoModal(true)}
            title="Ver estructura jerárquica"
            style={{ 
              background: 'none', 
              border: 'none', 
              padding: '4px',
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Info size={20} />
          </button>
        </h1>
        {canManageUsers && (
          <button className="btn btn-primary" onClick={openCreateForm}>
            ➕ Crear Usuario
          </button>
        )}
      </div>

      {error && (
        <div style={{ 
          margin: '0 0 20px 0', 
          padding: '12px 16px', 
          background: '#fef2f2', 
          border: '1px solid #fee2e2', 
          borderRadius: '8px', 
          color: '#ef4444',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>⚠️ {error}</span>
          <button onClick={() => { setError(''); fetchUsers(); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', textDecoration: 'underline' }}>Reintentar</button>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Estructura / Usuario</th>
              <th>Email</th>
              <th>Nombre Completo</th>
              <th>Rol / Cargo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No se encontraron usuarios visible para tu perfil.
                </td>
              </tr>
            ) : (
              getFlattenedTree(buildTree(users)).map(user => (
                <tr 
                  key={user.id} 
                  className={`row-level-${user.level} ${!user.activo ? 'tr-inactive' : ''}`}
                  style={{ backgroundColor: user.level === 0 ? '#f8fafc' : 'transparent' }}
                >
                  <td style={{ 
                    paddingLeft: `${user.level * 24 + 12}px`,
                    fontWeight: user.level === 0 ? 700 : 500,
                    position: 'relative'
                  }}>
                    {user.level > 0 && (
                      <div style={{
                        position: 'absolute',
                        left: `${user.level * 24 - 4}px`,
                        top: '0',
                        bottom: '50%',
                        width: '12px',
                        borderLeft: '2px solid #cbd5e1',
                        borderBottom: '2px solid #cbd5e1',
                        borderRadius: '0 0 0 4px'
                      }} />
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {user.children && user.children.length > 0 ? (
                        <button 
                          onClick={() => toggleNode(user.id)}
                          style={{
                            background: 'none',
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '10px',
                            color: '#64748b'
                          }}
                        >
                          {expandedNodes[user.id] ? '▼' : '▶'}
                        </button>
                      ) : (
                        <div style={{ width: '20px' }} />
                      )}
                      <span>{user.username}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{user.email}</td>
                  <td>{user.nombre_completo}</td>
                  <td>
                    <span className={`role-badge role-${user.rol}`} style={{ fontSize: '0.75rem' }}>
                      {getRolLabel(user.rol)}
                    </span>
                  </td>
                  <td><span className={`status-badge ${user.activo ? 'active' : 'inactive'}`}>{user.activo ? 'Activo' : 'Inactivo'}</span></td>
                  <td>
                    <div className="actions-cell">
                      <button className="action-btn action-btn-edit" onClick={() => handleEditClick(user)} title="Editar Perfil">✏️</button>
                      {(isAdmin || currentUser.id === user.creado_por) && user.username !== 'admin' && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {user.activo ? (
                            <button className="action-btn action-btn-delete" onClick={() => handleStatusChange(user, 'soft')} title="Desactivar">🚫</button>
                          ) : (
                            <button className="action-btn action-btn-edit" style={{ color: '#22c55e' }} onClick={() => handleStatusChange(user, 'reactivate')} title="Reactivar">✅</button>
                          )}
                          <button className="action-btn action-btn-delete" style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2' }} onClick={() => handleStatusChange(user, 'hard')} title="ELIMINAR DEFINITIVAMENTE">🗑️</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
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
                  onChange={showCreateForm ? (e) => handleRolChange(e, setNewUser) : (e) => handleRolChange(e, setEditUser)}
                  disabled={!canManageUsers || (editUser?.username === 'admin')}
                >
                  {(showCreateForm ? rolesQuePoedoCrear : ROLES_CONFIG).map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {isAdmin && ROLES_CANDIDATOS.includes(showCreateForm ? newUser.rol : editUser.rol) && (
                <div className="form-group" style={{ background: '#fef2f2', padding: '10px', borderRadius: '8px', border: '1px solid #fca5a5' }}>
                  <label className="form-label" style={{ color: '#b91c1c' }}>🌐 URL Página Pública (Opcional)</label>
                  <input
                    name="public_slug"
                    value={showCreateForm ? (newUser.public_slug || '') : (editUser.public_slug || '')}
                    onChange={(e) => (showCreateForm ? handleChange(e, setNewUser) : handleChange(e, setEditUser))}
                    placeholder="ej: juan-perez"
                  />
                  <small style={{ color: '#ef4444' }}>Si asignas esto, la web pública será: /candidato/slug</small>
                </div>
              )}

              {(showCreateForm ? newUser.rol : editUser.rol) !== 'referente' && (
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
              )}

                  {/* SECCIÓN DE JERARQUÍA Y TERRITORIO */}
                  {ROLES_CON_DISTRITO.includes(showCreateForm ? newUser.rol : editUser.rol) && (
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
                      {ROLES_CANDIDATOS.includes(showCreateForm ? newUser.rol : editUser.rol) && isAdmin && (
                        <>
                          <div className="form-group">
                            <label className="form-label">Departamento</label>
                            <select 
                              name="departamento_id" 
                              value={showCreateForm ? newUser.departamento_id : (editUser.departamento_id || '')} 
                              onChange={(e) => handleDepartamentoChange(e, showCreateForm ? setNewUser : setEditUser)} 
                              required
                            >
                              <option value="">— Seleccionar —</option>
                              {departamentos.map(d => <option key={d.id} value={d.id}>{d.descripcion}</option>)}
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="form-label">Distrito</label>
                            <select 
                              name="distrito_id" 
                              value={showCreateForm ? newUser.distrito_id : (editUser.distrito_id || '')} 
                              onChange={(e) => handleDistritoChange(e, showCreateForm ? setNewUser : setEditUser, showCreateForm ? newUser.rol : editUser.rol)} 
                              required 
                              disabled={showCreateForm ? !newUser.departamento_id : !editUser.departamento_id}
                            >
                              <option value="">— Primero elige departamento —</option>
                              {distritos.map(d => <option key={d.id} value={d.id}>{d.descripcion}</option>)}
                            </select>
                          </div>
                        </>
                      )}

                      {/* PARA CONCEJAL: Superior (Intendente) Opcional */}
                      {(showCreateForm ? newUser.rol : editUser.rol) === 'concejal' && isAdmin && (showCreateForm ? newUser.distrito_id : editUser.distrito_id) && (
                        <div className="form-group">
                          <label className="form-label">Intendente Superior (Opcional)</label>
                          <select 
                            name="superior_usuario_id" 
                            value={showCreateForm ? newUser.superior_usuario_id : (editUser.superior_usuario_id || '')} 
                            onChange={(e) => handleChange(e, showCreateForm ? setNewUser : setEditUser)}
                          >
                            <option value="">— Ninguno —</option>
                            {superioresDisponibles.map(s => <option key={s.id} value={s.id}>{s.nombre_completo} ({s.username})</option>)}
                          </select>
                        </div>
                      )}

                      {/* PARA REFERENTE: Superior Obligatorio */}
                      {(showCreateForm ? newUser.rol : editUser.rol) === 'referente' && isAdmin && (
                        <div className="form-group">
                          <label className="form-label">Pertenece al Candidato / Intendente</label>
                          <select 
                            name="superior_usuario_id" 
                            value={showCreateForm ? newUser.superior_usuario_id : (editUser.superior_usuario_id || '')} 
                            onChange={(e) => handleSuperiorChange(e, showCreateForm ? setNewUser : setEditUser)} 
                            required
                          >
                            <option value="">— Seleccionar Superior —</option>
                            {superioresDisponibles.map(s => (
                              <option key={s.id} value={s.id}>
                                {s.nombre_completo} ({getRolLabel(s.rol)})
                              </option>
                            ))}
                          </select>
                          {(showCreateForm ? newUser.superior_usuario_id : editUser.superior_usuario_id) && (
                            <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '4px', fontWeight: 500 }}>
                              ✅ Heredará el distrito del superior seleccionado.
                            </div>
                          )}
                        </div>
                      )}

                      {/* Mensaje herencia automática para no-admins con detalle visual */}
                      {!isAdmin && (
                        <div className="territorio-heredado-detalle" style={{ 
                          marginTop: '12px',
                          padding: '12px', 
                          background: '#fff', 
                          borderRadius: '10px',
                          border: '1px solid #bfdbfe',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}>
                          <p style={{ margin: '0 0 8px 0', fontSize: '0.75rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
                            📍 Territorio Heredado de ti
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                              <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>Departamento</span>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                                {departamentos.find(d => d.id === parseInt(currentUser.departamento_id))?.descripcion || 'Cargando...'}
                              </span>
                            </div>
                            <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                              <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>Distrito</span>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                                {distritos.find(d => d.id === parseInt(currentUser.distrito_id))?.descripcion || 'Cargando...'}
                              </span>
                            </div>
                          </div>
                          <p style={{ margin: '8px 0 0 0', fontSize: '0.7rem', color: '#60a5fa', fontStyle: 'italic' }}>
                            ℹ️ Como {getRolLabel(currentUser.rol)}, tus subordinados heredan tu jurisdicción automáticamente.
                          </p>
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
              {/* REENVIAR CREDENCIALES (Para Admins o creadores del usuario) */}
              {!showCreateForm && canManageUsers && currentUser.id !== editUser?.id && (
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

      {showInfoModal && ReactDOM.createPortal(
        <div className="modal-overlay" onClick={() => setShowInfoModal(false)}>
          <div className="modal info-modal fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Estructura Jerárquica del Sistema</h3>
              <button className="close-btn" onClick={() => setShowInfoModal(false)}>×</button>
            </div>
            <div className="modal-content hierarchy-explainer" style={{ padding: '24px', overflowY: 'auto' }}>
              <div className="hierarchy-tree-viz">
                <div className="viz-item viz-admin">
                  <div className="viz-box"><Shield size={16} /> Administrador</div>
                  <div className="viz-connector-v"></div>
                  
                  <div className="viz-group">
                    <div className="viz-item viz-intendente">
                      <div className="viz-box"><User size={16} /> Candidato a Intendente</div>
                      <div className="viz-connector-v"></div>
                      
                      <div className="viz-row-group">
                        <div className="viz-item">
                          <div className="viz-box viz-sub-box"><Users size={14} /> Referentes Int.</div>
                        </div>
                        <div className="viz-item">
                          <div className="viz-box viz-sub-box"><User size={14} /> Concejales</div>
                          <div className="viz-connector-v"></div>
                          <div className="viz-item">
                            <div className="viz-box viz-sub-sub-box"><Users size={12} /> Referentes Conc.</div>
                          </div>
                        </div>
                      </div>

                      <div className="viz-divider"></div>
                      
                      <div className="viz-row-group operative-group">
                        <div className="viz-item">
                          <div className="viz-box viz-op-box"><Car size={14} /> Choferes</div>
                        </div>
                        <div className="viz-item">
                          <div className="viz-box viz-op-box"><Eye size={14} /> Veedores</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="hierarchy-text-notes" style={{ marginTop: '24px', borderTop: '1px solid #eee', paddingTop: '16px' }}>
                <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '8px' }}>
                  <strong>Lógica de Visibilidad:</strong>
                </p>
                <ul style={{ fontSize: '0.8rem', color: '#64748b', paddingLeft: '20px' }}>
                  <li>Los superiores ven TODOS los datos de sus subordinados.</li>
                  <li>Los subordinados solo ven sus propios datos.</li>
                  <li>Los referentes de un mismo superior no ven datos entre sí.</li>
                  <li>Choferes y Veedores son personal operativo subordinado a quien los creó.</li>
                </ul>
              </div>
            </div>
            <div className="modal-actions" style={{ padding: '16px 24px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setShowInfoModal(false)}>Entendido</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default UserManagement;