"use client";
import React, { useState, useEffect } from 'react';
import { Calendar, Plus, MoreVertical, PlayCircle, Edit3, X, Loader2, Trophy } from 'lucide-react';
import MatchController from './MatchController';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function PartidosView({ torneoId, deporte }: { torneoId: string, deporte?: string }) {
  const [partidos, setPartidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [faseFilter, setFaseFilter] = useState('1º Fase');
  
  // Dropdown context menu
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Match controller
  const [activeMatch, setActiveMatch] = useState<any>(null);

  useEffect(() => {
    fetchPartidos();
  }, [torneoId]);

  const getToken = () => {
    const session = JSON.parse(localStorage.getItem('user_session') || '{}');
    return session.access_token || session.token || '';
  };

  const fetchPartidos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/futbol/torneos/${torneoId}/partidos`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if(res.ok) setPartidos(await res.json());
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const handleAutoalineacion = async () => {
    if(!confirm("¿Generar partidos automáticamente para los atletas inscritos (MMA)?")) return;
    try {
      const res = await fetch(`${API_URL}/futbol/torneos/${torneoId}/autoalineacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({})
      });
      if(res.ok) fetchPartidos();
    } catch(e) {
      console.error(e);
    }
  };

  const getStatusColor = (status: string) => {
    if(status === 'finalizado') return 'text-green-600 bg-green-50 border-green-200';
    if(status === 'en_curso') return 'text-red-600 bg-red-50 border-red-200';
    return 'text-slate-600 bg-slate-50 border-slate-200';
  };

  const getStatusText = (status: string) => {
    if(status === 'finalizado') return 'FINALIZADO';
    if(status === 'en_curso') return 'EN VIVO';
    return 'NO REALIZADO';
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
          <Calendar className="text-blue-600" size={20} />
          Juegos
        </h4>
        <div className="flex gap-2">
          <select 
            value={faseFilter} 
            onChange={e => setFaseFilter(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-sm bg-white"
          >
            <option value="1º Fase">1º Fase</option>
            <option value="4tos de Final">4tos de Final</option>
            <option value="Semifinal">Semifinal</option>
            <option value="Final">Final</option>
          </select>
        </div>
      </div>

      <div className="flex justify-center mb-4 gap-2">
        <button className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1">
          <Plus size={14} /> AGREGAR PARTIDO
        </button>
        {deporte === 'Artes Marciales Mixtas' && (
          <button onClick={handleAutoalineacion} className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1">
            AUTOALINEACIÓN
          </button>
        )}
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto">
        {partidos.filter(p => p.fase === faseFilter || !p.fase).length === 0 ? (
          <div className="text-center text-slate-400 text-sm mt-8">No hay juegos en esta fase.</div>
        ) : (
          partidos.filter(p => p.fase === faseFilter || !p.fase).map(p => (
            <div key={p.id} className="relative">
              <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between shadow-sm hover:shadow-md transition">
                
                {/* Local */}
                <div className="flex flex-col items-center flex-1">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 mb-1 overflow-hidden">
                    {p.local_logo ? <img src={p.local_logo} className="w-full h-full object-cover" /> : <Trophy size={18} />}
                  </div>
                  <span className="text-xs font-medium text-center line-clamp-1">{p.jugador_local_nombre || p.local_nombre}</span>
                </div>

                {/* Marcador Central */}
                <div className="flex flex-col items-center justify-center px-4">
                  <div className={`text-[10px] font-bold px-2 py-0.5 rounded border mb-1 whitespace-nowrap ${getStatusColor(p.estado)}`}>
                    {getStatusText(p.estado)}
                  </div>
                  <button 
                    onClick={() => setMenuOpenId(menuOpenId === p.id ? null : p.id)}
                    className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-md transition border border-slate-200 font-bold text-lg w-16"
                  >
                    {p.estado === 'programado' ? ':' : `${p.goles_local} - ${p.goles_visitante}`}
                  </button>
                </div>

                {/* Visitante */}
                <div className="flex flex-col items-center flex-1">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 mb-1 overflow-hidden">
                    {p.visitante_logo ? <img src={p.visitante_logo} className="w-full h-full object-cover" /> : <Trophy size={18} />}
                  </div>
                  <span className="text-xs font-medium text-center line-clamp-1">{p.jugador_visitante_nombre || p.visitante_nombre || 'Esperando...'}</span>
                </div>
              </div>

              {/* Context Menu Dropdown */}
              {menuOpenId === p.id && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-blue-700 rounded-xl shadow-xl z-20 overflow-hidden text-white font-medium text-sm animate-in fade-in zoom-in-95">
                  <button 
                    onClick={() => { setActiveMatch(p); setMenuOpenId(null); }}
                    className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-blue-600 transition"
                  >
                    <Edit3 size={16} /> Editar resultado
                  </button>
                  <button className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-blue-600 transition border-b border-blue-600/50">
                    <PlayCircle size={16} /> Ver partido
                  </button>
                  <button className="w-full text-left px-4 py-3 flex items-center gap-3 bg-white text-red-500 hover:bg-red-50 transition">
                    <X size={16} /> Quitar
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {activeMatch && (
        <MatchController 
          match={activeMatch} 
          deporte={deporte}
          onClose={() => { setActiveMatch(null); fetchPartidos(); }} 
        />
      )}
    </div>
  );
}
