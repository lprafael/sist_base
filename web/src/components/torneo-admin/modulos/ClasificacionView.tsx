"use client";
import React, { useState, useEffect } from 'react';
import { BarChart2, Save, Loader2, Info } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function ClasificacionView({ torneoId }: { torneoId: string }) {
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
      // Muestra un pequeño indicador de guardado exitoso si quieres
    } catch(e) { console.error(e); }
    setSavingId(null);
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-4">
        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
          <BarChart2 size={20} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800">Criterios de Clasificación</h3>
          <p className="text-sm text-slate-500">Configura la puntuación para la fase de grupos o ligas por categoría.</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3 text-blue-800 text-sm mb-6">
        <Info size={20} className="shrink-0 text-blue-500" />
        <p>
          Estos valores se utilizarán para calcular automáticamente la tabla de posiciones cuando se registren los resultados de los combates o partidos. 
          En Artes Marciales, la victoria puede valer 3 puntos o 1 punto, dependiendo de tu reglamento.
        </p>
      </div>

      {categorias.length === 0 ? (
        <div className="text-center p-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-500">Primero debes crear Categorías en el submódulo correspondiente.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {categorias.map(cat => (
            <div key={cat.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-slate-700 text-lg">{cat.nombre}</h4>
                <button 
                  onClick={() => handleSave(cat)}
                  disabled={savingId === cat.id}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition disabled:opacity-50"
                >
                  {savingId === cat.id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Guardar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-green-600 mb-1 uppercase">Puntos por Victoria</label>
                  <input 
                    type="number" 
                    value={cat.pts_victoria ?? 3} 
                    onChange={e => handleChange(cat.id, 'pts_victoria', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-blue-500 focus:border-blue-500 text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-500 mb-1 uppercase">Puntos por Empate</label>
                  <input 
                    type="number" 
                    value={cat.pts_empate ?? 1} 
                    onChange={e => handleChange(cat.id, 'pts_empate', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-blue-500 focus:border-blue-500 text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-red-500 mb-1 uppercase">Puntos por Derrota</label>
                  <input 
                    type="number" 
                    value={cat.pts_derrota ?? 0} 
                    onChange={e => handleChange(cat.id, 'pts_derrota', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-blue-500 focus:border-blue-500 text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Criterio de Desempate principal</label>
                  <select 
                    value={cat.criterio_desempate || 'Diferencia de puntos'} 
                    onChange={e => handleChange(cat.id, 'criterio_desempate', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="Diferencia de puntos">Diferencia de puntos/goles</option>
                    <option value="Enfrentamiento directo">Enfrentamiento directo</option>
                    <option value="Mayor cantidad de victorias">Mayor cantidad de victorias</option>
                    <option value="Sorteo">Sorteo</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
