"use client";
import React, { useState, useEffect } from 'react';
import { Calendar, Plus, MoreVertical, PlayCircle, Edit3, X, Loader2, Trophy } from 'lucide-react';
import MatchController from './MatchController';
import MatchAddModal from './MatchAddModal';
import MMAController from './MMAController';
import FormasController from './FormasController';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function PartidosView({ 
  torneoId, deporte, torneo, partidosProp, faseOculta, onRefresh, tipoCategoria, criterioDesempate
}: { 
  torneoId: string, deporte?: string, torneo?: any, partidosProp?: any[], faseOculta?: string, onRefresh?: () => void, tipoCategoria?: string, criterioDesempate?: string
}) {
  const [partidosState, setPartidosState] = useState<any[]>([]);
  const [loading, setLoading] = useState(!partidosProp);
  const partidos = partidosProp || partidosState;
  
  const fasesFromTorneo = torneo?.configuracion?.fases?.length 
    ? torneo.configuracion.fases.map((f: any) => typeof f === 'object' ? f.name : f) 
    : ['Fase 1'];
  const fasesFromPartidos = Array.from(new Set(partidos.map(p => p.fase).filter(Boolean)));
  const fasesOptions = Array.from(new Set([...fasesFromTorneo, ...fasesFromPartidos]));

  const [faseFilter, setFaseFilter] = useState(fasesFromTorneo[0]);

  
  // Dropdown context menu
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Match controller & modals
  const [activeMatch, setActiveMatch] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (!partidosProp) {
      fetchPartidos();
    } else {
      setLoading(false);
    }
  }, [torneoId, partidosProp]);

  const getToken = () => {
    const session = JSON.parse(localStorage.getItem('user_session') || '{}');
    return session.access_token || session.token || '';
  };

  const fetchPartidos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/cancha/torneos/${torneoId}/partidos`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if(res.ok) {
        const data = await res.json();
        setPartidosState(data);
        // If the current filter isn't in the new options and we have data, reset it
        const downloadedFases = Array.from(new Set(data.map((p:any) => p.fase).filter(Boolean)));
        if (downloadedFases.length > 0 && !downloadedFases.includes(faseFilter)) {
            setFaseFilter(downloadedFases[0] as string);
        }
      }
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const handleAutoalineacion = async () => {
    if(!confirm("¿Generar partidos automáticamente para los atletas inscritos (MMA)?")) return;
    try {
      const res = await fetch(`${API_URL}/cancha/torneos/${torneoId}/autoalineacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if(res.ok && data.status !== 'error') {
        alert(data.message || 'Partidos generados correctamente');
        if(onRefresh) onRefresh(); else fetchPartidos();
      } else {
        alert(data.message || 'Ocurrió un error al generar partidos');
      }
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

  // Filtrar los partidos que se van a mostrar (ya sea por prop o por filtro local)
  let partidosAMostrar = faseOculta ? partidos : partidos.filter(p => (p.fase || 'Fase 1') === faseFilter);

  if (tipoCategoria === 'formas') {
    partidosAMostrar.sort((a, b) => {
      const statsA = typeof a.estadisticas === 'string' ? JSON.parse(a.estadisticas || '{}') : (a.estadisticas || {});
      const statsB = typeof b.estadisticas === 'string' ? JSON.parse(b.estadisticas || '{}') : (b.estadisticas || {});
      
      const scoreA = statsA.puntaje_final || 0;
      const scoreB = statsB.puntaje_final || 0;

      if (scoreA !== scoreB) return scoreB - scoreA;
      
      // Si el desempate es manual, no usar los filtros, los dejamos empatados.
      if (criterioDesempate === 'Manual') return 0;

      // Tie breakers automáticos
      const f1A = statsA.filtro1_min_valido || 0;
      const f1B = statsB.filtro1_min_valido || 0;
      if (f1A !== f1B) {
         if (a.estado !== 'empatado_desempate' && b.estado !== 'empatado_desempate') {
            // we could flag something, but let's just sort
            return f1B - f1A;
         }
      }

      const f2A = statsA.filtro2_max_valido || 0;
      const f2B = statsB.filtro2_max_valido || 0;
      if (f2A !== f2B) return f2B - f2A;

      const f3A = statsA.filtro3_min_descartado || 0;
      const f3B = statsB.filtro3_min_descartado || 0;
      if (f3A !== f3B) return f3B - f3A;

      const f4A = statsA.filtro4_max_descartado || 0;
      const f4B = statsB.filtro4_max_descartado || 0;
      if (f4A !== f4B) return f4B - f4A;

      return 0;
    });
  }

  return (
    <div className={`bg-slate-50 border-slate-200 flex flex-col h-full ${faseOculta ? 'p-4' : 'border rounded-xl p-4'}`}>
      {!faseOculta && (
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
              {fasesOptions.map((fase: string) => (
                <option key={fase} value={fase}>{fase}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {!faseOculta && (
        <div className="flex justify-center mb-4 gap-2">
          <button 
            onClick={() => { setActiveMatch(null); setShowAddModal(true); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition"
          >
            <Plus size={16}/> AGREGAR PARTIDO
          </button>
          {deporte === 'Artes Marciales Mixtas' && (
            <button 
              onClick={handleAutoalineacion}
              className="flex items-center gap-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition border border-indigo-200"
            >
              AUTOALINEACIÓN
            </button>
          )}
        </div>
      )}

      <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-2">
        {partidosAMostrar.length === 0 ? (
          <div className="text-center text-slate-400 mt-10">
            No hay participantes o juegos en esta fase.
          </div>
        ) : tipoCategoria === 'formas' ? (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Competidor</th>
                  <th className="py-3 px-4 text-center">Puntaje Jueces</th>
                  <th className="py-3 px-4 text-center">Puntaje Final</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {partidosAMostrar.map((p, idx) => {
                   const stats = typeof p.estadisticas === 'string' ? JSON.parse(p.estadisticas || '{}') : (p.estadisticas || {});
                   let desempateMsg = null;
                   
                   if (idx > 0) {
                      const prevStats = typeof partidosAMostrar[idx-1].estadisticas === 'string' 
                          ? JSON.parse(partidosAMostrar[idx-1].estadisticas || '{}') 
                          : (partidosAMostrar[idx-1].estadisticas || {});
                      
                      const scoreA = prevStats.puntaje_final || 0;
                      const scoreB = stats.puntaje_final || 0;
                      if (scoreA === scoreB && scoreA > 0) {
                          if (prevStats.filtro1_min_valido !== stats.filtro1_min_valido) desempateMsg = "Filtro 1";
                          else if (prevStats.filtro2_max_valido !== stats.filtro2_max_valido) desempateMsg = "Filtro 2";
                          else if (prevStats.filtro3_min_descartado !== stats.filtro3_min_descartado) desempateMsg = "Filtro 3";
                          else if (prevStats.filtro4_max_descartado !== stats.filtro4_max_descartado) desempateMsg = "Filtro 4";
                          else desempateMsg = "Manual (Tatami)";
                      }
                   }

                   return (
                     <tr key={p.id} className="hover:bg-slate-50 transition">
                       <td className="py-3 px-4 font-bold text-slate-400">{idx + 1}</td>
                       <td className="py-3 px-4 font-semibold text-slate-700 flex flex-col gap-1">
                         <div className="flex items-center gap-2">
                           <div className="w-8 h-8 bg-slate-100 rounded overflow-hidden">
                             {p.local_logo ? <img src={p.local_logo} className="w-full h-full object-cover" /> : <Trophy size={14} className="m-2 text-slate-400" />}
                           </div>
                           {p.jugador_local_nombre || p.local_nombre}
                         </div>
                         {desempateMsg && (
                           <span className="text-[10px] text-orange-500 font-bold bg-orange-50 w-fit px-2 py-0.5 rounded border border-orange-200">
                             Desempate: {desempateMsg}
                           </span>
                         )}
                       </td>
                       <td className="py-3 px-4 text-center text-slate-500 font-mono">
                         {stats.jueces ? stats.jueces.join(' - ') : '-'}
                       </td>
                       <td className="py-3 px-4 text-center font-bold text-blue-600 text-lg">
                         {stats.puntaje_final ?? '-'}
                       </td>
                       <td className="py-3 px-4 text-center">
                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusColor(p.estado)}`}>
                           {getStatusText(p.estado)}
                         </span>
                       </td>
                       <td className="py-3 px-4 text-right">
                         <button 
                           onClick={() => { setActiveMatch(p); setShowAddModal(false); }}
                           className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-bold transition"
                         >
                           Puntuar
                         </button>
                       </td>
                     </tr>
                   );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          partidosAMostrar.map(p => (
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

      {showAddModal && (
        <MatchAddModal
          torneoId={torneoId}
          deporte={deporte}
          fases={fasesOptions}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            if(onRefresh) onRefresh(); else fetchPartidos();
          }}
        />
      )}

      {activeMatch && (
        tipoCategoria === 'formas' ? (
          <FormasController 
            match={activeMatch} 
            onClose={() => setActiveMatch(null)}
            onSaved={() => { setActiveMatch(null); if(onRefresh) onRefresh(); else fetchPartidos(); }}
          />
        ) : (deporte === 'Artes Marciales Mixtas' || torneo?.deporte === 'Artes Marciales Mixtas') ? (
          <MMAController 
            match={activeMatch} 
            onClose={() => setActiveMatch(null)}
            onSaved={() => { setActiveMatch(null); if(onRefresh) onRefresh(); else fetchPartidos(); }}
            onUpdate={() => { if(onRefresh) onRefresh(); else fetchPartidos(); }}
          />
        ) : (
          <MatchController 
            match={activeMatch} 
            deporte={deporte}
            onClose={() => setActiveMatch(null)}
            onSaved={() => { setActiveMatch(null); if(onRefresh) onRefresh(); else fetchPartidos(); }}
          />
        )
      )}
    </div>
  );
}
