/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Building2, Calendar, Clock, MapPin, Phone, Mail, CheckCircle2,
  AlertCircle, X, ChevronRight, Share2, Sparkles, Trophy, MessageSquare
} from 'lucide-react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

const C = {
  bg: '#0F172A',
  card: '#1E293B',
  cardHover: '#334155',
  border: '#334155',
  text: '#F8FAFC',
  muted: '#94A3B8',
  emerald: '#10B981',
  blue: '#3B82F6',
  yellow: '#F59E0B',
  pink: '#EC4899',
  red: '#EF4444',
};

// Horarios estándar para la grilla pública (ej. 07:00 a 23:00)
const SLOTS_HORARIOS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
  '19:00', '20:00', '21:00', '22:00', '23:00'
];

export default function ComplejoPublicPage() {
  const params = useParams();
  const slug = (params?.slug as string) || 'mburicao-sports';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [canchaFiltro, setCanchaFiltro] = useState<string>('todas');

  // Modal Reserva
  const [slotSeleccionado, setSlotSeleccionado] = useState<any>(null); // { cancha, hora_inicio, hora_fin, precio }
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [notas, setNotas] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [reservaExitosa, setReservaExitosa] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchComplejoData();
  }, [slug, fecha]);

  const fetchComplejoData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/complejos/public/${slug}?fecha=${fecha}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarReserva = async (e: any) => {
    e.preventDefault();
    if (!slotSeleccionado) return;
    setEnviando(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${API_URL}/api/complejos/public/${slug}/reservar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancha_id: slotSeleccionado.cancha.id,
          cliente_nombre: clienteNombre,
          cliente_telefono: clienteTelefono,
          fecha: fecha,
          hora_inicio: slotSeleccionado.hora_inicio,
          hora_fin: slotSeleccionado.hora_fin,
          notas: notas
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || 'No se pudo procesar la reserva.');

      setReservaExitosa(json);
      fetchComplejoData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setEnviando(false);
    }
  };

  if (loading && !data) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text }}>
        <p style={{ fontSize: 18, color: C.muted }}>Cargando disponibilidad de canchas...</p>
      </div>
    );
  }

  const complejo = data?.complejo || {};
  const canchasList = data?.canchas || [];
  const reservasOcupadas = data?.reservas_ocupadas || [];

  const canchasFiltradas = canchaFiltro === 'todas' ? canchasList : canchasList.filter((c: any) => c.deporte === canchaFiltro);
  const deportesUnicos = Array.from(new Set(canchasList.map((c: any) => c.deporte)));

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', paddingTop: '74px' }}>
      <Nav />


      {/* Hero Banner del Complejo */}
      <div style={{ position: 'relative', minHeight: 320, background: `linear-gradient(rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.95)), url(${complejo.foto_portada}) center/cover no-repeat`, display: 'flex', alignItems: 'flex-end', padding: '40px 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 24 }}>
          <div>
            <span style={{ background: C.emerald, color: '#fff', padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
              Complejo Deportivo Oficial
            </span>
            <h1 style={{ fontSize: 36, fontWeight: 900, margin: '10px 0 8px 0', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
              {complejo.nombre}
            </h1>
            <p style={{ color: C.muted, fontSize: 15, maxWidth: 650, margin: '0 0 12px 0' }}>
              {complejo.descripcion}
            </p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#CBD5E1' }}>
              <span><MapPin style={{ width: 14, height: 14, display: 'inline', color: C.emerald, marginRight: 4 }} />{complejo.direccion}, {complejo.ciudad}</span>
              <span><Clock style={{ width: 14, height: 14, display: 'inline', color: C.emerald, marginRight: 4 }} />Horario: {complejo.horario_apertura} a {complejo.horario_cierre} hs</span>
              <span><Phone style={{ width: 14, height: 14, display: 'inline', color: C.emerald, marginRight: 4 }} />{complejo.telefono}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <a
              href={`https://wa.me/${complejo.telefono?.replace(/\D/g, '')}?text=Hola,%20quisiera%20consultar%20sobre%20reserva%20de%20canchas%20en%20${encodeURIComponent(complejo.nombre)}`}
              target="_blank"
              rel="noreferrer"
              style={{ background: '#25D366', color: '#fff', padding: '12px 24px', borderRadius: 10, fontWeight: 800, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14 }}
            >
              <MessageSquare style={{ width: 18, height: 18 }} /> WhatsApp Complejo
            </a>
          </div>
        </div>
      </div>

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>
        {/* Selector de Fecha y Filtro de Deporte */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Calendar style={{ width: 22, height: 22, color: C.emerald }} />
            <div>
              <span style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>FECHA DE RESERVA</span>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: '8px 12px', fontSize: 14, fontWeight: 700 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
            <button
              onClick={() => setCanchaFiltro('todas')}
              style={{
                padding: '8px 16px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                background: canchaFiltro === 'todas' ? C.emerald : C.bg, color: canchaFiltro === 'todas' ? '#fff' : C.muted
              }}
            >
              Todas las Canchas ({canchasList.length})
            </button>
            {deportesUnicos.map((dep: any) => (
              <button
                key={dep}
                onClick={() => setCanchaFiltro(dep)}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  background: canchaFiltro === dep ? C.emerald : C.bg, color: canchaFiltro === dep ? '#fff' : C.muted
                }}
              >
                {dep}
              </button>
            ))}
          </div>
        </div>

        {/* Grilla de Disponibilidad de Canchas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {canchasFiltradas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: C.muted, background: C.card, borderRadius: 12, border: `1px solid ${C.border}` }}>
              No hay canchas disponibles con los filtros seleccionados.
            </div>
          ) : (
            canchasFiltradas.map((cancha: any) => (
              <div key={cancha.id} style={{ background: C.card, border: `2px solid ${cancha.color || C.border}`, borderRadius: 16, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{cancha.nombre}</h3>
                    <span style={{ fontSize: 13, color: C.muted }}>
                      {cancha.superficie} • Dim: {cancha.dimensiones || 'Estándar'} • Capacidad: {cancha.capacidad_jugadores} personas
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 12, color: C.muted, display: 'block' }}>Tarifa Diurna / Nocturna</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: C.emerald }}>
                      {cancha.precio_hora.toLocaleString('es-PY')} Gs / h
                    </span>
                  </div>
                </div>

                {/* Slots de Horarios */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 12 }}>
                  {SLOTS_HORARIOS.map((hIni, idx) => {
                    if (idx === SLOTS_HORARIOS.length - 1) return null;
                    const hFin = SLOTS_HORARIOS[idx + 1];

                    // Validar si este horario está ocupado en esta cancha
                    const estaOcupado = reservasOcupadas.some(
                      (r: any) => r.cancha_id === cancha.id && (
                        (r.inicio <= hIni && r.fin > hIni) ||
                        (hIni <= r.inicio && hFin > r.inicio)
                      )
                    );

                    const esNocturno = hIni >= (cancha.hora_inicio_nocturna || '18:00');
                    const precioSlot = esNocturno ? cancha.precio_hora_nocturna : cancha.precio_hora;

                    return (
                      <button
                        key={hIni}
                        disabled={estaOcupado}
                        onClick={() => {
                          setSlotSeleccionado({ cancha, hora_inicio: hIni, hora_fin: hFin, precio: precioSlot });
                          setReservaExitosa(null);
                          setErrorMsg('');
                        }}
                        style={{
                          background: estaOcupado ? '#0F172A' : `${C.emerald}15`,
                          border: estaOcupado ? `1px solid ${C.border}` : `1px solid ${C.emerald}`,
                          color: estaOcupado ? C.muted : C.text,
                          borderRadius: 10, padding: '12px 8px', cursor: estaOcupado ? 'not-allowed' : 'pointer',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, transition: 'all 0.2s'
                        }}
                      >
                        <span style={{ fontSize: 14, fontWeight: 800 }}>{hIni} - {hFin}</span>
                        {estaOcupado ? (
                          <span style={{ fontSize: 10, color: C.red, fontWeight: 700, textTransform: 'uppercase' }}>OCUPADO</span>
                        ) : (
                          <span style={{ fontSize: 11, color: C.emerald, fontWeight: 700 }}>
                            {precioSlot.toLocaleString('es-PY')} Gs
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* MODAL SOLICITUD DE RESERVA */}
      {slotSeleccionado && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {reservaExitosa ? (
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <CheckCircle2 style={{ width: 64, height: 64, color: C.emerald }} />
                <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>¡Reserva Confirmada!</h3>
                <p style={{ color: C.muted, margin: 0, fontSize: 14 }}>{reservaExitosa.mensaje}</p>

                <div style={{ background: C.bg, borderRadius: 10, padding: 16, width: '100%', textAling: 'left', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div><strong>Cancha:</strong> {slotSeleccionado.cancha.nombre}</div>
                  <div><strong>Fecha & Hora:</strong> {fecha} ({slotSeleccionado.hora_inicio} a {slotSeleccionado.hora_fin} hs)</div>
                  <div><strong>Total a Pagar:</strong> <span style={{ color: C.emerald, fontWeight: 800 }}>{reservaExitosa.precio_total?.toLocaleString('es-PY')} Gs</span></div>
                </div>

                <a
                  href={`https://wa.me/${complejo.telefono?.replace(/\D/g, '')}?text=Hola,%20acabo%20de%20realizar%20la%20reserva%20Nro%20${reservaExitosa.id}%20a%20nombre%20de%20${encodeURIComponent(clienteNombre)}%20para%20${slotSeleccionado.cancha.nombre}%20el%20día%20${fecha}%20de%20${slotSeleccionado.hora_inicio}%20a%20${slotSeleccionado.hora_fin}%20hs.`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ background: '#25D366', color: '#fff', padding: '12px 20px', borderRadius: 8, width: '100%', fontWeight: 800, textDecoration: 'none' }}
                >
                  Enviar Comprobante por WhatsApp
                </a>

                <button onClick={() => setSlotSeleccionado(null)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontWeight: 600 }}>
                  Cerrar Ventana
                </button>
              </div>
            ) : (
              <form onSubmit={handleConfirmarReserva} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Reservar Cancha Online</h3>
                  <button type="button" onClick={() => setSlotSeleccionado(null)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}>
                    <X style={{ width: 20, height: 20 }} />
                  </button>
                </div>

                <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div><strong>Cancha:</strong> {slotSeleccionado.cancha.nombre} ({slotSeleccionado.cancha.deporte})</div>
                  <div><strong>Horario:</strong> {fecha} ({slotSeleccionado.hora_inicio} a {slotSeleccionado.hora_fin} hs)</div>
                  <div><strong>Precio Turno:</strong> <span style={{ color: C.emerald, fontWeight: 800, fontSize: 15 }}>{slotSeleccionado.precio.toLocaleString('es-PY')} Gs</span></div>
                </div>

                {errorMsg && (
                  <div style={{ background: `${C.red}20`, border: `1px solid ${C.red}`, color: C.red, padding: 10, borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Tu Nombre Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Carlos Giménez"
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 14 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Número de Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 0981 123 456"
                    value={clienteTelefono}
                    onChange={(e) => setClienteTelefono(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 14 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Notas Adicionales (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. Requiero chalecos / pelotas extra"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 14 }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                  <button type="button" onClick={() => setSlotSeleccionado(null)} style={{ padding: '10px 16px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.muted, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={enviando} style={{ padding: '10px 20px', background: C.emerald, border: 'none', borderRadius: 6, color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                    {enviando ? 'Enviando...' : 'Confirmar Reserva Online'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
