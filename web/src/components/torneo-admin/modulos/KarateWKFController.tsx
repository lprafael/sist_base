import React, { useState, useEffect } from 'react';
import { X, Play, Pause, RotateCcw, Check, Trophy, User, ShieldAlert, AlertTriangle, Zap, Flame, Video, Award } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function KarateWKFController({
  match,
  onClose,
  onSaved,
  onUpdate
}: {
  match: any;
  onClose: () => void;
  onSaved?: () => void;
  onUpdate?: () => void;
}) {
  const [estado, setEstado] = useState(match.estado || 'programado');
  const [estadisticas, setEstadisticas] = useState<any>(() => {
    const raw = match.estadisticas || {};
    const statsObj = typeof raw === 'string' ? (JSON.parse(raw) || {}) : raw;
    return {
      tipo_reglamento: 'WKF',
      local: {
        puntos: typeof statsObj.local === 'object' ? statsObj.local.puntos || 0 : (match.goles_local || 0),
        yuko: typeof statsObj.local === 'object' ? statsObj.local.yuko || 0 : 0,
        waza_ari: typeof statsObj.local === 'object' ? statsObj.local.waza_ari || 0 : 0,
        ippon: typeof statsObj.local === 'object' ? statsObj.local.ippon || 0 : 0,
        senshu: typeof statsObj.local === 'object' ? Boolean(statsObj.local.senshu) : false,
        jogai: typeof statsObj.local === 'object' ? statsObj.local.jogai || 0 : 0,
        penalizaciones: typeof statsObj.local === 'object' ? statsObj.local.penalizaciones || 0 : 0,
        video_review: typeof statsObj.local === 'object' ? statsObj.local.video_review || 'ACTIVE' : 'ACTIVE',
      },
      visitante: {
        puntos: typeof statsObj.visitante === 'object' ? statsObj.visitante.puntos || 0 : (match.goles_visitante || 0),
        yuko: typeof statsObj.visitante === 'object' ? statsObj.visitante.yuko || 0 : 0,
        waza_ari: typeof statsObj.visitante === 'object' ? statsObj.visitante.waza_ari || 0 : 0,
        ippon: typeof statsObj.visitante === 'object' ? statsObj.visitante.ippon || 0 : 0,
        senshu: typeof statsObj.visitante === 'object' ? Boolean(statsObj.visitante.senshu) : false,
        jogai: typeof statsObj.visitante === 'object' ? statsObj.visitante.jogai || 0 : 0,
        penalizaciones: typeof statsObj.visitante === 'object' ? statsObj.visitante.penalizaciones || 0 : 0,
        video_review: typeof statsObj.visitante === 'object' ? statsObj.visitante.video_review || 'ACTIVE' : 'ACTIVE',
      },
      metodo_victoria: statsObj.metodo_victoria || null,
      ganador_lado: statsObj.ganador_lado || null
    };
  });

  const [duracionCombate, setDuracionCombate] = useState<number>(120); // 2:00 por defecto
  const [timer, setTimer] = useState<number>(120);
  const [isRunning, setIsRunning] = useState(false);
  const [alertaCombate, setAlertaCombate] = useState<string | null>(null);
  const [hanteiModal, setHanteiModal] = useState<{ visible: boolean; ganador: string | null; motivo: string; status: string } | null>(null);

  const ptAka = estadisticas.local.puntos;
  const ptAo = estadisticas.visitante.puntos;
  const nombreAka = match.jugador_local_nombre || match.local_nombre || 'AKA (Rojo)';
  const nombreAo = match.jugador_visitante_nombre || match.visitante_nombre || 'AO (Azul)';

  // Chronometer
  useEffect(() => {
    let interval: any;
    if (isRunning) {
      interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            setAlertaCombate("⏰ ¡Tiempo Reglamentario Finalizado! Aplica la resolución de empate WKF si persiste igualdad.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (!isRunning && timer !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRunning, timer]);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getToken = () => {
    try {
      const session = JSON.parse(localStorage.getItem('user_session') || '{}');
      return session.access_token || session.token || '';
    } catch {
      return '';
    }
  };

  const handleSave = async (nuevoEstado?: string, ganadorId?: string | null, customStats?: any) => {
    const estadoFinal = nuevoEstado || estado;
    const statsToSave = customStats || estadisticas;
    try {
      await fetch(`${API_URL}/cancha/torneos/partidos/${match.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({
          goles_local: statsToSave.local.puntos,
          goles_visitante: statsToSave.visitante.puntos,
          estado: estadoFinal,
          estadisticas: statsToSave,
          ...(ganadorId ? { ganador_id: ganadorId } : {})
        })
      });
    } catch (e) {
      console.error("Error guardando combate WKF:", e);
    }
  };

  const mapEstadoToSelect = (st: string) => {
    if (st === 'en_curso') return 'EN VIVO';
    if (st === 'finalizado') return 'FINALIZADO';
    return 'NO REALIZADO';
  };

  const handleStateChange = (val: string) => {
    let newSt = 'programado';
    if (val === 'EN VIVO') newSt = 'en_curso';
    if (val === 'FINALIZADO') newSt = 'finalizado';
    setEstado(newSt);
  };

  // Motor WKF: Asignación de técnicas y puntos
  const addTechnique = (lado: 'local' | 'visitante', tech: 'yuko' | 'waza_ari' | 'ippon', delta: number = 1) => {
    const ptsValue = tech === 'yuko' ? 1 : tech === 'waza_ari' ? 2 : 3;
    const techName = tech === 'yuko' ? 'Yuko (+1)' : tech === 'waza_ari' ? 'Waza-Ari (+2)' : 'Ippon (+3)';
    const rivalLado = lado === 'local' ? 'visitante' : 'local';
    const atleta = lado === 'local' ? nombreAka : nombreAo;
    const rivalAtleta = rivalLado === 'local' ? nombreAka : nombreAo;

    setEstadisticas((prev: any) => {
      const n = JSON.parse(JSON.stringify(prev));
      const currentTechCount = n[lado][tech] || 0;
      const newTechCount = Math.max(0, currentTechCount + delta);
      n[lado][tech] = newTechCount;

      const currentPts = n[lado].puntos || 0;
      const newPts = Math.max(0, currentPts + (ptsValue * delta));
      n[lado].puntos = newPts;

      // 1. Senshu automático al primer punto sin oposición
      if (delta > 0 && currentPts === 0 && (n[rivalLado].puntos || 0) === 0 && !n[rivalLado].senshu) {
        n[lado].senshu = true;
        setAlertaCombate(`🥋 ¡SENSHU para ${atleta}! Primer punto de la contienda marcado.`);
      }

      // 2. Regla WKF: Superioridad de 8 Puntos (Diferencia >= 8)
      const diff = n[lado].puntos - n[rivalLado].puntos;
      if (diff >= 8) {
        setIsRunning(false);
        n.ganador_lado = lado;
        n.metodo_victoria = `Ventaja de 8 Puntos (Superioridad Técnica WKF: ${n[lado].puntos} - ${n[rivalLado].puntos})`;
        setAlertaCombate(`🏆 ¡SUPERIORIDAD TÉCNICA WKF! Diferencia de 8 puntos alcanzada (${n[lado].puntos} - ${n[rivalLado].puntos}). Victoria para ${atleta}.`);
        setEstado('finalizado');
        const ganadorId = lado === 'local' ? match.equipo_local_id : match.equipo_visitante_id;
        handleSave('finalizado', ganadorId, n);
      } else if (-diff >= 8) {
        setIsRunning(false);
        n.ganador_lado = rivalLado;
        n.metodo_victoria = `Ventaja de 8 Puntos (Superioridad Técnica WKF: ${n[rivalLado].puntos} - ${n[lado].puntos})`;
        setAlertaCombate(`🏆 ¡SUPERIORIDAD TÉCNICA WKF! Diferencia de 8 puntos alcanzada (${n[rivalLado].puntos} - ${n[lado].puntos}). Victoria para ${rivalAtleta}.`);
        setEstado('finalizado');
        const ganadorId = rivalLado === 'local' ? match.equipo_local_id : match.equipo_visitante_id;
        handleSave('finalizado', ganadorId, n);
      }

      return n;
    });
  };

  // Toggle manual de Senshu
  const toggleSenshu = (lado: 'local' | 'visitante') => {
    const rival = lado === 'local' ? 'visitante' : 'local';
    const atleta = lado === 'local' ? nombreAka : nombreAo;
    setEstadisticas((prev: any) => {
      const n = JSON.parse(JSON.stringify(prev));
      const current = n[lado].senshu;
      n[lado].senshu = !current;
      if (!current) {
        n[rival].senshu = false;
        setAlertaCombate(`⚡ Senshu asignado manualmente a ${atleta}.`);
      } else {
        setAlertaCombate(`Senshu retirado de ${atleta}.`);
      }
      return n;
    });
  };

  // Invalidación por falta de Zanshin (Art. 1.3 / 3.1)
  const invalidarUltimoPuntoZanshin = (lado: 'local' | 'visitante') => {
    const atleta = lado === 'local' ? nombreAka : nombreAo;
    if (!confirm(`¿Invalidar punto previo de ${atleta} por Falta de Zanshin / Decisión Arbitral?`)) return;

    setEstadisticas((prev: any) => {
      const n = JSON.parse(JSON.stringify(prev));
      if (n[lado].puntos > 0) {
        n[lado].puntos = Math.max(0, n[lado].puntos - 1);
        if (n[lado].yuko > 0) n[lado].yuko -= 1;
        else if (n[lado].waza_ari > 0) n[lado].waza_ari -= 1;
        else if (n[lado].ippon > 0) n[lado].ippon -= 1;
      }
      setAlertaCombate(`⚠️ Punto invalidado para ${atleta} por Falta de Zanshin (Conciencia continua).`);
      return n;
    });
  };

  // Incrementos de Jogai (Salidas) y Penalizaciones (Chui / Hansoku)
  const updatePenalidades = (lado: 'local' | 'visitante', tipo: 'jogai' | 'penalizaciones', delta: number) => {
    setEstadisticas((prev: any) => {
      const n = JSON.parse(JSON.stringify(prev));
      n[lado][tipo] = Math.max(0, (n[lado][tipo] || 0) + delta);
      return n;
    });
  };

  // Gestión de Video Review Card del Coach
  const toggleVideoReview = (lado: 'local' | 'visitante') => {
    const atleta = lado === 'local' ? nombreAka : nombreAo;
    setEstadisticas((prev: any) => {
      const n = JSON.parse(JSON.stringify(prev));
      const current = n[lado].video_review || 'ACTIVE';
      const next = current === 'ACTIVE' ? 'USED_AND_LOCKED' : 'ACTIVE';
      n[lado].video_review = next;
      setAlertaCombate(
        next === 'USED_AND_LOCKED'
          ? `🔒 Tarjeta de Video Review utilizada y BLOQUEADA para el Coach de ${atleta}.`
          : `✅ Tarjeta de Video Review HABILITADA para el Coach de ${atleta}.`
      );
      return n;
    });
  };

  // Descalificación Directa por Hansoku (WKF)
  const aplicarHansokuDirecto = (ladoInfractor: 'local' | 'visitante') => {
    const rival = ladoInfractor === 'local' ? 'visitante' : 'local';
    const nombreInfractor = ladoInfractor === 'local' ? nombreAka : nombreAo;
    const nombreRival = rival === 'local' ? nombreAka : nombreAo;

    if (!confirm(`🛑 ¿Confirmar DESCALIFICACIÓN DIRECTA (HANSOKU) de ${nombreInfractor} según reglamento WKF?`)) {
      return;
    }

    setIsRunning(false);
    const n = JSON.parse(JSON.stringify(estadisticas));
    n.ganador_lado = rival;
    n.metodo_victoria = `Hansoku Directo (Descalificación de ${nombreInfractor})`;
    setEstadisticas(n);
    setAlertaCombate(`🛑 ¡HANSOKU! Descalificación oficial de ${nombreInfractor}. Victoria otorgada a ${nombreRival}.`);
    setEstado('finalizado');
    const ganadorId = rival === 'local' ? match.equipo_local_id : match.equipo_visitante_id;
    handleSave('finalizado', ganadorId, n);
  };

  // Evaluación de Desempate Oficial WKF: 1. Senshu -> 2. Ippons -> 3. Waza-Aris -> 4. Hantei
  const evaluarDesempateWKF = () => {
    if (ptAka !== ptAo) {
      alert("El desempate WKF sólo se aplica si el marcador de puntos está empatado.");
      return;
    }

    const loc = estadisticas.local;
    const vis = estadisticas.visitante;

    // 1. Senshu
    if (loc.senshu && !vis.senshu) {
      setHanteiModal({
        visible: true,
        ganador: 'local',
        motivo: `Criterio 1 WKF: ${nombreAka} tiene la ventaja de Senshu (Primer punto de la contienda).`,
        status: 'resuelto'
      });
      return;
    }
    if (vis.senshu && !loc.senshu) {
      setHanteiModal({
        visible: true,
        ganador: 'visitante',
        motivo: `Criterio 1 WKF: ${nombreAo} tiene la ventaja de Senshu (Primer punto de la contienda).`,
        status: 'resuelto'
      });
      return;
    }

    // 2. Mayor número de Ippons
    const ippAka = loc.ippon || 0;
    const ippAo = vis.ippon || 0;
    if (ippAka > ippAo) {
      setHanteiModal({
        visible: true,
        ganador: 'local',
        motivo: `Criterio 2 WKF: ${nombreAka} tiene mayor cantidad de Ippon (${ippAka} vs ${ippAo}).`,
        status: 'resuelto'
      });
      return;
    }
    if (ippAo > ippAka) {
      setHanteiModal({
        visible: true,
        ganador: 'visitante',
        motivo: `Criterio 2 WKF: ${nombreAo} tiene mayor cantidad de Ippon (${ippAo} vs ${ippAka}).`,
        status: 'resuelto'
      });
      return;
    }

    // 3. Mayor número de Waza-Aris
    const wazAka = loc.waza_ari || 0;
    const wazAo = vis.waza_ari || 0;
    if (wazAka > wazAo) {
      setHanteiModal({
        visible: true,
        ganador: 'local',
        motivo: `Criterio 3 WKF: ${nombreAka} tiene mayor cantidad de Waza-Ari (${wazAka} vs ${wazAo}).`,
        status: 'resuelto'
      });
      return;
    }
    if (wazAo > wazAka) {
      setHanteiModal({
        visible: true,
        ganador: 'visitante',
        motivo: `Criterio 3 WKF: ${nombreAo} tiene mayor cantidad de Waza-Ari (${wazAo} vs ${wazAka}).`,
        status: 'resuelto'
      });
      return;
    }

    // 4. Hantei
    setHanteiModal({
      visible: true,
      ganador: null,
      motivo: `Empate absoluto en puntos, Senshu, Ippons (${ippAka}) y Waza-Aris (${wazAka}). Requiere votación por banderas del panel arbitral (Hantei).`,
      status: 'hantei_votacion'
    });
  };

  const confirmarVictoriaHantei = (ganadorLado: 'local' | 'visitante', motivo: string) => {
    const n = JSON.parse(JSON.stringify(estadisticas));
    n.ganador_lado = ganadorLado;
    n.metodo_victoria = `Decisión Arbitral WKF (${motivo})`;
    setEstadisticas(n);
    setEstado('finalizado');
    const ganadorId = ganadorLado === 'local' ? match.equipo_local_id : match.equipo_visitante_id;
    const nombreGanador = ganadorLado === 'local' ? nombreAka : nombreAo;
    handleSave('finalizado', ganadorId, n);
    setHanteiModal(null);
    setAlertaCombate(`🏆 Ganador Oficial WKF: ${nombreGanador} (${motivo})`);
  };

  // Autoguardado con debounce
  const [isInitialMount, setIsInitialMount] = useState(true);
  useEffect(() => {
    if (isInitialMount) {
      setIsInitialMount(false);
      return;
    }
    const delay = setTimeout(() => {
      handleSave(estado);
    }, 500);
    return () => clearTimeout(delay);
  }, [estadisticas, estado]);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-3 animate-fadeIn">
      <div className="bg-slate-900 w-full max-w-6xl h-[94vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border-2 border-red-600">
        
        {/* Header Oficial WKF */}
        <div className="bg-slate-950 text-white p-3.5 flex justify-between items-center relative border-b-2 border-red-600">
          <button onClick={() => { if (onUpdate) onUpdate(); onClose(); }} className="p-2 hover:bg-white/10 rounded-full transition">
            <X size={20} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center font-black text-white text-xs shadow-md">
              WKF
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs font-black uppercase tracking-widest text-red-500">
                World Karate Federation (WKF)
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Mesa de Control Oficial — Kumite (Combate)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select 
              value={mapEstadoToSelect(estado)} 
              onChange={e => handleStateChange(e.target.value)}
              className="bg-black/60 border border-white/20 text-white font-black py-1.5 px-4 rounded-xl text-xs uppercase cursor-pointer hover:bg-black/80 transition outline-none"
            >
              <option value="NO REALIZADO">NO REALIZADO</option>
              <option value="EN VIVO">EN VIVO</option>
              <option value="FINALIZADO">FINALIZADO</option>
            </select>
          </div>
        </div>

        {/* Banner de alerta / estado de combate */}
        {alertaCombate && (
          <div className="bg-amber-500 text-slate-950 px-6 py-2 font-black text-center text-xs flex items-center justify-center gap-2 shadow-inner">
            <AlertTriangle size={16} />
            <span>{alertaCombate}</span>
          </div>
        )}

        {/* Arena Principal de Kumite */}
        <div className="flex-1 p-5 grid grid-cols-1 md:grid-cols-[1fr_330px_1fr] gap-5 overflow-y-auto bg-slate-950/60">
          
          {/* LADO AKA (ROJO) */}
          <div className="bg-slate-900/90 rounded-2xl border-2 border-red-600 shadow-xl flex flex-col overflow-hidden">
            {/* Cabecera Atleta AKA */}
            <div className="bg-red-600 text-white p-3.5 font-black text-center text-lg uppercase tracking-wider flex items-center justify-between px-4">
              <span className="text-xs bg-black/40 px-2 py-0.5 rounded font-black tracking-widest">AKA (ROJO)</span>
              <span className="truncate max-w-[200px]">{nombreAka}</span>
              {estadisticas.local.senshu && (
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow flex items-center gap-1 animate-pulse">
                  <Award size={12} /> SENSHU
                </span>
              )}
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between gap-3 bg-slate-900/40">
              
              {/* Marcador AKA y Badges de Técnicas */}
              <div className="flex items-center justify-around bg-slate-950/70 p-3 rounded-2xl border border-red-900/40">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center overflow-hidden border-2 border-red-500 shadow">
                  {match.local_logo ? <img src={match.local_logo} className="w-full h-full object-cover" /> : <User size={32} className="text-slate-400" />}
                </div>
                <div className="text-center">
                  <div className="text-5xl font-black text-red-500 font-mono leading-none drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                    {ptAka}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Puntos Totales</span>
                </div>
                <div className="flex flex-col gap-1 text-[11px] font-bold text-slate-300">
                  <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 text-red-400">Yuko: {estadisticas.local.yuko || 0}</span>
                  <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 text-amber-400">W-Ari: {estadisticas.local.waza_ari || 0}</span>
                  <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 text-emerald-400">Ippon: {estadisticas.local.ippon || 0}</span>
                </div>
              </div>

              {/* Botones de Puntuación Técnica WKF */}
              <div className="grid grid-cols-3 gap-2">
                {/* YUKO (+1) */}
                <button
                  onClick={() => addTechnique('local', 'yuko', 1)}
                  className="py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black text-sm shadow-md transition flex flex-col items-center justify-center leading-tight"
                >
                  <span className="text-base">+1 YUKO</span>
                  <span className="text-[9px] font-medium opacity-80">Tsuki / Puño</span>
                </button>

                {/* WAZA-ARI (+2) */}
                <button
                  onClick={() => addTechnique('local', 'waza_ari', 1)}
                  className="py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-black text-sm shadow-md transition flex flex-col items-center justify-center leading-tight"
                >
                  <span className="text-base">+2 WAZA-ARI</span>
                  <span className="text-[9px] font-medium opacity-80">Chudan Kick</span>
                </button>

                {/* IPPON (+3) */}
                <button
                  onClick={() => addTechnique('local', 'ippon', 1)}
                  className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-sm shadow-md transition flex flex-col items-center justify-center leading-tight"
                >
                  <span className="text-base">+3 IPPON</span>
                  <span className="text-[9px] font-medium opacity-80">Jodan Kick / Caído</span>
                </button>
              </div>

              {/* Botones de Corrección / Paso Abajo */}
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => addTechnique('local', 'yuko', -1)} className="py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold border border-slate-700">
                  -1 Yuko
                </button>
                <button onClick={() => addTechnique('local', 'waza_ari', -1)} className="py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold border border-slate-700">
                  -1 W-Ari
                </button>
                <button onClick={() => addTechnique('local', 'ippon', -1)} className="py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold border border-slate-700">
                  -1 Ippon
                </button>
              </div>

              {/* Senshu y Zanshin */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => toggleSenshu('local')}
                  className={`py-2 px-3 rounded-xl font-black text-xs transition border flex items-center justify-center gap-1.5 ${
                    estadisticas.local.senshu
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/20'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  <Award size={14} /> {estadisticas.local.senshu ? 'Senshu Activo' : 'Asignar Senshu'}
                </button>
                <button
                  onClick={() => invalidarUltimoPuntoZanshin('local')}
                  className="py-2 px-3 bg-slate-800/80 hover:bg-slate-700 text-rose-300 border border-slate-700 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5"
                  title="Restar técnica por pérdida de Zanshin"
                >
                  <RotateCcw size={14} /> Falta Zanshin
                </button>
              </div>

              {/* Penalizaciones (Chui / Hansoku) y Salidas (Jogai) */}
              <div className="grid grid-cols-2 gap-2">
                {/* Jogai (Salidas) */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Jogai (Salidas)</div>
                  <div className="text-xl font-black text-orange-400 my-0.5">{estadisticas.local.jogai || 0}</div>
                  <div className="flex gap-1 mt-1">
                    <button onClick={() => updatePenalidades('local', 'jogai', 1)} className="flex-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-xs py-1 rounded font-bold border border-orange-500/30">
                      +1
                    </button>
                    <button onClick={() => updatePenalidades('local', 'jogai', -1)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs py-1 rounded font-bold border border-slate-700">
                      -1
                    </button>
                  </div>
                </div>

                {/* Penalizaciones (Chui) */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Penalizaciones</div>
                  <div className="text-xl font-black text-red-400 my-0.5">{estadisticas.local.penalizaciones || 0}</div>
                  <div className="flex gap-1 mt-1">
                    <button onClick={() => updatePenalidades('local', 'penalizaciones', 1)} className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs py-1 rounded font-bold border border-red-500/30">
                      +1
                    </button>
                    <button onClick={() => updatePenalidades('local', 'penalizaciones', -1)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs py-1 rounded font-bold border border-slate-700">
                      -1
                    </button>
                  </div>
                </div>
              </div>

              {/* Video Review Card & Hansoku Directo */}
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  onClick={() => toggleVideoReview('local')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs transition border flex items-center justify-center gap-1.5 ${
                    estadisticas.local.video_review === 'ACTIVE'
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-950/70'
                      : 'bg-red-950/40 text-red-400 border-red-800/40 line-through opacity-70'
                  }`}
                >
                  <Video size={14} /> VR Card: {estadisticas.local.video_review === 'ACTIVE' ? 'DISP.' : 'BLOQ.'}
                </button>

                <button
                  onClick={() => aplicarHansokuDirecto('local')}
                  className="py-2 px-3 bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-700/50 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <ShieldAlert size={14} /> Hansoku Directo
                </button>
              </div>

            </div>
          </div>

          {/* COLUMNA CENTRAL: MARCADOR GLOBAL, CRONÓMETRO Y DESEMPATE WKF */}
          <div className="flex flex-col gap-3 justify-center">
            
            {/* Marcador Central */}
            <div className="bg-slate-950 rounded-3xl border-2 border-slate-800 shadow-2xl p-4 text-center text-white relative overflow-hidden">
              <h3 className="text-[10px] font-black text-red-500 mb-1 tracking-widest uppercase">
                Puntuación Oficial WKF
              </h3>
              <div className="flex justify-around items-center">
                <span className="text-6xl font-black text-red-500 font-mono leading-none">{ptAka}</span>
                <span className="text-xl font-black text-slate-600 font-sans">VS</span>
                <span className="text-6xl font-black text-blue-500 font-mono leading-none">{ptAo}</span>
              </div>
              <div className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Diferencia: <span className={Math.abs(ptAka - ptAo) >= 8 ? 'text-amber-400 font-black' : 'text-slate-300'}>{Math.abs(ptAka - ptAo)} pts</span>
                {Math.abs(ptAka - ptAo) >= 8 && <span className="ml-1 text-amber-400">(Ventaja $\ge 8$)</span>}
              </div>
            </div>

            {/* Cronómetro WKF */}
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-sm p-4 text-center">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Tiempo de Combate
                </span>
                <div className="flex gap-1">
                  <button onClick={() => { setDuracionCombate(90); setTimer(90); }} className={`px-2 py-0.5 rounded text-[10px] font-bold ${duracionCombate === 90 ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'}`}>1:30</button>
                  <button onClick={() => { setDuracionCombate(120); setTimer(120); }} className={`px-2 py-0.5 rounded text-[10px] font-bold ${duracionCombate === 120 ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'}`}>2:00</button>
                  <button onClick={() => { setDuracionCombate(180); setTimer(180); }} className={`px-2 py-0.5 rounded text-[10px] font-bold ${duracionCombate === 180 ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'}`}>3:00</button>
                </div>
              </div>
              
              <div className="text-5xl font-mono font-black py-1 text-slate-100 tracking-wider">
                {formatTime(timer)}
              </div>

              <div className="flex justify-center gap-2 mt-2">
                <button 
                  onClick={() => setIsRunning(!isRunning)}
                  className={`w-12 h-10 rounded-xl flex items-center justify-center shadow transition ${isRunning ? 'bg-amber-500 text-slate-950 hover:bg-amber-400' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}
                >
                  {isRunning ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                </button>
                <button 
                  onClick={() => { setIsRunning(false); setTimer(duracionCombate); }}
                  className="w-12 h-10 rounded-xl flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 transition shadow border border-slate-700"
                  title="Reiniciar Cronómetro"
                >
                  <RotateCcw size={18} />
                </button>
              </div>
            </div>

            {/* Asistente de Desempate WKF */}
            <button 
              onClick={evaluarDesempateWKF}
              disabled={ptAka !== ptAo}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-blue-600 hover:from-red-500 hover:to-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl font-black text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2"
            >
              <Award size={16} /> Resolver Empate Oficial (WKF)
            </button>

            {/* Guía rápida de reglas WKF */}
            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl text-[10px] text-slate-400 space-y-1">
              <div className="text-amber-400 font-bold uppercase tracking-wider">Criterios de Desempate WKF:</div>
              <div>1. <strong>Senshu</strong> (Primer punto marcado sin oposición).</div>
              <div>2. <strong>Ippon</strong> (Mayor número de patadas a la cabeza/derribos).</div>
              <div>3. <strong>Waza-Ari</strong> (Mayor número de patadas al torso).</div>
              <div>4. <strong>Hantei</strong> (Votación por banderas de los jueces).</div>
            </div>

          </div>

          {/* LADO AO (AZUL) */}
          <div className="bg-slate-900/90 rounded-2xl border-2 border-blue-600 shadow-xl flex flex-col overflow-hidden">
            {/* Cabecera Atleta AO */}
            <div className="bg-blue-600 text-white p-3.5 font-black text-center text-lg uppercase tracking-wider flex items-center justify-between px-4">
              <span className="text-xs bg-black/40 px-2 py-0.5 rounded font-black tracking-widest">AO (AZUL)</span>
              <span className="truncate max-w-[200px]">{nombreAo}</span>
              {estadisticas.visitante.senshu && (
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow flex items-center gap-1 animate-pulse">
                  <Award size={12} /> SENSHU
                </span>
              )}
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between gap-3 bg-slate-900/40">
              
              {/* Marcador AO y Badges de Técnicas */}
              <div className="flex items-center justify-around bg-slate-950/70 p-3 rounded-2xl border border-blue-900/40">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center overflow-hidden border-2 border-blue-500 shadow">
                  {match.visitante_logo ? <img src={match.visitante_logo} className="w-full h-full object-cover" /> : <User size={32} className="text-slate-400" />}
                </div>
                <div className="text-center">
                  <div className="text-5xl font-black text-blue-500 font-mono leading-none drop-shadow-[0_0_15px_rgba(59,130,246,0.4)]">
                    {ptAo}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Puntos Totales</span>
                </div>
                <div className="flex flex-col gap-1 text-[11px] font-bold text-slate-300">
                  <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 text-blue-400">Yuko: {estadisticas.visitante.yuko || 0}</span>
                  <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 text-amber-400">W-Ari: {estadisticas.visitante.waza_ari || 0}</span>
                  <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 text-emerald-400">Ippon: {estadisticas.visitante.ippon || 0}</span>
                </div>
              </div>

              {/* Botones de Puntuación Técnica WKF */}
              <div className="grid grid-cols-3 gap-2">
                {/* YUKO (+1) */}
                <button
                  onClick={() => addTechnique('visitante', 'yuko', 1)}
                  className="py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-sm shadow-md transition flex flex-col items-center justify-center leading-tight"
                >
                  <span className="text-base">+1 YUKO</span>
                  <span className="text-[9px] font-medium opacity-80">Tsuki / Puño</span>
                </button>

                {/* WAZA-ARI (+2) */}
                <button
                  onClick={() => addTechnique('visitante', 'waza_ari', 1)}
                  className="py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-black text-sm shadow-md transition flex flex-col items-center justify-center leading-tight"
                >
                  <span className="text-base">+2 WAZA-ARI</span>
                  <span className="text-[9px] font-medium opacity-80">Chudan Kick</span>
                </button>

                {/* IPPON (+3) */}
                <button
                  onClick={() => addTechnique('visitante', 'ippon', 1)}
                  className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-sm shadow-md transition flex flex-col items-center justify-center leading-tight"
                >
                  <span className="text-base">+3 IPPON</span>
                  <span className="text-[9px] font-medium opacity-80">Jodan Kick / Caído</span>
                </button>
              </div>

              {/* Botones de Corrección / Paso Abajo */}
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => addTechnique('visitante', 'yuko', -1)} className="py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold border border-slate-700">
                  -1 Yuko
                </button>
                <button onClick={() => addTechnique('visitante', 'waza_ari', -1)} className="py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold border border-slate-700">
                  -1 W-Ari
                </button>
                <button onClick={() => addTechnique('visitante', 'ippon', -1)} className="py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold border border-slate-700">
                  -1 Ippon
                </button>
              </div>

              {/* Senshu y Zanshin */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => toggleSenshu('visitante')}
                  className={`py-2 px-3 rounded-xl font-black text-xs transition border flex items-center justify-center gap-1.5 ${
                    estadisticas.visitante.senshu
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/20'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  <Award size={14} /> {estadisticas.visitante.senshu ? 'Senshu Activo' : 'Asignar Senshu'}
                </button>
                <button
                  onClick={() => invalidarUltimoPuntoZanshin('visitante')}
                  className="py-2 px-3 bg-slate-800/80 hover:bg-slate-700 text-rose-300 border border-slate-700 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5"
                  title="Restar técnica por pérdida de Zanshin"
                >
                  <RotateCcw size={14} /> Falta Zanshin
                </button>
              </div>

              {/* Penalizaciones (Chui / Hansoku) y Salidas (Jogai) */}
              <div className="grid grid-cols-2 gap-2">
                {/* Jogai (Salidas) */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Jogai (Salidas)</div>
                  <div className="text-xl font-black text-orange-400 my-0.5">{estadisticas.visitante.jogai || 0}</div>
                  <div className="flex gap-1 mt-1">
                    <button onClick={() => updatePenalidades('visitante', 'jogai', 1)} className="flex-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-xs py-1 rounded font-bold border border-orange-500/30">
                      +1
                    </button>
                    <button onClick={() => updatePenalidades('visitante', 'jogai', -1)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs py-1 rounded font-bold border border-slate-700">
                      -1
                    </button>
                  </div>
                </div>

                {/* Penalizaciones (Chui) */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Penalizaciones</div>
                  <div className="text-xl font-black text-red-400 my-0.5">{estadisticas.visitante.penalizaciones || 0}</div>
                  <div className="flex gap-1 mt-1">
                    <button onClick={() => updatePenalidades('visitante', 'penalizaciones', 1)} className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs py-1 rounded font-bold border border-red-500/30">
                      +1
                    </button>
                    <button onClick={() => updatePenalidades('visitante', 'penalizaciones', -1)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs py-1 rounded font-bold border border-slate-700">
                      -1
                    </button>
                  </div>
                </div>
              </div>

              {/* Video Review Card & Hansoku Directo */}
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  onClick={() => toggleVideoReview('visitante')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs transition border flex items-center justify-center gap-1.5 ${
                    estadisticas.visitante.video_review === 'ACTIVE'
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-950/70'
                      : 'bg-red-950/40 text-red-400 border-red-800/40 line-through opacity-70'
                  }`}
                >
                  <Video size={14} /> VR Card: {estadisticas.visitante.video_review === 'ACTIVE' ? 'DISP.' : 'BLOQ.'}
                </button>

                <button
                  onClick={() => aplicarHansokuDirecto('visitante')}
                  className="py-2 px-3 bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-700/50 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <ShieldAlert size={14} /> Hansoku Directo
                </button>
              </div>

            </div>
          </div>

        </div>

        {/* Modal de Resolución de Desempate WKF */}
        {hanteiModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[150] flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl border-2 border-red-500 animate-fadeIn">
              <div className="flex items-center gap-3 text-red-500 font-black text-xl mb-4">
                <Award size={28} />
                <span>Dictamen de Desempate Oficial (WKF)</span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-6">
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">
                  Criterio Reglamentario Aplicado:
                </p>
                <p className="text-sm font-bold text-slate-100 leading-relaxed">
                  {hanteiModal.motivo}
                </p>
              </div>

              {hanteiModal.ganador ? (
                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => setHanteiModal(null)}
                    className="px-5 py-2.5 rounded-xl text-slate-400 font-bold hover:bg-slate-800 transition text-xs"
                  >
                    Cerrar
                  </button>
                  <button 
                    onClick={() => confirmarVictoriaHantei(hanteiModal.ganador as 'local' | 'visitante', hanteiModal.motivo)}
                    className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition shadow-lg flex items-center gap-2"
                  >
                    <Check size={16} /> Confirmar Victoria Oficial ({hanteiModal.ganador === 'local' ? 'AKA / Rojo' : 'AO / Azul'})
                  </button>
                </div>
              ) : (
                /* Modo Hantei: Votación de jueces */
                <div className="space-y-4">
                  <p className="text-xs text-amber-400 font-bold text-center">
                    Selecciona el ganador según la mayoría de banderas del panel arbitral:
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => confirmarVictoriaHantei('local', 'Decisión Unánime / Mayoritaria de Jueces (Hantei AKA)')}
                      className="py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-xs uppercase tracking-wider transition shadow-md"
                    >
                      Banderas AKA (Rojo)
                    </button>
                    <button
                      onClick={() => confirmarVictoriaHantei('visitante', 'Decisión Unánime / Mayoritaria de Jueces (Hantei AO)')}
                      className="py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-xs uppercase tracking-wider transition shadow-md"
                    >
                      Banderas AO (Azul)
                    </button>
                  </div>
                  <div className="flex justify-center">
                    <button onClick={() => setHanteiModal(null)} className="text-xs text-slate-400 hover:text-white font-bold py-1">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Oficial */}
        <div className="bg-slate-950 text-slate-400 border-t border-slate-800 p-2.5 text-center text-[10px] font-bold tracking-widest uppercase flex items-center justify-center gap-4">
          <span>World Karate Federation (WKF) — Sistema de Puntuación de Kumite</span>
          <span className="text-red-500">•</span>
          <span>Yuko (1) / Waza-Ari (2) / Ippon (3) / Senshu / Ventaja 8 pts</span>
        </div>
      </div>
    </div>
  );
}
