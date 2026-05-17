'use client';

const TIPO_CONFIG: Record<string, { icon: string; title: string; className: string }> = {
  inicio_turno:  { icon: '▶️', title: 'Turno iniciado',   className: 'inicio' },
  aviso_5min:    { icon: '⏰', title: '5 minutos restantes', className: 'aviso_5min' },
  fin_turno:     { icon: '🏁', title: 'Turno finalizado',  className: 'fin_turno' },
  manual:        { icon: '📢', title: 'Anuncio manual',    className: 'manual' },
};

interface AnnouncementToastProps {
  announcement: {
    id: number;
    tipo: string;
    text: string;
    payload?: any;
  };
  onClose: () => void;
}

export default function AnnouncementToast({ announcement, onClose }: AnnouncementToastProps) {
  const config = TIPO_CONFIG[announcement.tipo] || { icon: '🔔', title: 'Notificación', className: '' };

  return (
    <div className={`announcement-toast ${config.className}`}>
      <div className="toast-icon">{config.icon}</div>
      <div className="toast-content">
        <div className="toast-title">{config.title}</div>
        <div className="toast-text">{announcement.text}</div>
        {announcement.payload?.cancha_nombre && (
          <div style={{ fontSize: 11, marginTop: 4, opacity: 0.6 }}>
            📍 {announcement.payload.cancha_nombre}
          </div>
        )}
      </div>
      <button className="toast-close" onClick={onClose}>✕</button>
    </div>
  );
}
