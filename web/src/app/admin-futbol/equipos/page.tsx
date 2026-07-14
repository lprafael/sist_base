"use client";
import React, { useState, useEffect } from 'react';
import { X, Users, UserCog, ArrowLeft, Trash2, Download, User, Trophy } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Jugador {
  nombre: string;
  nombre_abreviado?: string;
  dni?: string;
  fecha_nacimiento?: string;
  numero_camiseta?: string;
  posicion?: string;
  telefono?: string;
  foto_url?: string;
  estatura_verificada?: number;
  peso_verificado?: number;
}

export default function RegistroEquipoPage() {
  const [formData, setFormData] = useState({
    nombre: "",
    entrenador: "",
    logo_url: ""
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [deleteMode, setDeleteMode] = useState(false);
  
  const [view, setView] = useState<"list" | "main" | "jugadores" | "tecnicos" | "jugador_edit">("list");
  
  const [equiposList, setEquiposList] = useState<any[]>([]);
  const [nuevoEquipo, setNuevoEquipo] = useState("");
  const [selectedEquipoId, setSelectedEquipoId] = useState<string | null>(null);

  const [torneos, setTorneos] = useState<any[]>([]);
  const [selectedTorneoId, setSelectedTorneoId] = useState("");

  useEffect(() => {
    const fetchTorneos = async () => {
      try {
        const sessionData = JSON.parse(localStorage.getItem('user_session') || '{}');
        const token = sessionData.access_token || sessionData.token || '';
        const res = await fetch(`${API_URL}/futbol/torneos`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setTorneos(data);
          if (data.length > 0) setSelectedTorneoId(data[0].id);
        }
      } catch (err) {}
    };
    fetchTorneos();
  }, []);

  const fetchEquipos = async () => {
    if (!selectedTorneoId) return;
    try {
      const sessionData = JSON.parse(localStorage.getItem('user_session') || '{}');
      const token = sessionData.access_token || sessionData.token || '';
      const res = await fetch(`${API_URL}/futbol/torneos/${selectedTorneoId}/equipos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEquiposList(data);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchEquipos();
  }, [selectedTorneoId]);

  const handleAddEquipo = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if(nuevoEquipo.trim() && selectedTorneoId) {
      try {
        const sessionData = JSON.parse(localStorage.getItem('user_session') || '{}');
        const token = sessionData.access_token || sessionData.token || '';
        const res = await fetch(`${API_URL}/futbol/equipos`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ nombre: nuevoEquipo.trim(), torneo_id: selectedTorneoId })
        });
        if(res.ok) {
          setNuevoEquipo("");
          fetchEquipos();
        }
      } catch (err) {}
    }
  };

  const handleDeleteEquipo = async (id: string) => {
    if(!confirm("¿Seguro que deseas eliminar este equipo y todos sus jugadores?")) return;
    try {
      const sessionData = JSON.parse(localStorage.getItem('user_session') || '{}');
      const token = sessionData.access_token || sessionData.token || '';
      const res = await fetch(`${API_URL}/futbol/equipos/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if(res.ok) {
        fetchEquipos();
      } else {
        alert("Error al eliminar equipo");
      }
    } catch (e) {
      alert("Error de conexión");
    }
  };

  const openEquipoDetails = (equipo: any) => {
    setSelectedEquipoId(equipo.id);
    setFormData({ nombre: equipo.nombre, entrenador: equipo.entrenador || "", logo_url: equipo.logo_url || "" });
    setJugadores(equipo.jugadores || []);
    setTecnicos(equipo.tecnicos || []);
    setView("main");
  };
  
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [nuevoJugador, setNuevoJugador] = useState("");
  const [selectedJugadorIndex, setSelectedJugadorIndex] = useState<number | null>(null);
  const [editingJugador, setEditingJugador] = useState<Jugador>({ nombre: "" });

  const [tecnicos, setTecnicos] = useState<{nombre: string}[]>([]);
  const [nuevoTecnico, setNuevoTecnico] = useState("");

  const handleAddJugador = (e?: React.FormEvent) => {
    e?.preventDefault();
    if(nuevoJugador.trim()) {
      setJugadores([{nombre: nuevoJugador.trim()}, ...jugadores]);
      setNuevoJugador("");
    }
  };

  const handleSelectJugador = (idx: number) => {
    setSelectedJugadorIndex(idx);
    setEditingJugador({ ...jugadores[idx] });
    setView("jugador_edit");
  };

  const handleSaveJugador = () => {
    if (selectedJugadorIndex !== null) {
      const newJugadores = [...jugadores];
      newJugadores[selectedJugadorIndex] = editingJugador;
      setJugadores(newJugadores);
    }
    setView("jugadores");
  };
  
  const handleRemoveJugador = () => {
    if (selectedJugadorIndex !== null) {
      const newJugadores = [...jugadores];
      newJugadores.splice(selectedJugadorIndex, 1);
      setJugadores(newJugadores);
    }
    setView("jugadores");
  };

  const handleAddTecnico = (e?: React.FormEvent) => {
    e?.preventDefault();
    if(nuevoTecnico.trim()) {
      setTecnicos([{nombre: nuevoTecnico.trim()}, ...tecnicos]);
      setNuevoTecnico("");
    }
  };

  const handleSave = async () => {
    if (!formData.nombre) {
      setMessage("❌ Ingresa el nombre del equipo.");
      return;
    }
    setLoading(true);
    setMessage("");
    
    try {
      const sessionData = JSON.parse(localStorage.getItem('user_session') || '{}');
      const token = sessionData.access_token || sessionData.token || '';
      
      if (selectedEquipoId) {
        await fetch(`${API_URL}/futbol/equipos/${selectedEquipoId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ nombre: formData.nombre, logo_url: formData.logo_url })
        });

        await fetch(`${API_URL}/futbol/equipos/${selectedEquipoId}/plantel`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            jugadores: jugadores,
            tecnicos: tecnicos,
            entrenador: formData.entrenador
          })
        });
      }

      setMessage("✅ Equipo guardado con éxito.");
      fetchEquipos();
      setTimeout(() => setMessage(""), 4000);
    } catch (err) {
      setMessage("❌ Error al guardar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center py-10">
      <div className="bg-white w-full max-w-2xl min-h-[600px] shadow-2xl relative flex flex-col overflow-hidden rounded-t-xl">
        
        {view === "list" && (
          <div className="flex-1 flex flex-col h-full bg-gray-50 p-6">
            <h2 className="text-2xl font-bold text-[#1b264f] mb-4">Registro de Equipos</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">Campeonato</label>
              <select 
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 bg-white outline-none focus:border-green-500 font-medium text-gray-700 shadow-sm"
                value={selectedTorneoId}
                onChange={e => setSelectedTorneoId(e.target.value)}
              >
                {torneos.length === 0 && <option value="">No hay campeonatos creados</option>}
                {torneos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>

            {selectedTorneoId ? (
              <>
                <form onSubmit={handleAddEquipo} className="flex gap-2 mb-2">
                  <input 
                    type="text"
                    placeholder="Nombre del equipo"
                    value={nuevoEquipo}
                    onChange={(e) => setNuevoEquipo(e.target.value)}
                    className="flex-1 border border-green-500 rounded-md px-4 py-3 outline-none focus:ring-2 focus:ring-green-200 text-gray-800 text-lg shadow-sm"
                  />
                  <button type="submit" className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-md font-bold transition shadow-sm">
                    Añadir
                  </button>
                </form>
                
                <div className="flex justify-between items-center mb-4 px-1">
                  <div className="text-sm font-bold text-gray-500">
                    Total: {equiposList.length}
                  </div>
                  <button 
                    onClick={() => setDeleteMode(!deleteMode)}
                    className={`p-2 rounded transition ${deleteMode ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:bg-gray-100'}`}
                    title="Eliminar equipos"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3">
                  {equiposList.map((eq) => (
                    <div key={eq.id} onClick={() => !deleteMode && openEquipoDetails(eq)} className={`bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between transition ${!deleteMode ? 'cursor-pointer hover:shadow-md' : ''}`}>
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-b from-[#1b264f] to-blue-900 rounded-lg flex flex-col items-center justify-center text-white shrink-0 relative overflow-hidden">
                          <Trophy size={24} className="text-yellow-400 mb-1 z-10" />
                          <div className="absolute bottom-0 w-full h-1/2 bg-green-400 rounded-t-full opacity-90"></div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-800 font-medium text-lg">{eq.nombre}</span>
                          <span className="text-gray-500 text-sm">{eq.jugadores?.length || 0} Jugadores</span>
                        </div>
                      </div>
                      {deleteMode ? (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteEquipo(eq.id); }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-full transition"
                        >
                          <X size={24} />
                        </button>
                      ) : (
                        <Users size={28} className="text-green-500" />
                      )}
                    </div>
                  ))}
                  {equiposList.length === 0 && (
                    <div className="text-center p-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl mt-4">
                      Aún no hay equipos en el campeonato.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center p-8 text-gray-500">Crea o selecciona un campeonato primero.</div>
            )}
          </div>
        )}

        {view === "main" && (
          <>
            {/* HEADER */}
            <div className="p-4 border-b border-gray-200 flex items-center">
              <button onClick={() => setView("list")} className="p-2 hover:bg-gray-100 rounded-full transition">
                <ArrowLeft size={24} className="text-gray-700" />
              </button>
              <h2 className="text-xl font-bold text-gray-800 ml-2">Detalles del Equipo</h2>
            </div>

            {/* CONTENIDO PRINCIPAL */}
            <div className="p-6 flex-1 flex flex-col">
              {message && (
                <div className={`p-3 mb-4 rounded-lg font-bold text-sm ${message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {message}
                </div>
              )}
              <div className="flex gap-6 mb-8">
                {/* ÁREA DE LOGO */}
                <div className="w-[120px] h-[140px] bg-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-400 transition relative group">
                  {formData.logo_url ? (
                     <img src={formData.logo_url} className="w-full h-full object-cover rounded-lg" alt="Logo" />
                  ) : (
                    <>
                      <span className="text-3xl text-gray-500 mb-1">+</span>
                      <span className="text-xs text-gray-600 font-bold">200x240</span>
                    </>
                  )}
                   <div className="absolute inset-0 bg-black/60 hidden group-hover:flex items-center justify-center rounded-lg">
                      <input 
                        type="text" 
                        placeholder="URL Logo" 
                        value={formData.logo_url}
                        onChange={e => setFormData({...formData, logo_url: e.target.value})}
                        className="w-10/12 text-black px-1 py-1 text-xs rounded"
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                </div>

                {/* CAMPOS DE TEXTO (Estilo Material Design outline) */}
                <div className="flex-1 space-y-6 pt-2">
                  <div className="relative">
                    <input 
                      type="text" 
                      value={formData.nombre}
                      onChange={e => setFormData({...formData, nombre: e.target.value})}
                      className="block px-3 py-3 w-full text-sm text-gray-900 bg-transparent rounded-lg border border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer" placeholder=" " 
                    />
                    <label className="absolute text-sm text-gray-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-blue-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-1">Nombre del equipo</label>
                  </div>

                  <div className="relative">
                    <input 
                      type="text" 
                      value={formData.entrenador}
                      onChange={e => setFormData({...formData, entrenador: e.target.value})}
                      className="block px-3 py-3 w-full text-sm text-gray-900 bg-transparent rounded-lg border border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer" placeholder=" " 
                    />
                    <label className="absolute text-sm text-gray-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-blue-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-1">Entrenador</label>
                  </div>
                </div>
              </div>

              <hr className="border-gray-200 mb-2" />

              {/* LISTAS / BOTONES (Jugadores, Equipo técnico) */}
              <div className="space-y-1">
                <button onClick={() => setView("jugadores")} className="w-full flex items-center justify-between py-4 px-2 hover:bg-gray-50 transition border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    <Users size={24} className="text-green-600" />
                    <span className="text-gray-700 text-lg">Jugadores</span>
                  </div>
                  <span className="text-gray-400 text-sm font-bold">{jugadores.length > 0 ? jugadores.length : ''}</span>
                </button>
                <button onClick={() => setView("tecnicos")} className="w-full flex items-center justify-between py-4 px-2 hover:bg-gray-50 transition border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    <UserCog size={24} className="text-green-600" />
                    <span className="text-gray-700 text-lg">Equipo técnico</span>
                  </div>
                  <span className="text-gray-400 text-sm font-bold">{tecnicos.length > 0 ? tecnicos.length : ''}</span>
                </button>
              </div>

            </div>

            {/* FOOTER ACCIONES */}
            <div className="p-6 border-t border-gray-200 flex justify-between items-center bg-white">
              <button 
                onClick={() => {
                  if (selectedEquipoId && window.confirm("¿Estás seguro de eliminar este equipo?")) {
                    handleDeleteEquipo(selectedEquipoId);
                    setView("list");
                  }
                }}
                className="text-red-500 font-bold text-lg hover:text-red-600 transition"
              >
                Quitar
              </button>
              <button 
                onClick={handleSave}
                disabled={loading}
                className="text-blue-500 font-bold text-lg hover:text-blue-600 transition disabled:text-blue-300"
              >
                {loading ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </>
        )}

        {(view === "jugadores" || view === "tecnicos") && (
          <div className="flex-1 flex flex-col h-full bg-white">
            {/* SUB-HEADER */}
            <div className="bg-[#1b264f] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => setView("main")} className="hover:bg-white/10 p-2 rounded-full transition">
                  <ArrowLeft size={24} />
                </button>
                <h2 className="text-xl font-medium">{view === "jugadores" ? "Jugadores" : "Equipo técnico"}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button className="hover:bg-white/10 p-2 rounded-full transition"><Trash2 size={20} /></button>
                <button className="hover:bg-white/10 p-2 rounded-full transition"><Download size={20} /></button>
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col">
              {/* INPUT AÑADIR */}
              <form onSubmit={view === "jugadores" ? handleAddJugador : handleAddTecnico} className="flex gap-2 mb-4">
                <input 
                  type="text"
                  placeholder={`Nombre del ${view === "jugadores" ? "jugador" : "técnico"}`}
                  value={view === "jugadores" ? nuevoJugador : nuevoTecnico}
                  onChange={(e) => view === "jugadores" ? setNuevoJugador(e.target.value) : setNuevoTecnico(e.target.value)}
                  className="flex-1 border-2 border-green-500 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-green-200 text-gray-800"
                  autoFocus
                />
                <button type="submit" className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md font-medium transition">
                  Añadir
                </button>
              </form>

              <div className="text-sm font-bold text-gray-600 mb-2">
                Total: {view === "jugadores" ? jugadores.length : tecnicos.length}
              </div>

              {/* LISTA */}
              <div className="flex-1 overflow-y-auto space-y-4">
                {(view === "jugadores" ? jugadores : tecnicos).map((item, idx) => (
                  <div key={idx} 
                       onClick={() => view === "jugadores" ? handleSelectJugador(idx) : null}
                       className={`flex items-center gap-4 py-2 border-b border-gray-100 last:border-0 ${view === "jugadores" ? 'cursor-pointer hover:bg-gray-50' : ''}`}>
                    <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                      {(item as any).foto_url ? (
                        <img src={(item as any).foto_url} alt={item.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <User size={36} className="text-white mt-2" fill="currentColor" />
                      )}
                    </div>
                    <span className="text-gray-800 text-lg">{item.nombre}</span>
                  </div>
                ))}
              </div>

              {/* WARNING FOOTER */}
              <div className="mt-4 text-red-500 text-sm">
                Atención: Para cambiar equipos que ya están en campeonatos, es necesario cambiar el equipo en la configuración del campeonato.
              </div>
            </div>
          </div>
        )}

        {view === "jugador_edit" && (
          <div className="flex-1 flex flex-col h-full bg-white relative">
            {/* SUB-HEADER */}
            <div className="bg-[#1b264f] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => setView("jugadores")} className="hover:bg-white/10 p-2 rounded-full transition">
                  <ArrowLeft size={24} />
                </button>
                <h2 className="text-xl font-medium">Editar Jugador</h2>
              </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <div className="flex flex-col gap-6 max-w-2xl mx-auto">
                {/* FOTO y Nombre Abreviado */}
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-[120px] h-[140px] bg-gray-300 rounded-lg flex flex-col items-center justify-center relative cursor-pointer group shrink-0">
                    {editingJugador.foto_url ? (
                       <img src={editingJugador.foto_url} className="w-full h-full object-cover rounded-lg" alt="Foto" />
                    ) : (
                      <>
                        <span className="text-3xl text-gray-500 mb-1">+</span>
                        <span className="text-xs text-gray-600 font-bold">200x240</span>
                      </>
                    )}
                     <div className="absolute inset-0 bg-black/60 hidden group-hover:flex items-center justify-center rounded-lg">
                        <input 
                          type="text" 
                          placeholder="URL Foto" 
                          value={editingJugador.foto_url || ''}
                          onChange={e => setEditingJugador({...editingJugador, foto_url: e.target.value})}
                          className="w-10/12 text-black px-1 py-1 text-xs rounded"
                          onClick={e => e.stopPropagation()}
                        />
                      </div>
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div className="relative">
                      <input type="text" value={editingJugador.nombre} onChange={e => setEditingJugador({...editingJugador, nombre: e.target.value})} className="block px-3 py-3 w-full text-sm text-gray-900 bg-transparent rounded-lg border border-gray-300 focus:outline-none focus:border-blue-600 peer" placeholder=" " />
                      <label className="absolute text-sm text-gray-500 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 left-1">Nombre del jugador</label>
                    </div>
                    
                    <div className="relative">
                      <input type="text" value={editingJugador.nombre_abreviado || ''} onChange={e => setEditingJugador({...editingJugador, nombre_abreviado: e.target.value})} className="block px-3 py-3 w-full text-sm text-gray-900 bg-transparent rounded-lg border border-gray-300 focus:outline-none focus:border-blue-600 peer" placeholder=" " />
                      <label className="absolute text-sm text-gray-500 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 left-1">Nombre abreviado</label>
                    </div>
                  </div>
                </div>

                {/* Otros campos */}
                <div className="relative">
                  <select value={editingJugador.posicion || ''} onChange={e => setEditingJugador({...editingJugador, posicion: e.target.value})} className="block px-3 py-3 w-full text-sm text-gray-900 bg-transparent rounded-lg border border-gray-300 focus:outline-none focus:border-blue-600 peer">
                    <option value="">Seleccione...</option>
                    <option value="Portero">Portero</option>
                    <option value="Defensa">Defensa</option>
                    <option value="Mediocampista">Mediocampista</option>
                    <option value="Delantero">Delantero</option>
                  </select>
                  <label className="absolute text-sm text-gray-500 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 left-1">Posición de jugador</label>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <input type="text" value={editingJugador.numero_camiseta || ''} onChange={e => setEditingJugador({...editingJugador, numero_camiseta: e.target.value})} className="block px-3 py-3 w-full text-sm text-gray-900 bg-transparent rounded-lg border border-gray-300 focus:outline-none focus:border-blue-600 peer" placeholder=" " />
                    <label className="absolute text-sm text-gray-500 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 left-1">N° de camiseta/Registro</label>
                  </div>
                  
                  <div className="relative">
                    <input type="text" value={editingJugador.dni || ''} onChange={e => setEditingJugador({...editingJugador, dni: e.target.value})} className="block px-3 py-3 w-full text-sm text-gray-900 bg-transparent rounded-lg border border-gray-300 focus:outline-none focus:border-blue-600 peer" placeholder=" " />
                    <label className="absolute text-sm text-gray-500 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 left-1">Documento</label>
                  </div>
                  
                  <div className="relative">
                    <input type="date" value={editingJugador.fecha_nacimiento || ''} onChange={e => setEditingJugador({...editingJugador, fecha_nacimiento: e.target.value})} className="block px-3 py-3 w-full text-sm text-gray-900 bg-transparent rounded-lg border border-gray-300 focus:outline-none focus:border-blue-600 peer" placeholder=" " />
                    <label className="absolute text-sm text-gray-500 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 left-1">Fecha de nacimiento</label>
                  </div>
                  
                  <div className="relative">
                    <input type="text" value={editingJugador.telefono || ''} onChange={e => setEditingJugador({...editingJugador, telefono: e.target.value})} className="block px-3 py-3 w-full text-sm text-gray-900 bg-transparent rounded-lg border border-gray-300 focus:outline-none focus:border-blue-600 peer" placeholder=" " />
                    <label className="absolute text-sm text-gray-500 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 left-1">Teléfono</label>
                  </div>
                  
                  <div className="relative">
                    <input type="number" step="0.01" value={editingJugador.estatura_verificada || ''} onChange={e => setEditingJugador({...editingJugador, estatura_verificada: e.target.value ? parseFloat(e.target.value) : undefined})} className="block px-3 py-3 w-full text-sm text-gray-900 bg-transparent rounded-lg border border-gray-300 focus:outline-none focus:border-blue-600 peer" placeholder=" " />
                    <label className="absolute text-sm text-gray-500 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 left-1">Estatura (m)</label>
                  </div>
                  
                  <div className="relative">
                    <input type="number" step="0.1" value={editingJugador.peso_verificado || ''} onChange={e => setEditingJugador({...editingJugador, peso_verificado: e.target.value ? parseFloat(e.target.value) : undefined})} className="block px-3 py-3 w-full text-sm text-gray-900 bg-transparent rounded-lg border border-gray-300 focus:outline-none focus:border-blue-600 peer" placeholder=" " />
                    <label className="absolute text-sm text-gray-500 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 left-1">Peso (kg)</label>
                  </div>
                </div>
              </div>
            </div>

            {/* FOOTER ACCIONES */}
            <div className="p-6 border-t border-gray-200 flex justify-between items-center bg-white mt-auto">
              <button onClick={handleRemoveJugador} className="text-red-500 font-bold text-lg hover:text-red-600 transition">
                Quitar
              </button>
              <button onClick={handleSaveJugador} className="text-blue-500 font-bold text-lg hover:text-blue-600 transition">
                Guardar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
