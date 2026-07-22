'use client';
import { useEffect, useState } from 'react';

interface NavProps { scrolled: boolean; }

export default function Nav({ scrolled }: NavProps) {
  const [session, setSession] = useState<any>(null);
  const [showLoginMenu, setShowLoginMenu] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('user_session');
    if (raw) {
      try {
        setSession(JSON.parse(raw));
      } catch (e) {}
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user_session');
    window.location.href = '/login';
  };

  return (
    <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
      <a href="/" className="nav-logo" style={{ textDecoration: 'none', cursor: 'pointer' }}>
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <circle cx="13" cy="13" r="13" fill="#16a34a" opacity="0.15"/>
          <path d="M6 13C6 9.134 9.134 6 13 6s7 3.134 7 7-3.134 7-7 7-7-3.134-7-7z" stroke="#16a34a" strokeWidth="1.5"/>
          <path d="M9 13h8M13 9v8" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Mi<span>Cancha</span>
      </a>

      <div className="nav-links">
        <a href="/buscar" className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 800, color: '#16a34a' }}>
          🗺️ Buscar en Mapa
        </a>
        <a href="#canchas" className="nav-link">Lista Canchas</a>
        <a href="/MANUAL_USUARIO_TORNEOS.html" target="_blank" rel="noopener noreferrer" className="nav-link">Cómo funciona</a>
        <a href="/torneos" className="nav-link">Torneos</a>
        <a href="/academias" className="nav-link">🎓 Academias</a>
      </div>

      <div className="nav-actions">
        {session ? (
          <>
            {session.role === 'academia' || session.academia_id ? (
              <a href="/academia-panel" className="btn btn-outline btn-sm">
                Panel Academia
              </a>
            ) : session.role === 'complejo' || session.complejo_id ? (
              <a href="/complejo-panel" className="btn btn-outline btn-sm">
                Panel Complejo
              </a>
            ) : session.role === 'organizador' ? (
              <a href="/admin-futbol/campeonatos" className="btn btn-outline btn-sm">
                Panel Torneos
              </a>
            ) : (
              <a href="/admin" className="btn btn-outline btn-sm">
                Consola Clubes
              </a>
            )}

            <button onClick={handleLogout} className="btn btn-primary btn-sm" style={{ border: 'none', cursor: 'pointer' }}>
              Salir
            </button>
          </>
        ) : (
          <div style={{ position: 'relative' }} onMouseLeave={() => setShowLoginMenu(false)}>
            <button
              onClick={() => setShowLoginMenu(v => !v)}
              onMouseEnter={() => setShowLoginMenu(true)}
              className="btn btn-primary btn-sm"
              style={{ border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              Ingresar
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                style={{ transform: showLoginMenu ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {showLoginMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, paddingTop: 8, zIndex: 1000 }}>
                <div style={{
                  background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 16, padding: 8, minWidth: 230,
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                  display: 'flex', flexDirection: 'column', gap: 3,
                  animation: 'navDropIn 0.15s ease-out'
                }}>
                <p style={{ padding: '4px 12px 8px', fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 2, margin: 0, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 8 }}>
                  Seleccioná tu portal
                </p>

                <a href="/complejo/login" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, textDecoration: 'none', transition: 'background 0.15s' }}
                  onMouseOver={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.15)')}
                  onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  </div>
                  <div><p style={{ margin: 0, color: '#e2e8f0', fontWeight: 700, fontSize: 13 }}>Complejo Deportivo</p><p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Canchas & Administración</p></div>
                </a>

                <a href="/torneos/login" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, textDecoration: 'none', transition: 'background 0.15s' }}
                  onMouseOver={e => (e.currentTarget.style.background = 'rgba(5,150,105,0.15)')}
                  onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#059669,#047857)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
                  </div>
                  <div><p style={{ margin: 0, color: '#e2e8f0', fontWeight: 700, fontSize: 13 }}>Torneos</p><p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Organizadores & Veedores</p></div>
                </a>

                <a href="/academias/login" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, textDecoration: 'none', transition: 'background 0.15s' }}
                  onMouseOver={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.15)')}
                  onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                  </div>
                  <div><p style={{ margin: 0, color: '#e2e8f0', fontWeight: 700, fontSize: 13 }}>Academia Deportiva</p><p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Alumnos, cuotas & más</p></div>
                </a>

                <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '4px 10px' }} />

                <a href="/login" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, textDecoration: 'none', transition: 'background 0.15s' }}
                  onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                  </div>
                  <div><p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontWeight: 600, fontSize: 13 }}>Jugadores / Acceso general</p><p style={{ margin: 0, color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>Con Google o usuario</p></div>
                </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes navDropIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </nav>
  );
}
