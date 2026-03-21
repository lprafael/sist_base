// App.jsx
// Frontend principal del Sistema SIGEL (Sistema de Gestión Electoral)
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./components/Login.jsx";
import UserManagement from "./components/UserManagement.jsx";
import BackupSystem from "./components/BackupSystem.jsx";
import AuditSystem from "./components/AuditSystem.jsx";
import VoterRegistration from "./components/VoterRegistration.jsx";
import CandidateDashboard from "./components/CandidateDashboard.jsx";
import GeoDashboard from "./components/GeoDashboard.jsx";
import HistoricalAnalysis from "./components/HistoricalAnalysis.jsx";
import PadronImpresion from "./components/PadronImpresion.jsx";
import LogisticaControlPanel from './components/LogisticaControlPanel.jsx';
import ChoferGestion from './components/ChoferGestion.jsx';
import ChoferTracking from './components/ChoferTracking.jsx';
import LandingPage from "./pages/LandingPage.jsx";
import PlraPadronConsult from "./components/PlraPadronConsult.jsx";
import ActivitiesManagement from "./components/ActivitiesManagement.jsx";
import CandidatePublicPage from "./components/CandidatePublicPage.jsx";
import InteligenciaTerritorial from "./components/InteligenciaTerritorial.jsx";
import FinanciamientoPolitico from "./components/FinanciamientoPolitico.jsx";
import EscrutinioDiaD from "./components/EscrutinioDiaD.jsx";

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
        <h1>SIGEL - Gestión Electoral</h1>
      </div>
      <div className="header-user-info">
        {user && (
          <div className="user-details">
            <div className="user-name">{user.nombre_completo}</div>
            <div className="user-role">
              {user.rol === 'admin' ? '🔑 Administrador' :
                user.rol === 'intendente' ? '🏛️ Candidato Intendente' :
                  user.rol === 'concejal' ? '🏙️ Candidato Concejal' :
                    user.rol === 'referente' ? '👥 Referente' : 'Visualizador'}
            </div>
          </div>
        )}
        <div className="logo-container" style={{ background: 'white', padding: '4px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
          <img
            src="/imagenes/Logo_chico.PNG"
            alt="Logo SIGEL"
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

function MainDashboard({ user, onLogout }) {
  const [tab, setTab] = useState("captacion");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Inicializar todas las categorías como colapsadas
  const [collapsedCategories, setCollapsedCategories] = useState({
    "Administración": true,
    "Captación": true,
    "Logística": true,
    "Extras": true
  });

  const toggleCategory = (categoryTitle) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [categoryTitle]: !prev[categoryTitle]
    }));
  };

  const menuGroups = [
    {
      title: "Captación", // Primer subgrupo de Gestión Electoral
      items: [
        { id: 'captacion', label: 'Cargar Simpatizantes', icon: '🗳️', roles: ['admin', 'intendente', 'concejal', 'referente'] },
        { id: 'tablero', label: 'Mi Tablero', icon: '📈', roles: ['admin', 'intendente', 'concejal', 'referente'] },
        { id: 'actividades', label: 'Actividades', icon: '🚩', roles: ['admin', 'intendente', 'concejal'] },
        { id: 'geografia', label: 'Panel Georreferenciado', icon: '🗺️', roles: ['admin', 'intendente', 'concejal'] },
        { id: 'analisis_historico', label: 'Análisis de Resultados', icon: '📊', roles: ['admin', 'intendente', 'concejal'] },
        { id: 'padron_impresion', label: 'Impresión de Padrón', icon: '🖨️', roles: ['admin', 'intendente', 'concejal', 'referente'] },
      ]
    },
    {
      title: "Logística", // Segundo subgrupo de Gestión Electoral
      items: [
        { id: 'logistica', label: 'Logística Día D', icon: '🚗', roles: ['admin', 'intendente'] },
        { id: 'choferes', label: 'Gestión de Choferes', icon: '📇', roles: ['admin', 'intendente'] },
        { id: 'escrutinio_dia_d', label: 'Escrutinio Día D', icon: '🗳️', roles: ['admin', 'intendente', 'concejal'] },
      ]
    },
    {
      title: "Extras",
      items: [
        { id: 'padron_plra', label: 'Padrón PLRA', icon: '🔵', roles: ['admin', 'intendente', 'concejal'] },
        { id: 'inteligencia_territorial', label: 'Inteligencia Territorial', icon: '🧠', roles: ['admin', 'intendente', 'concejal'] },
        { id: 'financiamiento', label: 'Financiamiento Político', icon: '⚖️', roles: ['admin', 'intendente', 'concejal'] },
      ]
    },
    {
      title: "Administración",
      items: [
        { id: 'usuarios', label: user.rol === 'admin' ? 'Gestión de Usuarios' : 'Mi Equipo', icon: '👤', roles: ['admin', 'intendente', 'concejal'] },
        { id: 'auditoria', label: 'Auditoría', icon: '📊', roles: ['admin'] },
        { id: 'backup', label: 'Sistema de Backup', icon: '🔄', roles: ['admin'] },
      ]
    }
  ];

  return (
    <div className="app-container">
      <CabeceradePagina
        user={user}
        onLogout={onLogout}
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
              onClick={() => window.open('/ficha_tecnica_sistema.html', '_blank')}
            >
              <span className="icon">📄</span>
              {!sidebarCollapsed && <span className="label">Ficha del Sistema</span>}
            </button>
          </div>
        </aside>

        <main className="main-content">
          <div className="fade-in">
            {tab === "usuarios" && ['admin', 'intendente', 'concejal'].includes(user.rol) && <UserManagement user={user} />}
            {tab === "auditoria" && user.rol === 'admin' && <AuditSystem />}
            {tab === "backup" && user.rol === 'admin' && <BackupSystem />}
            {tab === "captacion" && ['admin', 'intendente', 'concejal', 'referente'].includes(user.rol) && <VoterRegistration user={user} />}
            {tab === "tablero" && ['admin', 'intendente', 'concejal', 'referente'].includes(user.rol) && <CandidateDashboard user={user} />}
            {tab === "actividades" && ['admin', 'intendente', 'concejal'].includes(user.rol) && <ActivitiesManagement user={user} />}
            {tab === "geografia" && ['admin', 'intendente', 'concejal'].includes(user.rol) && <GeoDashboard user={user} />}
            {tab === "analisis_historico" && ['admin', 'intendente', 'concejal'].includes(user.rol) && <HistoricalAnalysis user={user} />}
            {tab === "padron_impresion" && ['admin', 'intendente', 'concejal', 'referente'].includes(user.rol) && <PadronImpresion user={user} />}
            {tab === "logistica" && ['admin', 'intendente'].includes(user.rol) && <LogisticaControlPanel user={user} />}
            {tab === "choferes" && ['admin', 'intendente'].includes(user.rol) && <ChoferGestion user={user} />}
            {tab === "padron_plra" && ['admin', 'intendente', 'concejal'].includes(user.rol) && <PlraPadronConsult />}
            {tab === "inteligencia_territorial" && ['admin', 'intendente', 'concejal'].includes(user.rol) && <InteligenciaTerritorial user={user} />}
            {tab === "financiamiento" && ['admin', 'intendente', 'concejal'].includes(user.rol) && <FinanciamientoPolitico user={user} />}
            {tab === "escrutinio_dia_d" && ['admin', 'intendente', 'concejal'].includes(user.rol) && <EscrutinioDiaD user={user} />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
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
    return <div className="loading-screen"><div className="loader">Cargando SIGEL...</div></div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage user={user} />} />
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />}
        />
        <Route
          path="/dashboard"
          element={user ? <MainDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
        />
        <Route path="/candidato/:slug" element={<CandidatePublicPage />} />
        <Route path="/chofer/:token" element={<ChoferTracking />} />
        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
