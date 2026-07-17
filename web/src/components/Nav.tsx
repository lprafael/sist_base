'use client';
import { useEffect, useState } from 'react';

interface NavProps { scrolled: boolean; }

export default function Nav({ scrolled }: NavProps) {
  const [session, setSession] = useState<any>(null);

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
        <a href="/torneos" className="nav-link">Torneos (Fútbol)</a>
        <a href="/torneos-generales" className="nav-link">Torneos Generales</a>
        <a href="/academias" className="nav-link">🎓 Academias</a>
      </div>

      <div className="nav-actions">
        {session ? (
          <>
            {session.role === 'academia' || session.academia_id ? (
              <a href="/academia-panel" className="btn btn-outline btn-sm">
                Panel Academia
              </a>
            ) : session.role === 'organizador' ? (
              <a href={session.tipo_torneo === 'futbol' ? "/admin-futbol/campeonatos" : "/admin-generales"} className="btn btn-outline btn-sm">
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
          <>
            <a href="/admin" className="btn btn-outline btn-sm">
              Consola Clubes
            </a>
            <a href="/login" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              Ingresar
            </a>
          </>
        )}
      </div>
    </nav>
  );
}
