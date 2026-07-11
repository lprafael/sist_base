"use client";
import React, { useState, useEffect } from 'react';
import { Camera, Save, UserPlus, Upload, ShieldCheck, X, Trash2, ArrowUpDown, User } from 'lucide-react';

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
                <div key={jugador.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:shadow-md transition">
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
                      onClick={() => handleDeleteJugador(jugador.id)}
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
