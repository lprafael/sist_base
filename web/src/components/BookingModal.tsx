/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';

interface BookingModalProps {
  cancha: any;
  apiUrl: string;
  onClose: () => void;
  onSuccess: () => void;
}

const DURACIONES = [
  { label: '30 min', value: 30 },
  { label: '1 hora', value: 60 },
  { label: '1h 30min', value: 90 },
  { label: '2 horas', value: 120 },
];

function formatGs(amount: number): string {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency', currency: 'PYG',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}

export default function BookingModal({ cancha, apiUrl, onClose, onSuccess }: BookingModalProps) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [inicio, setInicio] = useState<string>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return toLocalInput(d);
  });
  const [duracion, setDuracion] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'confirm'>('form');

  const finDate = new Date(new Date(inicio).getTime() + duracion * 60000);
  const precioTotal = Math.round((cancha.precio_hora * duracion) / 60);

  const handleSubmit = async () => {
    if (!nombre.trim()) { setError('Ingresá tu nombre'); return; }
    if (!inicio) { setError('Seleccioná el horario de inicio'); return; }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiUrl}/cancha/reservas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancha_id: cancha.id,
          complejo_id: cancha.complejo_id,
          cliente_nombre: nombre.trim(),
          cliente_telefono: telefono.trim() || null,
          inicio: new Date(inicio).toISOString(),
          fin: finDate.toISOString(),
          origen: 'web',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al crear la reserva');
      onSuccess();
    } catch (e: any) {
      if (e.message.includes('ya tiene una reserva')) {
        setError('⚠️ Ese horario ya está ocupado. Elegí otro.');
      } else {
        setError(e.message || 'Error al realizar la reserva');
      }
    } finally {
      setLoading(false);
    }
  };

  // Deshabilitar scroll al abrir modal
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Reservar {cancha.nombre}</div>
            <div className="modal-subtitle">
              {cancha.complejo_nombre} · {cancha.deporte}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Datos personales */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tu nombre *</label>
              <input
                className="form-input"
                placeholder="Juan Pérez"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input
                className="form-input"
                placeholder="0981 000 000"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
              />
            </div>
          </div>

          {/* Horario */}
          <div className="form-group">
            <label className="form-label">Fecha y hora de inicio *</label>
            <input
              type="datetime-local"
              className="form-input"
              value={inicio}
              onChange={e => setInicio(e.target.value)}
              min={toLocalInput(new Date())}
            />
          </div>

          {/* Duración */}
          <div className="form-group">
            <label className="form-label">Duración</label>
            <div className="time-pills">
              {DURACIONES.map(d => (
                <button
                  key={d.value}
                  className={`time-pill ${duracion === d.value ? 'active' : ''}`}
                  onClick={() => setDuracion(d.value)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Resumen de precio */}
          <div className="price-box">
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
              {inicio ? new Date(inicio).toLocaleDateString('es-PY', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
              {inicio ? ` · ${new Date(inicio).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}` : ''}
              {inicio ? ` – ${finDate.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}` : ''}
            </div>
            <div className="price-box-amount">{formatGs(precioTotal)}</div>
            <div className="price-box-label">Total a pagar en el complejo</div>
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 10,
              padding: '12px 16px',
              fontSize: 14,
              color: '#EF4444',
            }}>
              {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose} disabled={loading} style={{ flex: 1 }}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading}
            style={{ flex: 2 }}
          >
            {loading ? 'Reservando...' : '✓ Confirmar reserva'}
          </button>
        </div>
      </div>
    </div>
  );
}
