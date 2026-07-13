import React, { useState, useEffect } from 'react';
import { X, Play, Pause, RotateCcw, Plus, Minus, Check, Trophy } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function FootballController({ match, onClose }: { match: any, onClose: () => void }) {
  const [estado, setEstado] = useState(match.estado || 'programado'); // 'programado' | 'en_curso' | 'finalizado'
  const [golesLocal, setGolesLocal] = useState(match.goles_local || 0);
  const [golesVisitante, setGolesVisitante] = useState(match.goles_visitante || 0);

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
      await fetch(`${API_URL}/cancha/torneos/partidos/${match.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({
          goles_local: golesLocal,
          goles_visitante: golesVisitante,
          estado: estadoFinal,
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

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-100 w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-blue-700 text-white p-3 flex justify-between items-center relative">
          <button onClick={onClose} className="p-2 hover:bg-blue-600 rounded-full transition"><X size={20} /></button>
          
          <div className="absolute left-1/2 -translate-x-1/2">
            <select 
              value={mapEstadoToSelect(estado)} 
              onChange={e => handleStateChange(e.target.value)}
              className="bg-blue-800 border-none text-white font-bold py-2 px-4 rounded-lg appearance-none text-center cursor-pointer hover:bg-blue-600 transition outline-none"
              style={{ textAlignLast: 'center' }}
            >
              <option value="NO REALIZADO">NO REALIZADO</option>
              <option value="EN VIVO">EN VIVO</option>
              <option value="FINALIZADO">FINALIZADO</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button onClick={() => handleSave()} className="bg-blue-600 hover:bg-blue-500 px-4 py-1.5 rounded-lg text-sm font-bold transition flex items-center gap-2">
              <Check size={16}/> Guardar
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-[1fr_300px_1fr] gap-4 overflow-y-auto">
          
          {/* Local Team */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="bg-blue-600 text-white p-3 font-bold text-center relative flex justify-between items-center">
              <span>{match.local_nombre || match.jugador_local_nombre}</span>
              <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
                {match.local_logo ? <img src={match.local_logo} className="w-full h-full object-cover"/> : <Trophy size={16}/>}
              </div>
            </div>
            <div className="p-4 flex-1">
              <div className="flex justify-between items-center bg-slate-50 p-2 rounded text-xs font-bold text-slate-500 mb-2">
                <span># JUGADORES</span>
                <span>TITULAR</span>
              </div>
              <div className="text-center text-slate-400 py-8 text-sm">
                Lista de jugadores (Próximamente conectada al roster)
              </div>
            </div>
          </div>

          {/* Center Column (Chronometer & Score) */}
          <div className="flex flex-col gap-4">
            {/* Score */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
              <h3 className="text-xs font-bold text-slate-400 mb-2">MARCADOR</h3>
              <div className="flex justify-center items-center gap-6">
                <div className="flex flex-col items-center">
                  <span className="text-4xl font-black text-slate-800">{golesLocal}</span>
                  <div className="flex gap-1 mt-2">
                    <button onClick={() => { setGolesLocal(p => Math.max(0, p - 1)); handleSave(); }} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Minus size={14}/></button>
                    <button onClick={() => { setGolesLocal(p => p + 1); handleSave(); }} className="w-8 h-8 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center justify-center"><Plus size={14}/></button>
                  </div>
                </div>
                <span className="text-2xl font-bold text-slate-300">-</span>
                <div className="flex flex-col items-center">
                  <span className="text-4xl font-black text-slate-800">{golesVisitante}</span>
                  <div className="flex gap-1 mt-2">
                    <button onClick={() => { setGolesVisitante(p => Math.max(0, p - 1)); handleSave(); }} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Minus size={14}/></button>
                    <button onClick={() => { setGolesVisitante(p => p + 1); handleSave(); }} className="w-8 h-8 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center justify-center"><Plus size={14}/></button>
                  </div>
                </div>
              </div>
            </div>

            {/* Chrono */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
              <h3 className="text-xs font-bold text-slate-400 mb-2 uppercase">Cronómetro de juego</h3>
              <div className="text-5xl font-mono font-black text-slate-800 mb-6 bg-slate-50 rounded-lg py-4 border border-slate-100">
                {formatTime(timer)}
              </div>
              <div className="flex justify-center gap-4">
                <button 
                  onClick={() => setIsRunning(!isRunning)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow transition ${isRunning ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}
                >
                  {isRunning ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                </button>
                <button 
                  onClick={() => { setIsRunning(false); setTimer(0); }}
                  className="w-14 h-14 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 transition shadow"
                >
                  <RotateCcw size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Away Team */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="bg-blue-600 text-white p-3 font-bold text-center relative flex justify-between items-center">
              <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
                {match.visitante_logo ? <img src={match.visitante_logo} className="w-full h-full object-cover"/> : <Trophy size={16}/>}
              </div>
              <span>{match.visitante_nombre || match.jugador_visitante_nombre || 'Visitante'}</span>
            </div>
            <div className="p-4 flex-1">
              <div className="flex justify-between items-center bg-slate-50 p-2 rounded text-xs font-bold text-slate-500 mb-2">
                <span># JUGADORES</span>
                <span>TITULAR</span>
              </div>
              <div className="text-center text-slate-400 py-8 text-sm">
                Lista de jugadores (Próximamente conectada al roster)
              </div>
            </div>
          </div>
        </div>

        {/* Bottom panel */}
        <div className="bg-white border-t border-slate-200 p-4 grid grid-cols-2 gap-4 min-h-[150px]">
          <div>
            <h4 className="font-bold text-sm text-slate-800 flex justify-between items-center mb-2 border-b pb-2">
              Jugadas del partido
              <button className="text-blue-500 hover:text-blue-700"><Plus size={16}/></button>
            </h4>
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-800 flex justify-between items-center mb-2 border-b pb-2">
              Registros de arbitraje
              <button className="text-blue-500 hover:text-blue-700"><Plus size={16}/></button>
            </h4>
          </div>
        </div>
      </div>
    </div>
  );
}
