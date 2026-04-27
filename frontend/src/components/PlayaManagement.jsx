import React, { useState, useEffect } from 'react';
import { authFetch } from '../utils/authFetch';
import './UserManagement.css'; // Reusaremos estilos base o crearemos uno propio si es necesario

const PlayaManagement = () => {
  const [playas, setPlayas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPlaya, setEditPlaya] = useState(null);
  const [newPlaya, setNewPlaya] = useState({
    nombre: '', 
    razon_social: '', 
    ruc: '', 
    direccion: '', 
    telefono: '', 
    email: '', 
    activo: true
  });

  const fetchPlayas = async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/sistema/playas');
      if (response.ok) {
        const data = await response.json();
        setPlayas(data);
      } else {
        setError('No se pudieron cargar las playas. Verifica tus permisos.');
      }
    } catch (err) {
      setError('Error de conexión al cargar playas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayas();
  }, []);

  const handleChange = (e, setter) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setter((prev) => ({ ...prev, [name]: val }));
  };

  const handleCreatePlaya = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await authFetch('/api/sistema/playas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPlaya)
      });
      if (response.ok) {
        setShowCreateForm(false);
        setNewPlaya({
          nombre: '', razon_social: '', ruc: '', direccion: '', telefono: '', email: '', activo: true
        });
        fetchPlayas();
        alert('Empresa (Playa) creada exitosamente.');
      } else {
        const data = await response.json();
        alert(data.detail || 'Error al crear la playa');
      }
    } catch (err) {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (playa) => {
    setEditPlaya({ ...playa });
    setShowEditModal(true);
  };

  const handleUpdatePlaya = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await authFetch(`/api/sistema/playas/${editPlaya.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPlaya)
      });
      if (response.ok) {
        setShowEditModal(false);
        fetchPlayas();
        alert('Datos de la empresa actualizados.');
      } else {
        const data = await response.json();
        alert(data.detail || 'Error al actualizar');
      }
    } catch (err) {
      alert('Error al actualizar');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (playa) => {
    if (!window.confirm(`¿Seguro que deseas ${playa.activo ? 'desactivar' : 'activar'} esta empresa?`)) return;
    
    try {
      const response = await authFetch(`/api/sistema/playas/${playa.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !playa.activo })
      });
      if (response.ok) {
        fetchPlayas();
      }
    } catch (err) {
      alert('Error al cambiar estado');
    }
  };

  if (loading && playas.length === 0) return <div className="loading">Cargando empresas...</div>;

  return (
    <div className="fade-in">
      <div className="user-management-header">
        <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Gestión de Empresas (Playas)</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Administración centralizada de tenants del sistema.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
          ➕ Nueva Empresa
        </button>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '20px' }}>{error}</div>}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>RUC</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {playas.map(playa => (
              <tr key={playa.id}>
                <td style={{ fontWeight: 600 }}>{playa.nombre}</td>
                <td>{playa.ruc || '-'}</td>
                <td>{playa.email || '-'}</td>
                <td>{playa.telefono || '-'}</td>
                <td>
                  <span className={`status-badge ${playa.activo ? 'active' : 'inactive'}`}>
                    {playa.activo ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td>
                  <div className="actions-cell">
                    <button className="action-btn action-btn-edit" onClick={() => handleEditClick(playa)} title="Editar">✏️</button>
                    <button 
                      className={`action-btn ${playa.activo ? 'action-btn-delete' : ''}`} 
                      style={{ color: playa.activo ? '' : '#22c55e' }}
                      onClick={() => toggleStatus(playa)} 
                      title={playa.activo ? 'Desactivar' : 'Activar'}
                    >
                      {playa.activo ? '🚫' : '✅'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {playas.length === 0 && !loading && (
                <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>No hay empresas registradas.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {(showCreateForm || showEditModal) && (
        <div className="modal-overlay">
          <div className="modal fade-in" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>{showCreateForm ? 'Registrar Nueva Empresa' : 'Editar Empresa'}</h3>
              <button className="close-btn" onClick={() => { setShowCreateForm(false); setShowEditModal(false); }}>×</button>
            </div>
            <form onSubmit={showCreateForm ? handleCreatePlaya : handleUpdatePlaya} className="create-user-form">
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="form-group">
                    <label className="form-label">Nombre Comercial</label>
                    <input 
                      name="nombre" 
                      value={showCreateForm ? newPlaya.nombre : editPlaya.nombre} 
                      onChange={(e) => handleChange(e, showCreateForm ? setNewPlaya : setEditPlaya)} 
                      required 
                      placeholder="Ej: Peralta Automotores"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">RUC</label>
                    <input 
                      name="ruc" 
                      value={showCreateForm ? newPlaya.ruc : editPlaya.ruc} 
                      onChange={(e) => handleChange(e, showCreateForm ? setNewPlaya : setEditPlaya)} 
                      placeholder="Ej: 80001234-5"
                    />
                  </div>
              </div>

              <div className="form-group">
                <label className="form-label">Razón Social</label>
                <input 
                  name="razon_social" 
                  value={showCreateForm ? newPlaya.razon_social : editPlaya.razon_social} 
                  onChange={(e) => handleChange(e, showCreateForm ? setNewPlaya : setEditPlaya)} 
                  placeholder="Nombre legal completo"
                />
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input 
                      type="email"
                      name="email" 
                      value={showCreateForm ? newPlaya.email : editPlaya.email} 
                      onChange={(e) => handleChange(e, showCreateForm ? setNewPlaya : setEditPlaya)} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Teléfono</label>
                    <input 
                      name="telefono" 
                      value={showCreateForm ? newPlaya.telefono : editPlaya.telefono} 
                      onChange={(e) => handleChange(e, showCreateForm ? setNewPlaya : setEditPlaya)} 
                    />
                  </div>
              </div>

              <div className="form-group">
                <label className="form-label">Dirección</label>
                <textarea 
                  name="direccion" 
                  value={showCreateForm ? newPlaya.direccion : editPlaya.direccion} 
                  onChange={(e) => handleChange(e, showCreateForm ? setNewPlaya : setEditPlaya)} 
                  rows="2"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowCreateForm(false); setShowEditModal(false); }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Procesando...' : (showCreateForm ? 'Crear Empresa' : 'Guardar Cambios')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayaManagement;
