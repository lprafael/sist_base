"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, AlertCircle, ShieldAlert, Timer, ArrowLeft, Zap, Award, Video, RotateCcw, Wifi, WifiOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';
const WS_URL  = API_URL.replace(/^http/, 'ws');

export default function ArbitrajeCombate({ params }: { params: { id: string } }) {
  const router = useRouter();
  
  const [combateId, setCombateId] = useState("123");
  const [reglamento, setReglamento] = useState<'WKF' | 'ASAM'>('WKF');
  
  // Estado ASAM (Blanco vs Rojo)
  const [blanco, setBlanco] = useState({ puntos: 0, salidas: 0, faltas: 0, nombre: "Juan Perez (Blanco)" });
  const [rojo, setRojo] = useState({ puntos: 0, salidas: 0, faltas: 0, nombre: "Carlos Gomez (Rojo)" });
  
  // Estado WKF (AKA Rojo vs AO Azul)
  const [aka, setAka] = useState({
    nombre: "Competidor AKA (Rojo)",
    puntos: 0, yuko: 0, waza_ari: 0, ippon: 0, senshu: false, jogai: 0, penalizaciones: 0, video_review: 'ACTIVE'
  });
  const [ao, setAo] = useState({
    nombre: "Competidor AO (Azul)",
    puntos: 0, yuko: 0, waza_ari: 0, ippon: 0, senshu: false, jogai: 0, penalizaciones: 0, video_review: 'ACTIVE'
  });

  const [tiempo, setTiempo] = useState(120);
  const [corriendo, setCorriendo] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [modoAlargue, setModoAlargue] = useState(false);

  // ── WebSocket & Video Review ──────────────────────────────────────
  const wsRef = useRef<WebSocket | null>(null);
  const [wsConectado, setWsConectado] = useState(false);
  const [vrModal, setVrModal] = useState<{
    abierto: boolean;
    competidor: 'aka' | 'ao' | 'blanco' | 'rojo' | null;
    tipoSeleccionado: string;
    enviando: boolean;
  }>({ abierto: false, competidor: null, tipoSeleccionado: 'YUKO', enviando: false });
  const [vrActivo, setVrActivo] = useState<{
    activo: boolean; color: string; tipo: string; reviewId: number | null;
  }>({ activo: false, color: '', tipo: '', reviewId: null });

  // Conectar WebSocket cuando cambia el combateId
  useEffect(() => {
    if (!combateId) return;
    const connectWS = () => {
      const ws = new WebSocket(`${WS_URL}/api/vr/ws/${combateId}`);
      wsRef.current = ws;
      ws.onopen  = () => setWsConectado(true);
      ws.onclose = () => { setWsConectado(false); setTimeout(connectWS, 3000); };
      ws.onmessage = (evt) => {
        try { handleWSMsg(JSON.parse(evt.data)); } catch {}
      };
    };
    connectWS();
    return () => wsRef.current?.close();
  }, [combateId]);

  const handleWSMsg = useCallback((msg: any) => {
    if (msg.event === 'VR_SOLICITADO') {
      setCorriendo(false);
      setVrActivo({ activo: true, color: msg.competidor_color, tipo: msg.tipo_solicitud, reviewId: msg.review_id });
      setMensaje(`🎥 VIDEO REVIEW solicitado por ${msg.competidor_color} — ${msg.tipo_solicitud.replace('_','-')}`);
    }
    if (msg.event === 'VR_RESUELTO') {
      setVrActivo({ activo: false, color: '', tipo: '', reviewId: null });
      const col = msg.competidor_color;
      const pts = msg.puntos_otorgados || 0;
      const txt = msg.resultado === 'ACEPTADO'
        ? `✅ VR ACEPTADO · ${col} recibe ${pts} pts`
        : msg.resultado === 'RECHAZADO'
        ? `❌ VR RECHAZADO · Coach ${col} pierde tarjeta`
        : `👁 MIENAI · Coach ${col} conserva tarjeta`;
      setMensaje(txt);
      // Actualizar VR card en estado local
      if (msg.resultado === 'RECHAZADO') {
        if (col === 'Aka') setAka(p => ({ ...p, video_review: 'USED_AND_LOCKED' }));
        if (col === 'Ao')  setAo(p  => ({ ...p, video_review: 'USED_AND_LOCKED' }));
        if (col === 'Blanco') setBlanco(p => ({ ...p } as any));
        if (col === 'Rojo')   setRojo(p   => ({ ...p } as any));
      }
      // Actualizar puntos si ACEPTADO
      if (msg.resultado === 'ACEPTADO' && pts > 0 && reglamento === 'WKF') {
        const setter = col === 'Aka' ? setAka : setAo;
        setter(p => ({ ...p, puntos: p.puntos + pts }));
      }
    }
    if (msg.event === 'SCORE_UPDATE') {
      // Sincroniza marcador desde backend si hay update externo
      const s = msg.state;
      if (s?.aka) setAka(p => ({ ...p, ...s.aka }));
      if (s?.ao)  setAo(p  => ({ ...p, ...s.ao  }));
    }
  }, [reglamento]);

  // Solicitar Video Review al backend
  const solicitarVR = async () => {
    const { competidor, tipoSeleccionado } = vrModal;
    if (!competidor) return;
    setVrModal(p => ({ ...p, enviando: true }));
    const colorMap: Record<string, string> = {
      aka: 'Aka', ao: 'Ao', blanco: 'Blanco', rojo: 'Rojo'
    };
    const tiempoActual = `${Math.floor(tiempo/60)}:${String(tiempo%60).padStart(2,'0')}`;
    try {
      const res = await fetch(`${API_URL}/api/vr/combates/${combateId}/solicitar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competidor_color: colorMap[competidor],
          tipo_solicitud: tipoSeleccionado,
          tiempo_cronometro: tiempoActual,
          reglamento,
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCorriendo(false);
        setMensaje(`🎥 VR solicitado por ${colorMap[competidor]} · ${tipoSeleccionado.replace('_','-')}`);
        setVrModal({ abierto: false, competidor: null, tipoSeleccionado: 'YUKO', enviando: false });
      } else {
        setMensaje(`⚠️ ${data.detail || 'Error al solicitar VR'}`);
        setVrModal(p => ({ ...p, enviando: false }));
      }
    } catch {
      // Fallback local si no hay backend
      const next = competidor === 'aka'
        ? (aka.video_review === 'ACTIVE' ? 'USED_AND_LOCKED' : 'ACTIVE')
        : (ao.video_review  === 'ACTIVE' ? 'USED_AND_LOCKED' : 'ACTIVE');
      if (competidor === 'aka') setAka(p => ({ ...p, video_review: next }));
      if (competidor === 'ao')  setAo(p  => ({ ...p, video_review: next }));
      setCorriendo(false);
      setVrModal({ abierto: false, competidor: null, tipoSeleccionado: 'YUKO', enviando: false });
    }
  };

  useEffect(() => {
    let interval: any;
    if (corriendo && tiempo > 0) {
      interval = setInterval(() => setTiempo((t) => t - 1), 1000);
    } else if (tiempo === 0 && corriendo) {
      setCorriendo(false);
      setMensaje("⏰ Tiempo reglamentario finalizado. Aplicar criterio de desempate.");
    }
    return () => clearInterval(interval);
  }, [corriendo, tiempo]);

  // ASAM Actions
  const registrarEventoASAM = async (competidor: 'blanco' | 'rojo', accion: 'punto' | 'salida' | 'falta' | 'hansoku_directo', valor: number = 1) => {
    try {
      const res = await fetch(`http://localhost:8002/asam/combates/${combateId}/evento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competidor, accion, valor })
      });
      const data = await res.json();
      if (res.ok && data.state) {
        setBlanco(prev => ({...prev, ...data.state.blanco}));
        setRojo(prev => ({...prev, ...data.state.rojo}));
      }
      if (data.message) setMensaje(data.message);
    } catch (e) {
      if (competidor === 'blanco') setBlanco(p => ({...p, [accion + "s"]: Math.max(0, (p as any)[accion + "s"] + valor)}));
      if (competidor === 'rojo') setRojo(p => ({...p, [accion + "s"]: Math.max(0, (p as any)[accion + "s"] + valor)}));
    }
  };

  // WKF Actions
  const registrarEventoWKF = async (competidor: 'aka' | 'ao', accion: string, valor: number = 1) => {
    const isAka = competidor === 'aka';
    const setTarget = isAka ? setAka : setAo;
    const setRival = isAka ? setAo : setAka;
    const target = isAka ? aka : ao;
    const rival = isAka ? ao : aka;

    if (accion === 'yuko' || accion === 'waza_ari' || accion === 'ippon') {
      const ptsVal = accion === 'yuko' ? 1 : accion === 'waza_ari' ? 2 : 3;
      const newPts = Math.max(0, target.puntos + (ptsVal * valor));
      const newCount = Math.max(0, (target as any)[accion] + valor);
      
      let senshuAuto = target.senshu;
      if (valor > 0 && target.puntos === 0 && rival.puntos === 0 && !rival.senshu) {
        senshuAuto = true;
        setMensaje(`🥋 ¡SENSHU para ${target.nombre}! Primer punto del combate.`);
      }

      setTarget(p => ({ ...p, puntos: newPts, [accion]: newCount, senshu: senshuAuto }));

      // Superioridad de 8 puntos
      if (newPts - rival.puntos >= 8) {
        setCorriendo(false);
        setMensaje(`🏆 ¡SUPERIORIDAD TÉCNICA WKF! Diferencia de 8 puntos (${newPts} - ${rival.puntos}). Victoria para ${target.nombre}.`);
      }
    } else if (accion === 'senshu') {
      setTarget(p => ({ ...p, senshu: !p.senshu }));
      setRival(p => ({ ...p, senshu: false }));
      setMensaje(`⚡ Senshu actualizado para ${target.nombre}.`);
    } else if (accion === 'invalidar_punto') {
      setTarget(p => ({ ...p, puntos: Math.max(0, p.puntos - 1) }));
      setMensaje(`⚠️ Punto invalidado para ${target.nombre} por Falta de Zanshin.`);
    } else if (accion === 'jogai' || accion === 'penalizacion') {
      const field = accion === 'jogai' ? 'jogai' : 'penalizaciones';
      setTarget(p => ({ ...p, [field]: Math.max(0, p[field] + valor) }));
    } else if (accion === 'video_review') {
      // Abre el modal de solicitud VR en lugar del toggle simple
      setVrModal({ abierto: true, competidor: competidor as any, tipoSeleccionado: 'YUKO', enviando: false });
      return;
    } else if (accion === 'hansoku_directo') {
      setCorriendo(false);
      setMensaje(`🛑 ¡HANSOKU DIRECTO! Descalificación de ${target.nombre}. Victoria para ${rival.nombre}.`);
    }
  };

  const aplicarDesempateWKF = () => {
    if (aka.puntos !== ao.puntos) {
      alert("El desempate sólo aplica en caso de igualdad de puntos.");
      return;
    }
    // 1. Senshu
    if (aka.senshu && !ao.senshu) {
      setMensaje(`🏆 Victoria WKF para AKA (${aka.nombre}) por Senshu (Criterio 1).`);
      return;
    }
    if (ao.senshu && !aka.senshu) {
      setMensaje(`🏆 Victoria WKF para AO (${ao.nombre}) por Senshu (Criterio 1).`);
      return;
    }
    // 2. Ippons
    if (aka.ippon > ao.ippon) {
      setMensaje(`🏆 Victoria WKF para AKA (${aka.nombre}) por Mayor cantidad de Ippon (${aka.ippon} vs ${ao.ippon}).`);
      return;
    }
    if (ao.ippon > aka.ippon) {
      setMensaje(`🏆 Victoria WKF para AO (${ao.nombre}) por Mayor cantidad de Ippon (${ao.ippon} vs ${aka.ippon}).`);
      return;
    }
    // 3. Waza-Aris
    if (aka.waza_ari > ao.waza_ari) {
      setMensaje(`🏆 Victoria WKF para AKA (${aka.nombre}) por Mayor cantidad de Waza-Ari (${aka.waza_ari} vs ${ao.waza_ari}).`);
      return;
    }
    if (ao.waza_ari > aka.waza_ari) {
      setMensaje(`🏆 Victoria WKF para AO (${ao.nombre}) por Mayor cantidad de Waza-Ari (${ao.waza_ari} vs ${aka.waza_ari}).`);
      return;
    }
    // 4. Hantei
    setMensaje(`⚖️ Empate absoluto en Senshu, Ippons y Waza-Aris. Requiere votación por banderas del panel arbitral (Hantei).`);
  };

  const formatTiempo = (seg: number) => {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 font-sans">

      {/* ── Modal VR ─────────────────────────────────────────────────── */}
      {vrModal.abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-black text-amber-400 mb-2 flex items-center gap-2">
              <Video size={20} /> Solicitud de Video Review
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              Coach de <span className="font-black text-white uppercase">{vrModal.competidor}</span> — seleccioná el tipo de reclamo:
            </p>

            {reglamento === 'WKF' && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {['YUKO', 'WAZA_ARI', 'IPPON', 'SENSHU'].map(tipo => (
                  <button key={tipo} onClick={() => setVrModal(p => ({ ...p, tipoSeleccionado: tipo }))}
                    className={`py-3 rounded-xl font-black text-sm transition ${
                      vrModal.tipoSeleccionado === tipo
                        ? 'bg-amber-500 text-slate-950 shadow-lg'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}>
                    {tipo.replace('_', '-')}
                  </button>
                ))}
              </div>
            )}
            {reglamento === 'ASAM' && (
              <div className="mb-6">
                <button
                  onClick={() => setVrModal(p => ({ ...p, tipoSeleccionado: 'OTRO' }))}
                  className="w-full py-3 bg-amber-500 text-slate-950 rounded-xl font-black text-sm">
                  PUNTO (+1)
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setVrModal({ abierto: false, competidor: null, tipoSeleccionado: 'YUKO', enviando: false })}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-sm">
                Cancelar
              </button>
              <button onClick={solicitarVR} disabled={vrModal.enviando}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black text-sm disabled:opacity-50">
                {vrModal.enviando ? 'Enviando...' : '🎥 Solicitar VR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Banner VR activo en árbitro de mesa ─────────────────────── */}
      {vrActivo.activo && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 bg-amber-500 text-slate-950 px-8 py-3 rounded-2xl font-black text-sm shadow-xl flex items-center gap-2 animate-pulse">
          <Video size={18} />
          VIDEO REVIEW · {vrActivo.color?.toUpperCase()} · Esperando veredicto del Juez VR...
        </div>
      )}
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-3 hover:bg-slate-800 rounded-xl transition">
            <ArrowLeft size={24} />
          </button>
          {wsConectado
            ? <Wifi size={14} className="text-emerald-400" />
            : <WifiOff size={14} className="text-slate-600" />
          }
          <span className="text-xs text-slate-500 font-mono">Match {combateId}</span>
        </div>

        <div className="text-center flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => { setReglamento('WKF'); setTiempo(120); setCorriendo(false); }}
              className={`px-4 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition ${
                reglamento === 'WKF' ? 'bg-red-600 text-white shadow-md' : 'bg-slate-800 text-slate-400'
              }`}
            >
              Reglamento WKF (Karate)
            </button>
            <button
              onClick={() => { setReglamento('ASAM'); setTiempo(90); setCorriendo(false); }}
              className={`px-4 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition ${
                reglamento === 'ASAM' ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-800 text-slate-400'
              }`}
            >
              Reglamento ASAM (MMA)
            </button>
            <button
              onClick={() => router.push(`/torneos/${params.id}/arbitraje/baloncesto`)}
              className="px-4 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition bg-slate-800 text-amber-400 hover:bg-slate-700 border border-amber-500/30 flex items-center gap-1"
            >
              <span>🏀</span> Baloncesto (FIBA/NBA)
            </button>
          </div>

          <div className="text-5xl font-black font-mono tracking-widest text-slate-100 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            {formatTiempo(tiempo)}
          </div>

          <div className="flex gap-3 mt-3">
            <button onClick={() => setCorriendo(!corriendo)} className={`px-6 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition ${corriendo ? 'bg-amber-500 text-slate-950' : 'bg-emerald-600 text-white'}`}>
              {corriendo ? 'Pausar' : 'Iniciar'}
            </button>
            <button onClick={() => { setTiempo(reglamento === 'WKF' ? 120 : 90); setCorriendo(false); setModoAlargue(false); }} className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-xs">
              Reiniciar
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/torneos/${params.id}/tatami/1/camara?matchId=${combateId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-red-400 border border-red-500/30 rounded-xl text-xs font-black transition shadow-sm"
            title="Abrir Cámara del Tatami (Celular / Webcam)"
          >
            <Video size={14} />
            <span className="hidden md:inline">Cámara Tatami</span>
          </a>
          <a
            href={`/torneos/${params.id}/vr-station`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-black transition shadow-sm"
            title="Abrir Panel Juez VR (Tablet)"
          >
            <span>⚖️</span>
            <span className="hidden md:inline">Juez VR</span>
          </a>
        </div>
      </div>

      {mensaje && (
        <div className="bg-red-600 text-white p-3 rounded-2xl text-center font-black mb-6 text-sm shadow-lg animate-pulse flex items-center justify-center gap-2">
          <AlertCircle size={18} />
          <span>{mensaje}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* ARENA WKF (KARATE)                                           */}
      {/* ============================================================ */}
      {reglamento === 'WKF' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* LADO AKA (ROJO) */}
            <div className="bg-slate-900/90 rounded-3xl p-6 border-4 border-red-600 flex flex-col items-center relative overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between w-full mb-4">
                <span className="bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full uppercase">AKA (Rojo)</span>
                {aka.senshu && (
                  <span className="bg-amber-400 text-slate-950 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1 animate-pulse">
                    <Award size={14} /> SENSHU
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-black mb-4 text-white text-center">{aka.nombre}</h2>

              <div className="text-8xl font-black mb-4 font-mono text-red-500">
                {aka.puntos}
              </div>

              <div className="flex gap-2 text-xs font-bold mb-4">
                <span className="bg-slate-800 px-2 py-1 rounded text-red-400">Yuko: {aka.yuko}</span>
                <span className="bg-slate-800 px-2 py-1 rounded text-amber-400">W-Ari: {aka.waza_ari}</span>
                <span className="bg-slate-800 px-2 py-1 rounded text-emerald-400">Ippon: {aka.ippon}</span>
              </div>

              {/* Botones de Técnicas */}
              <div className="grid grid-cols-3 gap-2 w-full mb-3">
                <button onClick={() => registrarEventoWKF('aka', 'yuko', 1)} className="py-3 bg-red-600 hover:bg-red-500 rounded-xl font-black text-sm">+1 YUKO</button>
                <button onClick={() => registrarEventoWKF('aka', 'waza_ari', 1)} className="py-3 bg-amber-600 hover:bg-amber-500 rounded-xl font-black text-sm">+2 WAZA-ARI</button>
                <button onClick={() => registrarEventoWKF('aka', 'ippon', 1)} className="py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-black text-sm">+3 IPPON</button>
                
                <button onClick={() => registrarEventoWKF('aka', 'yuko', -1)} className="py-1 bg-slate-800 text-slate-400 rounded-lg text-[10px]">-1 Yuko</button>
                <button onClick={() => registrarEventoWKF('aka', 'waza_ari', -1)} className="py-1 bg-slate-800 text-slate-400 rounded-lg text-[10px]">-1 W-Ari</button>
                <button onClick={() => registrarEventoWKF('aka', 'ippon', -1)} className="py-1 bg-slate-800 text-slate-400 rounded-lg text-[10px]">-1 Ippon</button>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full mb-3">
                <button onClick={() => registrarEventoWKF('aka', 'senshu')} className={`py-2 rounded-xl font-bold text-xs ${aka.senshu ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'}`}>
                  {aka.senshu ? '★ Senshu Activo' : 'Asignar Senshu'}
                </button>
                <button onClick={() => registrarEventoWKF('aka', 'invalidar_punto')} className="py-2 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1">
                  <RotateCcw size={14} /> Falta Zanshin
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full mb-3">
                <button onClick={() => registrarEventoWKF('aka', 'jogai', 1)} className="py-2 bg-orange-950/40 border border-orange-500/40 text-orange-300 rounded-xl font-bold text-xs">
                  Jogai ({aka.jogai})
                </button>
                <button onClick={() => registrarEventoWKF('aka', 'penalizacion', 1)} className="py-2 bg-red-950/40 border border-red-500/40 text-red-300 rounded-xl font-bold text-xs">
                  Penalización ({aka.penalizaciones})
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full">
                <button onClick={() => registrarEventoWKF('aka', 'video_review')} className={`py-2 rounded-xl font-bold text-xs ${aka.video_review === 'ACTIVE' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-red-950 text-red-400 line-through'}`}>
                  VR Card: {aka.video_review === 'ACTIVE' ? 'DISP.' : 'BLOQ.'}
                </button>
                <button onClick={() => registrarEventoWKF('aka', 'hansoku_directo')} className="py-2 bg-red-950 text-red-300 border border-red-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1">
                  <ShieldAlert size={14} /> Hansoku
                </button>
              </div>

            </div>

            {/* LADO AO (AZUL) */}
            <div className="bg-slate-900/90 rounded-3xl p-6 border-4 border-blue-600 flex flex-col items-center relative overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between w-full mb-4">
                <span className="bg-blue-600 text-white text-xs font-black px-3 py-1 rounded-full uppercase">AO (Azul)</span>
                {ao.senshu && (
                  <span className="bg-amber-400 text-slate-950 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1 animate-pulse">
                    <Award size={14} /> SENSHU
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-black mb-4 text-white text-center">{ao.nombre}</h2>

              <div className="text-8xl font-black mb-4 font-mono text-blue-500">
                {ao.puntos}
              </div>

              <div className="flex gap-2 text-xs font-bold mb-4">
                <span className="bg-slate-800 px-2 py-1 rounded text-blue-400">Yuko: {ao.yuko}</span>
                <span className="bg-slate-800 px-2 py-1 rounded text-amber-400">W-Ari: {ao.waza_ari}</span>
                <span className="bg-slate-800 px-2 py-1 rounded text-emerald-400">Ippon: {ao.ippon}</span>
              </div>

              {/* Botones de Técnicas */}
              <div className="grid grid-cols-3 gap-2 w-full mb-3">
                <button onClick={() => registrarEventoWKF('ao', 'yuko', 1)} className="py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-black text-sm">+1 YUKO</button>
                <button onClick={() => registrarEventoWKF('ao', 'waza_ari', 1)} className="py-3 bg-amber-600 hover:bg-amber-500 rounded-xl font-black text-sm">+2 WAZA-ARI</button>
                <button onClick={() => registrarEventoWKF('ao', 'ippon', 1)} className="py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-black text-sm">+3 IPPON</button>
                
                <button onClick={() => registrarEventoWKF('ao', 'yuko', -1)} className="py-1 bg-slate-800 text-slate-400 rounded-lg text-[10px]">-1 Yuko</button>
                <button onClick={() => registrarEventoWKF('ao', 'waza_ari', -1)} className="py-1 bg-slate-800 text-slate-400 rounded-lg text-[10px]">-1 W-Ari</button>
                <button onClick={() => registrarEventoWKF('ao', 'ippon', -1)} className="py-1 bg-slate-800 text-slate-400 rounded-lg text-[10px]">-1 Ippon</button>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full mb-3">
                <button onClick={() => registrarEventoWKF('ao', 'senshu')} className={`py-2 rounded-xl font-bold text-xs ${ao.senshu ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'}`}>
                  {ao.senshu ? '★ Senshu Activo' : 'Asignar Senshu'}
                </button>
                <button onClick={() => registrarEventoWKF('ao', 'invalidar_punto')} className="py-2 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1">
                  <RotateCcw size={14} /> Falta Zanshin
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full mb-3">
                <button onClick={() => registrarEventoWKF('ao', 'jogai', 1)} className="py-2 bg-orange-950/40 border border-orange-500/40 text-orange-300 rounded-xl font-bold text-xs">
                  Jogai ({ao.jogai})
                </button>
                <button onClick={() => registrarEventoWKF('ao', 'penalizacion', 1)} className="py-2 bg-red-950/40 border border-red-500/40 text-red-300 rounded-xl font-bold text-xs">
                  Penalización ({ao.penalizaciones})
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full">
                <button onClick={() => registrarEventoWKF('ao', 'video_review')} className={`py-2 rounded-xl font-bold text-xs ${ao.video_review === 'ACTIVE' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-red-950 text-red-400 line-through'}`}>
                  VR Card: {ao.video_review === 'ACTIVE' ? 'DISP.' : 'BLOQ.'}
                </button>
                <button onClick={() => registrarEventoWKF('ao', 'hansoku_directo')} className="py-2 bg-red-950 text-red-300 border border-red-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1">
                  <ShieldAlert size={14} /> Hansoku
                </button>
              </div>

            </div>

          </div>

          <div className="flex justify-center">
            <button onClick={aplicarDesempateWKF} className="px-8 py-3.5 bg-gradient-to-r from-red-600 to-blue-600 hover:from-red-500 hover:to-blue-500 rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl flex items-center gap-2">
              <Award size={18} /> Evaluar Desempate WKF (Senshu → Ippon → Waza-Ari → Hantei)
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ARENA ASAM (MMA)                                             */}
      {/* ============================================================ */}
      {reglamento === 'ASAM' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* LADO BLANCO */}
            <div className="bg-white/10 rounded-3xl p-6 border-4 border-white flex flex-col items-center relative overflow-hidden">
              <h2 className="text-3xl font-black mb-6 text-white">{blanco.nombre}</h2>
              <div className="text-9xl font-black mb-8 font-mono text-white">{blanco.puntos}</div>
              
              <div className="grid grid-cols-3 gap-2 w-full">
                <button onClick={() => registrarEventoASAM('blanco', 'punto', 1)} className="col-span-3 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-black text-xl">+1 Punto</button>
                <button onClick={() => registrarEventoASAM('blanco', 'punto', -1)} className="col-span-3 py-1 bg-blue-900 text-blue-200 rounded-lg text-xs mb-2">-1 Punto</button>
                <button onClick={() => registrarEventoASAM('blanco', 'salida', 1)} className="col-span-1 py-2 bg-orange-600 rounded-xl font-bold text-xs">Salida ({blanco.salidas})</button>
                <button onClick={() => registrarEventoASAM('blanco', 'falta', 1)} className="col-span-2 py-2 bg-red-600 rounded-xl font-bold text-xs">Falta ({blanco.faltas})</button>
                <button onClick={() => registrarEventoASAM('blanco', 'hansoku_directo')} className="col-span-3 mt-2 py-2 bg-red-950 border border-red-500 text-red-300 rounded-xl font-bold text-xs">Hansoku Directo</button>
              </div>
            </div>

            {/* LADO ROJO */}
            <div className="bg-red-900/40 rounded-3xl p-6 border-4 border-red-600 flex flex-col items-center relative overflow-hidden">
              <h2 className="text-3xl font-black mb-6 text-red-400">{rojo.nombre}</h2>
              <div className="text-9xl font-black mb-8 font-mono text-red-500">{rojo.puntos}</div>
              
              <div className="grid grid-cols-3 gap-2 w-full">
                <button onClick={() => registrarEventoASAM('rojo', 'punto', 1)} className="col-span-3 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-black text-xl">+1 Punto</button>
                <button onClick={() => registrarEventoASAM('rojo', 'punto', -1)} className="col-span-3 py-1 bg-blue-900 text-blue-200 rounded-lg text-xs mb-2">-1 Punto</button>
                <button onClick={() => registrarEventoASAM('rojo', 'salida', 1)} className="col-span-1 py-2 bg-orange-600 rounded-xl font-bold text-xs">Salida ({rojo.salidas})</button>
                <button onClick={() => registrarEventoASAM('rojo', 'falta', 1)} className="col-span-2 py-2 bg-red-600 rounded-xl font-bold text-xs">Falta ({rojo.faltas})</button>
                <button onClick={() => registrarEventoASAM('rojo', 'hansoku_directo')} className="col-span-3 mt-2 py-2 bg-red-950 border border-red-500 text-red-300 rounded-xl font-bold text-xs">Hansoku Directo</button>
              </div>
            </div>

          </div>

          <div className="flex justify-center gap-4">
            <button onClick={() => { setModoAlargue(true); setTiempo(60); setCorriendo(true); setMensaje("⚡ Minuto de Oro iniciado."); }} className="px-8 py-3 bg-amber-600 hover:bg-amber-500 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center gap-2">
              <Zap size={18} /> Minuto de Oro (1:00)
            </button>
            <button onClick={() => setMensaje("Hantei evaluado según Tabla Oficial ASAM")} className="px-8 py-3 bg-purple-600 hover:bg-purple-500 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert size={18} /> Aplicar Hantei (ASAM)
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
