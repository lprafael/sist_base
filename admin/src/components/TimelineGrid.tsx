'use client';

import { useMemo, useRef, useEffect } from 'react';
import { formatHour, formatGs, generarHorasDelDia, getBookingOpacity } from '@/lib/utils';

const HORA_APERTURA = 7;
const HORA_CIERRE = 23;
const CELL_HEIGHT = 60; // px por hora

interface TimelineGridProps {
  canchas: any[];
  reservas: any[];
  fecha: string;
  onSlotClick: (cancha: any, horaInicio: string) => void;
  onReservaClick: (reserva: any) => void;
}

export default function TimelineGrid({
  canchas, reservas, fecha, onSlotClick, onReservaClick
}: TimelineGridProps) {
  const horas = generarHorasDelDia(HORA_APERTURA, HORA_CIERRE);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll a la hora actual al cargar
  useEffect(() => {
    const now = new Date();
    const horaActual = now.getHours();
    if (horaActual >= HORA_APERTURA && horaActual <= HORA_CIERRE) {
      const offset = (horaActual - HORA_APERTURA) * CELL_HEIGHT - 100;
      containerRef.current?.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
    }
  }, []);

  // Línea de hora actual
  const horaActualOffset = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    if (todayStr !== fecha) return null;
    const horas = now.getHours();
    const minutos = now.getMinutes();
    if (horas < HORA_APERTURA || horas > HORA_CIERRE) return null;
    return ((horas - HORA_APERTURA) + minutos / 60) * CELL_HEIGHT;
  }, [fecha]);

  // Mapa rápido de reservas por cancha+hora
  const reservaMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    reservas.forEach(r => {
      const key = r.cancha_id;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return map;
  }, [reservas]);

  const getCeldaReserva = (canchaId: string, hora: number): any | null => {
    const list = reservaMap[canchaId] || [];
    return list.find(r => {
      const inicio = new Date(r.inicio);
      return inicio.getHours() === hora;
    }) || null;
  };

  const getBookingBlockStyle = (reserva: any, hora: number) => {
    const inicio = new Date(reserva.inicio);
    const fin = new Date(reserva.fin);
    const inicioMinutos = inicio.getMinutes();
    const durMinutos = (fin.getTime() - inicio.getTime()) / 60000;
    const top = (inicioMinutos / 60) * CELL_HEIGHT;
    const height = (durMinutos / 60) * CELL_HEIGHT - 4;
    const opacity = getBookingOpacity(reserva.estado);
    return {
      top,
      height: Math.max(height, 24),
      background: reserva.cancha_color || '#3B82F6',
      opacity,
    };
  };

  const handleCellClick = (cancha: any, hora: number) => {
    const d = new Date(`${fecha}T${String(hora).padStart(2, '0')}:00:00`);
    onSlotClick(cancha, d.toISOString());
  };

  const tipoLabel: Record<string, string> = {
    confirmada: '✓',
    en_curso: '▶',
    pendiente: '○',
    finalizada: '■',
    cancelada: '✕',
  };

  if (canchas.length === 0) {
    return (
      <div className="loading-state">
        <div style={{ fontSize: 48 }}>🏟️</div>
        <p style={{ fontSize: 16, fontWeight: 600 }}>Sin canchas configuradas</p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Agrega canchas desde la configuración del complejo</p>
      </div>
    );
  }

  return (
    <div className="timeline-container" ref={containerRef}>
      <div className="timeline-grid" style={{
        gridTemplateColumns: `64px repeat(${canchas.length}, 1fr)`,
      }}>

        {/* Header sticky */}
        <div className="timeline-header" style={{
          gridColumn: `1 / -1`,
          display: 'flex',
        }}>
          <div className="timeline-hour-label" />
          {canchas.map(c => (
            <div key={c.id} className="timeline-cancha-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="cancha-header-dot" style={{ background: c.color }} />
                <span className="cancha-header-name">{c.nombre}</span>
              </div>
              <div className="cancha-header-sport">{c.deporte} {c.superficie ? `· ${c.superficie}` : ''}</div>
              <div className="cancha-header-price">{formatGs(c.precio_hora)}/h</div>
            </div>
          ))}
        </div>

        {/* Filas de horas */}
        {horas.map(hora => (
          <div key={hora} className="timeline-row" style={{
            gridColumn: `1 / -1`,
            display: 'flex',
            height: CELL_HEIGHT,
          }}>
            {/* Etiqueta de hora */}
            <div className="timeline-hour">
              {String(hora).padStart(2, '0')}:00
            </div>

            {/* Celda por cancha */}
            {canchas.map(cancha => {
              const reserva = getCeldaReserva(cancha.id, hora);
              return (
                <div
                  key={cancha.id}
                  className={`timeline-cell ${reserva ? 'occupied' : ''}`}
                  style={{ position: 'relative', height: CELL_HEIGHT }}
                  onClick={() => !reserva && handleCellClick(cancha, hora)}
                >
                  {/* Línea de media hora */}
                  <div style={{
                    position: 'absolute',
                    top: CELL_HEIGHT / 2,
                    left: 0, right: 0,
                    height: 1,
                    background: 'var(--border-subtle)',
                    opacity: 0.5,
                  }} />

                  {/* Bloque de reserva (solo renderizar desde la hora de inicio) */}
                  {reserva && new Date(reserva.inicio).getHours() === hora && (
                    <div
                      className="booking-block"
                      style={getBookingBlockStyle(reserva, hora)}
                      onClick={e => { e.stopPropagation(); onReservaClick(reserva); }}
                    >
                      <div className="booking-block-name">
                        {tipoLabel[reserva.estado] || ''} {reserva.cliente_nombre}
                      </div>
                      <div className="booking-block-time">
                        {formatHour(reserva.inicio)} – {formatHour(reserva.fin)}
                      </div>
                      <div className="booking-block-price">{formatGs(reserva.precio_total)}</div>
                    </div>
                  )}

                  {/* Marcador de cancha ocupada (hora dentro de la reserva pero no el inicio) */}
                  {reserva && new Date(reserva.inicio).getHours() !== hora && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: reserva.cancha_color || '#3B82F6',
                      opacity: 0.12,
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Línea de hora actual */}
        {horaActualOffset !== null && (
          <div
            className="hora-actual-line"
            style={{
              position: 'absolute',
              top: 64 + horaActualOffset,  // 64px = altura del header
              left: 64,
              right: 0,
            }}
          />
        )}
      </div>
    </div>
  );
}
