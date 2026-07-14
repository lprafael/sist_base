"use client";
import React, { useState, useEffect } from 'react';
import { BarChart2, Save, Loader2, Info } from 'lucide-react';
import PartidosView from './PartidosView';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function ClasificacionView({ torneoId, torneo }: { torneoId: string, torneo?: any }) {
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Configuracion de puntos
  const [showConfig, setShowConfig] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategorias();
  }, [torneoId]);

  const getToken = () => {
    const session = JSON.parse(localStorage.getItem('user_session') || '{}');
    return session.access_token || session.token || '';
  };

  const fetchCategorias = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/futbol/torneos/${torneoId}/categorias-puntos`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if(res.ok) setCategorias(await res.json());
    } catch(e) { console.error(e); }
    setLoading(false);
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
                      <select value={cat.criterio_desempate || 'Diferencia de puntos'} onChange={e => handleChange(cat.id, 'criterio_desempate', e.target.value)} className="w-full border p-2 rounded text-sm">
                        <option value="Diferencia de puntos">Dif. puntos/goles</option>
                        <option value="Enfrentamiento directo">Enfrentamiento directo</option>
                        <option value="Sorteo">Sorteo</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Split View */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 h-[70vh]">
        {/* Tabla de Posiciones */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 overflow-y-auto">
          <h4 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
            <BarChart2 className="text-blue-600" size={20} />
            Tabla de Posiciones
          </h4>
          <div className="text-center text-slate-400 mt-12 text-sm">
            La tabla se calculará automáticamente a medida que finalicen los juegos.
          </div>
        </div>

        {/* Partidos */}
        <PartidosView torneoId={torneoId} deporte={torneo?.deporte} torneo={torneo} />
      </div>
    </div>
  );
}
