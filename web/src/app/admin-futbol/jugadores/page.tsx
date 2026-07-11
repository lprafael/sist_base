"use client";
import React, { useState, useEffect } from 'react';
import { Camera, Save, UserPlus, Upload, ShieldCheck, X, Trash2, ArrowUpDown, User, ArrowLeft } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Jugador {
  id: string;
  nombre: string;
  nombre_abreviado: string;
  dni: string;
  fecha_nacimiento: string;
  numero_camiseta: string;
  posicion: string;
  telefono: string;
  foto_url: string;
  biometria_aprobada: boolean;
  equipo_nombre: string;
}

export default function RegistroJugadoresPage() {
  const [jugadoresList, setJugadoresList] = useState<Jugador[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteMode, setDeleteMode] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [view, setView] = useState<"list" | "edit">("list");
  const [editingJugador, setEditingJugador] = useState<Jugador | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const fetchJugadores = async () => {
    try {
      setLoading(true);
      const sessionData = JSON.parse(localStorage.getItem('user_session') || '{}');
      const token = sessionData.access_token || sessionData.token || '';
      const res = await fetch(`${API_URL}/futbol/jugadores`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setJugadoresList(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJugadores();
  }, []);

  const handleSort = () => {
    const newOrder = sortOrder === "asc" ? "desc" : "asc";
    setSortOrder(newOrder);
    
    const sorted = [...jugadoresList].sort((a, b) => {
      if (newOrder === "asc") {
        return a.nombre.localeCompare(b.nombre);
      } else {
        return b.nombre.localeCompare(a.nombre);
      }
    });
    setJugadoresList(sorted);
  };

  const handleDeleteJugador = async (id: string) => {
    if(!confirm("¿Seguro que deseas eliminar a este jugador permanentemente?")) return;
    try {
      const sessionData = JSON.parse(localStorage.getItem('user_session') || '{}');
      const token = sessionData.access_token || sessionData.token || '';
      const res = await fetch(`${API_URL}/futbol/jugadores/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if(res.ok) {
        fetchJugadores();
      } else {
        alert("Error al eliminar jugador");
      }
    } catch (e) {
      alert("Error de conexión");
    }
  };

  const openEdit = (jugador: Jugador) => {
    setEditingJugador(jugador);
    setPhotoPreview(jugador.foto_url || null);
    setView("edit");
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
        if (editingJugador) {
          setEditingJugador({...editingJugador, foto_url: "uploaded_image.jpg"}); // Mocked upload
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (view === "edit" && editingJugador) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setView("list")} className="p-2 hover:bg-gray-200 rounded-full transition">
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <UserPlus size={32} className="text-[#1b264f]" />
          <h1 className="text-3xl font-black text-[#1b264f]">Editar Jugador (Biometría)</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-bold text-gray-700">Modificar datos del jugador</h2>
            <span className={`text-xs px-2 py-1 rounded font-bold flex items-center gap-1 ${editingJugador.biometria_aprobada ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              <ShieldCheck size={14}/> {editingJugador.biometria_aprobada ? 'Biometría Activa' : 'Biometría Pendiente'}
            </span>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* FOTO BIOMETRICA */}
            <div className="col-span-1 flex flex-col items-center">
              <div className="w-48 h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-full flex flex-col items-center justify-center relative overflow-hidden mb-4">
                {photoPreview ? (
                  <img src={photoPreview} className="w-full h-full object-cover" alt="Biometria" />
                ) : (
                  <>
                    <Camera size={40} className="text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500 font-bold text-center px-4">Foto para<br/>reconocimiento facial</span>
                  </>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="user"
                  onChange={handlePhotoUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
              <button className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                <Upload size={16}/> {photoPreview ? 'Cambiar Foto' : 'Subir o Tomar Foto'}
              </button>
              
              <button 
                onClick={() => alert("Iniciando prueba biométrica de reconocimiento facial...")}
                className="mt-4 bg-purple-100 text-purple-700 hover:bg-purple-200 text-sm font-bold py-2 px-4 rounded-lg flex items-center gap-2 w-full justify-center"
              >
                <ShieldCheck size={16}/> Prueba Biométrica
              </button>
            </div>

            {/* DATOS DEL JUGADOR */}
            <div className="col-span-1 md:col-span-2 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Completo</label>
                  <input 
                    type="text" 
                    value={editingJugador.nombre || ''}
                    onChange={e => setEditingJugador({...editingJugador, nombre: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Abreviado</label>
                  <input 
                    type="text" 
                    value={editingJugador.nombre_abreviado || ''}
                    onChange={e => setEditingJugador({...editingJugador, nombre_abreviado: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Documento (DNI/CI)</label>
                  <input 
                    type="text" 
                    value={editingJugador.dni || ''}
                    onChange={e => setEditingJugador({...editingJugador, dni: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Fecha de Nac.</label>
                  <input 
                    type="date" 
                    value={editingJugador.fecha_nacimiento || ''}
                    onChange={e => setEditingJugador({...editingJugador, fecha_nacimiento: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Dorsal / N° Camiseta</label>
                  <input 
                    type="number" 
                    value={editingJugador.numero_camiseta || ''}
                    onChange={e => setEditingJugador({...editingJugador, numero_camiseta: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Posición</label>
                  <select 
                    value={editingJugador.posicion || ''}
                    onChange={e => setEditingJugador({...editingJugador, posicion: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Seleccione...</option>
                    <option value="Portero">Portero</option>
                    <option value="Defensa">Defensa</option>
                    <option value="Mediocampista">Mediocampista</option>
                    <option value="Delantero">Delantero</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Teléfono</label>
                  <input 
                    type="text" 
                    value={editingJugador.telefono || ''}
                    onChange={e => setEditingJugador({...editingJugador, telefono: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-4">
            <button onClick={() => setView("list")} className="text-gray-600 font-bold px-4 py-2 hover:bg-gray-200 rounded-lg transition">Cancelar</button>
            <button 
              onClick={() => {
                alert("Funcionalidad de guardado individual de jugador pendiente de conexión con backend.");
                setView("list");
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-lg flex items-center gap-2 transition"
            >
              <Save size={18}/> Guardar Jugador
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <UserPlus size={32} className="text-[#1b264f]" />
        <h1 className="text-3xl font-black text-[#1b264f]">Registro de Jugadores (Global)</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[700px]">
        <div className="p-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <div className="flex flex-col">
            <h2 className="font-bold text-gray-700 text-lg">Todos los jugadores</h2>
            <span className="text-sm text-gray-500">Total: {jugadoresList.length} registrados</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleSort}
              className="p-2 rounded text-gray-600 hover:bg-gray-200 transition"
              title="Ordenar A-Z / Z-A"
            >
              <ArrowUpDown size={20} />
            </button>
            <button 
              onClick={() => setDeleteMode(!deleteMode)}
              className={`p-2 rounded transition ${deleteMode ? 'bg-red-100 text-red-600' : 'text-gray-600 hover:bg-gray-200'}`}
              title="Eliminar jugadores"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {loading ? (
            <div className="text-center text-gray-500 py-10">Cargando jugadores...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jugadoresList.map((jugador) => (
                <div 
                  key={jugador.id} 
                  onClick={() => !deleteMode && openEdit(jugador)}
                  className={`bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between transition ${!deleteMode ? 'cursor-pointer hover:shadow-md' : ''}`}
                >
                  <div className="flex items-center gap-4 flex-1 overflow-hidden">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                      {jugador.foto_url ? (
                        <img src={jugador.foto_url} alt={jugador.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <User size={32} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-gray-800 font-bold text-lg truncate" title={jugador.nombre}>{jugador.nombre}</span>
                      <span className="text-blue-600 text-sm font-medium truncate">{jugador.equipo_nombre}</span>
                      {jugador.dni && <span className="text-gray-500 text-xs">DNI: {jugador.dni}</span>}
                    </div>
                  </div>
                  {deleteMode && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteJugador(jugador.id); }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-full transition ml-2 shrink-0"
                    >
                      <X size={24} />
                    </button>
                  )}
                </div>
              ))}
              {jugadoresList.length === 0 && (
                <div className="col-span-full text-center p-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                  No se encontraron jugadores registrados en tus campeonatos.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
