"use client";
import React, { useState } from 'react';
import { X, Users, UserCog, ArrowLeft, Trash2, Download, User, Trophy } from 'lucide-react';

export default function RegistroEquipoPage() {
  const [formData, setFormData] = useState({
    nombre: "",
    entrenador: "",
    logo_url: ""
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  const [view, setView] = useState<"list" | "main" | "jugadores" | "tecnicos">("list");
  
  const [equiposList, setEquiposList] = useState<any[]>([
    { id: 1, nombre: "Equipo2", jugadores: 2 }
  ]);
  const [nuevoEquipo, setNuevoEquipo] = useState("");
  const [selectedEquipoId, setSelectedEquipoId] = useState<number | null>(null);

  const handleAddEquipo = (e?: React.FormEvent) => {
    e?.preventDefault();
    if(nuevoEquipo.trim()) {
      const newTeam = {
        id: Date.now(),
        nombre: nuevoEquipo.trim(),
        jugadores: 0
      };
      setEquiposList([newTeam, ...equiposList]);
      setNuevoEquipo("");
    }
  };

  const openEquipoDetails = (equipo: any) => {
    setSelectedEquipoId(equipo.id);
    setFormData({ nombre: equipo.nombre, entrenador: "", logo_url: "" });
    setJugadores([]); // Reset
    setTecnicos([]); // Reset
    setView("main");
  };
  
  const [jugadores, setJugadores] = useState<{nombre: string}[]>([]);
  const [nuevoJugador, setNuevoJugador] = useState("");

  const [tecnicos, setTecnicos] = useState<{nombre: string}[]>([]);
  const [nuevoTecnico, setNuevoTecnico] = useState("");

  const handleAddJugador = (e?: React.FormEvent) => {
    e?.preventDefault();
    if(nuevoJugador.trim()) {
      setJugadores([{nombre: nuevoJugador.trim()}, ...jugadores]);
      setNuevoJugador("");
    }
  };

  const handleAddTecnico = (e?: React.FormEvent) => {
    e?.preventDefault();
    if(nuevoTecnico.trim()) {
      setTecnicos([{nombre: nuevoTecnico.trim()}, ...tecnicos]);
      setNuevoTecnico("");
    }
  };

  const handleSave = () => {
    if (!formData.nombre) {
      setMessage("❌ Ingresa el nombre del equipo.");
      return;
    }
    setLoading(true);
    setMessage("");
    
    // Simular guardado
    setTimeout(() => {
      setLoading(false);
      setMessage("✅ Equipo guardado con éxito.");
      setTimeout(() => setMessage(""), 4000);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center py-10">
      <div className="bg-white w-full max-w-2xl min-h-[600px] shadow-2xl relative flex flex-col overflow-hidden rounded-t-xl">
        
        {view === "list" && (
          <div className="flex-1 flex flex-col h-full bg-gray-50 p-6">
            <h2 className="text-2xl font-bold text-[#1b264f] mb-6 hidden">Equipos</h2>
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
            
            <div className="text-sm font-bold text-gray-500 mb-4 px-1">
              Total: {equiposList.length}
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {equiposList.map((eq) => (
                <div key={eq.id} onClick={() => openEquipoDetails(eq)} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md transition">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-b from-[#1b264f] to-blue-900 rounded-lg flex flex-col items-center justify-center text-white shrink-0 relative overflow-hidden">
                      <Trophy size={24} className="text-yellow-400 mb-1 z-10" />
                      <div className="absolute bottom-0 w-full h-1/2 bg-green-400 rounded-t-full opacity-90"></div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-800 font-medium text-lg">{eq.nombre}</span>
                      <span className="text-gray-500 text-sm">{eq.jugadores} Jugadores</span>
                    </div>
                  </div>
                  <Users size={28} className="text-green-500" />
                </div>
              ))}
              {equiposList.length === 0 && (
                <div className="text-center p-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl mt-4">
                  Aún no hay equipos en el campeonato.
                </div>
              )}
            </div>
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
              <button className="text-red-500 font-bold text-lg hover:text-red-600 transition">
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
                  <div key={idx} className="flex items-center gap-4 py-2 border-b border-gray-100 last:border-0">
                    <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                      <User size={36} className="text-white mt-2" fill="currentColor" />
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
      </div>
    </div>
  );
}
