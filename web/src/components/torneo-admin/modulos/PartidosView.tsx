"use client";
import React, { useState, useEffect } from 'react';
import { 
  Calendar, Plus, MoreVertical, PlayCircle, Edit3, X, Loader2, Trophy, 
  List, Check, Share2, RotateCcw, Image as ImageIcon, FileText, ChevronRight 
} from 'lucide-react';
import MatchController from './MatchController';
import MatchAddModal from './MatchAddModal';
import MMAController from './MMAController';
import FormasController from './FormasController';
import EditMatchInfoModal from './EditMatchInfoModal';
import SelectTeamsModal from './SelectTeamsModal';
import ArtDuJeuModal from './ArtDuJeuModal';
import ActaModal from './ActaModal';

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
  const [shareSubmenuId, setShareSubmenuId] = useState<string | null>(null);

  // Active Modals & Match Controls
  const [activeMatch, setActiveMatch] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Custom Modals
  const [editInfoMatch, setEditInfoMatch] = useState<any>(null);
  const [selectTeamsMatch, setSelectTeamsMatch] = useState<any>(null);
  const [artDuJeuMatch, setArtDuJeuMatch] = useState<any>(null);
  const [actaMatch, setActaMatch] = useState<any>(null);

  useEffect(() => {
    if (!partidosProp) {
      fetchPartidos();
    } else {
      setLoading(false);
    }
  }, [torneoId, partidosProp]);

  const getToken = () => {
    try {
      const session = JSON.parse(localStorage.getItem('user_session') || '{}');
      return session.access_token || session.token || '';
    } catch {
      return '';
    }
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

  const handleRestaurarPartido = async (matchId: string) => {
    try {
      const res = await fetch(`${API_URL}/cancha/torneos/partidos/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ estado: 'programado', goles_local: 0, goles_visitante: 0 })
      });
      if(res.ok) {
        setMenuOpenId(null);
        if(onRefresh) onRefresh(); else fetchPartidos();
      }
    } catch(e) { console.error(e); }
  };

  const handleQuitarPartido = async (matchId: string) => {
    if(!confirm("¿Estás seguro de eliminar este encuentro?")) return;
    try {
      const res = await fetch(`${API_URL}/cancha/torneos/partidos/${matchId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if(res.ok) {
        setMenuOpenId(null);
        if(onRefresh) onRefresh(); else fetchPartidos();
      }
    } catch(e) { console.error(e); }
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

  let partidosAMostrar = faseOculta ? partidos : partidos.filter(p => (p.fase || 'Fase 1') === faseFilter);

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
                    onClick={() => {
                      setMenuOpenId(menuOpenId === p.id ? null : p.id);
                      setShareSubmenuId(null);
                    }}
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

              {/* CONTEXT MENU DROPDOWN (Matching Image 1 & User Request) */}
              {menuOpenId === p.id && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 bg-[#0c0c28] rounded-xl shadow-2xl z-30 overflow-hidden text-white font-medium text-xs animate-in fade-in zoom-in-95 border border-indigo-900">
                  
                  {/* Ver partido */}
                  <button 
                    onClick={() => { setActiveMatch(p); setMenuOpenId(null); }}
                    className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-indigo-900/80 transition border-b border-indigo-900/40"
                  >
                    <PlayCircle size={16} className="text-indigo-400" /> Ver partido
                  </button>

                  {/* Seleccionar equipos */}
                  <button 
                    onClick={() => { setSelectTeamsMatch(p); setMenuOpenId(null); }}
                    className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-indigo-900/80 transition border-b border-indigo-900/40"
                  >
                    <List size={16} className="text-indigo-400" /> Seleccionar equipos
                  </button>

                  {/* Editar resultado */}
                  <button 
                    onClick={() => { setActiveMatch(p); setMenuOpenId(null); }}
                    className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-indigo-900/80 transition border-b border-indigo-900/40"
                  >
                    <Check size={16} className="text-indigo-400" /> Editar resultado
                  </button>

                  {/* Editar informacion */}
                  <button 
                    onClick={() => { setEditInfoMatch(p); setMenuOpenId(null); }}
                    className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-indigo-900/80 transition border-b border-indigo-900/40"
                  >
                    <Edit3 size={16} className="text-indigo-400" /> Editar informacion
                  </button>

                  {/* Compartir Submenu Toggle (Matching Image 1 & 3) */}
                  <div className="relative border-b border-indigo-900/40">
                    <button 
                      onClick={() => setShareSubmenuId(shareSubmenuId === p.id ? null : p.id)}
                      className="w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-indigo-900/80 transition"
                    >
                      <span className="flex items-center gap-3">
                        <Share2 size={16} className="text-indigo-400" /> Compartir
                      </span>
                      <ChevronRight size={14} className="text-slate-400" />
                    </button>

                    {/* Compartir Submenu Options: Art du jeu / Acta */}
                    {shareSubmenuId === p.id && (
                      <div className="bg-[#14143a] border-t border-indigo-900/60 divide-y divide-indigo-900/40 pl-4">
                        <button 
                          onClick={() => { setArtDuJeuMatch(p); setMenuOpenId(null); setShareSubmenuId(null); }}
                          className="w-full text-left py-2.5 px-3 flex items-center gap-2.5 hover:bg-indigo-900/80 text-white transition"
                        >
                          <ImageIcon size={14} className="text-indigo-400" /> Art du jeu
                        </button>
                        <button 
                          onClick={() => { setActaMatch(p); setMenuOpenId(null); setShareSubmenuId(null); }}
                          className="w-full text-left py-2.5 px-3 flex items-center gap-2.5 hover:bg-indigo-900/80 text-white transition"
                        >
                          <FileText size={14} className="text-indigo-400" /> Acta
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Red Options: Restaurar / Quitar */}
                  <div className="bg-white divide-y divide-slate-100">
                    <button 
                      onClick={() => handleRestaurarPartido(p.id)}
                      className="w-full text-left px-4 py-2.5 flex items-center gap-3 text-red-500 hover:bg-red-50 transition font-bold"
                    >
                      <RotateCcw size={16} /> Restaurar
                    </button>
                    <button 
                      onClick={() => handleQuitarPartido(p.id)}
                      className="w-full text-left px-4 py-2.5 flex items-center gap-3 text-red-500 hover:bg-red-50 transition font-bold"
                    >
                      <X size={16} /> Quitar
                    </button>
                  </div>

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

      {/* Editar informacion Modal */}
      {editInfoMatch && (
        <EditMatchInfoModal 
          match={editInfoMatch}
          onClose={() => setEditInfoMatch(null)}
          onSuccess={() => {
            setEditInfoMatch(null);
            if(onRefresh) onRefresh(); else fetchPartidos();
          }}
        />
      )}

      {/* Seleccionar equipos Modal */}
      {selectTeamsMatch && (
        <SelectTeamsModal 
          torneoId={torneoId}
          match={selectTeamsMatch}
          onClose={() => setSelectTeamsMatch(null)}
          onSuccess={() => {
            setSelectTeamsMatch(null);
            if(onRefresh) onRefresh(); else fetchPartidos();
          }}
        />
      )}

      {/* Art du jeu Modal */}
      {artDuJeuMatch && (
        <ArtDuJeuModal 
          match={artDuJeuMatch}
          onClose={() => setArtDuJeuMatch(null)}
        />
      )}

      {/* Acta Modal */}
      {actaMatch && (
        <ActaModal 
          match={actaMatch}
          torneo={torneo}
          onClose={() => setActaMatch(null)}
        />
      )}

      {/* Match Controllers */}
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
