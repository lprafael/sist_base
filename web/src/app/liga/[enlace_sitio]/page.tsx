"use client";
import React, { useState, useEffect } from 'react';
import { Trophy, ChevronRight, Users, Activity, ExternalLink, Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function LigaPublicaPage() {
  const { enlace_sitio } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('torneos');
  const [selectedTorneo, setSelectedTorneo] = useState<string | null>(null);

  useEffect(() => {
    fetchLiga();
  }, [enlace_sitio]);

  const fetchLiga = async () => {
    try {
      const res = await fetch(`http://localhost:8001/liga/${enlace_sitio}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
        if(d.torneos.length > 0) {
          fetchStats(d.torneos[0].id);
        }
      }
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  };

  const fetchStats = async (torneoId: string) => {
    setSelectedTorneo(torneoId);
    try {
      const res = await fetch(`http://localhost:8001/liga/torneo/${torneoId}/estadisticas`);
      if(res.ok) {
        setStats(await res.json());
      }
    } catch(e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 size={48} className="animate-spin text-blue-500"/></div>;
  }

  if (!data) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-2xl text-gray-400">Liga no encontrada</div>;
  }

  const primaryColor = data.perfil.color_primario || '#1e3a8a';

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* HEADER & BANNER */}
      <div 
        className="h-[300px] bg-cover bg-center relative"
        style={{ backgroundImage: `url(${data.perfil.banner_url || 'https://images.unsplash.com/photo-1518605368461-1ee7e161728c?q=80&w=2070&auto=format&fit=crop'})` }}
      >
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="absolute -bottom-16 left-0 right-0 max-w-5xl mx-auto px-4 md:px-8 flex items-end gap-6">
          <div className="w-32 h-32 rounded-2xl border-4 border-white shadow-xl overflow-hidden bg-white flex items-center justify-center">
            {data.perfil.logo_url ? (
              <img src={data.perfil.logo_url} className="w-full h-full object-cover" alt="Logo" />
            ) : (
              <Trophy size={48} className="text-gray-300" />
            )}
          </div>
          <div className="pb-4 text-white flex-1">
            <h1 className="text-3xl font-black drop-shadow-lg">{data.perfil.nombre_liga || "Liga Deportiva"}</h1>
            <p className="opacity-90">{data.perfil.descripcion || "Plataforma oficial"}</p>
          </div>
          <div className="pb-4 hidden md:block">
            <button 
              style={{ backgroundColor: primaryColor }}
              className="px-6 py-2 rounded-full text-white font-bold shadow-lg hover:opacity-90 transition"
            >
              Seguir Organización
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 mt-24">
        
        {/* TABS */}
        <div className="flex border-b border-gray-200 mb-8 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('torneos')}
            className={`px-6 py-4 font-bold border-b-4 whitespace-nowrap transition ${activeTab === 'torneos' ? 'text-gray-900 border-gray-900' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
          >
            Torneos Activos
          </button>
          <button 
            onClick={() => setActiveTab('posiciones')}
            className={`px-6 py-4 font-bold border-b-4 whitespace-nowrap transition ${activeTab === 'posiciones' ? 'text-gray-900 border-gray-900' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
          >
            Tabla de Posiciones
          </button>
          <button 
            onClick={() => setActiveTab('goleadores')}
            className={`px-6 py-4 font-bold border-b-4 whitespace-nowrap transition ${activeTab === 'goleadores' ? 'text-gray-900 border-gray-900' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
          >
            Goleadores
          </button>
        </div>

        {/* TAB: TORNEOS */}
        {activeTab === 'torneos' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.torneos.map((t: any) => (
              <div key={t.id} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition cursor-pointer flex justify-between items-center group">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-1">{t.nombre}</h3>
                  <div className="flex items-center gap-3 text-xs text-gray-500 font-bold">
                    <span className="bg-gray-100 px-2 py-1 rounded">{t.deporte}</span>
                    <span className="bg-gray-100 px-2 py-1 rounded">{t.formato}</span>
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded">INSCRIPCIONES ABIERTAS</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-50 group-hover:bg-blue-50 flex items-center justify-center transition">
                  <ChevronRight size={20} className="text-gray-400 group-hover:text-blue-600" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB: POSICIONES */}
        {activeTab === 'posiciones' && stats && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Tabla de Clasificación</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 font-bold">#</th>
                    <th className="px-6 py-3 font-bold">Equipo</th>
                    <th className="px-4 py-3 font-bold text-center">PJ</th>
                    <th className="px-4 py-3 font-bold text-center">G</th>
                    <th className="px-4 py-3 font-bold text-center">E</th>
                    <th className="px-4 py-3 font-bold text-center">P</th>
                    <th className="px-4 py-3 font-bold text-center">DG</th>
                    <th className="px-6 py-3 font-black text-center text-blue-600">PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.posiciones.map((p: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-bold text-gray-500">{idx + 1}</td>
                      <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        {p.equipo}
                      </td>
                      <td className="px-4 py-4 text-center">{p.pj}</td>
                      <td className="px-4 py-4 text-center">{p.pg}</td>
                      <td className="px-4 py-4 text-center">{p.pe}</td>
                      <td className="px-4 py-4 text-center">{p.pp}</td>
                      <td className="px-4 py-4 text-center">{p.gf - p.gc}</td>
                      <td className="px-6 py-4 text-center font-black text-blue-600">{p.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: GOLEADORES */}
        {activeTab === 'goleadores' && stats && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden max-w-2xl">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Tabla de Goleadores</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {stats.goleadores.map((g: any, idx: number) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                  <div className="flex items-center gap-4">
                    <span className="w-6 font-bold text-gray-400 text-center">{idx + 1}</span>
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center"><Users size={20} className="text-gray-400"/></div>
                    <div>
                      <p className="font-bold text-gray-900">{g.jugador}</p>
                      <p className="text-xs text-gray-500 font-bold">{g.equipo}</p>
                    </div>
                  </div>
                  <div className="text-2xl font-black text-green-600">
                    {g.goles} <span className="text-sm font-bold text-gray-400">⚽</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
