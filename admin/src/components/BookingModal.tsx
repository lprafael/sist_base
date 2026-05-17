'use client';

import { useState, useEffect } from 'react';
import { formatGs, calcularPrecio } from '@/lib/utils';

interface BookingModalProps {
  slot: { cancha: any; horaInicio: string } | null;
  reserva: any | null;
  canchas: any[];
  complejoId: string;
  apiUrl: string;
  fecha: string;
  onSave: () => void;
  onClose: () => void;
}

export default function BookingModal({
  slot, reserva, canchas, complejoId, apiUrl, fecha, onSave, onClose
}: BookingModalProps) {
  const isEditing = !!reserva;

  const [form, setForm] = useState({
    cancha_id: '',
    cliente_nombre: '',
    cliente_telefono: '',
    inicio: '',
    fin: '',
    notas: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Inicializar form
  useEffect(() => {
    if (slot) {
      const inicioDate = new Date(slot.horaInicio);
      const finDate = new Date(inicioDate.getTime() + 60 * 60000); // +1h por defecto
      setForm({
        cancha_id: slot.cancha.id,
        cliente_nombre: '',
        cliente_telefono: '',
        inicio: toLocalInput(inicioDate),
        fin: toLocalInput(finDate),
        notas: '',
      });
    } else if (reserva) {
      setForm({
        cancha_id: reserva.cancha_id,
        cliente_nombre: reserva.cliente_nombre || '',
        cliente_telefono: reserva.cliente_telefono || '',
        inicio: toLocalInput(new Date(reserva.inicio)),
        fin: toLocalInput(new Date(reserva.fin)),
        notas: reserva.notas || '',
      });
    }
  }, [slot, reserva]);

  function toLocalInput(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  const canchaActual = canchas.find(c => c.id === form.cancha_id);
  const precioTotal = canchaActual
    ? calcularPrecio(canchaActual.precio_hora, form.inicio, form.fin)
    : 0;

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async () => {
    if (!form.cancha_id || !form.cliente_nombre || !form.inicio || !form.fin) {
      setError('Completá todos los campos obligatorios');
      return;
    }
    if (new Date(form.fin) <= new Date(form.inicio)) {
      setError('La hora de fin debe ser posterior al inicio');
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (isEditing) {
        const res = await fetch(`${apiUrl}/cancha/reservas/${reserva.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cliente_nombre: form.cliente_nombre,
            cliente_telefono: form.cliente_telefono,
            notas: form.notas,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).detail || 'Error al actualizar');
      } else {
        const res = await fetch(`${apiUrl}/cancha/reservas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cancha_id: form.cancha_id,
            complejo_id: complejoId,
            cliente_nombre: form.cliente_nombre,
            cliente_telefono: form.cliente_telefono || null,
            inicio: new Date(form.inicio).toISOString(),
            fin: new Date(form.fin).toISOString(),
            notas: form.notas || null,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).detail || 'Error al crear reserva');
      }
      onSave();
    } catch (e: any) {
      setError(e.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = async () => {
    if (!reserva || !confirm('¿Cancelar esta reserva?')) return;
    setLoading(true);
    try {
      await fetch(`${apiUrl}/cancha/reservas/${reserva.id}`, { method: 'DELETE' });
      onSave();
    } catch {
      setError('Error al cancelar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">
              {isEditing ? '✏️ Editar Reserva' : '➕ Nueva Reserva'}
            </div>
            <div className="modal-subtitle">
              {isEditing ? `${reserva.cancha_nombre} · ${reserva.estado}` : 'Completá los datos del turno'}
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ fontSize: 18 }}>✕</button>
        </div>

        <div className="modal-body">
          {/* Cancha */}
          {!isEditing && (
            <div className="form-group">
              <label className="form-label">Cancha *</label>
              <select
                className="form-input"
                value={form.cancha_id}
                onChange={e => handleChange('cancha_id', e.target.value)}
              >
                <option value="">Seleccionar...</option>
                {canchas.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre} – {c.deporte}</option>
                ))}
              </select>
            </div>
          )}

          {/* Cliente */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nombre del cliente *</label>
              <input
                className="form-input"
                placeholder="Juan Pérez"
                value={form.cliente_nombre}
                onChange={e => handleChange('cliente_nombre', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input
                className="form-input"
                placeholder="0981 000 000"
                value={form.cliente_telefono}
                onChange={e => handleChange('cliente_telefono', e.target.value)}
              />
            </div>
          </div>

          {/* Horario */}
          {!isEditing && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Inicio *</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={form.inicio}
                  onChange={e => handleChange('inicio', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Fin *</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={form.fin}
                  onChange={e => handleChange('fin', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Duración rápida */}
          {!isEditing && canchaActual && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[30, 60, 90, 120].map(min => (
                <button
                  key={min}
                  className="btn btn-secondary"
                  style={{ fontSize: 12, padding: '6px 12px' }}
                  onClick={() => {
                    const inicio = new Date(form.inicio);
                    const fin = new Date(inicio.getTime() + min * 60000);
                    handleChange('fin', `${fin.getFullYear()}-${String(fin.getMonth()+1).padStart(2,'0')}-${String(fin.getDate()).padStart(2,'0')}T${String(fin.getHours()).padStart(2,'0')}:${String(fin.getMinutes()).padStart(2,'0')}`);
                  }}
                >
                  {min < 60 ? `${min}min` : `${min/60}h`}
                </button>
              ))}
            </div>
          )}

          {/* Precio */}
          {!isEditing && precioTotal > 0 && (
            <div className="price-display">
              <div className="price-display-label">Total a cobrar</div>
              <div className="price-display-value">{formatGs(precioTotal)}</div>
            </div>
          )}

          {/* Notas */}
          <div className="form-group">
            <label className="form-label">Notas (opcional)</label>
            <input
              className="form-input"
              placeholder="Torneo, pago pendiente, etc."
              value={form.notas}
              onChange={e => handleChange('notas', e.target.value)}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#EF4444'
            }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {isEditing && (
            <button
              className="btn btn-danger"
              onClick={handleCancelar}
              disabled={loading}
              style={{ marginRight: 'auto' }}
            >
              Cancelar reserva
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cerrar
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? '...' : isEditing ? 'Guardar cambios' : 'Confirmar reserva'}
          </button>
        </div>
      </div>
    </div>
  );
}
