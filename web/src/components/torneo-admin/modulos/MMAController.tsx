import React, { useState, useEffect } from 'react';
import { X, Play, Pause, RotateCcw, Check, Trophy, User } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function MMAController({ match, onClose }: { match: any, onClose: () => void }) {
  const [estado, setEstado] = useState(match.estado || 'programado');
  const [estadisticas, setEstadisticas] = useState(match.estadisticas || { local: 0, visitante: 0 });

  // Puntos calculados a partir de las estadisticas
  const ptLocal = estadisticas.local || 0;
  const ptVisitante = estadisticas.visitante || 0;

  // Chronometer
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isRunning) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
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
    const session = JSON.parse(localStorage.getItem('user_session') || '{}');
    return session.access_token || session.token || '';
  };

  const handleSave = async (nuevoEstado?: string) => {
    const estadoFinal = nuevoEstado || estado;
    try {
      await fetch(`${API_URL}/futbol/partidos/${match.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({
          goles_local: ptLocal, // En MMA, los goles son los puntos totales
          goles_visitante: ptVisitante,
          estado: estadoFinal,
          estadisticas: estadisticas
        })
      });
      if(nuevoEstado) setEstado(nuevoEstado);
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
    handleSave(newSt);
  };

  const updateStats = (lado: 'local' | 'visitante', pts: number) => {
    const n = { ...estadisticas };
    n[lado] = Math.max(0, (n[lado] || 0) + pts);
    setEstadisticas(n);
  };

  const scoreButtons = [
    { label: "Golpe a la cabeza", pts: 2, color: "bg-red-100 hover:bg-red-200 text-red-700" },
    { label: "Golpe al cuerpo", pts: 1, color: "bg-orange-100 hover:bg-orange-200 text-orange-700" },
    { label: "Derribo", pts: 2, color: "bg-blue-100 hover:bg-blue-200 text-blue-700" },
    { label: "Control de Suelo", pts: 1, color: "bg-indigo-100 hover:bg-indigo-200 text-indigo-700" },
    { label: "Falta (Penalización)", pts: -1, color: "bg-slate-800 hover:bg-slate-900 text-white" }
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-100 w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-blue-900 text-white p-3 flex justify-between items-center relative border-b-4 border-amber-500">
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition"><X size={20} /></button>
          
          <div className="absolute left-1/2 -translate-x-1/2">
            <select 
              value={mapEstadoToSelect(estado)} 
              onChange={e => handleStateChange(e.target.value)}
              className="bg-black/40 border border-white/20 text-white font-bold py-2 px-6 rounded-lg appearance-none text-center cursor-pointer hover:bg-black/60 transition outline-none"
              style={{ textAlignLast: 'center' }}
            >
              <option value="NO REALIZADO">NO REALIZADO</option>
              <option value="EN VIVO">EN VIVO</option>
              <option value="FINALIZADO">FINALIZADO</option>
            </select>
          </div>

          <button onClick={() => handleSave()} className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-1.5 rounded-lg text-sm font-bold transition flex items-center gap-2">
            <Check size={16}/> Guardar
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-[1fr_300px_1fr] gap-6 overflow-y-auto">
          
          {/* Peleador 1 */}
          <div className="bg-white rounded-xl border-2 border-red-500 shadow-md flex flex-col overflow-hidden">
            <div className="bg-red-600 text-white p-4 font-black text-center text-xl uppercase tracking-wider relative">
              <div className="absolute top-0 left-0 w-full h-full bg-black/10"></div>
              <span className="relative z-10">{match.jugador_local_nombre || match.local_nombre || 'ROJO'}</span>
            </div>
            <div className="p-6 flex-1 flex flex-col items-center justify-center gap-6 bg-slate-50">
              <div className="w-32 h-32 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden border-4 border-red-500 shadow-lg">
                {match.local_logo ? <img src={match.local_logo} className="w-full h-full object-cover"/> : <User size={48} className="text-slate-400"/>}
              </div>
              
              <div className="w-full space-y-3 mt-4">
                {scoreButtons.map(btn => (
                  <button 
                    key={btn.label}
                    onClick={() => { updateStats('local', btn.pts); handleSave(); }}
                    className={`w-full py-3 px-4 rounded-lg font-bold text-sm transition shadow-sm border border-black/5 flex justify-between items-center ${btn.color}`}
                  >
                    <span>{btn.label}</span>
                    <span className="bg-white/30 px-2 py-0.5 rounded text-xs">{btn.pts > 0 ? `+${btn.pts}` : btn.pts}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Center Column (Chronometer & Score) */}
          <div className="flex flex-col gap-6 justify-center">
            {/* Score */}
            <div className="bg-slate-900 rounded-2xl border-4 border-slate-700 shadow-2xl p-6 text-center text-white relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/10 to-transparent"></div>
              <h3 className="text-xs font-black text-amber-500 mb-4 tracking-widest relative z-10">PUNTUACIÓN ASAM</h3>
              <div className="flex justify-between items-center gap-4 relative z-10">
                <span className="text-6xl font-black text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">{ptLocal}</span>
                <span className="text-3xl font-black text-slate-500">VS</span>
                <span className="text-6xl font-black text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">{ptVisitante}</span>
              </div>
            </div>

            {/* Chrono */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
              <h3 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Tiempo de Combate</h3>
              <div className="text-6xl font-mono font-black text-slate-800 mb-6 py-4">
                {formatTime(timer)}
              </div>
              <div className="flex justify-center gap-4">
                <button 
                  onClick={() => setIsRunning(!isRunning)}
                  className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition ${isRunning ? 'bg-amber-500 text-white hover:bg-amber-400' : 'bg-emerald-500 text-white hover:bg-emerald-400'}`}
                >
                  {isRunning ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                </button>
                <button 
                  onClick={() => { setIsRunning(false); setTimer(0); }}
                  className="w-16 h-16 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 transition shadow"
                >
                  <RotateCcw size={24} />
                </button>
              </div>
            </div>
          </div>

          {/* Peleador 2 */}
          <div className="bg-white rounded-xl border-2 border-blue-500 shadow-md flex flex-col overflow-hidden">
            <div className="bg-blue-600 text-white p-4 font-black text-center text-xl uppercase tracking-wider relative">
              <div className="absolute top-0 left-0 w-full h-full bg-black/10"></div>
              <span className="relative z-10">{match.jugador_visitante_nombre || match.visitante_nombre || 'AZUL'}</span>
            </div>
            <div className="p-6 flex-1 flex flex-col items-center justify-center gap-6 bg-slate-50">
              <div className="w-32 h-32 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden border-4 border-blue-500 shadow-lg">
                {match.visitante_logo ? <img src={match.visitante_logo} className="w-full h-full object-cover"/> : <User size={48} className="text-slate-400"/>}
              </div>
              
              <div className="w-full space-y-3 mt-4">
                {scoreButtons.map(btn => (
                  <button 
                    key={btn.label}
                    onClick={() => { updateStats('visitante', btn.pts); handleSave(); }}
                    className={`w-full py-3 px-4 rounded-lg font-bold text-sm transition shadow-sm border border-black/5 flex justify-between items-center ${btn.color}`}
                  >
                    <span>{btn.label}</span>
                    <span className="bg-white/30 px-2 py-0.5 rounded text-xs">{btn.pts > 0 ? `+${btn.pts}` : btn.pts}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom panel */}
        <div className="bg-slate-900 text-white border-t-4 border-amber-500 p-3 text-center text-xs font-bold tracking-widest text-slate-400 uppercase">
          Asociación Sudamericana de Artes Marciales (ASAM) - Sistema de Puntuación
        </div>
      </div>
    </div>
  );
}
