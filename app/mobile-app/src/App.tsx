import React, { useState, useEffect } from 'react';
import { 
  Menu, Search, MessageSquare, User, HelpCircle, 
  MoreVertical, Copy, Share2, Globe, Flag,
  ChevronLeft, Trophy, ListTodo, Users, LayoutTemplate,
  Plus, BarChart2, Image as ImageIcon
} from 'lucide-react';
import './App.css';

const defaultOrganizadores = [
  { id: 1, name: 'Comité de Deportes - Exa CTN', img: 'https://placehold.co/100x100/e2e8f0/1e3a8a?text=CTN' },
  { id: 2, name: 'Luis130879', img: 'https://placehold.co/100x100/e2e8f0/1e3a8a?text=CVD' },
];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8002';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home'); // home, admin_campeonatos, torneo_detail
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  
  // Navigation State for Admin/Torneo
  const [selectedTorneoId, setSelectedTorneoId] = useState<string | null>(null);

  return (
    <div className="app-container">
      {currentScreen === 'home' && (
        <HomeScreen 
          openSidebar={() => setIsSidebarOpen(true)} 
          openLogin={() => setIsLoginOpen(true)}
        />
      )}
      
      {currentScreen === 'admin_campeonatos' && (
        <AdminLayout 
          goHome={() => setCurrentScreen('home')}
          openTorneo={(id) => {
            setSelectedTorneoId(id);
            setCurrentScreen('torneo_detail');
          }}
        />
      )}

      {currentScreen === 'torneo_detail' && (
        <TorneoDetailScreen 
          torneoId={selectedTorneoId!}
          goBack={() => setCurrentScreen('admin_campeonatos')}
        />
      )}

      {/* Overlays */}
      {isSidebarOpen && (
        <Sidebar 
          close={() => setIsSidebarOpen(false)} 
          goToMisCampeonatos={() => {
            setCurrentScreen('admin_campeonatos');
            setIsSidebarOpen(false);
          }}
        />
      )}
      
      {isLoginOpen && (
        <LoginModal close={() => setIsLoginOpen(false)} />
      )}
    </div>
  );
}

function HomeScreen({ openSidebar, openLogin }: { openSidebar: () => void, openLogin: () => void }) {
  const [organizadores, setOrganizadores] = useState(defaultOrganizadores);

  useEffect(() => {
    fetch(`${API_URL}/api/organizadores`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) setOrganizadores(data);
      })
      .catch(err => console.log('Backend no respondió para organizadores:', err));
  }, []);

  return (
    <>
      <header className="header-home">
        <button className="header-icon" onClick={openSidebar}><Menu size={28} /></button>
        <div className="header-logo"><span style={{fontWeight: 'bold', fontSize: '20px'}}>🏆</span></div>
        <div className="header-actions">
          <button className="header-icon"><MessageSquare size={24} /></button>
          <button className="header-icon" onClick={openLogin}><User size={24} /></button>
        </div>
      </header>

      <div className="search-container">
        <div className="search-input-wrapper">
          <input type="text" placeholder="Campeonatos y organizadores" className="search-input" />
          <Search size={20} color="#1e3a8a" />
        </div>
      </div>

      <div className="tabs">
        <div className="tab active">REGIÓN</div>
        <div className="tab">EN LÍNEA</div>
      </div>

      <div className="content-scroll">
        <h2 className="section-title">Organizadores</h2>
        <div className="grid-orgs">
          {organizadores.map((org: any) => (
            <div key={org.id} className="card-org">
              <img src={org.img || 'https://placehold.co/100x100'} alt={org.name} className="card-org-img" />
              <div className="card-org-name">{org.name}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* --- ADMIN LAYOUT (BOTTOM SHEET) --- */
function AdminLayout({ goHome, openTorneo }: { goHome: () => void, openTorneo: (id: string) => void }) {
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header className="header-green">
        <button onClick={goHome} style={{background: 'none', border: 'none', color: 'white'}}><ChevronLeft size={28} /></button>
        <div className="header-green-title">Panel de Organizador</div>
        <div style={{display: 'flex', gap: 16}}><HelpCircle size={24} /></div>
      </header>

      <div className="content-scroll" style={{ padding: 0, position: 'relative' }}>
        <AdminCampeonatosPage openTorneo={openTorneo} />
      </div>

      {/* Tab/Solapa para abrir la página del organizador */}
      <div 
        className="organizador-tab-handle"
        onClick={() => setIsBottomSheetOpen(true)}
      >
        <div className="handle-bar"></div>
        Página del organizador
      </div>

      {/* El Bottom Sheet desplegable */}
      <div className={`bottom-sheet ${isBottomSheetOpen ? 'open' : ''}`}>
        <div className="bottom-sheet-header" onClick={() => setIsBottomSheetOpen(false)}>
          <div className="handle-bar"></div>
          <div style={{fontWeight: 'bold', fontSize: '18px'}}>Página del organizador</div>
          <button className="close-btn" onClick={(e) => { e.stopPropagation(); setIsBottomSheetOpen(false); }}>
            <ChevronLeft size={24} style={{transform: 'rotate(-90deg)'}} />
          </button>
        </div>
        <div className="bottom-sheet-content">
          <div style={{padding: '20px'}}>
            <h3 style={{marginTop: 0, color: 'var(--blue-dark)'}}>Configuración de Perfil</h3>
            <p style={{color: 'var(--text-muted)'}}>
              Aquí puedes modificar tus datos como Organizador, tu banner, redes sociales y más.
            </p>
            
            <input type="text" placeholder="Nombre de la Organización" className="input-field" />
            <input type="text" placeholder="Teléfono" className="input-field" />
            
            <button className="btn-login" style={{marginTop: '16px'}}>Guardar Cambios</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- CAMPEONATOS PAGE --- */
function AdminCampeonatosPage({ openTorneo }: { openTorneo: (id: string) => void }) {
  const [torneos, setTorneos] = useState<any[]>([
    { id: '1', nombre: 'Copa Verano 2026', tipo_campeonato: 'Liga', deporte: 'Fútbol 5' }
  ]);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('user_session') || '{}');
    const token = session.access_token || session.token || '';

    fetch(`${API_URL}/futbol/torneos`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0 && !data.detail) {
          setTorneos(data);
        }
      })
      .catch(err => console.log('Backend no respondió para torneos:', err));
  }, []);

  return (
    <div style={{ paddingBottom: '80px' }}>
      <div style={{ padding: '16px', background: '#f1f5f9', fontWeight: 'bold' }}>Mis Campeonatos</div>
      
      {torneos.map(t => (
        <div key={t.id} className="camp-list-item" onClick={() => openTorneo(t.id)}>
          <img src="https://placehold.co/100x100/334155/ffffff?text=C" alt="Camp" className="camp-list-img" />
          <div className="camp-list-info">
            <div className="camp-title">{t.nombre}</div>
            <div className="camp-subtitle">{t.deporte} - {t.tipo_campeonato}</div>
          </div>
          <ChevronLeft size={20} color="#cbd5e1" style={{ transform: 'rotate(180deg)' }} />
        </div>
      ))}

      <button className="fab">
        <Plus size={28} />
      </button>
    </div>
  );
}

/* --- TOURNAMENT DETAILS (TOP TABS) --- */
function TorneoDetailScreen({ torneoId, goBack }: { torneoId: string, goBack: () => void }) {
  const [activeTab, setActiveTab] = useState('clasificacion');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <header className="header-green">
        <button onClick={goBack} style={{background: 'none', border: 'none', color: 'white'}}><ChevronLeft size={28} /></button>
        <div className="header-green-title">Torneo {torneoId}</div>
        <div style={{display: 'flex', gap: 16}}><Share2 size={24} /></div>
      </header>

      {/* Top Tabs (Replaces SidebarTorneo) */}
      <div className="top-tabs-container">
        <div className={`top-tab ${activeTab === 'inicio' ? 'active' : ''}`} onClick={() => setActiveTab('inicio')}>Inicio</div>
        <div className={`top-tab ${activeTab === 'clasificacion' ? 'active' : ''}`} onClick={() => setActiveTab('clasificacion')}>Partidos y Clasificación</div>
        <div className={`top-tab ${activeTab === 'rankings' ? 'active' : ''}`} onClick={() => setActiveTab('rankings')}>Rankings</div>
        <div className={`top-tab ${activeTab === 'multimedia' ? 'active' : ''}`} onClick={() => setActiveTab('multimedia')}>Multimedia</div>
      </div>

      <div className="content-scroll" style={{ padding: 0 }}>
        {activeTab === 'clasificacion' ? (
          <ClasificacionView torneoId={torneoId} />
        ) : (
          <div style={{padding: 20, textAlign: 'center'}}>Contenido de {activeTab}...</div>
        )}
      </div>
    </div>
  );
}

/* --- CLASIFICACION VIEW (RESPONSIVE TABLE) --- */
function ClasificacionView({ torneoId }: { torneoId: string }) {
  const [standings, setStandings] = useState<any[]>([
    { nombre: 'Equipo A', pj: 3, pg: 2, pe: 1, pp: 0, gf: 5, gc: 2, pts: 7 },
    { nombre: 'Equipo B', pj: 3, pg: 1, pe: 1, pp: 1, gf: 3, gc: 3, pts: 4 },
    { nombre: 'Equipo C', pj: 3, pg: 0, pe: 0, pp: 3, gf: 1, gc: 4, pts: 0 },
  ]);

  useEffect(() => {
    // Simulando fetch de Partidos y calculando la tabla
    fetch(`${API_URL}/cancha/torneos/${torneoId}/partidos`)
      .then(res => res.json())
      .then(data => {
        // Compute logic here si la API devuelve data válida
        console.log("Partidos obtenidos:", data);
      })
      .catch(err => console.log('Backend no respondió para clasificacion:', err));
  }, [torneoId]);

  return (
    <div>
      <div style={{ padding: '16px', fontWeight: 'bold', fontSize: '18px', color: 'var(--blue-dark)' }}>
        Fase 1 - Posiciones
      </div>
      
      <div className="table-container">
        <table className="clasificacion-table">
          <thead>
            <tr>
              <th>Equipo</th>
              <th>PJ</th>
              <th>PG</th>
              <th>PE</th>
              <th>PP</th>
              <th>GF</th>
              <th>GC</th>
              <th className="pts-col">PTS</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr key={i}>
                <td>{i+1}. {s.nombre}</td>
                <td>{s.pj}</td>
                <td>{s.pg}</td>
                <td>{s.pe}</td>
                <td>{s.pp}</td>
                <td>{s.gf}</td>
                <td>{s.gc}</td>
                <td className="pts-col">{s.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
        <BarChart2 size={16} style={{display:'inline', verticalAlign:'text-bottom'}}/> Desliza la tabla horizontalmente para ver más detalles.
      </div>
    </div>
  );
}

/* --- PREVIOUS COMPONENTS --- */

function Sidebar({ close, goToMisCampeonatos }: { close: () => void, goToMisCampeonatos: () => void }) {
  return (
    <div className="sidebar-overlay" onClick={close}>
      <div className="sidebar" onClick={e => e.stopPropagation()}>
        <div className="sidebar-header">
          <div className="sidebar-user">
            <div style={{ position: 'relative' }}>
              <img src="https://placehold.co/100x100/e2e8f0/1e3a8a?text=RL" alt="User" style={{borderRadius:'50%', width:50}} />
              <div style={{ position: 'absolute', bottom: -5, right: -5, background: 'white', borderRadius: '50%', padding: 2 }}>
                <Flag size={16} color="red" />
              </div>
            </div>
            <div style={{fontSize: 18, fontWeight: 'bold'}}>Rafael López Ibarra</div>
          </div>
        </div>
        <div className="content-scroll" style={{ padding: 0 }}>
          <div className="sidebar-section">
            <h3>Campeonatos</h3>
            <div className="sidebar-item" onClick={goToMisCampeonatos}>🏆 Panel de Administrador</div>
            <div className="sidebar-item">🔖 Campeonatos que sigo</div>
            <div className="sidebar-item">👥 Organizadores que sigo</div>
          </div>
          <div className="sidebar-section">
            <h3>Ayuda</h3>
            <div className="sidebar-item">📧 Contacto</div>
            <div className="sidebar-item">▶️ Youtube</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginModal({ close }: { close: () => void }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usuario, password: password })
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('user_session', JSON.stringify({
          access_token: data.access_token,
          token: data.access_token
        }));
        alert('Login exitoso!');
        close();
      } else {
        alert('Credenciales incorrectas o backend apagado.');
      }
    } catch (error) {
      alert('Error de conexión con el backend: ' + API_URL);
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">Login</div>
        <div className="modal-body">
          <input type="text" placeholder="Usuario" className="input-field" value={usuario} onChange={e => setUsuario(e.target.value)} />
          <input type="password" placeholder="Contraseña" className="input-field" value={password} onChange={e => setPassword(e.target.value)} />
          <div className="modal-actions">
            <a href="#" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Nueva cuenta</a>
            <button className="btn-login" onClick={handleLogin} disabled={loading}>{loading ? '...' : 'Login'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
