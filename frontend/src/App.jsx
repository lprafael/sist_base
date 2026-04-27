// App.js
// Frontend principal del Sistema Base
// Sistema de autenticación integrado
import React, { useState, useEffect } from "react";
import Login from "./components/Login.jsx";
import UserManagement from "./components/UserManagement.jsx";
import PlayaManagement from "./components/PlayaManagement.jsx";
import BackupSystem from "./components/BackupSystem.jsx";
import AuditSystem from "./components/AuditSystem.jsx";
import VehiculosPlaya from "./components/playa/gestion/VehiculosPlaya.jsx";
import ClientesPlaya from "./components/playa/gestion/ClientesPlaya.jsx";
import VentasPlaya from "./components/playa/negocios/VentasPlaya.jsx";
import CobrosPlaya from "./components/playa/negocios/CobrosPlaya.jsx";
import PagaresPlaya from "./components/playa/negocios/PagaresPlaya.jsx";
import GastosVehiculo from "./components/playa/gestion/GastosVehiculo.jsx";
import DocumentosImportacion from "./components/playa/gestion/DocumentosImportacion.jsx";
import DashboardPlaya from "./components/playa/gestion/DashboardPlaya.jsx";
import GastosEmpresa from "./components/playa/gestion/GastosEmpresa.jsx";
import CategoriasPlaya from "./components/playa/parametros/CategoriasPlaya.jsx";
import ConfigCalificacionesPlaya from "./components/playa/parametros/ConfigCalificacionesPlaya.jsx";
import TiposGastosEmpresa from "./components/playa/parametros/TiposGastosEmpresa.jsx";
import TiposGastosProductos from "./components/playa/parametros/TiposGastosProductos.jsx";
import ReportesPlaya from "./components/playa/reportes/ReportesPlaya.jsx";
import MovimientoDetallado from "./components/playa/reportes/MovimientoDetallado.jsx";
import VendedoresPlaya from "./components/playa/parametros/VendedoresPlaya.jsx";
import EstadosPlaya from "./components/playa/parametros/EstadosPlaya.jsx";
import CuentasPlaya from "./components/playa/parametros/CuentasPlaya.jsx";
import MovimientosCuentas from "./components/playa/negocios/MovimientosCuentas.jsx";
import EscribaniasPlaya from "./components/playa/parametros/EscribaniasPlaya.jsx";
import CatalogoTiposVehiculo from "./components/playa/parametros/CatalogoTiposVehiculo.jsx";
import CatalogoMarcas from "./components/playa/parametros/CatalogoMarcas.jsx";
import CatalogoModelos from "./components/playa/parametros/CatalogoModelos.jsx";
import ImagenesVehiculo from "./components/playa/gestion/ImagenesVehiculo.jsx";
import DiagnosticoPagares from "./components/playa/negocios/DiagnosticoPagares.jsx";
import HistorialPropietarios from "./components/playa/parametros/HistorialPropietarios.jsx";
import GastosAdicionales from "./components/playa/negocios/GastosAdicionales.jsx";

function CabeceradePagina({ user, onLogout, onToggleSidebar, isSidebarCollapsed, isMobileOpen, onMobileToggle }) {
  const handleToggle = () => {
    // En móviles, toggle del sidebar móvil
    if (window.innerWidth <= 768) {
      onMobileToggle();
    } else {
      // En desktop, toggle del colapso
      onToggleSidebar();
    }
  };

  return (
    <header className="main-header">
      <div className="header-title">
        {user && (
          <button
            className="menu-toggle"
            onClick={handleToggle}
            title={isMobileOpen || !isSidebarCollapsed ? "Ocultar menú" : "Mostrar menú"}
            aria-label="Toggle menu"
          >
            {isMobileOpen || !isSidebarCollapsed ? "⬅️" : "➡️"}
          </button>
        )}
        <img
          src="/imágenes/Logo_actualizado2.png"
          alt="Peralta Automotores"
          className="header-logo"
        />
        <h1>Gestión de Playa de Vehículos</h1>
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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState({
    "Playa de Vehículos": true,
    "Negocios": true,
    "Reportes": true,
    "Parámetros": true,
    "Parámetros generales": true,
    "Administración": true
  });
  const [preselectedVehicleId, setPreselectedVehicleId] = useState(null);
  const [preselectedCategoryId, setPreselectedCategoryId] = useState(null);
  const [preselectedCalificacion, setPreselectedCalificacion] = useState(null);
  const [preselectedDespacho, setPreselectedDespacho] = useState(null);

  const handleLogout = async () => {
    try {
      const token = sessionStorage.getItem('token');
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
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('loginTimestamp');
      sessionStorage.removeItem('lastActivity');
      setUser(null);
    }
  };

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    const userData = sessionStorage.getItem('user');

    if (token && userData) {
      const parsed = JSON.parse(userData);
      setUser(parsed);
      if (parsed.rol === 'admin') {
        setTab('pg_tipos_vehiculos');
      }
    }
    setLoading(false);
  }, []);

  // Lógica de expiración de sesión (Inactividad y Tiempo Absoluto)
  useEffect(() => {
    if (!user) return;

    const INACTIVITY_LIMIT = 20 * 60 * 1000; // 20 minutos
    // Aumentar el límite de tiempo absoluto a 2 horas
    const ABSOLUTE_LIMIT = 60 * 60 * 1000 * 2;   // 2 horas
    const CHECK_INTERVAL = 10000;           // Revisar cada 10 segundos

    // Al iniciar sesión, guardamos el tiempo de inicio si no existe
    if (!sessionStorage.getItem('loginTimestamp')) {
      sessionStorage.setItem('loginTimestamp', Date.now().toString());
    }

    // Inicializar último tiempo de actividad
    sessionStorage.setItem('lastActivity', Date.now().toString());

    const updateActivity = () => {
      sessionStorage.setItem('lastActivity', Date.now().toString());
    };

    // Listeners para detectar actividad del usuario (mouse, teclado, clics)
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('scroll', updateActivity);

    const interval = setInterval(() => {
      const now = Date.now();
      const lastActivity = parseInt(sessionStorage.getItem('lastActivity') || '0');
      const loginTime = parseInt(sessionStorage.getItem('loginTimestamp') || '0');

      // 1. Verificar inactividad
      if (now - lastActivity > INACTIVITY_LIMIT) {
        console.log("Cerrando sesión por inactividad");
        handleLogout();
        alert("Tu sesión ha expirado por inactividad.");
      }
      // 2. Verificar tiempo absoluto
      else if (now - loginTime > ABSOLUTE_LIMIT) {
        console.log("Cerrando sesión por tiempo máximo alcanzado");
        handleLogout();
        alert("Tu sesión ha expirado (límite de 2 horas alcanzado).");
      }
    }, CHECK_INTERVAL);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      clearInterval(interval);
    };
  }, [user]);

  const handleLogin = (loginData) => {
    sessionStorage.setItem('loginTimestamp', Date.now().toString());
    sessionStorage.setItem('lastActivity', Date.now().toString());
    setUser(loginData.user);
    if (loginData.user?.rol === 'admin') {
      setTab('pg_tipos_vehiculos');
    } else {
      setTab('dashboard_playa');
    }
  };

  const toggleCategory = (categoryTitle) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [categoryTitle]: !prev[categoryTitle]
    }));
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

  const baseMenuGroups = [
    {
      title: "Playa de Vehículos",
      icon: "🚗",
      items: [
        { id: "dashboard_playa", label: "Dashboard", icon: "📊", roles: ['admin', 'manager', 'user', 'viewer'] },
        { id: "inventario", label: "Inventario", icon: "🚙", roles: ['admin', 'manager', 'user', 'viewer'] },
        { id: "imagenes_productos", label: "Imágenes de Vehículos", icon: "📸", roles: ['admin', 'manager', 'user', 'viewer'] },
        { id: "documentos_importacion", label: "Documentos Importación", icon: "📄", roles: ['admin', 'manager', 'user', 'viewer'] },
        { id: "clientes_playa", label: "Clientes", icon: "👥", roles: ['admin', 'manager', 'user', 'viewer'] },
        { id: "gastos_playa", label: "Gastos de Vehículos", icon: "🔧", roles: ['admin', 'manager', 'user', 'viewer'] },
        { id: "gastos_empresa_playa", label: "Gastos Empresa", icon: "🏢", roles: ['admin', 'manager', 'user', 'viewer'] }
      ]
    },
    {
      title: "Reportes",
      icon: "📋",
      items: [
        { id: "reportes_mora", label: "Reportes", icon: "📋", roles: ['admin', 'manager', 'user'] },
        { id: "movimiento_detallado", label: "Movimiento Detallado", icon: "📊", roles: ['admin', 'manager'] },
      ]
    },
    {
      title: "Negocios",
      icon: "🤝",
      items: [
        { id: "ventas_playa", label: "Ventas", icon: "🤝", roles: ['admin', 'manager', 'user', 'viewer'] },
        { id: "pagares_playa", label: "Pagarés", icon: "📝", roles: ['admin', 'manager', 'user', 'viewer'] },
        { id: "cobros_playa", label: "Cobros", icon: "💵", roles: ['admin', 'manager', 'user', 'viewer'] },
        { id: "gastos_adicionales", label: "Gastos Adicionales", icon: "➕", roles: ['admin', 'manager', 'user'] },
        { id: "movimientos_cuentas", label: "Movimientos", icon: "💸", roles: ['admin', 'manager'] },
      ]
    },
    {
      title: "Parámetros",
      items: [
        { id: "categorias_playa", label: "Categorías(Veh.)", icon: "🏷️", roles: ['admin', 'manager', 'user', 'viewer'] },
        { id: "config_calificaciones_playa", label: "Calif.(clientes)", icon: "⭐", roles: ['admin', 'manager', 'user', 'viewer'] },
        { id: "tipos_gastos_empresa_playa", label: "Tipos Gastos Empresa", icon: "🏢", roles: ['admin', 'manager'] },
        { id: "tipos_gastos_productos_playa", label: "Tipos Gastos Productos", icon: "🛠️", roles: ['admin', 'manager'] },
        { id: "vendedores_playa", label: "Vendedores", icon: "👨‍💼", roles: ['admin', 'manager'] },
        { id: "escribanias_playa", label: "Escribanías", icon: "⚖️", roles: ['admin', 'manager'] },
        { id: "estados_playa", label: "Estados Pagarés", icon: "🔖", roles: ['admin', 'manager'] },
        { id: "cuentas_playa", label: "Cuentas/Cajas", icon: "🏦", roles: ['admin', 'manager'] },
        { id: "historial_propietarios", label: "Historial Propietarios", icon: "📜", roles: ['admin', 'manager', 'user'] },
      ]
    },
    {
      title: "Administración",
      items: [
        { id: 'usuarios', label: user.rol === 'admin' ? 'Gestión de Usuarios' : 'Mi Perfil', icon: '👤', roles: ['admin', 'manager', 'user', 'viewer'] },
        { id: 'diagnostico_pagares', label: 'Diagnóstico Pagarés', icon: '🔍', roles: ['admin', 'manager'] },
        { id: 'auditoria', label: 'Auditoría', icon: '📊', roles: ['admin', 'manager'] },
        { id: 'backup', label: 'Sistema de Backup', icon: '🔄', roles: ['admin', 'manager'] },
      ]
    }
  ];

  const ownerMenuGroups = baseMenuGroups.map(g => ({
    ...g,
    items: g.items
      .map(it => ({ ...it, roles: it.roles.filter(r => r !== 'admin') }))
      .filter(it => it.roles.length > 0)
  }));

  const adminMenuGroups = [
    {
      title: "Parámetros generales",
      icon: "⚙️",
      items: [
        { id: 'pg_tipos_vehiculos', label: 'Tipos de vehículos', icon: '🚙', roles: ['admin'] },
        { id: 'pg_marcas', label: 'Marcas', icon: '🏷️', roles: ['admin'] },
        { id: 'pg_modelos', label: 'Modelos', icon: '📋', roles: ['admin'] },
        { id: 'pg_escribanias', label: 'Escribanías', icon: '⚖️', roles: ['admin'] },
      ]
    },
    {
      title: "Administración",
      items: [
        { id: 'usuarios', label: 'Gestión de Usuarios', icon: '👤', roles: ['admin'] },
        { id: 'playas_admin', label: 'Gestión de Playas', icon: '🏢', roles: ['admin'] },
        { id: 'diagnostico_pagares', label: 'Diagnóstico Pagarés', icon: '🔍', roles: ['admin'] },
        { id: 'auditoria', label: 'Auditoría', icon: '📊', roles: ['admin'] },
        { id: 'backup', label: 'Sistema de Backup', icon: '🔄', roles: ['admin'] },
      ]
    }
  ];

  const menuGroups = user.rol === 'admin' ? adminMenuGroups : ownerMenuGroups;

  const handleTabChange = (newTab) => {
    setTab(newTab);
    // Cerrar sidebar móvil al cambiar de tab
    if (window.innerWidth <= 768) {
      setMobileSidebarOpen(false);
    }
  };

  const handleMobileSidebarToggle = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  const handleOverlayClick = () => {
    setMobileSidebarOpen(false);
  };

  return (
    <div className="app-container">
      <CabeceradePagina
        user={user}
        onLogout={handleLogout}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        isSidebarCollapsed={sidebarCollapsed}
        isMobileOpen={mobileSidebarOpen}
        onMobileToggle={handleMobileSidebarToggle}
      />

      {/* Overlay para móviles */}
      <div
        className={`sidebar-overlay ${mobileSidebarOpen ? 'active' : ''}`}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      <div className="content-wrapper">
        <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
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
                        onClick={() => handleTabChange(item.id)}
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
            {tab === "playas_admin" && user.rol === 'admin' && <PlayaManagement />}
            {tab === "diagnostico_pagares" && (user.rol === 'admin' || user.rol === 'manager') && <DiagnosticoPagares />}
            {tab === "auditoria" && (user.rol === 'admin' || user.rol === 'manager') && <AuditSystem />}
            {tab === "backup" && (user.rol === 'admin' || user.rol === 'manager') && <BackupSystem />}
            {tab === "dashboard_playa" && <DashboardPlaya />}
            {tab === "categorias_playa" && <CategoriasPlaya setTab={setTab} setPreselectedCategoryId={setPreselectedCategoryId} />}
            {tab === "config_calificaciones_playa" && <ConfigCalificacionesPlaya setTab={setTab} setPreselectedCalificacion={setPreselectedCalificacion} />}
            {tab === "tipos_gastos_empresa_playa" && <TiposGastosEmpresa />}
            {tab === "tipos_gastos_productos_playa" && <TiposGastosProductos />}
            {tab === "vendedores_playa" && <VendedoresPlaya />}
            {tab === "documentos_importacion" && <DocumentosImportacion preselectedDespacho={preselectedDespacho} setPreselectedDespacho={setPreselectedDespacho} />}
            {tab === "inventario" && (
              <VehiculosPlaya
                setTab={setTab}
                setPreselectedVehicleId={setPreselectedVehicleId}
                preselectedCategoryId={preselectedCategoryId}
                setPreselectedCategoryId={setPreselectedCategoryId}
                setPreselectedDespacho={setPreselectedDespacho}
              />
            )}
            {tab === "imagenes_productos" && <ImagenesVehiculo />}
            {tab === "clientes_playa" && <ClientesPlaya preselectedCalificacion={preselectedCalificacion} setPreselectedCalificacion={setPreselectedCalificacion} />}
            {tab === "ventas_playa" && <VentasPlaya setTab={setTab} preselectedVehicleId={preselectedVehicleId} setPreselectedVehicleId={setPreselectedVehicleId} />}
            {tab === "pagares_playa" && <PagaresPlaya />}
            {tab === "cobros_playa" && <CobrosPlaya />}
            {tab === "gastos_playa" && <GastosVehiculo />}
            {tab === "gastos_empresa_playa" && <GastosEmpresa />}
            {tab === "reportes_mora" && <ReportesPlaya />}
            {tab === "movimiento_detallado" && <MovimientoDetallado />}
            {tab === "estados_playa" && <EstadosPlaya />}
            {tab === "cuentas_playa" && <CuentasPlaya />}
            {tab === "movimientos_cuentas" && <MovimientosCuentas />}
            {tab === "gastos_adicionales" && <GastosAdicionales />}
            {tab === "escribanias_playa" && <EscribaniasPlaya />}
            {user.rol === 'admin' && tab === "pg_tipos_vehiculos" && <CatalogoTiposVehiculo />}
            {user.rol === 'admin' && tab === "pg_marcas" && <CatalogoMarcas />}
            {user.rol === 'admin' && tab === "pg_modelos" && <CatalogoModelos />}
            {user.rol === 'admin' && tab === "pg_escribanias" && <EscribaniasPlaya />}
            {tab === "historial_propietarios" && <HistorialPropietarios />}
          </div>

        </main>
      </div>
    </div>
  );
}
