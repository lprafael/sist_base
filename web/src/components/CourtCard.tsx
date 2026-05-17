'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface CourtCardProps {
  cancha: any;
  sportIcon: string;
  onReservar: () => void;
}

const BG_COLORS: Record<string, string> = {
  '#3B82F6': 'linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)',
  '#10B981': 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
  '#F59E0B': 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
  '#EF4444': 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
  '#7C3AED': 'linear-gradient(135deg, #6D28D9 0%, #7C3AED 100%)',
};

function formatGs(amount: number): string {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency', currency: 'PYG',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);
}

export default function CourtCard({ cancha, sportIcon, onReservar }: CourtCardProps) {
  const bg = BG_COLORS[cancha.color] || 'linear-gradient(135deg, #1A2236 0%, #2D3F55 100%)';

  return (
    <div className="court-card">
      {/* Banner */}
      <div className="court-card-banner" style={{ background: bg }}>
        <span className="court-card-sport-icon">{sportIcon}</span>
        <div className="court-card-sport-badge">{cancha.deporte}</div>
        <div className="court-card-available">✓ Disponible</div>
      </div>

      {/* Body */}
      <div className="court-card-body">
        <div className="court-card-name">{cancha.nombre}</div>
        <div className="court-card-complejo">
          📍 {cancha.complejo_nombre || 'Complejo'} · {cancha.complejo_ciudad || 'Asunción'}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {cancha.superficie && (
            <span className="tag">{cancha.superficie}</span>
          )}
          {cancha.dimensiones && (
            <span className="tag">{cancha.dimensiones}</span>
          )}
        </div>

        <div className="court-card-info">
          <div>
            <div className="court-card-price">
              {formatGs(cancha.precio_hora)}
              <span>/hora</span>
            </div>
            {cancha.precio_hora_nocturna && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Nocturno: {formatGs(cancha.precio_hora_nocturna)}/h
              </div>
            )}
          </div>
          <button className="btn btn-primary btn-sm" onClick={onReservar}>
            Reservar
          </button>
        </div>
      </div>
    </div>
  );
}
