"use client";
import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Loader2, UserPlus, X } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function GruposView({ torneoId }: { torneoId: string }) {
  const [grupos, setGrupos] = useState<any[]>([]);
  const [divisiones, setDivisiones] = useState<any[]>([]);
  const [jugadoresDisponibles, setJugadoresDisponibles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal create group
  const [isCreating, setIsCreating] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [saving, setSaving] = useState(false);

  // Group Details
  const [activeGroup, setActiveGroup] = useState<any>(null);
  const [participantes, setParticipantes] = useState<any[]>([]);
  const [isAddingJugador, setIsAddingJugador] = useState(false);

  useEffect(() => {
    fetchGrupos();
    fetchDivisiones();
    fetchJugadores();
  }, [torneoId]);

  const getToken = () => {
    const session = JSON.parse(localStorage.getItem('user_session') || '{}');
    return session.access_token || session.token || '';
  };

  const fetchGrupos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/futbol/torneos/${torneoId}/grupos`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if(res.ok) setGrupos(await res.json());
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

  const fetchParticipantes = async (grupoId: string) => {
    try {
      const res = await fetch(`${API_URL}/futbol/grupos/${grupoId}/participantes`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if(res.ok) setParticipantes(await res.json());
    } catch(e) { console.error(e); }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre || !selectedDivision) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/futbol/torneos/${torneoId}/grupos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ division_id: selectedDivision, nombre: newNombre })
      });
      if(res.ok) {
        setIsCreating(false);
        setNewNombre('');
        fetchGrupos();
      }
    } catch(e) { console.error(e); }
    setSaving(false);
  };

  const handleDeleteGroup = async (id: string) => {
    if(!confirm("¿Eliminar este grupo?")) return;
    try {
      await fetch(`${API_URL}/futbol/grupos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (activeGroup?.id === id) setActiveGroup(null);
      fetchGrupos();
    } catch(e) { console.error(e); }
  };

  const handleAddJugador = async (jugadorId: string) => {
    if (!activeGroup) return;
    try {
      await fetch(`${API_URL}/futbol/grupos/${activeGroup.id}/participantes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ jugador_id: jugadorId })
      });
      fetchParticipantes(activeGroup.id);
      setIsAddingJugador(false);
    } catch(e) { console.error(e); }
  };

  const handleRemoveJugador = async (jugadorId: string) => {
    if (!activeGroup) return;
    try {
      await fetch(`${API_URL}/futbol/grupos/${activeGroup.id}/participantes/${jugadorId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      fetchParticipantes(activeGroup.id);
    } catch(e) { console.error(e); }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800">
          <Users size={20} className="text-blue-500"/>
          Gestión de Grupos
        </h3>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus size={18} /> Crear Grupo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Lista de Grupos */}
        <div className="md:col-span-1 space-y-3">
          <h4 className="font-semibold text-slate-700 text-sm">Grupos Creados</h4>
          {grupos.length === 0 ? (
            <div className="p-4 border border-dashed border-slate-300 rounded text-center text-sm text-slate-500">
              No hay grupos. Crea uno para comenzar.
            </div>
          ) : (
            grupos.map(g => (
              <div 
                key={g.id} 
                className={`p-4 rounded-lg border cursor-pointer transition ${activeGroup?.id === g.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'}`}
                onClick={() => {
                  setActiveGroup(g);
                  fetchParticipantes(g.id);
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-bold text-slate-800">{g.nombre}</h5>
                    <p className="text-xs text-slate-500 mt-1">{g.categoria_nombre} - {g.division_nombre}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteGroup(g.id); }} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detalle del Grupo Seleccionado */}
        <div className="md:col-span-2">
          {activeGroup ? (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-slate-800 text-lg">{activeGroup.nombre}</h4>
                  <p className="text-sm text-slate-500">{activeGroup.categoria_nombre} - {activeGroup.division_nombre}</p>
                </div>
                <button 
                  onClick={() => setIsAddingJugador(true)}
                  className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded font-medium text-sm hover:bg-slate-50 transition flex items-center gap-2 shadow-sm"
                >
                  <UserPlus size={16} /> Agregar Atleta
                </button>
              </div>

              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2">Atleta</th>
                    <th className="px-4 py-2">Equipo</th>
                    <th className="px-4 py-2">Peso</th>
                    <th className="px-4 py-2 text-right">Quitar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {participantes.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">No hay atletas en este grupo</td></tr>
                  ) : (
                    participantes.map(p => (
                      <tr key={p.jugador_id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-2 font-medium text-slate-800">{p.jugador_nombre}</td>
                        <td className="px-4 py-2 text-slate-600">{p.equipo_nombre || '-'}</td>
                        <td className="px-4 py-2 text-slate-600">{p.peso_verificado ? `${p.peso_verificado} kg` : '-'}</td>
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => handleRemoveJugador(p.jugador_id)} className="text-red-500 hover:text-red-700">
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 text-slate-400 bg-slate-50 border border-slate-200 border-dashed rounded-xl">
              <Users size={48} className="mb-4 opacity-50" />
              <p>Selecciona un grupo para ver o administrar sus participantes</p>
            </div>
          )}
        </div>

      </div>

      {/* Modal Crear Grupo */}
      {isCreating && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Crear Nuevo Grupo</h3>
            </div>
            <form onSubmit={handleCreateGroup} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre del Grupo</label>
                <input type="text" required value={newNombre} onChange={e => setNewNombre(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-blue-500 focus:border-blue-500" placeholder="Ej: Grupo A" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">División / Categoría</label>
                <select required value={selectedDivision} onChange={e => setSelectedDivision(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-blue-500 focus:border-blue-500">
                  <option value="">Seleccione una división</option>
                  {divisiones.map(d => (
                    <option key={d.id} value={d.id}>{d.categoria_nombre} - {d.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded text-sm">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium">
                  {saving ? 'Guardando...' : 'Crear Grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Agregar Atleta */}
      {isAddingJugador && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Agregar Atletas al {activeGroup?.nombre}</h3>
              <button onClick={() => setIsAddingJugador(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <div className="p-0 overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 sticky top-0">
                  <tr>
                    <th className="px-4 py-2">Atleta</th>
                    <th className="px-4 py-2 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jugadoresDisponibles
                    .filter(j => !participantes.some(p => p.jugador_id === j.id))
                    .map(j => (
                    <tr key={j.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-700">{j.nombre} <span className="text-slate-400 font-normal text-xs ml-2">{j.equipo_nombre}</span></td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => handleAddJugador(j.id)} className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded border border-blue-200 text-xs font-medium">Agregar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
