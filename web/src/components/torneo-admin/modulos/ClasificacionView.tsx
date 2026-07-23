"use client";
import React, { useState, useEffect } from 'react';
import { BarChart2, Save, Loader2, Info } from 'lucide-react';
import PartidosView from './PartidosView';
import AsignacionCategoriasModal from './AsignacionCategoriasModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function ClasificacionView({ torneoId, torneo }: { torneoId: string, torneo?: any }) {
  const [categorias, setCategorias] = useState<any[]>([]);
  const [partidos, setPartidos] = useState<any[]>([]);
  const [fasesOptions, setFasesOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAsignacionModal, setShowAsignacionModal] = useState(false);

  // Configuracion de puntos
  const [showConfig, setShowConfig] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [torneoId]);

  const getToken = () => {
    const session = JSON.parse(localStorage.getItem('user_session') || '{}');
    return session.access_token || session.token || '';
  };

  const fetchData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const [resCat, resPart] = await Promise.all([
        fetch(`${API_URL}/futbol/torneos/${torneoId}/categorias-puntos`, { headers: { 'Authorization': `Bearer ${getToken()}` } }),
        fetch(`${API_URL}/cancha/torneos/${torneoId}/partidos`, { headers: { 'Authorization': `Bearer ${getToken()}` } })
      ]);
      
      if(resCat.ok) setCategorias(await resCat.json());
      
      if(resPart.ok) {
        const parts = await resPart.json();
        setPartidos(parts);
        const fFromTorneo = torneo?.configuracion?.fases?.length 
          ? torneo.configuracion.fases.map((f: any) => typeof f === 'object' ? f.name : f) 
          : ['Fase 1'];
        const fFromParts = Array.from(new Set(parts.map((p:any) => p.fase).filter(Boolean)));
        const uniqueFases = Array.from(new Set([...fFromTorneo, ...fFromParts])) as string[];
        setFasesOptions(uniqueFases.length > 0 ? uniqueFases : ['Fase 1']);
      }
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const computeStandings = (matches: any[]) => {
    const stats: Record<string, any> = {};
    matches.filter(m => m.estado === 'finalizado').forEach(m => {
      const pL = m.jugador_local_nombre || m.local_nombre || m.equipo_local;
      const pV = m.jugador_visitante_nombre || m.visitante_nombre || m.equipo_visitante;
      const gL = m.goles_local || 0;
      const gV = m.goles_visitante || 0;
      
      if (pL) {
        if (!stats[pL]) stats[pL] = { nombre: pL, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 };
        stats[pL].pj += 1;
        stats[pL].gf += gL;
        stats[pL].gc += gV;
        if (gL > gV) { stats[pL].pg += 1; stats[pL].pts += 3; }
        else if (gL === gV) { stats[pL].pe += 1; stats[pL].pts += 1; }
        else { stats[pL].pp += 1; }
      }
      
      if (pV) {
        if (!stats[pV]) stats[pV] = { nombre: pV, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 };
        stats[pV].pj += 1;
        stats[pV].gf += gV;
        stats[pV].gc += gL;
        if (gV > gL) { stats[pV].pg += 1; stats[pV].pts += 3; }
        else if (gV === gL) { stats[pV].pe += 1; stats[pV].pts += 1; }
        else { stats[pV].pp += 1; }
      }
    });
    return Object.values(stats).sort((a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc));
  };

  const handleChange = (id: string, field: string, value: any) => {
    setCategorias(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleSave = async (cat: any) => {
    setSavingId(cat.id);
    try {
      await fetch(`${API_URL}/futbol/categorias/${cat.id}/puntos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({
          pts_victoria: parseInt(cat.pts_victoria) || 0,
          pts_empate: parseInt(cat.pts_empate) || 0,
          pts_derrota: parseInt(cat.pts_derrota) || 0,
          criterio_desempate: cat.criterio_desempate || 'Diferencia de puntos'
        })
      });
    } catch(e) { console.error(e); }
    setSavingId(null);
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
        <div>
          <h3 className="text-xl font-bold text-slate-800">{torneo?.nombre || 'Campeonato'}</h3>
          <p className="text-sm text-slate-500">Gestión de Partidos y Clasificación</p>
        </div>
        <button 
          onClick={() => setShowConfig(!showConfig)}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition"
        >
          {showConfig ? 'Ocultar Configuración' : 'Configurar Puntos'}
        </button>
      </div>

      {showConfig && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3 text-blue-800 text-sm mb-6">
            <Info size={20} className="shrink-0 text-blue-500" />
            <p>
              Estos valores se utilizarán para calcular automáticamente la tabla de posiciones cuando se registren los resultados.
            </p>
          </div>
          
          {categorias.length === 0 ? (
            <p className="text-slate-500 text-center">Primero debes crear Categorías.</p>
          ) : (
            <div className="space-y-4">
              {categorias.map(cat => (
                <div key={cat.id} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-slate-700">{cat.nombre}</h4>
                    <button 
                      onClick={() => handleSave(cat)}
                      disabled={savingId === cat.id}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2"
                    >
                      {savingId === cat.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Guardar
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Pts. Victoria</label>
                      <input type="number" value={cat.pts_victoria ?? 3} onChange={e => handleChange(cat.id, 'pts_victoria', e.target.value)} className="w-full border p-2 rounded text-sm"/>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Pts. Empate</label>
                      <input type="number" value={cat.pts_empate ?? 1} onChange={e => handleChange(cat.id, 'pts_empate', e.target.value)} className="w-full border p-2 rounded text-sm"/>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Pts. Derrota</label>
                      <input type="number" value={cat.pts_derrota ?? 0} onChange={e => handleChange(cat.id, 'pts_derrota', e.target.value)} className="w-full border p-2 rounded text-sm"/>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Desempate</label>
                      <select value={cat.criterio_desempate || (cat.tipo_categoria === 'formas' ? 'Automático' : 'Diferencia de puntos')} onChange={e => handleChange(cat.id, 'criterio_desempate', e.target.value)} className="w-full border p-2 rounded text-sm">
                        {cat.tipo_categoria === 'formas' ? (
                          <>
                            <option value="Automático">Automático (Filtros ASAM)</option>
                            <option value="Manual">Manual (Tatami)</option>
                          </>
                        ) : (
                          <>
                            <option value="Diferencia de puntos">Dif. puntos/goles</option>
                            <option value="Enfrentamiento directo">Enfrentamiento directo</option>
                            <option value="Sorteo">Sorteo</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Acciones Globales */}
      <div className="flex justify-end gap-3 mb-6">
        {torneo?.deporte === 'Artes Marciales Mixtas' && (
          <>
            <button 
              onClick={async () => {
                if(!confirm("⚠️ ¿Estás seguro de que deseas ELIMINAR TODOS los partidos de este torneo? Esta acción no se puede deshacer.")) return;
                try {
                  const res = await fetch(`${API_URL}/cancha/torneos/${torneoId}/autoalineacion/reset`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${getToken()}` }
                  });
                  const data = await res.json();
                  if(res.ok) {
                    alert(data.message || 'Todos los partidos han sido eliminados');
                    fetchData();
                  } else {
                    alert(data.message || 'Ocurrió un error al resetear');
                  }
                } catch(e) { console.error(e); }
              }}
              className="flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition border border-red-200"
            >
              RESETEAR
            </button>
            <button 
              onClick={() => setShowAsignacionModal(true)}
              className="flex items-center gap-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition border border-indigo-200"
            >
              1. ASIGNAR CATEGORÍAS
            </button>
            <button 
              onClick={async () => {
                if(!confirm("¿Generar partidos automáticamente basándose en las asignaciones actuales?")) return;
                try {
                  const res = await fetch(`${API_URL}/cancha/torneos/${torneoId}/autoalineacion`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                    body: JSON.stringify({})
                  });
                  const data = await res.json();
                  if(res.ok && data.status !== 'error') {
                    alert(data.message || 'Partidos generados correctamente');
                    fetchData();
                  } else {
                    alert(data.message || 'Ocurrió un error al generar partidos');
                  }
                } catch(e) { console.error(e); }
              }}
              className="flex items-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition border border-emerald-200"
            >
              2. GENERAR COMBATES
            </button>
          </>
        )}
      </div>

      {showAsignacionModal && (
        <AsignacionCategoriasModal
          torneoId={torneoId}
          onClose={() => {
            setShowAsignacionModal(false);
            fetchData();
          }}
          getToken={getToken}
        />
      )}

      {/* Lista agrupada por Categorías y luego Divisiones */}
      <div className="flex flex-col gap-10 pb-10">
        {(() => {
          if (fasesOptions.length === 0) return (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 text-center text-slate-500">
              No hay categorías ni emparejamientos creados aún. Haz clic en "AUTOALINEACIÓN" si deseas generarlos.
            </div>
          );

          // Agrupar las fases parseándolas
          const grouped: Record<string, { original: string, division: string }[]> = {};
          fasesOptions.forEach(fase => {
            let cat = 'Categoría Única';
            let div = fase;
            if (fase.includes(' - ')) {
              const leftPart = fase.split(' - ')[0];
              const words = leftPart.split(' ');
              if (words.length > 1) {
                div = words[0];
                cat = words.slice(1).join(' ');
              }
            }
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push({ original: fase, division: div });
          });

          return Object.keys(grouped).map(categoria => (
            <details key={categoria} className="border-[3px] border-slate-300 rounded-2xl overflow-hidden shadow-sm bg-slate-100 group" open>
              <summary className="bg-slate-300 py-4 px-6 border-b-2 border-slate-400 cursor-pointer list-none flex justify-between items-center hover:bg-slate-400 transition">
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  CATEGORÍA: {categoria}
                </h2>
                <span className="text-slate-600 transition-transform group-open:rotate-180 text-xl font-bold">▼</span>
              </summary>
              
              <div className="p-4 flex flex-col gap-6">
                {grouped[categoria].map(({ original, division }) => {
                  const partidosFase = partidos.filter(p => (p.fase || 'Fase 1') === original);
                  const standings = computeStandings(partidosFase);
                  
                  return (
                    <details key={original} className="bg-white border-2 border-slate-300 rounded-xl shadow-md overflow-hidden flex flex-col group/div" open>
                      <summary className="bg-slate-800 text-white p-3 cursor-pointer list-none flex justify-between items-center hover:bg-slate-700 transition">
                        <h3 className="font-bold text-lg uppercase tracking-wider">
                          DIVISIÓN: {division}
                        </h3>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium text-slate-400">{original}</span>
                          <span className="text-slate-400 transition-transform group-open/div:rotate-180 font-bold">▼</span>
                        </div>
                      </summary>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                {/* Tabla de Posiciones */}
                <div className="p-4 border-r border-slate-100 bg-slate-50">
                  <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <BarChart2 className="text-blue-600" size={18} />
                    Tabla de Posiciones
                  </h4>
                  {standings.length === 0 ? (
                    <div className="text-center text-slate-400 mt-8 text-sm">
                      Aún no hay resultados finalizados para calcular la tabla en esta división.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-200/50 text-slate-600 font-bold">
                          <tr>
                            <th className="py-2 px-3">#</th>
                            <th className="py-2 px-3">Competidor</th>
                            <th className="py-2 px-3 text-center">PJ</th>
                            <th className="py-2 px-3 text-center">G</th>
                            <th className="py-2 px-3 text-center">E</th>
                            <th className="py-2 px-3 text-center">P</th>
                            <th className="py-2 px-3 text-center text-blue-600">Pts</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {standings.map((s, idx) => (
                            <tr key={s.nombre} className="hover:bg-slate-100/50">
                              <td className="py-2 px-3 font-bold text-slate-400">{idx + 1}</td>
                              <td className="py-2 px-3 font-semibold text-slate-700">{s.nombre}</td>
                              <td className="py-2 px-3 text-center text-slate-500">{s.pj}</td>
                              <td className="py-2 px-3 text-center text-green-600">{s.pg}</td>
                              <td className="py-2 px-3 text-center text-slate-400">{s.pe}</td>
                              <td className="py-2 px-3 text-center text-red-500">{s.pp}</td>
                              <td className="py-2 px-3 text-center font-bold text-blue-600">{s.pts}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                
                {/* Partidos de esta Fase */}
                <div className="p-0">
                  <PartidosView 
                    torneoId={torneoId} 
                    deporte={torneo?.deporte} 
                    torneo={torneo} 
                    partidosProp={partidosFase}
                    faseOculta={original}
                    onRefresh={() => fetchData(true)}
                    tipoCategoria={original.includes('Formas') ? 'formas' : (categorias.find(c => c.nombre === categoria)?.tipo_categoria || 'combate')}
                    criterioDesempate={categorias.find(c => c.nombre === categoria)?.criterio_desempate || 'Automático'}
                  />
                </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            </details>
          ));
        })()}
      </div>
    </div>
  );
}
