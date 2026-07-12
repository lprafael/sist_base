"use client";
import React, { useState, useEffect } from 'react';
import { Users, Plus, UserPlus, ChevronDown, ChevronRight, Loader2, Search, Building } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function ParticipantesView({ torneoId }: { torneoId: string }) {
  const [equipos, setEquipos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEquipo, setExpandedEquipo] = useState<string | null>(null);
  const [jugadoresPorEquipo, setJugadoresPorEquipo] = useState<any>({});
  const [loadingJugadores, setLoadingJugadores] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCreatingEquipo, setIsCreatingEquipo] = useState(false);
  const [isAddingJugador, setIsAddingJugador] = useState<string | null>(null); // equipo_id
  const [saving, setSaving] = useState(false);

  // Formularios
  const [nuevoEquipo, setNuevoEquipo] = useState('');
  const [nuevoJugador, setNuevoJugador] = useState({
    nombre: '', dni: '', fecha_nacimiento: '', email: '', telefono: ''
  });

  useEffect(() => {
    fetchEquipos();
  }, [torneoId]);

  const getToken = () => {
    const session = JSON.parse(localStorage.getItem('user_session') || '{}');
    return session.access_token || session.token || '';
  };

  const fetchEquipos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/cancha/torneos/${torneoId}/equipos`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if(res.ok) setEquipos(await res.json());
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const fetchJugadores = async (equipoId: string) => {
    setLoadingJugadores(true);
    try {
      const res = await fetch(`${API_URL}/cancha/torneos/${torneoId}/equipos/${equipoId}/jugadores`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if(res.ok) {
        const data = await res.json();
        setJugadoresPorEquipo((prev: any) => ({ ...prev, [equipoId]: data }));
      }
    } catch(e) { console.error(e); }
    setLoadingJugadores(false);
  };

  const toggleEquipo = (equipoId: string) => {
    if (expandedEquipo === equipoId) {
      setExpandedEquipo(null);
    } else {
      setExpandedEquipo(equipoId);
      if (!jugadoresPorEquipo[equipoId]) {
        fetchJugadores(equipoId);
      }
    }
  };

  const handleCreateEquipo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoEquipo) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/cancha/torneos/${torneoId}/equipos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ nombre: nuevoEquipo, color_principal: '#000000', delegados: [] })
      });
      if(res.ok) {
        setIsCreatingEquipo(false);
        setNuevoEquipo('');
        fetchEquipos();
      }
    } catch(e) { console.error(e); }
    setSaving(false);
  };

  const handleAddJugador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAddingJugador) return;
    setSaving(true);
    try {
      const payload = {
        nombre: nuevoJugador.nombre,
        dni: nuevoJugador.dni,
        fecha_nacimiento: nuevoJugador.fecha_nacimiento || null,
        email: nuevoJugador.email || null,
        telefono: nuevoJugador.telefono || null
      };

      const res = await fetch(`${API_URL}/cancha/torneos/${torneoId}/equipos/${isAddingJugador}/jugadores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify(payload)
      });
      
      if(res.ok) {
        setIsAddingJugador(null);
        setNuevoJugador({ nombre: '', dni: '', fecha_nacimiento: '', email: '', telefono: '' });
        fetchJugadores(isAddingJugador);
      } else {
        const err = await res.json();
        alert("Error: " + (err.detail || "No se pudo agregar"));
      }
    } catch(e) { console.error(e); }
    setSaving(false);
  };

  const filteredEquipos = equipos.filter(eq => eq.nombre.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800">
          <Users size={20} className="text-blue-500"/>
          Participantes (Equipos / Academias)
        </h3>
        <button 
          onClick={() => setIsCreatingEquipo(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Building size={18} /> Inscribir Equipo/Academia
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Buscar equipo o academia..." 
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {filteredEquipos.length === 0 ? (
          <div className="p-8 border border-dashed border-slate-300 rounded-xl text-center text-slate-500 bg-slate-50">
            No se encontraron equipos o academias inscritas.
          </div>
        ) : (
          filteredEquipos.map(eq => (
            <div key={eq.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition"
                onClick={() => toggleEquipo(eq.id)}
              >
                <div className="flex items-center gap-3">
                  {expandedEquipo === eq.id ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronRight size={20} className="text-slate-400" />}
                  <h4 className="font-bold text-slate-700 text-lg">{eq.nombre}</h4>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsAddingJugador(eq.id); }}
                  className="flex items-center gap-1 text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 transition"
                >
                  <UserPlus size={16} /> Añadir Atleta
                </button>
              </div>

              {expandedEquipo === eq.id && (
                <div className="border-t border-slate-100 bg-slate-50 p-4">
                  {loadingJugadores && !jugadoresPorEquipo[eq.id] ? (
                    <div className="flex justify-center p-4"><Loader2 className="animate-spin text-blue-400" /></div>
                  ) : (
                    <table className="w-full text-sm text-left bg-white rounded-lg overflow-hidden border border-slate-200">
                      <thead className="bg-slate-100 text-slate-500">
                        <tr>
                          <th className="px-4 py-2">Atleta</th>
                          <th className="px-4 py-2">DNI / Documento</th>
                          <th className="px-4 py-2">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {!jugadoresPorEquipo[eq.id] || jugadoresPorEquipo[eq.id].length === 0 ? (
                          <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">No hay atletas registrados en esta academia</td></tr>
                        ) : (
                          jugadoresPorEquipo[eq.id].map((j: any) => (
                            <tr key={j.id} className="hover:bg-slate-50 transition">
                              <td className="px-4 py-2 font-medium text-slate-800">{j.nombre}</td>
                              <td className="px-4 py-2 text-slate-600">{j.dni || '-'}</td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-1 text-xs font-bold rounded-full ${j.estado?.toLowerCase() === 'habilitado' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {j.estado || 'Pendiente'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal Crear Equipo */}
      {isCreatingEquipo && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Inscribir Equipo/Academia</h3>
            </div>
            <form onSubmit={handleCreateEquipo} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre</label>
                <input type="text" required value={nuevoEquipo} onChange={e => setNuevoEquipo(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-blue-500 focus:border-blue-500" placeholder="Ej: Academia Gracie" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsCreatingEquipo(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded text-sm">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium">
                  {saving ? 'Guardando...' : 'Crear Equipo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Añadir Jugador */}
      {isAddingJugador && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Añadir Atleta</h3>
            </div>
            <form onSubmit={handleAddJugador} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre completo</label>
                <input type="text" required value={nuevoJugador.nombre} onChange={e => setNuevoJugador({...nuevoJugador, nombre: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded text-sm" placeholder="Ej: Juan Perez" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Documento / DNI</label>
                <input type="text" required value={nuevoJugador.dni} onChange={e => setNuevoJugador({...nuevoJugador, dni: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded text-sm" placeholder="Ej: 1234567" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Email (Opcional)</label>
                  <input type="email" value={nuevoJugador.email} onChange={e => setNuevoJugador({...nuevoJugador, email: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Teléfono (Opcional)</label>
                  <input type="text" value={nuevoJugador.telefono} onChange={e => setNuevoJugador({...nuevoJugador, telefono: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setIsAddingJugador(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded text-sm">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium">
                  {saving ? 'Guardando...' : 'Añadir Atleta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
