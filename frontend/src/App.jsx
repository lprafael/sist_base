// App.jsx
// Frontend principal del Sistema de Gestión de Surtidor (SGS)
import React, { useState, useEffect } from "react";
import Login from "./components/Login.jsx";
import UserManagement from "./components/UserManagement.jsx";
import BackupSystem from "./components/BackupSystem.jsx";
import AuditSystem from "./components/AuditSystem.jsx";
import Dashboard from "./components/Dashboard.jsx";
import ConfigSurtidor from "./components/ConfigSurtidor.jsx";
import VentasTurno from "./components/VentasTurno.jsx";
import ConciliacionTarjetas from "./components/ConciliacionTarjetas.jsx";
import ProyeccionStock from "./components/ProyeccionStock.jsx";

function CabeceradePagina({ user, onLogout, onToggleSidebar, isSidebarCollapsed }) {
  return (
    <header className="main-header">
      <div className="header-title">
        {user && (
          <button
            className="menu-toggle"
            onClick={onToggleSidebar}
            title={isSidebarCollapsed ? "Mostrar menú" : "Ocultar menú"}
          >
            {isSidebarCollapsed ? "➡️" : "⬅️"}
          </button>
        )}
        <h1>⛽ SGS — Sistema de Gestión de Surtidor</h1>
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
          <img src="/imágenes/Logo_chico.PNG" alt="Logo RDS" style={{ height: 40 }} />
        </div>
        {user && (
          <button onClick={onLogout} className="logout-btn">Cerrar Sesión</button>
        )}
      </div>
    </header>
  );
}

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState({});

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) setUser(JSON.parse(userData));
    setLoading(false);
  }, []);

  const handleLogin = (loginData) => setUser(loginData.user);

  const toggleCategory = (categoryTitle) => {
    setCollapsedCategories(prev => ({ ...prev, [categoryTitle]: !prev[categoryTitle] }));
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch(`${import.meta.env.VITE_REACT_APP_API_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--background-color)' }}>
        <div className="loader">Cargando...</div>
      </div>
    );
  }

  if (!user) return <Login onLogin={handleLogin} />;

  const menuGroups = [
    {
      title: "Principal",
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: '📊', roles: ['admin', 'manager', 'user', 'viewer'] },
      ]
    },
    {
      title: "Operaciones",
      items: [
        { id: 'turnos', label: 'Gestión de Turnos', icon: '🔄', roles: ['admin', 'manager', 'user'] },
        { id: 'ventas', label: 'Ventas', icon: '💰', roles: ['admin', 'manager', 'user'] },
        { id: 'stock', label: 'Control de Stock', icon: '🛢️', roles: ['admin', 'manager', 'user', 'viewer'] },
        { id: 'mediciones', label: 'Mediciones Manuales', icon: '📏', roles: ['admin', 'manager', 'user'] },
      ]
    },
    {
      title: "Adquisiciones",
      items: [
        { id: 'pedidos', label: 'Pedidos de Combustible', icon: '📦', roles: ['admin', 'manager'] },
        { id: 'recepciones', label: 'Recepciones', icon: '🚚', roles: ['admin', 'manager', 'user'] },
        { id: 'proyeccion', label: 'Proyección de Stock', icon: '📈', roles: ['admin', 'manager', 'viewer'] },
      ]
    },
    {
      title: "Finanzas",
      items: [
        { id: 'caja', label: 'Caja', icon: '💵', roles: ['admin', 'manager'] },
        { id: 'conciliacion', label: 'Conciliación Tarjetas', icon: '💳', roles: ['admin', 'manager'] },
        { id: 'cuentas', label: 'Cuentas Bancarias', icon: '🏦', roles: ['admin', 'manager'] },
      ]
    },
    {
      title: "Personal",
      items: [
        { id: 'personal', label: 'Personal / Playeros', icon: '👷', roles: ['admin', 'manager'] },
      ]
    },
    {
      title: "Administración",
      items: [
        { id: 'config-surtidor', label: 'Config. Surtidor', icon: '⚙️', roles: ['admin'] },
        { id: 'usuarios', label: user.rol === 'admin' ? 'Gestión de Usuarios' : 'Mi Perfil', icon: '👤', roles: ['admin', 'manager', 'user', 'viewer'] },
        { id: 'auditoria', label: 'Auditoría', icon: '📋', roles: ['admin', 'manager'] },
        { id: 'backup', label: 'Backup', icon: '🗃️', roles: ['admin'] },
      ]
    }
  ];

  const PENDING_MODULES = ["turnos","stock","mediciones","pedidos","recepciones","caja","cuentas","personal"];

  return (
    <div className="app-container">
      <CabeceradePagina
        user={user}
        onLogout={handleLogout}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        isSidebarCollapsed={sidebarCollapsed}
      />

      <div className="content-wrapper">
        <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <h2 style={{ display: sidebarCollapsed ? 'none' : 'block' }}>Menú Principal</h2>

          <nav className="sidebar-nav">
            {menuGroups.map((group, gIdx) => {
              const visibleItems = group.items.filter(item => item.roles.includes(user.rol));
              if (visibleItems.length === 0) return null;
              const isCollapsed = collapsedCategories[group.title];
              return (
                <div key={gIdx} className="sidebar-category">
                  <div className="category-title" onClick={() => toggleCategory(group.title)}>
                    <span>{group.title}</span>
                    <span className={`category-arrow ${isCollapsed ? 'collapsed' : ''}`}>▼</span>
                  </div>
                  <div className={`category-items ${isCollapsed ? 'collapsed' : ''}`}>
                    {visibleItems.map(item => (
                      <button
                        key={item.id}
                        id={`menu-${item.id}`}
                        className={`sidebar-tab${tab === item.id ? " active" : ""}`}
                        onClick={() => setTab(item.id)}
                        title={sidebarCollapsed ? item.label : ""}
                      >
                        <span className="icon">{item.icon}</span>
                        {!sidebarCollapsed && <span className="label">{item.label}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        <main className="main-content">
          <div className="fade-in">
            {tab === "dashboard" && <Dashboard />}
            {tab === "config-surtidor" && user.rol === 'admin' && <ConfigSurtidor />}
            {tab === "usuarios" && <UserManagement />}
            {tab === "auditoria" && (user.rol === 'admin' || user.rol === 'manager') && <AuditSystem />}
            {tab === "backup" && user.rol === 'admin' && <BackupSystem />}

              {tab === "ventas" && <VentasTurno />}
            {tab === "conciliacion" && (user.rol === 'admin' || user.rol === 'manager') && <ConciliacionTarjetas />}
            {tab === "proyeccion" && <ProyeccionStock />}

            {PENDING_MODULES.includes(tab) && (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🚧</div>
                <h3 style={{ color: '#1e293b', marginBottom: '8px', fontSize: '1.2rem' }}>Módulo en construcción</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
                  El backend de este módulo ya está implementado y los endpoints están disponibles.<br />
                  El componente visual se integrará en la siguiente fase.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
