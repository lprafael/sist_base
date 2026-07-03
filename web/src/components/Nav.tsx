'use client';

interface NavProps { scrolled: boolean; }

export default function Nav({ scrolled }: NavProps) {
  return (
    <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-logo">
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <circle cx="13" cy="13" r="13" fill="#16a34a" opacity="0.15"/>
          <path d="M6 13C6 9.134 9.134 6 13 6s7 3.134 7 7-3.134 7-7 7-7-3.134-7-7z" stroke="#16a34a" strokeWidth="1.5"/>
          <path d="M9 13h8M13 9v8" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Mi<span>Cancha</span>
      </div>

      <div className="nav-links">
        <a href="/buscar" className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 800, color: '#16a34a' }}>
          🗺️ Buscar en Mapa
        </a>
        <a href="#canchas" className="nav-link">Lista Canchas</a>
        <a href="/MANUAL_USUARIO_TORNEOS.html" target="_blank" rel="noopener noreferrer" className="nav-link">Cómo funciona</a>
        <a href="/torneos" className="nav-link">Torneos (Fútbol)</a>
        <a href="/torneos-generales" className="nav-link">Torneos Generales</a>
        <a href="/mundial" className="nav-link" style={{ fontWeight: 600, color: '#eab308' }}>🏆 Mundial 2026</a>
      </div>

      <div className="nav-actions">
        <a href="/admin" className="btn btn-outline btn-sm">
          Consola Clubes
        </a>
        <a href="/login" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          Ingresar
        </a>
      </div>
    </nav>
  );
}
