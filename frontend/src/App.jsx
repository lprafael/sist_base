// App.js
// Frontend principal del Sistema Base
// Sistema de autenticación integrado
import React, { useState, useEffect } from "react";
import Login from "./components/Login.jsx";
import UserManagement from "./components/UserManagement.jsx";
import BackupSystem from "./components/BackupSystem.jsx";
import AuditSystem from "./components/AuditSystem.jsx";
import VehiculosPlaya from "./components/playa/VehiculosPlaya.jsx";
import ClientesPlaya from "./components/playa/ClientesPlaya.jsx";
import VentasPlaya from "./components/playa/VentasPlaya.jsx";
import CobrosPlaya from "./components/playa/CobrosPlaya.jsx";
import GastosVehiculo from "./components/playa/GastosVehiculo.jsx";
import DashboardPlaya from "./components/playa/DashboardPlaya.jsx";
import GastosEmpresa from "./components/playa/GastosEmpresa.jsx";
import CategoriasPlaya from "./components/playa/CategoriasPlaya.jsx";
import ConfigCalificacionesPlaya from "./components/playa/ConfigCalificacionesPlaya.jsx";

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
        <h1>Sistema Base - Poliverso</h1>
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
            src="/imágenes/Logo_chico.PNG"
            alt="Logo RDS"
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
  const [tab, setTab] = useState("dashboard_playa");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState({
    "Playa de Vehículos": true,
    "Negocios": true,
    "Parámetros": true,
    "Administración": true
  });
  const [preselectedVehicleId, setPreselectedVehicleId] = useState(null);
  const [preselectedCategoryId, setPreselectedCategoryId] = useState(null);
  const [preselectedCalificacion, setPreselectedCalificacion] = useState(null);

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

  const toggleCategory = (categoryTitle) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [categoryTitle]: !prev[categoryTitle]
    }));
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

  const menuGroups = [
    {
      title: "Playa de Vehículos",
      icon: "🚗",
      items: [
        { id: "dashboard_playa", label: "Dashboard", icon: "📊", roles: ['admin', 'manager', 'user', 'viewer'] },
        { id: "inventario", label: "Inventario", icon: "🚙", roles: ['admin', 'manager', 'user', 'viewer'] },
        { id: "clientes_playa", label: "Clientes", icon: "👥", roles: ['admin', 'manager', 'user', 'viewer'] },
        { id: "gastos_playa", label: "Gastos de Vehículos", icon: "🔧", roles: ['admin', 'manager', 'user', 'viewer'] },
        { id: "gastos_empresa_playa", label: "Gastos Empresa", icon: "🏢", roles: ['admin', 'manager', 'user', 'viewer'] }
      ]
    },
    {
      title: "Negocios",
      icon: "🤝",
      items: [
        { id: "ventas_playa", label: "Ventas", icon: "🤝", roles: ['admin', 'manager', 'user', 'viewer'] },
        { id: "cobros_playa", label: "Cobros", icon: "💵", roles: ['admin', 'manager', 'user', 'viewer'] },
      ]
    },
    {
      title: "Parámetros",
      items: [
        { id: "categorias_playa", label: "Categorías(Veh.)", icon: "🏷️", roles: ['admin', 'manager', 'user', 'viewer'] },
        { id: "config_calificaciones_playa", label: "Calif.(clientes)", icon: "⭐", roles: ['admin', 'manager', 'user', 'viewer'] },
      ]
    },
    {
      title: "Administración",
      items: [
        { id: 'usuarios', label: user.rol === 'admin' ? 'Gestión de Usuarios' : 'Mi Perfil', icon: '👤', roles: ['admin', 'manager', 'user', 'viewer'] },
        { id: 'auditoria', label: 'Auditoría', icon: '📊', roles: ['admin', 'manager'] },
        { id: 'backup', label: 'Sistema de Backup', icon: '🔄', roles: ['admin', 'manager'] },
      ]
    }

  ];

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
                  <div
                    className="category-title"
                    onClick={() => toggleCategory(group.title)}
                  >
                    <span>{group.title}</span>
                    <span className={`category-arrow ${isCollapsed ? 'collapsed' : ''}`}>▼</span>
                  </div>

                  <div className={`category-items ${isCollapsed ? 'collapsed' : ''}`}>
                    {visibleItems.map(item => (
                      <button
                        key={item.id}
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

          <div style={{ marginTop: 'auto', padding: '0 12px', marginBottom: '12px' }}>
            <button
              className="sidebar-tab"
              style={{
                width: '100%',
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                border: '1px solid var(--border-color)',
                padding: sidebarCollapsed ? '10px' : '10px 16px'
              }}
              onClick={() => window.open('/ficha_tecnica_sistema.html', '_blank')}
              title={sidebarCollapsed ? "Ficha del Sistema" : ""}
            >
              <span className="icon">📄</span>
              {!sidebarCollapsed && <span className="label">Ficha del Sistema</span>}
            </button>
          </div>
        </aside>

        <main className="main-content">
          <div className="fade-in">
            {tab === "usuarios" && <UserManagement />}
            {tab === "auditoria" && (user.rol === 'admin' || user.rol === 'manager') && <AuditSystem />}
            {tab === "backup" && (user.rol === 'admin' || user.rol === 'manager') && <BackupSystem />}
            {tab === "dashboard_playa" && <DashboardPlaya />}
            {tab === "categorias_playa" && <CategoriasPlaya setTab={setTab} setPreselectedCategoryId={setPreselectedCategoryId} />}
            {tab === "config_calificaciones_playa" && <ConfigCalificacionesPlaya setTab={setTab} setPreselectedCalificacion={setPreselectedCalificacion} />}
            {tab === "inventario" && (
              <VehiculosPlaya
                setTab={setTab}
                setPreselectedVehicleId={setPreselectedVehicleId}
                preselectedCategoryId={preselectedCategoryId}
                setPreselectedCategoryId={setPreselectedCategoryId}
              />
            )}
            {tab === "clientes_playa" && <ClientesPlaya preselectedCalificacion={preselectedCalificacion} setPreselectedCalificacion={setPreselectedCalificacion} />}
            {tab === "ventas_playa" && <VentasPlaya preselectedVehicleId={preselectedVehicleId} setPreselectedVehicleId={setPreselectedVehicleId} />}
            {tab === "cobros_playa" && <CobrosPlaya />}
            {tab === "gastos_playa" && <GastosVehiculo />}
            {tab === "gastos_empresa_playa" && <GastosEmpresa />}
          </div>

        </main>
      </div>
    </div>
  );
}
