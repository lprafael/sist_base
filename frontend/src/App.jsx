// App.js
// Frontend principal para el CRUD de gremios, eots y feriados
// Sistema de autenticación integrado
import React, { useState, useEffect } from "react";
import GremiosCRUD from "./GremiosCRUD.jsx";
import EotsCRUD from "./EotsCRUD.jsx";
import FeriadosCRUD from "./FeriadosCRUD.jsx";
import RutasCRUD from "./RutasCRUD.jsx";
import Login from "./components/Login.jsx";
import UserManagement from "./components/UserManagement.jsx";
import BackupSystem from "./components/BackupSystem.jsx";
import GeocercasTerminales from "./GeocercasTerminales.jsx";

function CabeceradePagina({ user, onLogout }) {
  return (
    <header className="main-header">
      <div className="header-title">
        <h1>Sistema de Gestión de Catálogos - VMT-CID</h1>
      </div>
      <div className="header-user-info">
        {user && (
          <div className="user-details">
            <div className="user-name">{user.nombre_completo}</div>
            <div className="user-role">
              {user.rol === 'admin' ? 'Administrador' :
                user.rol === 'manager' ? 'Gerente' :
                  user.rol === 'user' ? 'Usuario' : 'Visualizador'}
            </div>
          </div>
        )}
        <div className="logo-container" style={{ background: 'white', padding: '4px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
          <img
            src="/imágenes/Logo_CIDSA2.jpg"
            alt="Logo CIDSA"
            style={{ height: 40 }}
          />
        </div>
        {user && (
          <button onClick={onLogout} className="logout-btn">
            Cerrar Sesión
          </button>
        )}
      </div>
    </header>
  );
}

export default function App() {
  const [tab, setTab] = useState("gremios");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const handleLogin = (loginData) => {
    setUser(loginData.user);
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch(`${import.meta.env.VITE_REACT_APP_API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'var(--background-color)'
      }}>
        <div className="loader">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const menuItems = [
    { id: 'gremios', label: '📊 Gremios', roles: ['admin', 'manager', 'user', 'viewer'] },
    { id: 'eots', label: '🚌 EOTs', roles: ['admin', 'manager', 'user', 'viewer'] },
    { id: 'feriados', label: '📅 Feriados', roles: ['admin', 'manager', 'user', 'viewer'] },
    { id: 'rutas', label: '🗺️ Catálogo de Rutas', roles: ['admin', 'manager', 'user', 'viewer'] },
    { id: 'geocercas', label: '📍 Terminales y Geocercas', roles: ['admin', 'manager', 'user', 'viewer'] },
    { id: 'usuarios', label: user.rol === 'admin' ? '👥 Gestión de Usuarios' : '👤 Mi Perfil', roles: ['admin', 'manager', 'user', 'viewer'] },
    { id: 'backup', label: '🔄 Sistema de Backup', roles: ['admin'] },
  ];

  return (
    <div className="app-container">
      <CabeceradePagina user={user} onLogout={handleLogout} />

      <div className="content-wrapper">
        <aside className="sidebar">
          <h2>Menú Principal</h2>
          <nav className="sidebar-nav">
            {menuItems.map(item => (
              item.roles.includes(user.rol) && (
                <button
                  key={item.id}
                  className={`sidebar-tab${tab === item.id ? " active" : ""}`}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                </button>
              )
            ))}
          </nav>

          <div style={{ marginTop: 'auto', padding: '0 12px' }}>
            <button
              className="sidebar-tab"
              style={{ width: '100%', justifyContent: 'center', border: '1px solid var(--border-color)', marginTop: '20px' }}
              onClick={() => window.open('/ficha_tecnica_sistema.html', '_blank')}
            >
              📄 Ficha del Sistema
            </button>
          </div>
        </aside>

        <main className="main-content">
          <div className="fade-in">
            {tab === "gremios" && <GremiosCRUD />}
            {tab === "eots" && <EotsCRUD />}
            {tab === "feriados" && <FeriadosCRUD />}
            {tab === "rutas" && <RutasCRUD />}
            {tab === "geocercas" && <GeocercasTerminales />}
            {tab === "usuarios" && <UserManagement />}
            {tab === "backup" && user.rol === 'admin' && <BackupSystem />}
          </div>
        </main>
      </div>
    </div>
  );
}
