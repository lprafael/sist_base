"use client";
import React, { useState, useEffect } from 'react';
import { Trophy, Plus, Trash2, Loader2, GitMerge } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function AgrupacionView({ torneoId }: { torneoId: string }) {
  const [llaves, setLlaves] = useState<any[]>([]);
  const [divisiones, setDivisiones] = useState<any[]>([]);
  const [jugadoresDisponibles, setJugadoresDisponibles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal create llave
  const [isCreating, setIsCreating] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedRonda, setSelectedRonda] = useState('Final');
  const [jugador1, setJugador1] = useState('');
  const [jugador2, setJugador2] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLlaves();
    fetchDivisiones();
    fetchJugadores();
  }, [torneoId]);

  const getToken = () => {
    const session = JSON.parse(localStorage.getItem('user_session') || '{}');
    return session.access_token || session.token || '';
  };

  const fetchLlaves = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/futbol/torneos/${torneoId}/llaves`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if(res.ok) setLlaves(await res.json());
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const fetchDivisiones = async () => {
    try {
      const res = await fetch(`${API_URL}/futbol/torneos/${torneoId}/divisiones`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if(res.ok) setDivisiones(await res.json());
    } catch(e) { console.error(e); }
  };

  const fetchJugadores = async () => {
    try {
      const res = await fetch(`${API_URL}/futbol/torneos/${torneoId}/checkin-list`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if(res.ok) setJugadoresDisponibles(await res.json());
    } catch(e) { console.error(e); }
  };

  const handleCreateLlave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDivision || !jugador1 || !jugador2 || jugador1 === jugador2) {
      alert("Por favor, seleccione dos atletas diferentes.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/futbol/torneos/${torneoId}/llaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ 
          division_id: selectedDivision, 
          ronda: selectedRonda,
          jugador_local_id: jugador1,
          jugador_visitante_id: jugador2
        })
      });
      if(res.ok) {
        setIsCreating(false);
        setJugador1('');
        setJugador2('');
        fetchLlaves();
      }
    } catch(e) { console.error(e); }
    setSaving(false);
  };

  const handleDeleteLlave = async (id: string) => {
    if(!confirm("¿Eliminar esta llave/combate?")) return;
    try {
      await fetch(`${API_URL}/futbol/llaves/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      fetchLlaves();
    } catch(e) { console.error(e); }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500" /></div>;

  // Group llaves by division
  const llavesPorDivision = llaves.reduce((acc: any, curr: any) => {
    if(!acc[curr.division_nombre]) acc[curr.division_nombre] = [];
    acc[curr.division_nombre].push(curr);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800">
          <GitMerge size={20} className="text-blue-500"/>
          Fases y Llaves (Combates)
        </h3>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus size={18} /> Programar Combate
        </button>
      </div>

      {Object.keys(llavesPorDivision).length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center p-12 text-slate-400 bg-slate-50 border border-slate-200 border-dashed rounded-xl">
          <Trophy size={48} className="mb-4 opacity-50" />
          <p>No hay llaves o combates programados aún.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.keys(llavesPorDivision).map(division => (
            <div key={division} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
                <h4 className="font-bold text-slate-700">{division}</h4>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {llavesPorDivision[division].map((llave: any) => (
                  <div key={llave.id} className="border border-slate-200 rounded-lg p-4 relative hover:border-blue-300 transition shadow-sm">
                    <button 
                      onClick={() => handleDeleteLlave(llave.id)} 
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-500 bg-white rounded-full p-1 shadow-sm border border-slate-100"
                    >
                      <Trash2 size={14} />
                    </button>
                    
                    <div className="text-xs font-bold text-blue-600 mb-3 bg-blue-50 inline-block px-2 py-1 rounded">
                      {llave.ronda}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100">
                        <span className="font-medium text-slate-700 text-sm truncate">{llave.jugador_local_nombre}</span>
                        {llave.ganador_jugador_id === llave.jugador_local_id && <Trophy size={14} className="text-yellow-500" />}
                      </div>
                      <div className="text-center text-xs text-slate-400 font-bold">VS</div>
                      <div className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100">
                        <span className="font-medium text-slate-700 text-sm truncate">{llave.jugador_visitante_nombre}</span>
                        {llave.ganador_jugador_id === llave.jugador_visitante_id && <Trophy size={14} className="text-yellow-500" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear Llave */}
      {isCreating && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Programar Nuevo Combate (Llave)</h3>
            </div>
            <form onSubmit={handleCreateLlave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">División / Categoría</label>
                <select required value={selectedDivision} onChange={e => setSelectedDivision(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-blue-500 focus:border-blue-500 text-sm">
                  <option value="">Seleccione una división</option>
                  {divisiones.map(d => (
                    <option key={d.id} value={d.id}>{d.categoria_nombre} - {d.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Ronda / Fase</label>
                <select required value={selectedRonda} onChange={e => setSelectedRonda(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-blue-500 focus:border-blue-500 text-sm">
                  <option value="Final">Final</option>
                  <option value="Semifinal">Semifinal</option>
                  <option value="Cuartos de Final">Cuartos de Final</option>
                  <option value="Octavos de Final">Octavos de Final</option>
                  <option value="Clasificatoria">Clasificatoria</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Atleta Rojo</label>
                  <select required value={jugador1} onChange={e => setJugador1(e.target.value)} className="w-full px-3 py-2 border border-red-300 rounded focus:ring-red-500 focus:border-red-500 text-sm bg-red-50">
                    <option value="">Seleccionar...</option>
                    {jugadoresDisponibles.map(j => (
                      <option key={j.id} value={j.id}>{j.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Atleta Azul</label>
                  <select required value={jugador2} onChange={e => setJugador2(e.target.value)} className="w-full px-3 py-2 border border-blue-300 rounded focus:ring-blue-500 focus:border-blue-500 text-sm bg-blue-50">
                    <option value="">Seleccionar...</option>
                    {jugadoresDisponibles.map(j => (
                      <option key={j.id} value={j.id}>{j.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-6">
                <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded text-sm">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium">
                  {saving ? 'Guardando...' : 'Programar Combate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
