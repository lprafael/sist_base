'use client';

import { formatHour, formatDateLong, formatGs } from '@/lib/utils';

interface HeaderProps {
  complejo: any;
  fecha: string;
  onFechaChange: (f: string) => void;
  isConnected: boolean;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onAnuncioManual: (texto: string) => void;
  onViewChange: (v: 'grid' | 'tournaments' | 'users' | 'catalogos') => void;
  currentView: 'grid' | 'tournaments' | 'users' | 'catalogos';
}

export default function Header({
  complejo, fecha, onFechaChange, isConnected,
  audioEnabled, onToggleAudio, onAnuncioManual,
  onViewChange, currentView
}: HeaderProps) {
  const irHoy = () => onFechaChange(new Date().toISOString().split('T')[0]);

  const cambiarDia = (offset: number) => {
    const d = new Date(fecha + 'T12:00:00');
    d.setDate(d.getDate() + offset);
    onFechaChange(d.toISOString().split('T')[0]);
  };

  const handleAnuncioRapido = (texto: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(texto);
      u.lang = 'es-ES'; // Using a more standard variant often yields better voices
      u.rate = 0.95;
      u.pitch = 1.0;
      
      const voices = window.speechSynthesis.getVoices();
      // Busca voces de Google (Chrome), Microsoft Natural (Edge), o al menos alguna en español
      const naturalVoice = voices.find(v => v.lang.startsWith('es') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Microsoft Elena'))) || voices.find(v => v.lang.startsWith('es'));
      
      if (naturalVoice) {
        u.voice = naturalVoice;
      }

      window.speechSynthesis.speak(u);
    }
    onAnuncioManual(texto);
  };

  return (
    <header className="admin-header">
      {/* Logo */}
      <div className="header-logo">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="14" fill="#00D084" opacity="0.15"/>
          <path d="M7 14C7 10.134 10.134 7 14 7s7 3.134 7 7-3.134 7-7 7-7-3.134-7-7z" stroke="#00D084" strokeWidth="1.5"/>
          <path d="M10 14h8M14 10v8" stroke="#00D084" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Mi<span>Cancha</span>
      </div>

      {/* Nombre del complejo */}
      {complejo && (
        <div className="header-complejo">
          🏟️ {complejo.nombre}
        </div>
      )}

      {/* Switcher de Vista */}
      <div className="view-switcher" style={{ display: 'flex', gap: '8px', marginLeft: '20px' }}>
        <button 
          className={`btn ${currentView === 'grid' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => onViewChange('grid')}
          style={{ fontSize: 13, padding: '8px 16px' }}
        >
          📅 Grilla
        </button>
        <button 
          className={`btn ${currentView === 'tournaments' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => onViewChange('tournaments')}
          style={{ fontSize: 13, padding: '8px 16px' }}
        >
          🏆 Torneos
        </button>
        <button 
          className={`btn ${currentView === 'users' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => onViewChange('users')}
          style={{ fontSize: 13, padding: '8px 16px' }}
        >
          👥 Usuarios
        </button>
        <button 
          className={`btn ${currentView === 'catalogos' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => onViewChange('catalogos')}
          style={{ fontSize: 13, padding: '8px 16px' }}
        >
          📖 Catálogos
        </button>
      </div>

      {/* Navegación de fecha */}
      <div className="header-actions" style={{ flex: 1, justifyContent: 'center', visibility: currentView === 'grid' ? 'visible' : 'hidden' }}>
        <div className="date-nav">
          <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => cambiarDia(-1)}>
            ◀
          </button>
          <input
            type="date"
            value={fecha}
            onChange={e => onFechaChange(e.target.value)}
          />
          <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => cambiarDia(1)}>
            ▶
          </button>
        </div>
        <button className="btn btn-secondary" onClick={irHoy} style={{ fontSize: 12 }}>
          Hoy
        </button>
      </div>

      {/* Acciones */}
      <div className="header-actions">
        {/* Botones de anuncio rápido */}
        <button
          className="btn btn-secondary"
          title="Test de altavoces"
          style={{ fontSize: 12 }}
          onClick={() => handleAnuncioRapido('Prueba de altavoces. El sistema de anuncios está funcionando correctamente.')}
        >
          🔊 Test
        </button>

        {/* Toggle audio */}
        <button
          className={`btn ${audioEnabled ? 'btn-primary' : 'btn-secondary'}`}
          onClick={onToggleAudio}
          title={audioEnabled ? 'Desactivar audio' : 'Activar audio'}
        >
          {audioEnabled ? '🔊' : '🔇'}
        </button>

        {/* Indicador WS */}
        <div className="ws-indicator">
          <div className={`ws-dot ${isConnected ? 'connected' : ''}`} />
          {isConnected ? 'En línea' : 'Reconectando...'}
        </div>
      </div>
    </header>
  );
}
