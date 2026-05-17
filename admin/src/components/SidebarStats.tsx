'use client';

import { useMemo } from 'react';
import { formatGs, formatHour } from '@/lib/utils';

interface SidebarStatsProps {
  stats: { totalReservas: number; ingresos: number; canchasActivas: number; ocupacion: number };
  canchas: any[];
  reservas: any[];
}

export default function SidebarStats({ stats, canchas, reservas }: SidebarStatsProps) {
  // Reservas por cancha
  const reservasPorCancha = useMemo(() => {
    const map: Record<string, number> = {};
    reservas.forEach(r => {
      map[r.cancha_id] = (map[r.cancha_id] || 0) + 1;
    });
    return map;
  }, [reservas]);

  // Próximas reservas (en las próximas 2 horas)
  const proximas = useMemo(() => {
    const now = new Date();
    const en2h = new Date(now.getTime() + 2 * 3600000);
    return reservas
      .filter(r => {
        const inicio = new Date(r.inicio);
        return inicio >= now && inicio <= en2h && r.estado !== 'cancelada';
      })
      .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
      .slice(0, 5);
  }, [reservas]);

  return (
    <aside className="admin-sidebar">
      {/* Stats del día */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">📊 Hoy</div>
        <div className="stat-card">
          <div className="stat-card-label">Reservas</div>
          <div className="stat-card-value">{stats.totalReservas}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Ingresos estimados</div>
          <div className="stat-card-value green">{formatGs(stats.ingresos)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Ocupación</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <div className="stat-card-value amber">{stats.ocupacion}%</div>
            <div style={{ flex: 1, height: 6, background: 'var(--border-default)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${stats.ocupacion}%`, background: 'var(--brand-accent)', borderRadius: 3, transition: 'width 0.5s' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Canchas */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">🏟️ Canchas</div>
        <div className="cancha-mini-list">
          {canchas.map(c => (
            <div key={c.id} className="cancha-mini">
              <div className="cancha-mini-dot" style={{ background: c.color }} />
              <div className="cancha-mini-info">
                <div className="cancha-mini-name">{c.nombre}</div>
                <div className="cancha-mini-sport">{c.deporte}</div>
              </div>
              <div className="cancha-mini-count">
                {reservasPorCancha[c.id] || 0} turno{(reservasPorCancha[c.id] || 0) !== 1 ? 's' : ''}
              </div>
            </div>
          ))}
          {canchas.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
              Sin canchas configuradas
            </div>
          )}
        </div>
      </div>

      {/* Próximas reservas */}
      <div className="sidebar-section" style={{ flex: 1 }}>
        <div className="sidebar-section-title">⏰ Próximas</div>
        {proximas.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
            Sin reservas en las próximas 2h
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {proximas.map(r => (
              <div key={r.id} style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                padding: '8px 10px',
                borderLeft: `3px solid ${r.cancha_color || '#3B82F6'}`,
              }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{r.cliente_nombre}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {r.cancha_nombre} · {formatHour(r.inicio)} – {formatHour(r.fin)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--brand-primary)', marginTop: 2 }}>
                  {formatGs(r.precio_total)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
