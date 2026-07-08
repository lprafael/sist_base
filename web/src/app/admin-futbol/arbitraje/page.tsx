"use client";
import React, { useState, useEffect } from 'react';
import { Play, Square, AlertTriangle, ShieldAlert, Goal } from 'lucide-react';

export default function VeedorFutbolPage() {
  const [matchState, setMatchState] = useState({
    time: 0,
    isRunning: false,
    period: 1, // 1st half, 2nd half
    scoreLocal: 0,
    scoreVisitante: 0,
    localId: '1',
    visitanteId: '2',
    partidoId: '100'
  });

  const [message, setMessage] = useState("");

  // Timer logic
  useEffect(() => {
    let interval: any;
    if (matchState.isRunning) {
      interval = setInterval(() => {
        setMatchState(prev => ({ ...prev, time: prev.time + 1 }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [matchState.isRunning]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const registrarEvento = async (tipo: string, equipoId: string) => {
    const min = Math.floor(matchState.time / 60);
    try {
      const res = await fetch("http://localhost:8001/futbol/arbitraje/evento", {
        method: "POST",
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          partido_id: matchState.partidoId,
          player_id: "jugador-anonimo", // En una version completa esto abriría un modal para elegir jugador
          equipo_id: equipoId,
          minuto: min,
          tipo: tipo
        })
      });

      if (res.ok) {
        setMessage(`✅ ${tipo} registrado al minuto ${min}'`);
        if (tipo === 'Gol') {
          if (equipoId === matchState.localId) {
            setMatchState(prev => ({ ...prev, scoreLocal: prev.scoreLocal + 1 }));
          } else {
            setMatchState(prev => ({ ...prev, scoreVisitante: prev.scoreVisitante + 1 }));
          }
        }
        setTimeout(() => setMessage(""), 3000);
      }
    } catch(e) {
      setMessage("❌ Error al registrar evento");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col p-4 md:p-8">
      
      {/* NOTIFICACION */}
      {message && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-full font-bold shadow-xl animate-bounce">
          {message}
        </div>
      )}

      {/* MARCADOR TOP */}
      <div className="bg-gray-800 rounded-3xl p-6 shadow-2xl border border-gray-700 flex flex-col items-center justify-center mb-8 relative overflow-hidden">
        
        {/* TIEMPO */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
          <span className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-1">
            {matchState.period === 1 ? '1ER TIEMPO' : '2DO TIEMPO'}
          </span>
          <div className={`text-5xl font-black font-mono ${matchState.isRunning ? 'text-green-400' : 'text-yellow-400'}`}>
            {formatTime(matchState.time)}
          </div>
          <div className="flex gap-4 mt-4">
            <button 
              onClick={() => setMatchState(prev => ({ ...prev, isRunning: !prev.isRunning }))}
              className={`p-3 rounded-full ${matchState.isRunning ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'} hover:bg-opacity-40 transition`}
            >
              {matchState.isRunning ? <Square size={24} /> : <Play size={24} />}
            </button>
          </div>
        </div>

        <div className="w-full flex justify-between items-center mt-24">
          
          {/* LOCAL */}
          <div className="flex flex-col items-center flex-1">
            <div className="w-24 h-24 bg-gray-700 rounded-full mb-4 flex items-center justify-center border-4 border-gray-600">
              <span className="text-2xl">🛡️</span>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-wider">LOCAL</h2>
          </div>

          {/* SCORES */}
          <div className="flex items-center gap-6 px-12">
            <span className="text-8xl font-black text-white">{matchState.scoreLocal}</span>
            <span className="text-4xl font-black text-gray-500">-</span>
            <span className="text-8xl font-black text-white">{matchState.scoreVisitante}</span>
          </div>

          {/* VISITANTE */}
          <div className="flex flex-col items-center flex-1">
            <div className="w-24 h-24 bg-gray-700 rounded-full mb-4 flex items-center justify-center border-4 border-gray-600">
              <span className="text-2xl">🦅</span>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-wider">VISITA</h2>
          </div>

        </div>
        
        {/* CHECK-IN BUTTON */}
        <div className="w-full flex justify-center mt-8">
          <button 
            onClick={() => window.location.href = '/admin-futbol/checkin'}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center gap-2"
          >
            <ShieldAlert size={20} />
            Realizar Check-in Biométrico
          </button>
        </div>
      </div>

      {/* CONTROLES DE EVENTOS */}
      <div className="grid grid-cols-2 gap-8 flex-1">
        
        {/* LOCAL BOTONES */}
        <div className="bg-gray-800 rounded-3xl p-6 border border-gray-700 flex flex-col gap-4">
          <button onClick={() => registrarEvento('Gol', matchState.localId)} className="flex-1 bg-green-600 hover:bg-green-500 rounded-2xl flex flex-col items-center justify-center text-white font-black text-2xl transition">
            <Goal size={48} className="mb-2" />
            GOL
          </button>
          <div className="flex gap-4 h-32">
            <button onClick={() => registrarEvento('Amarilla', matchState.localId)} className="flex-1 bg-yellow-500 hover:bg-yellow-400 rounded-2xl flex flex-col items-center justify-center text-black font-black text-xl transition">
              <AlertTriangle size={32} className="mb-2" /> AMARILLA
            </button>
            <button onClick={() => registrarEvento('Roja', matchState.localId)} className="flex-1 bg-red-600 hover:bg-red-500 rounded-2xl flex flex-col items-center justify-center text-white font-black text-xl transition">
              <ShieldAlert size={32} className="mb-2" /> ROJA
            </button>
          </div>
        </div>

        {/* VISITANTE BOTONES */}
        <div className="bg-gray-800 rounded-3xl p-6 border border-gray-700 flex flex-col gap-4">
          <button onClick={() => registrarEvento('Gol', matchState.visitanteId)} className="flex-1 bg-green-600 hover:bg-green-500 rounded-2xl flex flex-col items-center justify-center text-white font-black text-2xl transition">
            <Goal size={48} className="mb-2" />
            GOL
          </button>
          <div className="flex gap-4 h-32">
            <button onClick={() => registrarEvento('Amarilla', matchState.visitanteId)} className="flex-1 bg-yellow-500 hover:bg-yellow-400 rounded-2xl flex flex-col items-center justify-center text-black font-black text-xl transition">
              <AlertTriangle size={32} className="mb-2" /> AMARILLA
            </button>
            <button onClick={() => registrarEvento('Roja', matchState.visitanteId)} className="flex-1 bg-red-600 hover:bg-red-500 rounded-2xl flex flex-col items-center justify-center text-white font-black text-xl transition">
              <ShieldAlert size={32} className="mb-2" /> ROJA
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
