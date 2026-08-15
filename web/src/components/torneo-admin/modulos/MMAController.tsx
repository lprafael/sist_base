import React, { useState, useEffect } from 'react';
import { X, Play, Pause, RotateCcw, Check, Trophy, User, ShieldAlert, AlertTriangle, Zap, Flame } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function MMAController({ match, onClose, onSaved, onUpdate }: { match: any, onClose: () => void, onSaved?: () => void, onUpdate?: () => void }) {
  const [estado, setEstado] = useState(match.estado || 'programado');
  const [estadisticas, setEstadisticas] = useState<any>(() => {
    const raw = match.estadisticas || {};
    return {
      local: {
        puntos: typeof raw.local === 'object' ? raw.local.puntos || 0 : (raw.local || 0),
        faltas: typeof raw.local === 'object' ? raw.local.faltas || 0 : 0,
        salidas: typeof raw.local === 'object' ? raw.local.salidas || 0 : 0,
      },
      visitante: {
        puntos: typeof raw.visitante === 'object' ? raw.visitante.puntos || 0 : (raw.visitante || 0),
        faltas: typeof raw.visitante === 'object' ? raw.visitante.faltas || 0 : 0,
        salidas: typeof raw.visitante === 'object' ? raw.visitante.salidas || 0 : 0,
      },
      metodo_victoria: raw.metodo_victoria || null,
      ganador_lado: raw.ganador_lado || null
    };
  });

  const [modoAlargue, setModoAlargue] = useState(false);
  const [hanteiModal, setHanteiModal] = useState<{ visible: boolean; ganador: string | null; motivo: string; status: string } | null>(null);
  const [alertaCombate, setAlertaCombate] = useState<string | null>(null);

  const ptLocal = estadisticas.local.puntos;
  const ptVisitante = estadisticas.visitante.puntos;

  // Chronometer
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isRunning) {
      interval = setInterval(() => {
        setTimer(prev => {
          if (modoAlargue && prev <= 1) {
            setIsRunning(false);
            setAlertaCombate("⏰ ¡Tiempo de Alargue Finalizado! Aplica Hantei si persiste el empate.");
            return 0;
          }
          return modoAlargue ? prev - 1 : prev + 1;
        });
      }, 1000);
    } else if (!isRunning && timer !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRunning, timer, modoAlargue]);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getToken = () => {
    const session = JSON.parse(localStorage.getItem('user_session') || '{}');
    return session.access_token || session.token || '';
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
    } catch(e) { console.error(e); }
  };

  const mapEstadoToSelect = (st: string) => {
    if(st === 'en_curso') return 'EN VIVO';
    if(st === 'finalizado') return 'FINALIZADO';
    return 'NO REALIZADO';
  };

  const handleStateChange = (val: string) => {
    let newSt = 'programado';
    if (val === 'EN VIVO') newSt = 'en_curso';
    if (val === 'FINALIZADO') newSt = 'finalizado';
    setEstado(newSt);
  };

  // Motor de actualización de puntos, salidas y faltas ASAM
  const updateScore = (lado: 'local' | 'visitante', prop: 'puntos'|'faltas'|'salidas', value: number) => {
    setEstadisticas((prev: any) => {
      const n = JSON.parse(JSON.stringify(prev));
      const rival = lado === 'local' ? 'visitante' : 'local';
      const nombreLado = lado === 'local' ? (match.jugador_local_nombre || 'ROJO') : (match.jugador_visitante_nombre || 'AZUL');
      const nombreRival = rival === 'local' ? (match.jugador_local_nombre || 'ROJO') : (match.jugador_visitante_nombre || 'AZUL');

      const nuevoValor = Math.max(0, n[lado][prop] + value);
      n[lado][prop] = nuevoValor;

      // 1. Regla de Punto de Oro en Alargue
      if (modoAlargue && prop === 'puntos' && value > 0) {
        setIsRunning(false);
        n.ganador_lado = lado;
        n.metodo_victoria = 'Punto de Oro (Alargue)';
        setAlertaCombate(`🏆 ¡PUNTO DE ORO! ${nombreLado} marcó el punto de la victoria.`);
        setEstado('finalizado');
        const ganadorId = lado === 'local' ? match.equipo_local_id : match.equipo_visitante_id;
        handleSave('finalizado', ganadorId, n);
        return n;
      }

      // 2. Automatismos de Salidas ASAM
      if (prop === 'salidas' && value > 0) {
        if (nuevoValor === 3) {
          n[rival].puntos += 1;
          setAlertaCombate(`⚠️ 3.ª Salida de ${nombreLado} -> +1 Punto automático para ${nombreRival}`);
        } else if (nuevoValor === 4) {
          n[rival].puntos += 1;
          setAlertaCombate(`⚠️ 4.ª Salida de ${nombreLado} -> +1 Punto extra automático para ${nombreRival}`);
        } else if (nuevoValor >= 5) {
          setIsRunning(false);
          n.ganador_lado = rival;
          n.metodo_victoria = 'Descalificación por 5 Salidas';
          setAlertaCombate(`🚨 ¡DESCALIFICACIÓN POR SALIDAS! ${nombreLado} llegó a 5 salidas. Victoria para ${nombreRival}.`);
          setEstado('finalizado');
          const ganadorId = rival === 'local' ? match.equipo_local_id : match.equipo_visitante_id;
          handleSave('finalizado', ganadorId, n);
        }
      }

      // 3. Automatismos de Faltas ASAM
      if (prop === 'faltas' && value > 0) {
        if (nuevoValor >= 2) {
          setIsRunning(false);
          n.ganador_lado = rival;
          n.metodo_victoria = 'Descalificación por 2 Faltas';
          setAlertaCombate(`🚨 ¡DESCALIFICACIÓN POR FALTAS! ${nombreLado} acumuló 2 faltas. Victoria para ${nombreRival}.`);
          setEstado('finalizado');
          const ganadorId = rival === 'local' ? match.equipo_local_id : match.equipo_visitante_id;
          handleSave('finalizado', ganadorId, n);
        }
      }

      return n;
    });
  };

  // Descalificación Directa por Hansoku (Sangre / Agresión grave según Art. 30/31)
  const aplicarHansokuDirecto = (ladoInfractor: 'local' | 'visitante') => {
    const rival = ladoInfractor === 'local' ? 'visitante' : 'local';
    const nombreInfractor = ladoInfractor === 'local' ? (match.jugador_local_nombre || 'ROJO') : (match.jugador_visitante_nombre || 'AZUL');
    const nombreRival = rival === 'local' ? (match.jugador_local_nombre || 'ROJO') : (match.jugador_visitante_nombre || 'AZUL');

    if (!confirm(`⚠️ ¿Confirmar DESCALIFICACIÓN DIRECTA (HANSOKU) de ${nombreInfractor} por Sangre / Falta Grave Inapelable?`)) {
      return;
    }

    setIsRunning(false);
    const n = JSON.parse(JSON.stringify(estadisticas));
    n.ganador_lado = rival;
    n.metodo_victoria = `Hansoku Directo (Descalificación de ${nombreInfractor})`;
    setEstadisticas(n);
    setAlertaCombate(`🛑 ¡HANSOKU DIRECTO! Descalificación inapelable de ${nombreInfractor}. Victoria oficial para ${nombreRival}.`);
    setEstado('finalizado');
    const ganadorId = rival === 'local' ? match.equipo_local_id : match.equipo_visitante_id;
    handleSave('finalizado', ganadorId, n);
  };

  // Iniciar Minuto de Oro (Punto de Oro)
  const iniciarMinutoDeOro = () => {
    if (ptLocal !== ptVisitante) {
      alert("El Minuto de Oro sólo se aplica si el marcador está empatado.");
      return;
    }
    setModoAlargue(true);
    setTimer(60); // 1 minuto reglamentario
    setIsRunning(true);
    setAlertaCombate("⚡ Minuto de Oro en curso (1:00). El primer atleta en marcar un punto gana el combate.");
  };

  // Resolución de Hantei con la Tabla Oficial de Equivalencias ASAM
  const evaluarHantei = () => {
    if (ptLocal !== ptVisitante) {
      alert("El Hantei sólo se aplica en caso de empate en puntos.");
      return;
    }

    const fb = estadisticas.local.faltas;
    const sb = estadisticas.local.salidas;
    const fr = estadisticas.visitante.faltas;
    const sr = estadisticas.visitante.salidas;

    const nombreBlanco = match.jugador_local_nombre || 'ROJO';
    const nombreRojo = match.jugador_visitante_nombre || 'AZUL';

    let ganador: 'local' | 'visitante' | null = null;
    let motivo = "";
    let status = "resuelto";

    // 1. Ambos sin faltas
    if (fb === 0 && fr === 0) {
      if (sb < sr) {
        ganador = 'local';
        motivo = `${nombreBlanco} tiene menos salidas (${sb} vs ${sr} de ${nombreRojo}).`;
      } else if (sr < sb) {
        ganador = 'visitante';
        motivo = `${nombreRojo} tiene menos salidas (${sr} vs ${sb} de ${nombreBlanco}).`;
      } else {
        status = 'empate';
        motivo = "Empate absoluto en faltas y salidas. Requiere votación de banderas de los jueces por actividad general.";
      }
    }
    // 2. Ambos con 1 falta
    else if (fb === 1 && fr === 1) {
      if (sb < sr) {
        ganador = 'local';
        motivo = `Ambos tienen 1 falta: ${nombreBlanco} tiene menos salidas (${sb} vs ${sr}).`;
      } else if (sr < sb) {
        ganador = 'visitante';
        motivo = `Ambos tienen 1 falta: ${nombreRojo} tiene menos salidas (${sr} vs ${sb}).`;
      } else {
        status = 'empate';
        motivo = "Empate absoluto con 1 falta y mismas salidas. Requiere votación de banderas.";
      }
    }
    // 3. Local tiene 1 falta y Visitante 0 faltas
    else if (fb === 1 && fr === 0) {
      if (sb > 0) {
        ganador = 'visitante';
        motivo = `Regla ASAM: ${nombreRojo} solo tiene salidas (${sr}), mientras ${nombreBlanco} tiene 1 falta + ${sb} salidas.`;
      } else {
        if (sr <= 3) {
          ganador = 'visitante';
          motivo = `Tabla ASAM: ${sr} salida(s) de ${nombreRojo} pesan menos que 1 falta de ${nombreBlanco}. Gana ${nombreRojo}.`;
        } else if (sr === 4) {
          ganador = 'local';
          motivo = `Tabla ASAM: 4 salidas de ${nombreRojo} penalizan más que 1 falta de ${nombreBlanco}. Gana ${nombreBlanco}.`;
        }
      }
    }
    // 4. Visitante tiene 1 falta y Local 0 faltas
    else if (fr === 1 && fb === 0) {
      if (sr > 0) {
        ganador = 'local';
        motivo = `Regla ASAM: ${nombreBlanco} solo tiene salidas (${sb}), mientras ${nombreRojo} tiene 1 falta + ${sr} salidas.`;
      } else {
        if (sb <= 3) {
          ganador = 'local';
          motivo = `Tabla ASAM: ${sb} salida(s) de ${nombreBlanco} pesan menos que 1 falta de ${nombreRojo}. Gana ${nombreBlanco}.`;
        } else if (sb === 4) {
          ganador = 'visitante';
          motivo = `Tabla ASAM: 4 salidas de ${nombreBlanco} penalizan más que 1 falta de ${nombreRojo}. Gana ${nombreRojo}.`;
        }
      }
    }

    setHanteiModal({
      visible: true,
      ganador,
      motivo,
      status
    });
  };

  const confirmarHantei = () => {
    if (!hanteiModal || !hanteiModal.ganador) return;
    const n = JSON.parse(JSON.stringify(estadisticas));
    n.ganador_lado = hanteiModal.ganador;
    n.metodo_victoria = `Hantei (${hanteiModal.motivo})`;
    setEstadisticas(n);
    setEstado('finalizado');
    const ganadorId = hanteiModal.ganador === 'local' ? match.equipo_local_id : match.equipo_visitante_id;
    handleSave('finalizado', ganadorId, n);
    setHanteiModal(null);
    setAlertaCombate(`🏆 Ganador por Hantei: ${hanteiModal.ganador === 'local' ? (match.jugador_local_nombre || 'ROJO') : (match.jugador_visitante_nombre || 'AZUL')}`);
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
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-100 w-full max-w-6xl h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-300">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-3.5 flex justify-between items-center relative border-b-4 border-amber-500">
          <button onClick={() => { if(onUpdate) onUpdate(); onClose(); }} className="p-2 hover:bg-white/10 rounded-full transition">
            <X size={20} />
          </button>
          
          <div className="flex items-center gap-3">
            <span className="text-xs font-black uppercase tracking-widest text-amber-400">
              Mesa de Control ASAM
            </span>
          </div>

          <div className="flex items-center gap-2">
            <select 
              value={mapEstadoToSelect(estado)} 
              onChange={e => handleStateChange(e.target.value)}
              className="bg-black/40 border border-white/20 text-white font-black py-1.5 px-4 rounded-xl text-xs uppercase cursor-pointer hover:bg-black/60 transition outline-none"
            >
              <option value="NO REALIZADO">NO REALIZADO</option>
              <option value="EN VIVO">EN VIVO</option>
              <option value="FINALIZADO">FINALIZADO</option>
            </select>
          </div>
        </div>

        {/* Banner de alerta o estado del combate */}
        {alertaCombate && (
          <div className="bg-amber-500 text-slate-950 px-6 py-2.5 font-bold text-center text-sm flex items-center justify-center gap-2 shadow-inner">
            <AlertTriangle size={18} />
            <span>{alertaCombate}</span>
          </div>
        )}

        {/* Content Arena */}
        <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-[1fr_320px_1fr] gap-6 overflow-y-auto bg-slate-200/50">
          
          {/* Peleador 1 (ROJO) */}
          <div className="bg-white rounded-2xl border-2 border-red-500 shadow-md flex flex-col overflow-hidden">
            <div className="bg-red-600 text-white p-4 font-black text-center text-xl uppercase tracking-wider relative flex items-center justify-center gap-2">
              <span>{match.jugador_local_nombre || match.local_nombre || 'ROJO'}</span>
            </div>
            
            <div className="p-5 flex-1 flex flex-col items-center justify-between gap-4 bg-slate-50">
              <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden border-4 border-red-500 shadow">
                {match.local_logo ? <img src={match.local_logo} className="w-full h-full object-cover"/> : <User size={40} className="text-slate-400"/>}
              </div>
              
              {/* Botones de Puntos */}
              <div className="w-full grid grid-cols-2 gap-2">
                <button 
                  onClick={() => updateScore('local', 'puntos', 1)}
                  className="col-span-2 py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black text-xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  <Trophy size={20} /> +1 PUNTO
                </button>
                <button 
                  onClick={() => updateScore('local', 'puntos', -1)}
                  className="col-span-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-xs shadow-sm transition"
                >
                  -1 Punto
                </button>
                
                {/* Faltas */}
                <div className="col-span-1 bg-white border-2 border-slate-200 rounded-xl p-2.5 text-center">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Faltas (Máx 2)</div>
                  <div className="text-2xl font-black text-red-600 my-1">{estadisticas.local.faltas}</div>
                  <button onClick={() => updateScore('local', 'faltas', 1)} className="w-full bg-slate-800 hover:bg-slate-900 text-white text-xs py-1.5 rounded-lg font-bold">
                    + FALTA
                  </button>
                  <button onClick={() => updateScore('local', 'faltas', -1)} className="w-full mt-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] py-1 rounded font-bold">
                    -1 Falta
                  </button>
                </div>

                {/* Salidas */}
                <div className="col-span-1 bg-white border-2 border-slate-200 rounded-xl p-2.5 text-center">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Salidas (Máx 5)</div>
                  <div className="text-2xl font-black text-orange-500 my-1">{estadisticas.local.salidas}</div>
                  <button onClick={() => updateScore('local', 'salidas', 1)} className="w-full bg-orange-100 hover:bg-orange-200 text-orange-800 text-xs py-1.5 rounded-lg font-bold border border-orange-200">
                    + SALIDA
                  </button>
                  <button onClick={() => updateScore('local', 'salidas', -1)} className="w-full mt-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] py-1 rounded font-bold border border-slate-200">
                    -1 Salida
                  </button>
                </div>
              </div>

              {/* Botón Hansoku Directo */}
              <button 
                onClick={() => aplicarHansokuDirecto('local')}
                className="w-full py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-bold text-xs transition border border-red-300 flex items-center justify-center gap-1.5 uppercase"
              >
                <ShieldAlert size={16} /> Hansoku Directo (Sangre)
              </button>
            </div>
          </div>

          {/* Center Column (Marcador, Chronometer & Modos Especiales) */}
          <div className="flex flex-col gap-4 justify-center">
            
            {/* Marcador Central */}
            <div className="bg-slate-900 rounded-3xl border-4 border-slate-800 shadow-2xl p-5 text-center text-white relative overflow-hidden">
              <h3 className="text-[10px] font-black text-amber-500 mb-2 tracking-widest uppercase">
                Puntuación Oficial ASAM
              </h3>
              <div className="flex justify-around items-center relative z-10">
                <span className="text-6xl font-black text-red-500 font-mono">{ptLocal}</span>
                <span className="text-2xl font-black text-slate-500">VS</span>
                <span className="text-6xl font-black text-blue-500 font-mono">{ptVisitante}</span>
              </div>
            </div>

            {/* Cronómetro */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-center">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {modoAlargue ? '⚡ Minuto de Oro' : 'Tiempo Regular'}
                </span>
                {modoAlargue && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-full uppercase">
                    Punto de Oro
                  </span>
                )}
              </div>
              
              <div className={`text-5xl font-mono font-black py-2 ${modoAlargue ? 'text-amber-500' : 'text-slate-800'}`}>
                {formatTime(timer)}
              </div>

              <div className="flex justify-center gap-3 mt-2">
                <button 
                  onClick={() => setIsRunning(!isRunning)}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow transition ${isRunning ? 'bg-amber-500 text-white hover:bg-amber-400' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}
                >
                  {isRunning ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
                </button>
                <button 
                  onClick={() => { setIsRunning(false); setTimer(0); setModoAlargue(false); }}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 transition shadow"
                  title="Reiniciar Cronómetro"
                >
                  <RotateCcw size={20} />
                </button>
              </div>
            </div>

            {/* Acciones de Desempate: Alargue y Hantei */}
            <div className="flex flex-col gap-2">
              <button 
                onClick={iniciarMinutoDeOro}
                disabled={ptLocal !== ptVisitante}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider transition shadow flex items-center justify-center gap-2"
              >
                <Zap size={16} /> 1. Minuto de Oro (1:00)
              </button>
              
              <button 
                onClick={evaluarHantei}
                disabled={ptLocal !== ptVisitante}
                className="w-full py-2.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-black text-xs uppercase tracking-wider transition shadow flex items-center justify-center gap-2"
              >
                <ShieldAlert size={16} /> 2. Aplicar Hantei (ASAM)
              </button>
            </div>
          </div>

          {/* Peleador 2 (AZUL) */}
          <div className="bg-white rounded-2xl border-2 border-blue-500 shadow-md flex flex-col overflow-hidden">
            <div className="bg-blue-600 text-white p-4 font-black text-center text-xl uppercase tracking-wider relative flex items-center justify-center gap-2">
              <span>{match.jugador_visitante_nombre || match.visitante_nombre || 'AZUL'}</span>
            </div>
            
            <div className="p-5 flex-1 flex flex-col items-center justify-between gap-4 bg-slate-50">
              <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden border-4 border-blue-500 shadow">
                {match.visitante_logo ? <img src={match.visitante_logo} className="w-full h-full object-cover"/> : <User size={40} className="text-slate-400"/>}
              </div>
              
              {/* Botones de Puntos */}
              <div className="w-full grid grid-cols-2 gap-2">
                <button 
                  onClick={() => updateScore('visitante', 'puntos', 1)}
                  className="col-span-2 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  <Trophy size={20} /> +1 PUNTO
                </button>
                <button 
                  onClick={() => updateScore('visitante', 'puntos', -1)}
                  className="col-span-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-xs shadow-sm transition"
                >
                  -1 Punto
                </button>
                
                {/* Faltas */}
                <div className="col-span-1 bg-white border-2 border-slate-200 rounded-xl p-2.5 text-center">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Faltas (Máx 2)</div>
                  <div className="text-2xl font-black text-blue-600 my-1">{estadisticas.visitante.faltas}</div>
                  <button onClick={() => updateScore('visitante', 'faltas', 1)} className="w-full bg-slate-800 hover:bg-slate-900 text-white text-xs py-1.5 rounded-lg font-bold">
                    + FALTA
                  </button>
                  <button onClick={() => updateScore('visitante', 'faltas', -1)} className="w-full mt-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] py-1 rounded font-bold">
                    -1 Falta
                  </button>
                </div>

                {/* Salidas */}
                <div className="col-span-1 bg-white border-2 border-slate-200 rounded-xl p-2.5 text-center">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Salidas (Máx 5)</div>
                  <div className="text-2xl font-black text-orange-500 my-1">{estadisticas.visitante.salidas}</div>
                  <button onClick={() => updateScore('visitante', 'salidas', 1)} className="w-full bg-orange-100 hover:bg-orange-200 text-orange-800 text-xs py-1.5 rounded-lg font-bold border border-orange-200">
                    + SALIDA
                  </button>
                  <button onClick={() => updateScore('visitante', 'salidas', -1)} className="w-full mt-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] py-1 rounded font-bold border border-slate-200">
                    -1 Salida
                  </button>
                </div>
              </div>

              {/* Botón Hansoku Directo */}
              <button 
                onClick={() => aplicarHansokuDirecto('visitante')}
                className="w-full py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-bold text-xs transition border border-red-300 flex items-center justify-center gap-1.5 uppercase"
              >
                <ShieldAlert size={16} /> Hansoku Directo (Sangre)
              </button>
            </div>
          </div>

        </div>

        {/* Modal de Resolución de Hantei */}
        {hanteiModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 text-slate-800 shadow-2xl border-2 border-purple-500 animate-fadeIn">
              <div className="flex items-center gap-3 text-purple-700 font-black text-xl mb-4">
                <ShieldAlert size={28} />
                <span>Dictamen Arbitral de Hantei (ASAM)</span>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-6">
                <p className="text-sm font-medium text-purple-950 mb-2">
                  <strong>Resolución según Tabla Oficial:</strong>
                </p>
                <p className="text-base font-bold text-purple-900">
                  {hanteiModal.motivo}
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setHanteiModal(null)}
                  className="px-5 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition text-sm"
                >
                  Cerrar
                </button>
                {hanteiModal.ganador && (
                  <button 
                    onClick={confirmarHantei}
                    className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-black text-sm uppercase transition shadow-lg flex items-center gap-2"
                  >
                    <Check size={18} /> Confirmar Victoria Oficial
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bottom panel */}
        <div className="bg-slate-900 text-white border-t-2 border-amber-500 p-3 text-center text-xs font-bold tracking-widest text-slate-400 uppercase">
          Asociación Sudamericana de Artes Marciales (ASAM) — Reglamento Oficial de Combate
        </div>
      </div>
    </div>
  );
}

