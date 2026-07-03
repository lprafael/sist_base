"use client";

import { useState, useEffect } from "react";
import { Search, Activity, Users, ShieldAlert, Award } from "lucide-react";

export default function TorneosGeneralesPage() {
  const [search, setSearch] = useState("");
  
  const [torneos, setTorneos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

  useEffect(() => {
    fetch(`${API_URL}/api/marciales/torneos`)
      .then(res => res.json())
      .then(data => {
        setTorneos(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filtered = torneos.filter(t => 
    t.nombre.toLowerCase().includes(search.toLowerCase()) ||
    t.lugar.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-red-950 via-red-900 to-black text-white py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/40 z-10" />
        <div className="container relative z-20 text-center max-w-4xl">
          <div className="w-16 h-16 bg-red-600/20 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-red-500/30">
            <Activity size={32} />
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
            Torneos Multidisciplinarios
          </h1>
          <p className="text-slate-300 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
            Explora competencias de Artes Marciales y otras disciplinas deportivas.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-12 max-w-7xl">
        <div className="flex flex-col md:flex-row gap-6 justify-between items-center mb-10">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text"
              placeholder="Buscar torneo o lugar..."
              className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-6 py-4 text-slate-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-sm font-semibold transition-all"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500 font-bold">Cargando torneos...</div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map(t => (
            <div key={t.id} onClick={() => window.location.href = `/torneos-generales/${t.id}/inscripcion`} className="bg-white border border-slate-200 hover:border-red-500/50 hover:shadow-xl hover:shadow-red-500/5 transition-all duration-300 rounded-[2rem] overflow-hidden group flex flex-col h-full cursor-pointer">
              <div className="p-8 flex-1">
                <div className="flex justify-between items-start mb-6">
                  <span className="bg-red-50 text-red-600 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                    {Array.isArray(t.modalidades_permitidas) ? t.modalidades_permitidas[0] : t.modalidades_permitidas}
                  </span>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                    t.estado === 'Inscripciones Abiertas' ? 'bg-green-100 text-green-700' :
                    t.estado === 'En Curso' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {t.estado}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 leading-tight mb-4 group-hover:text-red-600 transition-colors">
                  {t.nombre}
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center text-slate-600 font-medium">
                    <Activity className="w-5 h-5 mr-3 text-slate-400" />
                    {t.fecha_inicio}
                  </div>
                  <div className="flex items-center text-slate-600 font-medium">
                    <ShieldAlert className="w-5 h-5 mr-3 text-slate-400" />
                    {t.lugar}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}
