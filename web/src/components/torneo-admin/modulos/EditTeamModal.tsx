import React, { useState } from 'react';
import { X, Users, Settings, Share2, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function EditTeamModal({ 
  equipo, 
  torneoId, 
  onClose, 
  onSaved, 
  jugadores, 
  fetchJugadores, 
  onEditPlayer 
}: any) {
  const [nombre, setNombre] = useState(equipo.nombre || '');
  const [entrenador, setEntrenador] = useState(equipo.capitan_nombre || '');
  const [email, setEmail] = useState(equipo.capitan_email || '');
  const [telefono, setTelefono] = useState(equipo.capitan_telefono || '');
  const [confirmado, setConfirmado] = useState(equipo.inscripcion_confirmada || false);
  const [saving, setSaving] = useState(false);

  const [nuevoJugadorRapido, setNuevoJugadorRapido] = useState('');
  const [nuevoJugadorGenero, setNuevoJugadorGenero] = useState('');
  const [nuevoJugadorFecha, setNuevoJugadorFecha] = useState('');
  const [savingJugador, setSavingJugador] = useState(false);

  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [loadingTecnicos, setLoadingTecnicos] = useState(false);
  const [nuevoTecnicoRapido, setNuevoTecnicoRapido] = useState('');
  const [savingTecnico, setSavingTecnico] = useState(false);

  const getToken = () => {
    const session = JSON.parse(localStorage.getItem('user_session') || '{}');
    return session.access_token || session.token || '';
  };

  const fetchTecnicos = async () => {
    setLoadingTecnicos(true);
    try {
      const res = await fetch(`${API_URL}/cancha/torneos/${torneoId}/equipos/${equipo.id}/tecnicos`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setTecnicos(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingTecnicos(false);
  };

  React.useEffect(() => {
    fetchTecnicos();
  }, [equipo.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/cancha/torneos/${torneoId}/equipos/${equipo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({
          nombre,
          capitan_nombre: entrenador,
          capitan_email: email,
          capitan_telefono: telefono,
          inscripcion_confirmada: confirmado
        })
      });
      if (res.ok) {
        onSaved();
      } else {
        alert("Error guardando el equipo");
      }
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const handleDeleteEquipo = async () => {
    if (!confirm("¿Está seguro que desea eliminar este equipo/academia y todos sus jugadores?")) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/cancha/torneos/${torneoId}/equipos/${equipo.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (res.ok) {
        onSaved();
      } else {
        alert("Error eliminando el equipo");
      }
    } catch (e) {
      console.error(e);
      alert("Error eliminando el equipo");
    }
    setSaving(false);
  };

  const handleFastAddJugador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoJugadorRapido.trim()) return;
    
    setSavingJugador(true);
    try {
      const payload = {
        nombre: nuevoJugadorRapido,
        dni: `SN-${Date.now()}`, // Default DNI for fast loading
        genero: nuevoJugadorGenero || null,
        fecha_nacimiento: nuevoJugadorFecha || null
      };

      const res = await fetch(`${API_URL}/cancha/torneos/${torneoId}/equipos/${equipo.id}/jugadores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify(payload)
      });
      
      if(res.ok) {
        setNuevoJugadorRapido('');
        setNuevoJugadorGenero('');
        setNuevoJugadorFecha('');
        fetchJugadores(equipo.id);
      } else {
        alert("Error al cargar jugador rápido");
      }
    } catch (e) {
      console.error(e);
    }
    setSavingJugador(false);
  };

  const handleFastAddTecnico = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoTecnicoRapido.trim()) return;
    
    setSavingTecnico(true);
    try {
      const payload = {
        nombre: nuevoTecnicoRapido,
        rol: "Entrenador"
      };

      const res = await fetch(`${API_URL}/cancha/torneos/${torneoId}/equipos/${equipo.id}/tecnicos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify(payload)
      });
      
      if(res.ok) {
        setNuevoTecnicoRapido('');
        fetchTecnicos();
      } else {
        alert("Error al añadir técnico");
      }
    } catch (e) {
      console.error(e);
    }
    setSavingTecnico(false);
  };

  const handleDeleteTecnico = async (tecnicoId: string) => {
    if (!confirm("¿Eliminar este miembro del cuerpo técnico?")) return;
    try {
      const res = await fetch(`${API_URL}/cancha/torneos/${torneoId}/equipos/${equipo.id}/tecnicos/${tecnicoId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if(res.ok) fetchTecnicos();
    } catch(e) {
      console.error(e);
    }
  };

  const linkInvitacion = typeof window !== 'undefined' 
    ? `${window.location.origin}/torneos/${torneoId}/invitacion/${equipo.token_jugadores}`
    : '';

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex flex-col items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition">
            <X size={24} className="text-slate-600" />
          </button>
          {equipo.token_jugadores && confirmado && (
            <button 
              onClick={() => {
                navigator.clipboard.writeText(linkInvitacion);
                alert("Enlace copiado al portapapeles");
              }}
              className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-full transition"
              title="Copiar Enlace de Invitación"
            >
              <Share2 size={20} />
            </button>
          )}
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <label className="absolute -top-2.5 left-3 bg-white px-1 text-xs font-medium text-slate-500">Nombre del equipo</label>
              <input 
                type="text" 
                value={nombre} 
                onChange={e => setNombre(e.target.value)} 
                className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="absolute -top-2.5 left-3 bg-white px-1 text-xs font-medium text-slate-500">Entrenador / Delegado</label>
                <input 
                  type="text" 
                  value={entrenador} 
                  onChange={e => setEntrenador(e.target.value)} 
                  className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500"
                />
              </div>
              <div className="relative">
                <label className="absolute -top-2.5 left-3 bg-white px-1 text-xs font-medium text-slate-500">Email de Delegado</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500"
                />
              </div>
            </div>
            
            <label className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 cursor-pointer">
              <input 
                type="checkbox" 
                checked={confirmado} 
                onChange={e => setConfirmado(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <div>
                <div className="font-bold text-slate-800">Inscripción Confirmada</div>
                <div className="text-xs text-slate-500">Permite a este equipo aparecer en la página pública del torneo y autoinscribir jugadores.</div>
              </div>
            </label>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Users size={18} className="text-blue-500" />
              Jugadores
            </h4>

            <form onSubmit={handleFastAddJugador} className="mb-4 flex gap-2">
              <input 
                type="text"
                placeholder="Nombre del Jugador [Enter]"
                value={nuevoJugadorRapido}
                onChange={e => setNuevoJugadorRapido(e.target.value)}
                className="flex-[2] border-b-2 border-slate-200 p-2 focus:border-blue-500 outline-none text-sm bg-slate-50"
              />
              <select 
                value={nuevoJugadorGenero}
                onChange={e => setNuevoJugadorGenero(e.target.value)}
                className="flex-1 border-b-2 border-slate-200 p-2 focus:border-blue-500 outline-none text-sm bg-slate-50"
              >
                <option value="">Género</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
              <input 
                type="date"
                title="Fecha de Nacimiento"
                value={nuevoJugadorFecha}
                onChange={e => setNuevoJugadorFecha(e.target.value)}
                className="flex-1 border-b-2 border-slate-200 p-2 focus:border-blue-500 outline-none text-sm bg-slate-50 text-slate-500"
              />
              <button type="submit" disabled={savingJugador} className="px-4 py-2 bg-blue-100 text-blue-700 font-bold rounded text-sm hover:bg-blue-200 disabled:opacity-50">
                {savingJugador ? <Loader2 size={16} className="animate-spin" /> : 'Añadir'}
              </button>
            </form>

            <div className="space-y-1">
              {!jugadores ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin text-slate-300" /></div>
              ) : jugadores.length === 0 ? (
                <div className="text-center text-sm text-slate-400 p-4">No hay jugadores cargados.</div>
              ) : (
                jugadores.map((j: any) => (
                  <div 
                    key={j.id} 
                    className="flex justify-between items-center p-3 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded cursor-pointer group"
                    onClick={() => onEditPlayer(j, equipo.id)}
                  >
                    <span className="font-medium text-slate-700">{j.nombre}</span>
                    <span className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition">Editar</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Settings size={18} className="text-blue-500" />
              Equipo técnico
            </h4>
            <form onSubmit={handleFastAddTecnico} className="mb-4 flex gap-2">
              <input 
                type="text"
                placeholder="Nombre del Técnico [Enter]"
                value={nuevoTecnicoRapido}
                onChange={e => setNuevoTecnicoRapido(e.target.value)}
                className="flex-1 border-b-2 border-slate-200 p-2 focus:border-blue-500 outline-none text-sm bg-slate-50"
              />
              <button type="submit" disabled={savingTecnico} className="px-4 py-2 bg-blue-100 text-blue-700 font-bold rounded text-sm hover:bg-blue-200 disabled:opacity-50">
                {savingTecnico ? <Loader2 size={16} className="animate-spin" /> : 'Añadir'}
              </button>
            </form>

            <div className="space-y-1">
              {loadingTecnicos ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin text-slate-300" /></div>
              ) : tecnicos.length === 0 ? (
                <div className="text-center text-sm text-slate-400 p-4">No hay cuerpo técnico cargado.</div>
              ) : (
                tecnicos.map((t: any) => (
                  <div 
                    key={t.id} 
                    className="flex justify-between items-center p-3 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-700">{t.nombre}</span>
                      <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{t.rol}</span>
                    </div>
                    <button 
                      onClick={() => handleDeleteTecnico(t.id)}
                      className="text-xs text-red-500 opacity-0 group-hover:opacity-100 transition hover:bg-red-50 px-2 py-1 rounded"
                    >
                      Quitar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-between bg-slate-50">
          <button type="button" onClick={handleDeleteEquipo} disabled={saving} className="px-6 py-2 text-red-600 font-bold rounded-lg hover:bg-red-50 disabled:opacity-50">Quitar</button>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
