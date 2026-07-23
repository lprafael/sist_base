import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Play, Pause, RotateCcw, Plus, Minus, Check, Trophy, Trash2, Edit, AlertCircle, ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

interface Player {
  id: string;
  nombre: string;
  numero_camiseta?: number;
  posicion?: string;
  titular?: boolean;
  goles?: number;
  amarillas?: number;
  rojas?: number;
}

interface Evento {
  id: string;
  tipo: string;
  minuto?: number;
  periodo?: number;
  player_id?: string;
  player_out_id?: string;
  jugador_nombre?: string;
  jugador_sale_nombre?: string;
  equipo_id?: string;
  observaciones?: string;
  registrado_en?: string;
}

export default function FootballController({ match, onClose, onSaved }: { match: any, onClose: () => void, onSaved?: () => void }) {
  const [estado, setEstado] = useState(match.estado || 'programado');
  const [golesLocal, setGolesLocal] = useState(match.goles_local || 0);
  const [golesVisitante, setGolesVisitante] = useState(match.goles_visitante || 0);
  const [periodo, setPeriodo] = useState<number>(match.periodo || 1);
  const [observaciones, setObservaciones] = useState(match.observaciones || '');

  const [jugadoresLocal, setJugadoresLocal] = useState<Player[]>([]);
  const [jugadoresVisitante, setJugadoresVisitante] = useState<Player[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('Guardado');
  const [isSaving, setIsSaving] = useState(false);

  // Chronometer
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // Modals
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Partial<Evento> | null>(null);
  const [eventTipo, setEventTipo] = useState<string>('GOL');
  const [eventPlayerId, setEventPlayerId] = useState<string>('');
  const [eventAssistId, setEventAssistId] = useState<string>('');
  const [eventDesc, setEventDesc] = useState<string>('');
  const [eventTimeCheck, setEventTimeCheck] = useState<boolean>(true);

  const [showRefModal, setShowRefModal] = useState(false);
  const [refNoteText, setRefNoteText] = useState('');

  const getToken = () => {
    try {
      const session = JSON.parse(localStorage.getItem('user_session') || '{}');
      return session.access_token || session.token || '';
    } catch {
      return '';
    }
  };

  // Timer Effect
  useEffect(() => {
    let interval: any;
    if (isRunning) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getPeriodoLabel = (p: number) => {
    if (p === 1) return '1º Tiempo';
    if (p === 2) return '2º Tiempo';
    if (p === 3) return '3º Tiempo';
    return 'Prórroga';
  };

  // Auto save to database
  const saveToBackend = useCallback(async (overrides?: { goles_local?: number; goles_visitante?: number; estado?: string; observaciones?: string }) => {
    setIsSaving(true);
    setAutoSaveStatus('Guardando...');
    try {
      const payload = {
        goles_local: overrides?.goles_local ?? golesLocal,
        goles_visitante: overrides?.goles_visitante ?? golesVisitante,
        estado: overrides?.estado ?? estado,
        observaciones: overrides?.observaciones ?? observaciones,
      };

      const res = await fetch(`${API_URL}/cancha/torneos/partidos/${match.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${getToken()}` 
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setAutoSaveStatus('Guardado ✓');
        if (onSaved) onSaved();
      } else {
        setAutoSaveStatus('Error al guardar');
      }
    } catch (e) {
      console.error(e);
      setAutoSaveStatus('Error de conexión');
    } finally {
      setIsSaving(false);
      setTimeout(() => setAutoSaveStatus('Guardado'), 3000);
    }
  }, [match.id, golesLocal, golesVisitante, estado, observaciones]);

  // Load Players and Events
  const loadMatchData = useCallback(async () => {
    const torneoId = match.torneo_id;
    if (!match.id) return;

    try {
      const headers = { 'Authorization': `Bearer ${getToken()}` };

      // Load Local Players
      if (match.equipo_local_id && torneoId) {
        const resL = await fetch(`${API_URL}/cancha/torneos/${torneoId}/equipos/${match.equipo_local_id}/jugadores`, { headers });
        if (resL.ok) {
          const dataL = await resL.json();
          setJugadoresLocal(dataL.map((p: any) => ({ ...p, titular: true, goles: 0, amarillas: 0, rojas: 0 })));
        }
      }

      // Load Visitante Players
      if (match.equipo_visitante_id && torneoId) {
        const resV = await fetch(`${API_URL}/cancha/torneos/${torneoId}/equipos/${match.equipo_visitante_id}/jugadores`, { headers });
        if (resV.ok) {
          const dataV = await resV.json();
          setJugadoresVisitante(dataV.map((p: any) => ({ ...p, titular: true, goles: 0, amarillas: 0, rojas: 0 })));
        }
      }

      // Load Events
      if (torneoId) {
        const resE = await fetch(`${API_URL}/cancha/torneos/${torneoId}/partidos/${match.id}/eventos`, { headers });
        if (resE.ok) {
          const dataE = await resE.json();
          setEventos(dataE);
        }
      }
    } catch (e) {
      console.error('Error cargando datos del partido:', e);
    }
  }, [match]);

  useEffect(() => {
    loadMatchData();
  }, [loadMatchData]);

  // Change Estado
  const handleEstadoChange = (newEstadoSelect: string) => {
    let newSt = 'programado';
    if (newEstadoSelect === 'EN VIVO') newSt = 'en_curso';
    if (newEstadoSelect === 'FINALIZADO') newSt = 'finalizado';
    setEstado(newSt);
    saveToBackend({ estado: newSt });
  };

  // Score buttons
  const handleScoreLocal = (delta: number) => {
    const nextVal = Math.max(0, golesLocal + delta);
    setGolesLocal(nextVal);
    saveToBackend({ goles_local: nextVal });
  };

  const handleScoreVisitante = (delta: number) => {
    const nextVal = Math.max(0, golesVisitante + delta);
    setGolesVisitante(nextVal);
    saveToBackend({ goles_visitante: nextVal });
  };

  // Add Event (Goal / Card) directly from player list
  const handleAddPlayerGoal = (player: Player, equipoId: string, isLocal: boolean) => {
    if (isLocal) {
      handleScoreLocal(1);
    } else {
      handleScoreVisitante(1);
    }
    createEventInDB('GOL', player.id, equipoId, `${player.nombre} (Gol)`);
  };

  const handleAddPlayerCard = (player: Player, equipoId: string, tipo: 'AMARILLA' | 'ROJA') => {
    createEventInDB(tipo, player.id, equipoId, `${player.nombre} (Tarjeta ${tipo})`);
  };

  const createEventInDB = async (tipo: string, playerId: string, equipoId: string, desc: string) => {
    const torneoId = match.torneo_id;
    if (!torneoId || !match.id) return;

    const min = Math.floor(timer / 60);

    try {
      const res = await fetch(`${API_URL}/cancha/torneos/${torneoId}/partidos/${match.id}/eventos`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${getToken()}` 
        },
        body: JSON.stringify({
          tipo,
          player_id: playerId || null,
          equipo_id: equipoId || null,
          minuto: min,
          periodo: periodo,
          es_tiempo_adicional: false,
          observaciones: desc
        })
      });

      if (res.ok) {
        loadMatchData();
        saveToBackend();
      }
    } catch (e) {
      console.error('Error creando evento:', e);
    }
  };

  // Open Event Modal
  const openNewEventModal = () => {
    setSelectedEvent(null);
    setEventTipo('GOL');
    setEventPlayerId('');
    setEventAssistId('');
    setEventDesc('');
    setEventTimeCheck(true);
    setShowEventModal(true);
  };

  const openEditEventModal = (ev: Evento) => {
    setSelectedEvent(ev);
    setEventTipo(ev.tipo || 'GOL');
    setEventPlayerId(ev.player_id || '');
    setEventAssistId(ev.player_out_id || '');
    setEventDesc(ev.observaciones || '');
    setEventTimeCheck(true);
    setShowEventModal(true);
  };

  const handleSaveEventFromModal = async () => {
    const torneoId = match.torneo_id;
    if (!torneoId || !match.id) return;

    const min = Math.floor(timer / 60);

    try {
      const res = await fetch(`${API_URL}/cancha/torneos/${torneoId}/partidos/${match.id}/eventos`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${getToken()}` 
        },
        body: JSON.stringify({
          tipo: eventTipo,
          player_id: eventPlayerId || null,
          player_out_id: eventAssistId || null,
          equipo_id: match.equipo_local_id || null,
          minuto: min,
          periodo: periodo,
          es_tiempo_adicional: false,
          observaciones: eventDesc
        })
      });

      if (res.ok) {
        setShowEventModal(false);
        loadMatchData();
        saveToBackend();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteEvent = async (evId: string) => {
    const torneoId = match.torneo_id;
    if (!match.id || !evId) return;

    try {
      const res = await fetch(`${API_URL}/cancha/torneos/partidos/${match.id}/eventos/${evId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setShowEventModal(false);
        loadMatchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Open Referee Modal
  const handleSaveRefNote = () => {
    const newObs = observaciones ? `${observaciones}\n${refNoteText}` : refNoteText;
    setObservaciones(newObs);
    saveToBackend({ observaciones: newObs });
    setRefNoteText('');
    setShowRefModal(false);
  };

  const allPlayers = [...jugadoresLocal, ...jugadoresVisitante];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-6xl h-[94vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* TOP NAVBAR (Dark Professional Header) */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex justify-between items-center relative flex-shrink-0">
          <button 
            onClick={() => {
              if (onSaved) onSaved();
              onClose();
            }} 
            className="flex items-center gap-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl font-bold text-xs transition"
          >
            ← Atrás
          </button>
          
          {/* Status selector */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
            <select 
              value={estado === 'en_curso' ? 'EN VIVO' : estado === 'finalizado' ? 'FINALIZADO' : 'NO REALIZADO'} 
              onChange={e => handleEstadoChange(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-amber-400 font-extrabold text-sm py-1.5 px-4 rounded-xl appearance-none text-center cursor-pointer hover:border-amber-400/50 transition outline-none"
              style={{ textAlignLast: 'center' }}
            >
              <option value="NO REALIZADO">NO REALIZADO</option>
              <option value="EN VIVO">🔴 EN VIVO</option>
              <option value="FINALIZADO">✓ FINALIZADO</option>
            </select>
          </div>

          {/* Auto-save badge indicator */}
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
              autoSaveStatus.includes('Error')
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
              {autoSaveStatus}
            </span>
          </div>
        </div>

        {/* MAIN CONTROLLER BODY */}
        <div className="flex-1 p-3 sm:p-4 grid grid-cols-1 md:grid-cols-[1fr_280px_1fr] gap-3 sm:gap-4 overflow-y-auto min-h-0 bg-slate-900/60">
          
          {/* LOCAL TEAM ROSTER PANEL */}
          <div className="bg-slate-950/70 rounded-2xl border border-slate-800 shadow-lg flex flex-col overflow-hidden">
            <div className="bg-indigo-950/80 text-indigo-200 border-b border-indigo-900/50 p-3 font-black text-sm flex justify-between items-center">
              <span className="truncate">{match.local_nombre || match.jugador_local_nombre || 'Equipo 1'}</span>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 font-bold">LOCAL</span>
            </div>
            
            <div className="p-3 flex-1 overflow-y-auto">
              <div className="flex justify-between items-center bg-slate-900/80 px-3 py-1.5 rounded-xl text-[11px] font-extrabold text-slate-400 mb-2 border border-slate-800">
                <span className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded border-slate-700 text-indigo-500" />
                  # JUGADORES
                </span>
                <span className="flex gap-4">
                  <span>TITULAR</span>
                  <span className="w-5 text-center">⚽</span>
                  <span className="w-5 text-center">🟨</span>
                  <span className="w-5 text-center">🟥</span>
                </span>
              </div>

              {jugadoresLocal.length === 0 ? (
                <div className="text-center text-slate-500 py-10 text-xs font-semibold">
                  Sin plantilla cargada para este equipo.
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {jugadoresLocal.map((p, idx) => (
                    <div key={p.id || idx} className="flex items-center justify-between bg-slate-900/40 hover:bg-slate-800/40 p-2 rounded-xl border border-slate-800/60 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <input 
                          type="checkbox" 
                          checked={p.titular !== false} 
                          onChange={() => {
                            setJugadoresLocal(prev => prev.map((item, i) => i === idx ? { ...item, titular: !item.titular } : item));
                            saveToBackend();
                          }}
                          className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-0 cursor-pointer" 
                        />
                        <span className="font-mono font-bold text-slate-400 w-4">{p.numero_camiseta || idx + 1}</span>
                        <span className="font-bold text-slate-200 truncate">{p.nombre}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Titular toggle switch */}
                        <button
                          onClick={() => {
                            setJugadoresLocal(prev => prev.map((item, i) => i === idx ? { ...item, titular: !item.titular } : item));
                            saveToBackend();
                          }}
                          className={`w-9 h-5 rounded-full p-0.5 transition-colors ${p.titular !== false ? 'bg-emerald-500' : 'bg-slate-700'}`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${p.titular !== false ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>

                        {/* Goal Button */}
                        <button 
                          onClick={() => handleAddPlayerGoal(p, match.equipo_local_id, true)} 
                          className="w-6 h-6 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-black text-[11px] flex items-center justify-center border border-emerald-500/30"
                          title="Sumar gol a este jugador"
                        >
                          ⚽
                        </button>

                        {/* Yellow Card Button */}
                        <button 
                          onClick={() => handleAddPlayerCard(p, match.equipo_local_id, 'AMARILLA')} 
                          className="w-5 h-6 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 text-xs font-bold"
                          title="Tarjeta Amarilla"
                        >
                          🟨
                        </button>

                        {/* Red Card Button */}
                        <button 
                          onClick={() => handleAddPlayerCard(p, match.equipo_local_id, 'ROJA')} 
                          className="w-5 h-6 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-400 text-xs font-bold"
                          title="Tarjeta Roja"
                        >
                          🟥
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CENTER PANEL (SCOREBOARD & CHRONOMETER) */}
          <div className="flex flex-col gap-3 sm:gap-4">
            
            {/* DIGITAL LED SCOREBOARD */}
            <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-4 text-center shadow-lg relative overflow-hidden">
              <div className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">MARCADOR</div>
              
              <div className="flex justify-center items-center gap-4 my-2">
                <div className="flex flex-col items-center">
                  <div className="bg-slate-900 border border-slate-800 text-emerald-400 font-mono font-black text-5xl w-20 h-20 rounded-2xl flex items-center justify-center shadow-inner tracking-tight">
                    {golesLocal}
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    <button onClick={() => handleScoreLocal(-1)} className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-black flex items-center justify-center text-sm"><Minus size={14}/></button>
                    <button onClick={() => handleScoreLocal(1)} className="w-7 h-7 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-black flex items-center justify-center text-sm border border-emerald-500/30"><Plus size={14}/></button>
                  </div>
                </div>

                <span className="text-3xl font-black text-slate-600">X</span>

                <div className="flex flex-col items-center">
                  <div className="bg-slate-900 border border-slate-800 text-emerald-400 font-mono font-black text-5xl w-20 h-20 rounded-2xl flex items-center justify-center shadow-inner tracking-tight">
                    {golesVisitante}
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    <button onClick={() => handleScoreVisitante(-1)} className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-black flex items-center justify-center text-sm"><Minus size={14}/></button>
                    <button onClick={() => handleScoreVisitante(1)} className="w-7 h-7 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-black flex items-center justify-center text-sm border border-emerald-500/30"><Plus size={14}/></button>
                  </div>
                </div>
              </div>
            </div>

            {/* CHRONOMETER */}
            <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-4 text-center shadow-lg">
              <div className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-2">CRONÓMETRO DE JUEGO</div>
              
              {/* Period Selector */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <button 
                  onClick={() => setPeriodo(p => Math.max(1, p - 1))} 
                  className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-black text-amber-400 px-3 py-1 bg-amber-400/10 rounded-lg border border-amber-400/20 min-w-[100px]">
                  {getPeriodoLabel(periodo)}
                </span>
                <button 
                  onClick={() => setPeriodo(p => p + 1)} 
                  className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Digital Timer */}
              <div className="relative flex items-center justify-center mb-4">
                <button 
                  onClick={() => setTimer(t => Math.max(0, t - 60))}
                  className="text-slate-500 hover:text-slate-300 text-lg font-bold px-2"
                  title="Restar 1 minuto"
                >
                  -
                </button>
                <div className="text-4xl sm:text-5xl font-mono font-black text-slate-100 bg-slate-900 rounded-xl py-3 px-6 border border-slate-800 tracking-wider shadow-inner">
                  {formatTime(timer)}
                </div>
                <button 
                  onClick={() => setTimer(t => t + 60)}
                  className="text-slate-500 hover:text-slate-300 text-lg font-bold px-2"
                  title="Sumar 1 minuto"
                >
                  +
                </button>
              </div>

              {/* Play / Pause / Reset Buttons */}
              <div className="flex justify-center gap-3">
                <button 
                  onClick={() => setIsRunning(!isRunning)}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-all ${
                    isRunning 
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30' 
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                  }`}
                >
                  {isRunning ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
                </button>
                <button 
                  onClick={() => { setIsRunning(false); setTimer(0); }}
                  className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition"
                  title="Reiniciar reloj"
                >
                  <RotateCcw size={18} />
                </button>
              </div>
            </div>

            {/* SUSTITUCIONES INDICATOR */}
            <div className="bg-slate-950/70 rounded-2xl border border-slate-800 p-3 text-center">
              <div className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-2">SUSTITUCIONES</div>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-300">
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-500">Local</div>
                  <div className="flex justify-center gap-1 mt-1">
                    {[1,2,3,4,5].map(i => <div key={i} className="w-2.5 h-2.5 rounded-full bg-emerald-500/30 border border-emerald-500/50" />)}
                  </div>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-500">Visitante</div>
                  <div className="flex justify-center gap-1 mt-1">
                    {[1,2,3,4,5].map(i => <div key={i} className="w-2.5 h-2.5 rounded-full bg-emerald-500/30 border border-emerald-500/50" />)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* VISITANTE TEAM ROSTER PANEL */}
          <div className="bg-slate-950/70 rounded-2xl border border-slate-800 shadow-lg flex flex-col overflow-hidden">
            <div className="bg-blue-950/80 text-blue-200 border-b border-blue-900/50 p-3 font-black text-sm flex justify-between items-center">
              <span className="truncate">{match.visitante_nombre || match.jugador_visitante_nombre || 'Equipo 2'}</span>
              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30 font-bold">VISITANTE</span>
            </div>
            
            <div className="p-3 flex-1 overflow-y-auto">
              <div className="flex justify-between items-center bg-slate-900/80 px-3 py-1.5 rounded-xl text-[11px] font-extrabold text-slate-400 mb-2 border border-slate-800">
                <span className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded border-slate-700 text-blue-500" />
                  # JUGADORES
                </span>
                <span className="flex gap-4">
                  <span>TITULAR</span>
                  <span className="w-5 text-center">⚽</span>
                  <span className="w-5 text-center">🟨</span>
                  <span className="w-5 text-center">🟥</span>
                </span>
              </div>

              {jugadoresVisitante.length === 0 ? (
                <div className="text-center text-slate-500 py-10 text-xs font-semibold">
                  Sin plantilla cargada para este equipo.
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {jugadoresVisitante.map((p, idx) => (
                    <div key={p.id || idx} className="flex items-center justify-between bg-slate-900/40 hover:bg-slate-800/40 p-2 rounded-xl border border-slate-800/60 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <input 
                          type="checkbox" 
                          checked={p.titular !== false} 
                          onChange={() => {
                            setJugadoresVisitante(prev => prev.map((item, i) => i === idx ? { ...item, titular: !item.titular } : item));
                            saveToBackend();
                          }}
                          className="rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-0 cursor-pointer" 
                        />
                        <span className="font-mono font-bold text-slate-400 w-4">{p.numero_camiseta || idx + 10}</span>
                        <span className="font-bold text-slate-200 truncate">{p.nombre}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Titular toggle switch */}
                        <button
                          onClick={() => {
                            setJugadoresVisitante(prev => prev.map((item, i) => i === idx ? { ...item, titular: !item.titular } : item));
                            saveToBackend();
                          }}
                          className={`w-9 h-5 rounded-full p-0.5 transition-colors ${p.titular !== false ? 'bg-emerald-500' : 'bg-slate-700'}`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${p.titular !== false ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>

                        {/* Goal Button */}
                        <button 
                          onClick={() => handleAddPlayerGoal(p, match.equipo_visitante_id, false)} 
                          className="w-6 h-6 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-black text-[11px] flex items-center justify-center border border-emerald-500/30"
                          title="Sumar gol a este jugador"
                        >
                          ⚽
                        </button>

                        {/* Yellow Card Button */}
                        <button 
                          onClick={() => handleAddPlayerCard(p, match.equipo_visitante_id, 'AMARILLA')} 
                          className="w-5 h-6 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 text-xs font-bold"
                          title="Tarjeta Amarilla"
                        >
                          🟨
                        </button>

                        {/* Red Card Button */}
                        <button 
                          onClick={() => handleAddPlayerCard(p, match.equipo_visitante_id, 'ROJA')} 
                          className="w-5 h-6 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-400 text-xs font-bold"
                          title="Tarjeta Roja"
                        >
                          🟥
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM PANEL (JUGADAS DEL PARTIDO & REGISTROS DE ARBITRAJE) */}
        <div className="bg-slate-950 border-t border-slate-800 p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-4 h-[180px] flex-shrink-0">
          
          {/* Jugadas del partido */}
          <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-3 flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
              <h4 className="font-extrabold text-xs text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span>Jugadas del partido</span>
              </h4>
              <button 
                onClick={openNewEventModal}
                className="w-6 h-6 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 flex items-center justify-center border border-blue-500/30 transition"
                title="Agregar jugada"
              >
                <Plus size={14}/>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 text-xs font-mono text-slate-300">
              {eventos.length === 0 ? (
                <div className="text-slate-500 text-center py-4 text-xs font-sans">
                  Sin eventos registrados en este partido.
                </div>
              ) : (
                eventos.map((ev) => (
                  <div 
                    key={ev.id} 
                    onClick={() => openEditEventModal(ev)}
                    className="flex justify-between items-center bg-slate-950/60 hover:bg-slate-800/60 p-2 rounded-lg border border-slate-800/60 cursor-pointer transition"
                  >
                    <div>
                      <span className="text-amber-400 font-bold mr-2">{ev.periodo || 1}. {String(ev.minuto || 0).padStart(2, '0')}:00</span>
                      <span className="font-bold text-slate-200">
                        {ev.tipo === 'GOL' ? '⚽ GOOL!' : ev.tipo === 'AMARILLA' ? '🟨 TARJETA AMARILLA' : ev.tipo === 'ROJA' ? '🟥 TARJETA ROJA' : ev.tipo}
                      </span>
                      <span className="text-slate-400 ml-2">— {ev.jugador_nombre || ev.observaciones || 'Jugador'}</span>
                    </div>
                    <Edit size={12} className="text-slate-500 hover:text-slate-300" />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Registros de arbitraje */}
          <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-3 flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
              <h4 className="font-extrabold text-xs text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span>Registros de arbitraje</span>
              </h4>
              <button 
                onClick={() => setShowRefModal(true)}
                className="w-6 h-6 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 flex items-center justify-center border border-blue-500/30 transition"
                title="Agregar observación de arbitraje"
              >
                <Plus size={14}/>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto text-xs text-slate-300 font-sans">
              {observaciones ? (
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 whitespace-pre-wrap">
                  {observaciones}
                </div>
              ) : (
                <div className="text-slate-500 text-center py-4 text-xs">
                  Sin observaciones de arbitraje cargadas.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* MODAL: REGISTRAR/EDITAR JUGADA DEL PARTIDO (FUTBOL CONTROLLER) */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 text-slate-100 flex flex-col gap-4">
            <h3 className="font-extrabold text-lg border-b border-slate-800 pb-2 flex justify-between items-center">
              <span>{selectedEvent ? 'Editar Jugada' : 'Registrar Jugada del Partido'}</span>
              <button onClick={() => setShowEventModal(false)} className="text-slate-400 hover:text-white"><X size={18}/></button>
            </h3>

            <div className="flex flex-col gap-3">
              {/* Gol / Tipo del jugador */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Gol / Evento del jugador</label>
                <select 
                  value={eventPlayerId} 
                  onChange={e => setEventPlayerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-bold text-slate-200 outline-none"
                >
                  <option value="">Seleccione el jugador</option>
                  {allPlayers.map(p => (
                    <option key={p.id} value={p.id}>#{p.numero_camiseta || ''} {p.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Asistencia jugador */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Asistencia jugador</label>
                <select 
                  value={eventAssistId} 
                  onChange={e => setEventAssistId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-bold text-slate-200 outline-none"
                >
                  <option value="">Seleccione el jugador asistente</option>
                  {allPlayers.map(p => (
                    <option key={p.id} value={p.id}>#{p.numero_camiseta || ''} {p.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Definir tiempo checkbox */}
              <div className="flex items-center gap-2 my-1">
                <input 
                  type="checkbox" 
                  id="defTiempo" 
                  checked={eventTimeCheck} 
                  onChange={e => setEventTimeCheck(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-blue-500" 
                />
                <label htmlFor="defTiempo" className="text-xs font-extrabold text-slate-300 cursor-pointer">
                  Definir tiempo ({periodo}º Tiempo — {formatTime(timer)})
                </label>
              </div>

              {/* Descripción */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Descripción</label>
                <textarea 
                  value={eventDesc} 
                  onChange={e => setEventDesc(e.target.value)} 
                  rows={3} 
                  placeholder="Detalles de la jugada..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center border-t border-slate-800 pt-3 mt-2">
              {selectedEvent ? (
                <button 
                  onClick={() => handleDeleteEvent(selectedEvent.id!)}
                  className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Trash2 size={14} /> Quitar
                </button>
              ) : <div />}

              <div className="flex gap-2">
                <button 
                  onClick={() => setShowEventModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveEventFromModal}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-xs font-extrabold transition shadow-lg"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRO DE ARBITRAJE */}
      {showRefModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 text-slate-100 flex flex-col gap-4">
            <h3 className="font-extrabold text-lg border-b border-slate-800 pb-2 flex justify-between items-center">
              <span>Agregar Registro de Arbitraje</span>
              <button onClick={() => setShowRefModal(false)} className="text-slate-400 hover:text-white"><X size={18}/></button>
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Informe / Observación del árbitro</label>
              <textarea 
                value={refNoteText} 
                onChange={e => setRefNoteText(e.target.value)} 
                rows={4} 
                placeholder="Ejemplo: Partido suspendido temporalmente por inclemencia del tiempo..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
              <button 
                onClick={() => setShowRefModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveRefNote}
                className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-xs font-extrabold transition shadow-lg"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
