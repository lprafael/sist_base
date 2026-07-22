/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Building2, Calendar, Clock, DollarSign, Volume2, VolumeX,
  Play, Plus, Edit2, Trash2, CheckCircle2, AlertCircle, X,
  MapPin, Phone, Mail, Globe, Sparkles, RefreshCw, LogOut,
  Users, ShieldCheck, Check, Layers, ChevronRight, Activity, Bell
} from 'lucide-react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

// ─── Estilos y Temas ─────────────────────────────────────────
const C = {
  bg: '#0F172A',
  card: '#1E293B',
  cardHover: '#334155',
  border: '#334155',
  text: '#F8FAFC',
  muted: '#94A3B8',
  emerald: '#10B981',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  pink: '#EC4899',
  yellow: '#F59E0B',
  red: '#EF4444',
};

type Tab = 'dashboard' | 'altavoz' | 'canchas' | 'reservas' | 'config';

export default function ComplejoPanel() {
  const [session, setSession] = useState<any>(null);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [notif, setNotif] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // Datos
  const [perfil, setPerfil] = useState<any>(null);
  const [canchas, setCanchas] = useState<any[]>([]);
  const [reservas, setReservas] = useState<any[]>([]);
  const [fechaFiltro, setFechaFiltro] = useState<string>(new Date().toISOString().split('T')[0]);

  // Modales
  const [modalCancha, setModalCancha] = useState<any>(null); // null | {} | {cancha}
  const [modalReserva, setModalReserva] = useState<any>(null); // null | {} | {reserva}
  const [editPerfil, setEditPerfil] = useState<any>(null);

  // ── Altavoz / Sistema de Locución por Voz en Tiempo Real ──
  const [altavozActivo, setAltavozActivo] = useState(false);
  const [anunciosLog, setAnunciosLog] = useState<any[]>([]);
  const [volumen, setVolumen] = useState(1);
  const [vocesDisponibles, setVocesDisponibles] = useState<SpeechSynthesisVoice[]>([]);
  const [vozSeleccionada, setVozSeleccionada] = useState<string>('');
  const [probandoAudio, setProbandoAudio] = useState(false);
  const [ultimaComprobacion, setUltimaComprobacion] = useState<string>('--:--:--');

  const notify = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3500);
  };

  // ── Auth Init ──
  useEffect(() => {
    const raw = localStorage.getItem('user_session');
    if (!raw) { setLoading(false); return; }
    const s = JSON.parse(raw);
    setSession(s);
    setToken(s.token || s.access_token || '');
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchAll();
  }, [token, fechaFiltro]);

  // Cargar Voces del Navegador para TTS
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const cargarVoces = () => {
        const list = window.speechSynthesis.getVoices();
        const esVoces = list.filter(v => v.lang.startsWith('es'));
        setVocesDisponibles(esVoces.length > 0 ? esVoces : list);
        if (esVoces.length > 0) setVozSeleccionada(esVoces[0].name);
      };
      cargarVoces();
      window.speechSynthesis.onvoiceschanged = cargarVoces;
    }
  }, []);

  const headers = () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

  const apiFetch = async (url: string, opts: RequestInit = {}) => {
    const res = await fetch(`${API_URL}${url}`, { headers: headers(), ...opts });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'Error en la operación');
    return data;
  };

  const fetchAll = async () => {
    try {
      const [p, c, r] = await Promise.allSettled([
        apiFetch('/api/complejo/perfil'),
        apiFetch('/api/complejo/canchas'),
        apiFetch(`/api/complejo/reservas?fecha=${fechaFiltro}`),
      ]);
      if (p.status === 'fulfilled') {
        setPerfil(p.value);
        setEditPerfil(p.value);
      }
      if (c.status === 'fulfilled') setCanchas(c.value);
      if (r.status === 'fulfilled') setReservas(r.value);
    } catch (e: any) {
      console.error(e);
    }
  };

  // ── Función para Reproducir Sonido de Chime + Voz TTS ──
  const hablarAltavoz = (texto: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      // Reproducir sonido de atención "ding-dong" usando Web Audio API
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.3 * volumen, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {}

    // Pequeña pausa antes del anuncio de voz
    setTimeout(() => {
      window.speechSynthesis.cancel(); // Cancelar anteriores si hay cola excesiva
      const utterance = new SpeechSynthesisUtterance(texto);
      utterance.volume = volumen;
      utterance.rate = 0.95; // Velocidad pausada y clara de locutor
      utterance.pitch = 1.0;

      if (vozSeleccionada) {
        const v = vocesDisponibles.find(x => x.name === vozSeleccionada);
        if (v) utterance.voice = v;
      }

      window.speechSynthesis.speak(utterance);
    }, 450);
  };

  // ── Polling Continuo del Altavoz de Eventos ──
  useEffect(() => {
    let interval: any;
    if (altavozActivo && token) {
      const revisarEventosAltavoz = async () => {
        try {
          const data = await apiFetch('/api/complejo/altavoz/eventos');
          setUltimaComprobacion(data.hora_actual || new Date().toLocaleTimeString());
          if (data.anuncios && data.anuncios.length > 0) {
            data.anuncios.forEach((a: any) => {
              // Agregar al log visual
              setAnunciosLog(prev => [a, ...prev.slice(0, 49)]);
              // Anunciar por voz alta
              hablarAltavoz(a.mensaje);
            });
            // Recargar reservas para actualizar estados
            fetchAll();
          }
        } catch (e) {}
      };
      revisarEventosAltavoz();
      interval = setInterval(revisarEventosAltavoz, 6000); // Revisar cada 6 segundos
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [altavozActivo, token, volumen, vozSeleccionada]);

  // ── Operaciones CRUD ──

  const handleSavePerfil = async (e: any) => {
    e.preventDefault();
    try {
      await apiFetch('/api/complejo/perfil', {
        method: 'PUT',
        body: JSON.stringify(editPerfil),
      });
      notify('Perfil del complejo actualizado');
      fetchAll();
    } catch (err: any) {
      notify(err.message, 'err');
    }
  };

  const handleSaveCancha = async (e: any) => {
    e.preventDefault();
    try {
      const isEdit = !!modalCancha?.id;
      const url = isEdit ? `/api/complejo/canchas/${modalCancha.id}` : '/api/complejo/canchas';
      const method = isEdit ? 'PUT' : 'POST';
      await apiFetch(url, { method, body: JSON.stringify(modalCancha) });
      notify(isEdit ? 'Cancha actualizada' : 'Cancha creada exitosamente');
      setModalCancha(null);
      fetchAll();
    } catch (err: any) {
      notify(err.message, 'err');
    }
  };

  const handleDeleteCancha = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta cancha?')) return;
    try {
      await apiFetch(`/api/complejo/canchas/${id}`, { method: 'DELETE' });
      notify('Cancha eliminada');
      fetchAll();
    } catch (err: any) {
      notify(err.message, 'err');
    }
  };

  const handleSaveReserva = async (e: any) => {
    e.preventDefault();
    try {
      const isEdit = !!modalReserva?.id;
      if (isEdit) {
        await apiFetch(`/api/complejo/reservas/${modalReserva.id}`, {
          method: 'PUT',
          body: JSON.stringify(modalReserva),
        });
        notify('Reserva actualizada');
      } else {
        await apiFetch('/api/complejo/reservas', {
          method: 'POST',
          body: JSON.stringify(modalReserva),
        });
        notify('Reserva creada exitosamente');
      }
      setModalReserva(null);
      fetchAll();
    } catch (err: any) {
      notify(err.message, 'err');
    }
  };

  const handleDeleteReserva = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta reserva?')) return;
    try {
      await apiFetch(`/api/complejo/reservas/${id}`, { method: 'DELETE' });
      notify('Reserva eliminada');
      fetchAll();
    } catch (err: any) {
      notify(err.message, 'err');
    }
  };

  // ── Guard Loading / Auth ──
  if (loading) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text }}>
        <RefreshCw style={{ animation: 'spin 1s linear infinite', width: 32, height: 32, color: C.emerald }} />
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.text, gap: 16 }}>
        <Building2 style={{ width: 64, height: 64, color: C.emerald }} />
        <h2>Acceso Denegado</h2>
        <p style={{ color: C.muted }}>Por favor inicia sesión con tu cuenta de Complejo Deportivo.</p>
        <Link href="/complejo/login" className="btn btn-primary">Iniciar Sesión Complejo</Link>
      </div>
    );
  }

  // Métricas para Dashboard
  const reservasHoy = reservas.filter(r => r.estado !== 'cancelada');
  const ingresosHoy = reservasHoy.reduce((sum, r) => sum + (r.precio_total || 0), 0);
  const turnosJugandoAhora = reservasHoy.filter(r => r.estado === 'en_curso').length;
  const turnosConfirmados = reservasHoy.filter(r => r.estado === 'confirmada').length;

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', paddingTop: '74px' }}>
      <Nav />


      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, #064e3b 0%, #0f172a 100%)', borderBottom: `1px solid ${C.border}`, padding: '32px 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Building2 style={{ width: 28, height: 28, color: C.emerald }} />
              <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>{perfil?.nombre || 'Complejo Deportivo'}</h1>
              <span style={{ background: `${C.emerald}20`, border: `1px solid ${C.emerald}`, color: C.emerald, padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                Administración Canchas
              </span>
            </div>
            <p style={{ color: C.muted, margin: 0, fontSize: 14 }}>
              <MapPin style={{ width: 14, height: 14, display: 'inline', marginRight: 4 }} />
              {perfil?.direccion || 'Configura la dirección de tu complejo'} | {perfil?.ciudad || 'Asunción'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {perfil?.slug && (
              <a
                href={`/complejo/${perfil.slug}`}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${C.blue}20`, border: `1px solid ${C.blue}`, color: C.blue, padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
              >
                <Globe style={{ width: 16, height: 16 }} /> Ver Página Pública
              </a>
            )}
            <button
              onClick={() => {
                setAltavozActivo(!altavozActivo);
                if (!altavozActivo) {
                  hablarAltavoz("Sistema de altavoz de complejo deportivo activado.");
                }
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                background: altavozActivo ? C.emerald : '#334155',
                color: '#fff', border: 'none', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              {altavozActivo ? <Volume2 style={{ width: 18, height: 18 }} /> : <VolumeX style={{ width: 18, height: 18 }} />}
              {altavozActivo ? 'Altavoz ACTIVADO' : 'Activar Altavoz'}
            </button>
          </div>
        </div>
      </div>

      {/* Notificación Flotante */}
      {notif && (
        <div style={{ position: 'fixed', top: 80, right: 24, zIndex: 9999, background: notif.type === 'ok' ? C.emerald : C.red, color: '#fff', padding: '12px 20px', borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,0.5)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          {notif.type === 'ok' ? <CheckCircle2 style={{ width: 18, height: 18 }} /> : <AlertCircle style={{ width: 18, height: 18 }} />}
          {notif.msg}
        </div>
      )}

      {/* Tabs Bar */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', gap: 4, padding: '0 24px', overflowX: 'auto' }}>
          {[
            { id: 'dashboard', label: '📊 Dashboard & En Vivo', icon: Activity },
            { id: 'altavoz', label: `📢 Altavoz en Vivo ${altavozActivo ? '(ON)' : ''}`, icon: Volume2, highlight: altavozActivo },
            { id: 'canchas', label: `⚽ Canchas (${canchas.length})`, icon: Layers },
            { id: 'reservas', label: `📅 Grilla & Reservas (${reservasHoy.length})`, icon: Calendar },
            { id: 'config', label: '🌐 Perfil & Página Pública', icon: Globe },
          ].map(tab => {
            const Icon = tab.icon;
            const isAct = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px',
                  background: 'none', border: 'none',
                  borderBottom: isAct ? `3px solid ${tab.highlight ? C.yellow : C.emerald}` : '3px solid transparent',
                  color: isAct ? (tab.highlight ? C.yellow : C.emerald) : C.muted,
                  fontWeight: isAct ? 700 : 500, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap'
                }}
              >
                <Icon style={{ width: 18, height: 18 }} /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>

        {/* ── TAB 1: DASHBOARD & EN VIVO ── */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {/* Cards de Métricas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: C.muted, fontSize: 13, fontWeight: 600 }}>
                  <span>RECAUDACIÓN DE HOY</span>
                  <DollarSign style={{ width: 20, height: 20, color: C.emerald }} />
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: C.emerald, marginTop: 8 }}>
                  {ingresosHoy.toLocaleString('es-PY')} Gs.
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                  {reservasHoy.length} reservas registradas hoy
                </div>
              </div>

              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: C.muted, fontSize: 13, fontWeight: 600 }}>
                  <span>CANCHAS EN USO AHORA</span>
                  <Activity style={{ width: 20, height: 20, color: C.yellow }} />
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: C.yellow, marginTop: 8 }}>
                  {turnosJugandoAhora} / {canchas.length} Canchas
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                  {canchas.length - turnosJugandoAhora} canchas libres actualmente
                </div>
              </div>

              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: C.muted, fontSize: 13, fontWeight: 600 }}>
                  <span>SISTEMA DE ALTAVOZ</span>
                  <Volume2 style={{ width: 20, height: 20, color: altavozActivo ? C.emerald : C.muted }} />
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: altavozActivo ? C.emerald : C.muted, marginTop: 8 }}>
                  {altavozActivo ? 'ACTIVADO & MONITOREANDO' : 'DESACTIVADO'}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                  Último cheq: {ultimaComprobacion}
                </div>
              </div>
            </div>

            {/* Estado en tiempo real por Cancha */}
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity style={{ color: C.emerald }} /> Estado de Canchas en Vivo
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                {canchas.map(c => {
                  const now = new Date();
                  const turnoActual = reservas.find(r => r.cancha_id === c.id && r.estado !== 'cancelada' && new Date(r.inicio) <= now && new Date(r.fin) >= now);
                  const proximoTurno = reservas.find(r => r.cancha_id === c.id && r.estado !== 'cancelada' && new Date(r.inicio) > now);

                  return (
                    <div key={c.id} style={{ background: C.card, border: `2px solid ${c.color || C.border}`, borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, fontSize: 16 }}>{c.nombre}</span>
                        <span style={{ fontSize: 11, background: `${c.color}25`, border: `1px solid ${c.color}`, color: c.color, padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>
                          {c.deporte}
                        </span>
                      </div>

                      {turnoActual ? (
                        <div style={{ background: `${C.emerald}15`, border: `1px solid ${C.emerald}40`, borderRadius: 8, padding: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: C.emerald, textTransform: 'uppercase' }}>● EN JUEGO AHORA</div>
                          <div style={{ fontWeight: 700, fontSize: 15, marginTop: 4 }}>{turnoActual.cliente_nombre}</div>
                          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                            {turnoActual.hora_inicio} - {turnoActual.hora_fin} hs
                          </div>
                        </div>
                      ) : (
                        <div style={{ background: '#0F172A', border: `1px dashed ${C.border}`, borderRadius: 8, padding: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>○ DISPONIBLE / LIBRE</div>
                          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Sin turno en juego actualmente</div>
                        </div>
                      )}

                      {proximoTurno && (
                        <div style={{ fontSize: 12, color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                          <Clock style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} />
                          Próx: <b>{proximoTurno.cliente_nombre}</b> ({proximoTurno.hora_inicio} hs)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: ALTAVOZ DE ANUNCIOS POR VOZ EN TIEMPO REAL ── */}
        {activeTab === 'altavoz' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Console Control Bar */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, color: altavozActivo ? C.emerald : C.text }}>
                  <Volume2 style={{ width: 24, height: 24, color: altavozActivo ? C.emerald : C.muted }} />
                  Consola de Altavoz & Locución de Turnos
                </h3>
                <p style={{ margin: '4px 0 0 0', color: C.muted, fontSize: 14 }}>
                  Anuncia automáticamente por altavoz inicio de turnos, avisos de 5 minutos restantes y finalización.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button
                  onClick={() => {
                    const nuevoEstado = !altavozActivo;
                    setAltavozActivo(nuevoEstado);
                    if (nuevoEstado) {
                      hablarAltavoz("Sistema de altavoz de complejo deportivo activado.");
                    }
                  }}
                  style={{
                    padding: '12px 24px', borderRadius: 10, fontSize: 14, fontWeight: 800,
                    background: altavozActivo ? C.emerald : C.cardHover, color: '#fff', border: 'none', cursor: 'pointer',
                    boxShadow: altavozActivo ? `0 0 20px ${C.emerald}60` : 'none', transition: 'all 0.2s'
                  }}
                >
                  {altavozActivo ? '🔊 ALTAVOZ ACTIVADO (MONITOREANDO)' : '🔈 ACTIVAR ALTAVOZ'}
                </button>

                <button
                  onClick={() => hablarAltavoz("Atención por favor. Prueba de sonido y altavoz del complejo deportivo funcionando correctamente.")}
                  style={{ padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 700, background: `${C.blue}20`, border: `1px solid ${C.blue}`, color: C.blue, cursor: 'pointer' }}
                >
                  <Play style={{ width: 16, height: 16, display: 'inline', marginRight: 6 }} /> Probar Altavoz
                </button>
              </div>
            </div>

            {/* Ajustes de Voz & Volumen */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 8 }}>Voz del Locutor/a (TTS)</label>
                <select
                  value={vozSeleccionada}
                  onChange={(e) => setVozSeleccionada(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13 }}
                >
                  {vocesDisponibles.map(v => (
                    <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 8 }}>Volumen de Anuncios: {Math.round(volumen * 100)}%</label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={volumen}
                  onChange={(e) => setVolumen(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: C.emerald }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: 12, color: C.muted }}>ESTADO DEL SCANNER DE TURNOS</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: altavozActivo ? C.emerald : C.muted }}>
                  {altavozActivo ? `● Escaneando cada 6s (Último: ${ultimaComprobacion})` : '○ Scanner pausado'}
                </span>
              </div>
            </div>

            {/* Historial / Audit Feed de Anuncios */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell style={{ color: C.yellow }} /> Bitácora de Anuncios Emitidos por Altavoz
              </h4>

              {anunciosLog.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: C.muted, border: `1px dashed ${C.border}`, borderRadius: 8 }}>
                  <Volume2 style={{ width: 48, height: 48, strokeWidth: 1.5, marginBottom: 12, opacity: 0.5 }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>No se han emitido anuncios por altavoz en esta sesión.</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: 13 }}>Activa el altavoz y los turnos que inicien o finalicen se anunciarán automáticamente.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto' }}>
                  {anunciosLog.map((a, idx) => (
                    <div key={a.id || idx} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
                          background: a.tipo === 'inicio_turno' ? `${C.emerald}20` : a.tipo === 'alerta_5min' ? `${C.yellow}20` : `${C.pink}20`,
                          color: a.tipo === 'inicio_turno' ? C.emerald : a.tipo === 'alerta_5min' ? C.yellow : C.pink,
                          border: `1px solid ${a.tipo === 'inicio_turno' ? C.emerald : a.tipo === 'alerta_5min' ? C.yellow : C.pink}`
                        }}>
                          {a.tipo.replace('_', ' ')}
                        </span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{a.mensaje}</div>
                          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Cancha: {a.cancha} | Usuario: {a.cliente}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: C.muted, fontWeight: 700, whiteSpace: 'nowrap' }}>{a.timestamp}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: GESTIÓN DE CANCHAS ── */}
        {activeTab === 'canchas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Canchas del Complejo</h3>
                <p style={{ margin: '4px 0 0 0', color: C.muted, fontSize: 14 }}>Administra la lista de canchas, superficies y tarifas por hora.</p>
              </div>

              <button
                onClick={() => setModalCancha({
                  nombre: '', deporte: 'Fútbol 5', superficie: 'Césped Sintético',
                  dimensiones: '20x40m', capacidad_jugadores: 10, precio_hora: 120000,
                  precio_hora_nocturna: 150000, hora_inicio_nocturna: '18:00', color: '#10B981', activo: true
                })}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, background: C.emerald, color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
              >
                <Plus style={{ width: 18, height: 18 }} /> Agregar Nueva Cancha
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
              {canchas.map(c => (
                <div key={c.id} style={{ background: C.card, border: `2px solid ${c.color || C.border}`, borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{c.nombre}</h4>
                      <span style={{ fontSize: 12, color: C.muted, display: 'block', marginTop: 2 }}>{c.superficie} • {c.dimensiones || 'Estándar'}</span>
                    </div>
                    <span style={{ background: `${c.color}25`, border: `1px solid ${c.color}`, color: c.color, padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                      {c.deporte}
                    </span>
                  </div>

                  <div style={{ background: C.bg, borderRadius: 8, padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                    <div>
                      <span style={{ color: C.muted, display: 'block', fontSize: 11 }}>TARIFA DÍA</span>
                      <strong style={{ color: C.emerald, fontSize: 15 }}>{c.precio_hora.toLocaleString('es-PY')} Gs/h</strong>
                    </div>
                    <div>
                      <span style={{ color: C.muted, display: 'block', fontSize: 11 }}>NOCTURNA ({c.hora_inicio_nocturna} hs)</span>
                      <strong style={{ color: C.yellow, fontSize: 15 }}>{c.precio_hora_nocturna.toLocaleString('es-PY')} Gs/h</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                    <span style={{ fontSize: 12, color: c.activo ? C.emerald : C.red, fontWeight: 700 }}>
                      {c.activo ? '● Habilitada' : '○ Inhabilitada'}
                    </span>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => setModalCancha(c)}
                        style={{ padding: '6px 12px', background: C.cardHover, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        <Edit2 style={{ width: 14, height: 14, display: 'inline', marginRight: 4 }} /> Editar
                      </button>
                      <button
                        onClick={() => handleDeleteCancha(c.id)}
                        style={{ padding: '6px 12px', background: `${C.red}20`, border: `1px solid ${C.red}`, borderRadius: 6, color: C.red, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 4: GRILLA & RESERVAS ── */}
        {activeTab === 'reservas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Grilla de Reservas & Turnos</h3>
                <p style={{ margin: '4px 0 0 0', color: C.muted, fontSize: 14 }}>Consulta y gestiona las reservas del día seleccionado.</p>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input
                  type="date"
                  value={fechaFiltro}
                  onChange={(e) => setFechaFiltro(e.target.value)}
                  style={{ padding: '10px 14px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, fontWeight: 600 }}
                />

                <button
                  onClick={() => setModalReserva({
                    cancha_id: canchas[0]?.id || '', cliente_nombre: '', cliente_telefono: '',
                    fecha: fechaFiltro, hora_inicio: '18:00', hora_fin: '19:00',
                    precio_total: canchas[0]?.precio_hora || 120000, seña_pagada: 50000,
                    estado: 'confirmada', estado_pago: 'seña_pagada', notas: ''
                  })}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, background: C.emerald, color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                >
                  <Plus style={{ width: 18, height: 18 }} /> Nueva Reserva Manual
                </button>
              </div>
            </div>

            {/* Tabla de Reservas */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, color: C.muted }}>
                    <th style={{ padding: '14px 18px' }}>Cancha</th>
                    <th style={{ padding: '14px 18px' }}>Horario</th>
                    <th style={{ padding: '14px 18px' }}>Cliente</th>
                    <th style={{ padding: '14px 18px' }}>Teléfono</th>
                    <th style={{ padding: '14px 18px' }}>Total / Seña</th>
                    <th style={{ padding: '14px 18px' }}>Estado</th>
                    <th style={{ padding: '14px 18px' }}>Pago</th>
                    <th style={{ padding: '14px 18px', textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {reservas.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: C.muted }}>
                        No hay reservas registradas para el día {fechaFiltro}.
                      </td>
                    </tr>
                  ) : (
                    reservas.map(r => (
                      <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: '14px 18px', fontWeight: 700 }}>
                          <span style={{ width: 10, height: 10, borderRadius: 999, background: r.color, display: 'inline-block', marginRight: 8 }} />
                          {r.cancha_nombre}
                        </td>
                        <td style={{ padding: '14px 18px', fontWeight: 600 }}>{r.hora_inicio} - {r.hora_fin} hs</td>
                        <td style={{ padding: '14px 18px' }}>{r.cliente_nombre}</td>
                        <td style={{ padding: '14px 18px', color: C.muted }}>{r.cliente_telefono || '-'}</td>
                        <td style={{ padding: '14px 18px' }}>
                          <strong style={{ color: C.emerald }}>{r.precio_total.toLocaleString('es-PY')} Gs</strong>
                          {r.seña_pagada > 0 && <span style={{ fontSize: 11, color: C.muted, display: 'block' }}>Seña: {r.seña_pagada.toLocaleString('es-PY')}</span>}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                            background: r.estado === 'confirmada' ? `${C.emerald}20` : r.estado === 'en_curso' ? `${C.yellow}20` : `${C.muted}20`,
                            color: r.estado === 'confirmada' ? C.emerald : r.estado === 'en_curso' ? C.yellow : C.muted
                          }}>
                            {r.estado}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                            background: r.estado_pago === 'pagado' ? `${C.emerald}20` : `${C.yellow}20`,
                            color: r.estado_pago === 'pagado' ? C.emerald : C.yellow
                          }}>
                            {r.estado_pago}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleDeleteReserva(r.id)}
                            style={{ padding: '4px 8px', background: `${C.red}20`, border: `1px solid ${C.red}`, borderRadius: 6, color: C.red, fontSize: 12, cursor: 'pointer' }}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 5: CONFIGURACIÓN DE PÁGINA PÚBLICA & PERFIL ── */}
        {activeTab === 'config' && editPerfil && (
          <form onSubmit={handleSavePerfil} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 36, maxWidth: 850, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text }}>
                  Configuración de Página Pública del Complejo
                </h3>
                <p style={{ margin: '4px 0 0 0', color: C.muted, fontSize: 14 }}>
                  Personaliza la URL pública, el logo de perfil y el banner de tu complejo.
                </p>
              </div>
              <button
                type="submit"
                style={{ padding: '10px 24px', borderRadius: 8, background: C.emerald, color: '#fff', border: 'none', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}
              >
                Guardar Cambios
              </button>
            </div>

            {/* URL Personalizada del Complejo */}
            <div style={{ background: C.bg, border: `1px solid ${C.emerald}60`, borderRadius: 12, padding: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: C.emerald, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                🌐 Tu Enlace Web Público Configurable
              </label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 14, fontWeight: 600 }}>
                  <span style={{ color: C.muted, marginRight: 2 }}>https://micancha.com.py/complejo/</span>
                  <input
                    type="text"
                    required
                    placeholder="nombre-de-tu-complejo"
                    value={editPerfil.slug || ''}
                    onChange={(e) => setEditPerfil({ ...editPerfil, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                    style={{ flex: 1, background: 'none', border: 'none', color: C.emerald, fontWeight: 800, fontSize: 14, outline: 'none' }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const fullUrl = `https://micancha.com.py/complejo/${editPerfil.slug}`;
                    navigator.clipboard.writeText(fullUrl);
                    notify('Enlace copiado al portapapeles');
                  }}
                  style={{ padding: '10px 16px', background: C.cardHover, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  Copiar Enlace
                </button>

                {editPerfil.slug && (
                  <a
                    href={`/complejo/${editPerfil.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ padding: '10px 16px', background: `${C.blue}20`, border: `1px solid ${C.blue}`, borderRadius: 8, color: C.blue, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
                  >
                    Ver Página Pública
                  </a>
                )}
              </div>
            </div>

            {/* SECCIÓN DE FOTOS: FOTO DE PERFIL / LOGO Y FOTO DE PORTADA / BANNER */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24, borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
              
              {/* Imagen de Perfil / Logo */}
              <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <label style={{ fontSize: 14, fontWeight: 800, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📷 Foto de Perfil / Logo</span>
                </label>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 72, height: 72, borderRadius: 999, border: `2px solid ${C.emerald}`, overflow: 'hidden', background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {editPerfil.foto_perfil ? (
                      <img src={editPerfil.foto_perfil} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Building2 style={{ width: 32, height: 32, color: C.muted }} />
                    )}
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ padding: '8px 14px', background: C.cardHover, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'center' }}>
                      Seleccionar de la PC
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (evt) => setEditPerfil({ ...editPerfil, foto_perfil: evt.target?.result as string });
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>

                    <input
                      type="text"
                      placeholder="O pega una URL de imagen..."
                      value={editPerfil.foto_perfil || ''}
                      onChange={(e) => setEditPerfil({ ...editPerfil, foto_perfil: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.muted, fontSize: 12 }}
                    />
                  </div>
                </div>
              </div>

              {/* Imagen de Portada / Banner */}
              <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <label style={{ fontSize: 14, fontWeight: 800, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>🖼️ Foto de Portada / Banner</span>
                </label>
                
                <div style={{ width: '100%', height: 100, borderRadius: 8, border: `1px solid ${C.border}`, overflow: 'hidden', background: C.card, position: 'relative' }}>
                  {editPerfil.foto_portada ? (
                    <img src={editPerfil.foto_portada} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 13 }}>
                      Sin foto de portada
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <label style={{ flex: 1, padding: '8px 14px', background: C.cardHover, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'center' }}>
                    Seleccionar de la PC
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (evt) => setEditPerfil({ ...editPerfil, foto_portada: evt.target?.result as string });
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>

                  <input
                    type="text"
                    placeholder="O URL de portada..."
                    value={editPerfil.foto_portada || ''}
                    onChange={(e) => setEditPerfil({ ...editPerfil, foto_portada: e.target.value })}
                    style={{ flex: 1, padding: '6px 10px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.muted, fontSize: 12 }}
                  />
                </div>
              </div>

            </div>

            {/* DATOS GENERALES DEL COMPLEJO */}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 6 }}>Nombre del Complejo</label>
                  <input
                    type="text"
                    required
                    value={editPerfil.nombre}
                    onChange={(e) => setEditPerfil({ ...editPerfil, nombre: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 6 }}>Ciudad</label>
                  <input
                    type="text"
                    value={editPerfil.ciudad || 'Asunción'}
                    onChange={(e) => setEditPerfil({ ...editPerfil, ciudad: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 6 }}>Descripción del Complejo</label>
                <textarea
                  rows={3}
                  value={editPerfil.descripcion || ''}
                  onChange={(e) => setEditPerfil({ ...editPerfil, descripcion: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 6 }}>Teléfono WhatsApp</label>
                  <input
                    type="text"
                    value={editPerfil.telefono || ''}
                    onChange={(e) => setEditPerfil({ ...editPerfil, telefono: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 6 }}>Email de Contacto</label>
                  <input
                    type="email"
                    value={editPerfil.email || ''}
                    onChange={(e) => setEditPerfil({ ...editPerfil, email: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 6 }}>Horario Apertura</label>
                  <input
                    type="time"
                    value={editPerfil.horario_apertura}
                    onChange={(e) => setEditPerfil({ ...editPerfil, horario_apertura: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 6 }}>Horario Cierre</label>
                  <input
                    type="time"
                    value={editPerfil.horario_cierre}
                    onChange={(e) => setEditPerfil({ ...editPerfil, horario_cierre: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14 }}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              style={{ marginTop: 12, padding: '14px 24px', borderRadius: 8, background: C.emerald, color: '#fff', border: 'none', fontWeight: 800, fontSize: 15, cursor: 'pointer', textAlign: 'center' }}
            >
              Guardar Cambios del Complejo
            </button>
          </form>
        )}

      </main>

      {/* ── MODAL NUEVA/EDITAR CANCHA ── */}
      {modalCancha && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <form onSubmit={handleSaveCancha} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28, width: '100%', maxWidth: 540, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{modalCancha.id ? 'Editar Cancha' : 'Nueva Cancha'}</h3>
              <button type="button" onClick={() => setModalCancha(null)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}>
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Nombre de la Cancha</label>
              <input
                type="text"
                required
                placeholder="Ej. Cancha 1 (Fútbol 5)"
                value={modalCancha.nombre}
                onChange={(e) => setModalCancha({ ...modalCancha, nombre: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 14 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Deporte</label>
                <select
                  value={modalCancha.deporte}
                  onChange={(e) => setModalCancha({ ...modalCancha, deporte: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 14 }}
                >
                  <option value="Fútbol 5">Fútbol 5</option>
                  <option value="Fútbol 7">Fútbol 7</option>
                  <option value="Fútbol 11">Fútbol 11</option>
                  <option value="Pádel">Pádel</option>
                  <option value="Tenis">Tenis</option>
                  <option value="Básquet">Básquet</option>
                  <option value="Vóley">Vóley</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Superficie</label>
                <input
                  type="text"
                  placeholder="Ej. Césped Sintético"
                  value={modalCancha.superficie}
                  onChange={(e) => setModalCancha({ ...modalCancha, superficie: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 14 }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Precio Hora Diurno (Gs)</label>
                <input
                  type="number"
                  required
                  value={modalCancha.precio_hora}
                  onChange={(e) => setModalCancha({ ...modalCancha, precio_hora: parseFloat(e.target.value) })}
                  style={{ width: '100%', padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 14 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Precio Nocturno (Gs)</label>
                <input
                  type="number"
                  required
                  value={modalCancha.precio_hora_nocturna}
                  onChange={(e) => setModalCancha({ ...modalCancha, precio_hora_nocturna: parseFloat(e.target.value) })}
                  style={{ width: '100%', padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 14 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
              <button type="button" onClick={() => setModalCancha(null)} style={{ padding: '10px 16px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.muted, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="submit" style={{ padding: '10px 20px', background: C.emerald, border: 'none', borderRadius: 6, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                Guardar Cancha
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── MODAL NUEVA RESERVA MANUAL ── */}
      {modalReserva && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <form onSubmit={handleSaveReserva} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28, width: '100%', maxWidth: 540, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Reserva Manual de Turno</h3>
              <button type="button" onClick={() => setModalReserva(null)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}>
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Cancha</label>
              <select
                value={modalReserva.cancha_id}
                onChange={(e) => setModalReserva({ ...modalReserva, cancha_id: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 14 }}
              >
                {canchas.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre} ({c.deporte})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Nombre Cliente</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={modalReserva.cliente_nombre}
                  onChange={(e) => setModalReserva({ ...modalReserva, cliente_nombre: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 14 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Teléfono Cliente</label>
                <input
                  type="text"
                  placeholder="Ej. 0981 123 456"
                  value={modalReserva.cliente_telefono}
                  onChange={(e) => setModalReserva({ ...modalReserva, cliente_telefono: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 14 }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Fecha</label>
                <input
                  type="date"
                  required
                  value={modalReserva.fecha}
                  onChange={(e) => setModalReserva({ ...modalReserva, fecha: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 14 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Hora Inicio</label>
                <input
                  type="time"
                  required
                  value={modalReserva.hora_inicio}
                  onChange={(e) => setModalReserva({ ...modalReserva, hora_inicio: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 14 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Hora Fin</label>
                <input
                  type="time"
                  required
                  value={modalReserva.hora_fin}
                  onChange={(e) => setModalReserva({ ...modalReserva, hora_fin: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 14 }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Monto Total (Gs)</label>
                <input
                  type="number"
                  required
                  value={modalReserva.precio_total}
                  onChange={(e) => setModalReserva({ ...modalReserva, precio_total: parseFloat(e.target.value) })}
                  style={{ width: '100%', padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 14 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Seña Pagada (Gs)</label>
                <input
                  type="number"
                  value={modalReserva.seña_pagada}
                  onChange={(e) => setModalReserva({ ...modalReserva, seña_pagada: parseFloat(e.target.value) })}
                  style={{ width: '100%', padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 14 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
              <button type="button" onClick={() => setModalReserva(null)} style={{ padding: '10px 16px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.muted, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="submit" style={{ padding: '10px 20px', background: C.emerald, border: 'none', borderRadius: 6, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                Confirmar Reserva
              </button>
            </div>
          </form>
        </div>
      )}

      <Footer />
    </div>
  );
}
