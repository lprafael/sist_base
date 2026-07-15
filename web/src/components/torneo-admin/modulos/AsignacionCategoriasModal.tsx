import React, { useState, useEffect } from 'react';
import { X, Save, GripVertical } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

interface Player {
  id: string;
  nombre: string;
  genero: string;
  fecha_nacimiento: string;
  torneo_equipo_id: string;
  logo_url?: string;
}

interface AsignacionCategoriasModalProps {
  torneoId: string;
  onClose: () => void;
  getToken: () => string | null;
}

export default function AsignacionCategoriasModal({ torneoId, onClose, getToken }: AsignacionCategoriasModalProps) {
  const [grupos, setGrupos] = useState<Record<string, Player[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAsignaciones();
  }, []);

  const fetchAsignaciones = async () => {
    try {
      const res = await fetch(`${API_URL}/cancha/torneos/${torneoId}/asignaciones`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (res.ok && data.grupos) {
        setGrupos(data.grupos);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, playerId: string, sourceGroup: string) => {
    e.dataTransfer.setData('playerId', playerId);
    e.dataTransfer.setData('sourceGroup', sourceGroup);
  };

  const handleDrop = async (e: React.DragEvent, targetGroup: string) => {
    e.preventDefault();
    const playerId = e.dataTransfer.getData('playerId');
    const sourceGroup = e.dataTransfer.getData('sourceGroup');

    if (sourceGroup === targetGroup || !playerId) return;

    // Optimistic UI update
    setGrupos(prev => {
      const newGrupos = { ...prev };
      const playerIndex = newGrupos[sourceGroup].findIndex(p => p.id === playerId);
      if (playerIndex > -1) {
        const player = newGrupos[sourceGroup][playerIndex];
        newGrupos[sourceGroup].splice(playerIndex, 1);
        if (!newGrupos[targetGroup]) newGrupos[targetGroup] = [];
        newGrupos[targetGroup].push(player);
      }
      return newGrupos;
    });

    try {
      await fetch(`${API_URL}/cancha/torneos/${torneoId}/asignaciones/${playerId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}` 
        },
        body: JSON.stringify({ fase_asignada: targetGroup })
      });
    } catch (e) {
      console.error("Error actualizando asignación:", e);
      fetchAsignaciones(); // Revert on error
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
      <div className="bg-slate-50 w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-800 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black tracking-widest uppercase">1. Asignar Categorías</h2>
            <p className="text-slate-300 text-sm mt-1">
              Arrastra a los atletas a sus categorías correspondientes. 
              El sistema los agrupó automáticamente según edad y género, pero puedes cambiarlo.
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition">
            <X size={24} />
          </button>
        </div>

        {/* Board */}
        <div className="flex-1 overflow-x-auto p-6 flex gap-6 items-start">
          {loading ? (
            <div className="w-full text-center text-slate-500 py-10 font-bold">Cargando atletas...</div>
          ) : (
            Object.keys(grupos).map(grupo => (
              <div 
                key={grupo}
                className="bg-white border-2 border-slate-200 shadow-sm rounded-xl min-w-[300px] w-[300px] max-w-[300px] flex flex-col max-h-full"
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleDrop(e, grupo)}
              >
                <div className="bg-slate-200 p-3 border-b-2 border-slate-300">
                  <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">{grupo}</h3>
                  <div className="text-xs text-slate-500 font-semibold mt-1">
                    {grupos[grupo].length} atletas
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-[150px]">
                  {grupos[grupo].map(player => (
                    <div 
                      key={player.id}
                      draggable
                      onDragStart={e => handleDragStart(e, player.id, grupo)}
                      className="bg-white border-2 border-slate-200 rounded-lg p-3 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing flex items-center gap-3 transition"
                    >
                      <div className="text-slate-400 cursor-grab">
                        <GripVertical size={16} />
                      </div>
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex-shrink-0 flex items-center justify-center border overflow-hidden">
                         {player.logo_url ? <img src={player.logo_url} className="w-full h-full object-cover" /> : <span className="text-slate-400 text-xs font-bold">{player.nombre.charAt(0)}</span>}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm leading-tight">{player.nombre}</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded">
                          {player.genero} • Nac: {player.fecha_nacimiento ? player.fecha_nacimiento.split('-')[0] : 'N/A'}
                        </div>
                      </div>
                    </div>
                  ))}
                  {grupos[grupo].length === 0 && (
                    <div className="text-center text-slate-400 text-xs py-4">Arrastra atletas aquí</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
