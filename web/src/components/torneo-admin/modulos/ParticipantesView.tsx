"use client";
import React, { useState, useEffect } from 'react';
import { Users, Search, Loader2 } from 'lucide-react';
import EditTeamModal from './EditTeamModal';
import EditPlayerModal from './EditPlayerModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function ParticipantesView({ torneoId }: { torneoId: string }) {
  const [equipos, setEquipos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEquipo, setEditingEquipo] = useState<any | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<any | null>(null);
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

  const equipoInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchEquipos(true);
  }, [torneoId]);

  const getToken = () => {
    const session = JSON.parse(localStorage.getItem('user_session') || '{}');
    return session.access_token || session.token || '';
  };

  const fetchEquipos = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await fetch(`${API_URL}/cancha/torneos/${torneoId}/equipos`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if(res.ok) setEquipos(await res.json());
    } catch(e) { console.error(e); }
    if (showSpinner) setLoading(false);
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

  const openEditTeam = (equipo: any) => {
    setEditingEquipo(equipo);
    if (!jugadoresPorEquipo[equipo.id]) {
      fetchJugadores(equipo.id);
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
        fetchEquipos(false);
        setTimeout(() => equipoInputRef.current?.focus(), 100);
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
      <div className="flex flex-col mb-6 space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800">
          <Users size={20} className="text-blue-500"/>
          Participantes (Equipos / Academias)
        </h3>

        {/* Carga rápida de equipos */}
        <form onSubmit={handleCreateEquipo} className="flex items-center gap-2">
          <input 
            ref={equipoInputRef}
            type="text" 
            placeholder="Nombre del equipo" 
            className="flex-1 px-4 py-2 border-2 border-blue-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={nuevoEquipo}
            onChange={e => setNuevoEquipo(e.target.value)}
          />
          <button 
            type="submit" 
            disabled={saving || !nuevoEquipo}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? 'Añadiendo...' : 'Añadir'}
          </button>
        </form>
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
                onClick={() => openEditTeam(eq)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#1e293b] rounded flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute top-1 text-yellow-400 text-[10px]">👑</div>
                    <div className="mt-2 text-emerald-400">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 003.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM7 10.82C5.84 10.4 5 9.3 5 8V7h2v3.82zM19 8c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-700 text-base">{eq.nombre}</h4>
                    <p className="text-xs text-slate-400">{jugadoresPorEquipo[eq.id] ? jugadoresPorEquipo[eq.id].length : 0} Jugador(es)</p>
                    {eq.inscripcion_confirmada === true && (
                      <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold ml-2">✓ Confirmado</span>
                    )}
                    {eq.inscripcion_confirmada === null || eq.inscripcion_confirmada === undefined ? (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold ml-2">⏳ Pendiente</span>
                    ) : null}
                    {eq.inscripcion_confirmada === false && (
                      <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold ml-2">✗ Eliminado</span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsAddingJugador(eq.id); }}
                  className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition shadow-sm border border-slate-200"
                  title="Añadir Atleta"
                >
                  <Users size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Crear Equipo removed as it's now inline */}

      {/* Modals */}
      {editingEquipo && (
        <EditTeamModal
          equipo={editingEquipo}
          torneoId={torneoId}
          onClose={() => setEditingEquipo(null)}
          onSaved={() => {
            setEditingEquipo(null);
            fetchEquipos();
          }}
          jugadores={jugadoresPorEquipo[editingEquipo.id]}
          fetchJugadores={fetchJugadores}
          onEditPlayer={(jugador: any, equipoId: string) => setEditingPlayer({ ...jugador, _equipoId: equipoId })}
        />
      )}

      {editingPlayer && (
        <EditPlayerModal
          jugador={editingPlayer}
          equipoId={editingPlayer._equipoId}
          torneoId={torneoId}
          onClose={() => setEditingPlayer(null)}
          onSaved={() => {
            fetchJugadores(editingPlayer._equipoId);
            setEditingPlayer(null);
          }}
        />
      )}
    </div>
  );
}
