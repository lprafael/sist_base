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
import VeedorGestion from "./components/VeedorGestion.jsx";
import VeedorLocalPanel from "./components/VeedorLocalPanel.jsx";
import InteligenciaTerritorial from "./components/InteligenciaTerritorial.jsx";
import FinanciamientoPolitico from "./components/FinanciamientoPolitico.jsx";
import EscrutinioDiaD from "./components/EscrutinioDiaD.jsx";
import ChoferScanner from "./components/ChoferScanner.jsx";
import EleccionesManagement from "./components/EleccionesManagement.jsx";
import PadronImport from "./components/PadronImport.jsx";

// Helper global para identificar el rol de forma robusta
const getSafeRole = (user) => {
  if (!user) return null;
  return (user.rol || user.role || "").toLowerCase().trim();
};

const TermsAcceptanceModal = ({ onAccept, onLogout }) => {
  return (
    <div className="modal-overlay terminos-overlay" style={{ zIndex: 3000 }}>
      <div className="modal fade-in" style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h3>📜 Términos de Uso y Confidencialidad</h3>
        </div>
        <div className="modal-body" style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto', textAlign: 'left', lineHeight: '1.6' }}>
          <p>Bienvenido al <strong>Sistema Integral de Gestión Electoral (SIGEL)</strong>. Para continuar, debe aceptar los siguientes términos sobre el uso de la información:</p>
          
          <section style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#1e3a8a' }}>1. Confidencialidad de la Información</h4>
            <p>Toda la información contenida en este sistema, incluyendo datos de votantes, números de cédula, ubicaciones y preferencias políticas, tiene carácter <strong>estrictamente confidencial</strong>. Usted se compromete a no divulgar, copiar, publicar ni transferir estos datos a personas ajenas a la organización política autorizada.</p>
          </section>

          <section style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#1e3a8a' }}>2. Uso Adecuado de los Datos</h4>
            <p>El uso de la base de datos es exclusivamente para fines de coordinación logística y comunicación política legítima. Queda prohibido el uso de esta información para fines comerciales, de acoso, o cualquier actividad que vulnere la integridad de las personas o las leyes electorales vigentes.</p>
          </section>

          <section style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#1e3a8a' }}>3. Responsabilidad Personal</h4>
            <p>Usted es responsable de la custodia de sus credenciales de acceso. Cualquier acción realizada con su usuario será atribuida a su persona. El sistema registra cada acceso y acción realizada para fines de auditoría.</p>
          </section>

          <section style={{ border: '1px solid #fee2e2', padding: '15px', borderRadius: '8px', background: '#fef2f2' }}>
            <p style={{ margin: 0, fontWeight: 'bold', color: '#dc2626' }}>⚠️ AVISO LEGAL: La vulneración de la confidencialidad de datos personales puede acarrear sanciones legales civiles y penales según la legislación vigente.</p>
          </section>
        </div>
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', borderTop: '1px solid #eee' }}>
          <button onClick={onLogout} className="btn-secondary" style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>No Acepto / Salir</button>
          <button onClick={onAccept} className="btn-primary" style={{ background: '#1e3a8a', color: 'white', border: 'none', padding: '10px 30px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>ACEPTO LOS TÉRMINOS</button>
        </div>
      </div>
    </div>
  );
};

const PasswordChangeModal = ({ onClose }) => {
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setError("La nueva contraseña y la confirmación no coinciden.");
      return;
    }
    if (passwords.new.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setIsSubmitting(true);
    try {
      const API_URL = import.meta.env.VITE_REACT_APP_API_URL || '/api';
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: passwords.current,
          new_password: passwords.new
        })
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess("Contraseña cambiada exitosamente.");
        setTimeout(() => onClose(), 2000);
      } else {
        setError(data.detail || "Error al cambiar la contraseña.");
      }
    } catch (err) {
      setError("Error de conexión con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 3001 }}>
      <div className="modal" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3>🔐 Cambiar Contraseña</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Contraseña Actual:</label>
            <input
              type="password"
              name="current"
              value={passwords.current}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Nueva Contraseña:</label>
            <input
              type="password"
              name="new"
              value={passwords.new}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Confirmar Nueva Contraseña:</label>
            <input
              type="password"
              name="confirm"
              value={passwords.confirm}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>
          
          {error && <div style={{ color: '#dc2626', fontSize: '0.9rem', marginBottom: '10px' }}>{error}</div>}
          {success && <div style={{ color: '#16a34a', fontSize: '0.9rem', marginBottom: '10px' }}>{success}</div>}
          
          <div className="modal-footer" style={{ borderTop: 'none', padding: '10px 0 0 0' }}>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isSubmitting}
              style={{ width: '100%', padding: '10px', background: '#1e3a8a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              {isSubmitting ? "Cambiando..." : "Actualizar Contraseña"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

function MobileBottomNav({ tab, setTab, user, menuGroups, onLogout }) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const userRole = getSafeRole(user);

  const quickItems = [
    { id: 'captacion', label: 'Captación', icon: '🗳️' },
    { id: 'tablero',   label: 'Tablero',   icon: '📈' },
    { id: 'logistica', label: 'Logística', icon: '🚗', roles: ['admin','candidato_principal', 'equipo_electoral'] },
  ].filter(item => !item.roles || item.roles.includes(userRole));

  const handleQuickNav = (id) => {
    setTab(id);
    setDrawerOpen(false);
  };

  return (
    <>
      {drawerOpen && (
        <div className="mobile-overlay" onClick={() => setDrawerOpen(false)} />
      )}
      {drawerOpen && (
        <div className="mobile-menu-drawer">
          <div className="mobile-drawer-handle" />
          {menuGroups.map((group, gi) => {
            const visible = group.items.filter(i => i.roles.includes(userRole));
            if (!visible.length) return null;
            return (
              <div className="mobile-drawer-section" key={gi}>
                <div className="mobile-drawer-section-title">{group.title}</div>
                {visible.map(item => (
                  <button
                    key={item.id}
                    className={`mobile-drawer-item${tab === item.id ? ' active' : ''}`}
                    onClick={() => { setTab(item.id); setDrawerOpen(false); }}
                  >
                    <span className="drawer-icon">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            );
          })}
          <div className="mobile-drawer-section">
            <button className="mobile-drawer-item" onClick={onLogout} style={{ color: '#ef4444' }}>
              <span className="drawer-icon">🚪</span>
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
      <nav className="mobile-bottom-nav">
        {quickItems.map(item => (
          <button
            key={item.id}
            className={`mobile-nav-item${tab === item.id ? ' active' : ''}`}
            onClick={() => handleQuickNav(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
        <button
          className={`mobile-nav-item${drawerOpen ? ' active' : ''}`}
          onClick={() => setDrawerOpen(o => !o)}
        >
          <span className="nav-icon">☰</span>
          Menú
        </button>
      </nav>
    </>
  );
}

function CabeceradePagina({ user, onLogout, onChangePassword, onToggleSidebar, isSidebarCollapsed }) {
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
              {(() => {
                const role = getSafeRole(user);
                return role === 'admin' ? '🔑 Administrador' :
                  (role === 'candidato_principal' || role === 'intendente') ? '🏛️ Candidato Principal' :
                    (role === 'equipo_electoral' || role === 'concejal') ? '🏙️ Equipo Electoral' :
                      role === 'referente' ? '👥 Referente' : `Visualizador (${role || 'Sin Rol'})`;
              })()}
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
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={onChangePassword} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.9rem' }}>
              🔑 Cambiar Clave
            </button>
            <button onClick={onLogout} className="logout-btn">
              Cerrar Sesión
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function MainDashboard({ user, onLogout }) {
  const [tab, setTab] = useState("captacion");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
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

  const userRole = getSafeRole(user);

  const menuGroups = [
    {
      title: "Captación", 
      items: [
        { id: 'captacion', label: 'Cargar Simpatizantes', icon: '🗳️', roles: ['admin', 'candidato_principal', 'intendente', 'equipo_electoral', 'concejal', 'referente'] },
        { id: 'tablero', label: 'Mi Tablero', icon: '📈', roles: ['admin', 'candidato_principal', 'intendente', 'equipo_electoral', 'concejal', 'referente'] },
        { id: 'actividades', label: 'Actividades', icon: '🚩', roles: ['admin', 'candidato_principal', 'intendente', 'equipo_electoral', 'concejal'] },
        { id: 'geografia', label: 'Panel Georreferenciado', icon: '🗺️', roles: ['admin', 'candidato_principal', 'intendente', 'equipo_electoral', 'concejal'] },
        { id: 'analisis_historico', label: 'Análisis de Resultados', icon: '📊', roles: ['admin', 'candidato_principal', 'intendente', 'equipo_electoral', 'concejal'] },
        { id: 'padron_impresion', label: 'Impresión de Padrón', icon: '🖨️', roles: ['admin', 'candidato_principal', 'intendente', 'equipo_electoral', 'concejal', 'referente'] },
      ]
    },
    {
      title: "Logística", 
      items: [
        { id: 'logistica', label: 'Logística Día D', icon: '🚗', roles: ['admin', 'candidato_principal', 'intendente', 'equipo_electoral', 'concejal'] },
        { id: 'choferes', label: 'Gestión de Choferes', icon: '📇', roles: ['admin', 'candidato_principal', 'intendente', 'equipo_electoral', 'concejal'] },
        { id: 'veedores', label: 'Gestión de Veedores', icon: '👥', roles: ['admin', 'candidato_principal', 'intendente', 'equipo_electoral', 'concejal'] },
        { id: 'veedor_panel', label: 'Mi Mesa (Veedor)', icon: '📋', roles: ['admin', 'candidato_principal', 'intendente', 'equipo_electoral', 'concejal', 'referente'] },
        { id: 'escrutinio_dia_d', label: 'Escrutinio Día D', icon: '🗳️', roles: ['admin', 'candidato_principal', 'intendente', 'equipo_electoral', 'concejal'] },
      ]
    },
    {
      title: "Extras",
      items: [
        { id: 'padron_plra', label: 'Padrón PLRA', icon: '🔵', roles: ['admin', 'candidato_principal', 'intendente', 'equipo_electoral', 'concejal'] },
        { id: 'inteligencia_territorial', label: 'Inteligencia Territorial', icon: '🧠', roles: ['admin', 'candidato_principal', 'intendente', 'equipo_electoral', 'concejal'] },
        { id: 'financiamiento', label: 'Financiamiento Político', icon: '⚖️', roles: ['admin', 'candidato_principal', 'intendente', 'equipo_electoral', 'concejal'] },
      ]
    },
    {
      title: "Administración",
      items: [
        { id: 'usuarios', label: userRole === 'admin' ? 'Gestión de Usuarios' : 'Mi Equipo', icon: '👤', roles: ['admin', 'candidato_principal', 'intendente', 'equipo_electoral', 'concejal'] },
        { id: 'elecciones', label: 'Gestión de Elecciones', icon: '🗳️', roles: ['admin'] },
        { id: 'import_padron', label: 'Importar Padrón', icon: '📥', roles: ['admin'] },
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
        onChangePassword={() => setShowPasswordModal(true)}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        isSidebarCollapsed={sidebarCollapsed}
      />

      {showPasswordModal && <PasswordChangeModal onClose={() => setShowPasswordModal(false)} />}

      <div className="content-wrapper">
        <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <h2 style={{ display: sidebarCollapsed ? 'none' : 'block' }}>Menú Principal</h2>

          <nav className="sidebar-nav">
            {menuGroups.map((group, gIdx) => {
              const visibleItems = group.items.filter(item => item.roles.includes(userRole));
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
            {tab === "usuarios" && ['admin', 'candidato_principal', 'equipo_electoral'].includes(user.rol) && <UserManagement user={user} />}
            {tab === "auditoria" && user.rol === 'admin' && <AuditSystem />}
            {tab === "backup" && user.rol === 'admin' && <BackupSystem />}
            {tab === "elecciones" && user.rol === 'admin' && <EleccionesManagement user={user} />}
            {tab === "import_padron" && user.rol === 'admin' && <PadronImport user={user} />}
            {tab === "captacion" && ['admin', 'candidato_principal', 'equipo_electoral', 'referente'].includes(user.rol) && <VoterRegistration user={user} />}
            {tab === "tablero" && ['admin', 'candidato_principal', 'equipo_electoral', 'referente'].includes(user.rol) && <CandidateDashboard user={user} />}
            {tab === "actividades" && ['admin', 'candidato_principal', 'equipo_electoral'].includes(user.rol) && <ActivitiesManagement user={user} />}
            {tab === "geografia" && ['admin', 'candidato_principal', 'equipo_electoral'].includes(user.rol) && <GeoDashboard user={user} />}
            {tab === "analisis_historico" && ['admin', 'candidato_principal', 'equipo_electoral'].includes(user.rol) && <HistoricalAnalysis user={user} />}
            {tab === "padron_impresion" && ['admin', 'candidato_principal', 'equipo_electoral', 'referente'].includes(user.rol) && <PadronImpresion user={user} />}
            {tab === "logistica" && ['admin', 'candidato_principal', 'equipo_electoral'].includes(user.rol) && <LogisticaControlPanel user={user} />}
            {tab === "choferes" && ['admin', 'candidato_principal', 'equipo_electoral'].includes(user.rol) && <ChoferGestion user={user} />}
            {tab === "veedores" && ['admin', 'candidato_principal', 'equipo_electoral'].includes(user.rol) && <VeedorGestion user={user} />}
            {tab === "veedor_panel" && ['admin', 'candidato_principal', 'equipo_electoral', 'referente'].includes(user.rol) && <VeedorLocalPanel user={user} />}
            {tab === "padron_plra" && ['admin', 'candidato_principal', 'equipo_electoral'].includes(user.rol) && <PlraPadronConsult />}
            {tab === "inteligencia_territorial" && ['admin', 'candidato_principal', 'equipo_electoral'].includes(user.rol) && <InteligenciaTerritorial user={user} />}
            {tab === "financiamiento" && ['admin', 'candidato_principal', 'equipo_electoral'].includes(user.rol) && <FinanciamientoPolitico user={user} />}
            {tab === "escrutinio_dia_d" && ['admin', 'candidato_principal', 'equipo_electoral'].includes(user.rol) && <EscrutinioDiaD user={user} />}
          </div>
        </main>
      </div>
      <MobileBottomNav
        tab={tab}
        setTab={setTab}
        user={user}
        menuGroups={menuGroups}
        onLogout={onLogout}
      />
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
      const API_URL = import.meta.env.VITE_REACT_APP_API_URL || '/api';
      const token = localStorage.getItem('token');
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
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

  const handleAcceptTerms = async () => {
    try {
      const API_URL = import.meta.env.VITE_REACT_APP_API_URL || '/api';
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/auth/accept-terms`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const updatedUser = { ...user, terminos_aceptados: true };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        window.location.reload(); // Recargar para asegurar estado limpio
      } else {
        const errData = await res.json();
        alert("Error al guardar aceptación: " + (errData.detail || "Error desconocido"));
      }
    } catch (err) {
      console.error("Error al aceptar términos", err);
      alert("Error de conexión al servidor");
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
          element={
            user ? (
              <>
                {!user.terminos_aceptados && <TermsAcceptanceModal onAccept={handleAcceptTerms} onLogout={handleLogout} />}
                <MainDashboard user={user} onLogout={handleLogout} />
              </>
            ) : <Navigate to="/login" />
          }
        />
        <Route path="/candidato/:slug" element={<CandidatePublicPage />} />
        <Route path="/chofer/:token" element={<ChoferTracking />} />
        <Route path="/scan-chofer" element={<ChoferScanner />} />
        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
