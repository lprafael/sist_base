"use client";

import { useState, useEffect } from "react";
import { Trophy, Calendar, MapPin, DollarSign, ChevronRight, Search, Award } from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function TorneosPage() {
  const [torneos, setTorneos] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadTorneos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/cancha/torneos`);
      if (res.ok) {
        setTorneos(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTorneos();
  }, []);

  const filtered = torneos.filter(t => 
    t.nombre.toLowerCase().includes(search.toLowerCase()) ||
    t.deporte.toLowerCase().includes(search.toLowerCase()) ||
    t.complejo_nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-subtle">
      {/* Hero Header */}
      <div className="bg-slate-950 text-white py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black opacity-90 z-10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32 z-0" />
        
        <div className="container relative z-20 text-center max-w-4xl">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto mb-6 border border-primary/20">
            <Trophy size={32} className="animate-pulse" />
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
            Torneos & Competencias
          </h1>
          <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
            Inscribe a tu equipo, gestiona tus partidos, sigue la tabla de posiciones y compite por grandes premios en los mejores complejos del país.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="container py-12 max-w-7xl">
        <div className="flex flex-col md:flex-row gap-6 justify-between items-center mb-10">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text"
              placeholder="Buscar torneo, deporte o complejo..."
              className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-6 py-4 text-slate-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm font-semibold transition-all"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="text-slate-500 font-bold text-sm">
            {filtered.length} Competencias encontradas
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="card !p-8 h-80 bg-white border border-slate-100 rounded-[2rem] flex flex-col justify-between animate-pulse">
                <div className="w-20 h-6 bg-slate-200 rounded-full" />
                <div className="space-y-3">
                  <div className="w-full h-8 bg-slate-200 rounded-lg" />
                  <div className="w-2/3 h-5 bg-slate-200 rounded-lg" />
                </div>
                <div className="w-full h-12 bg-slate-200 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center bg-white border border-slate-100 rounded-[2.5rem] shadow-sm max-w-3xl mx-auto">
            <Award className="mx-auto text-slate-300 w-16 h-16 mb-4" />
            <h3 className="text-2xl font-extrabold text-slate-900 mb-2">No se encontraron torneos</h3>
            <p className="text-slate-500 max-w-md mx-auto mb-8">Intenta buscando con otro nombre de complejo, deporte o prueba restableciendo los términos.</p>
            <button onClick={() => setSearch("")} className="bg-primary hover:bg-primary/95 text-black font-extrabold px-8 py-4 rounded-[2rem] transition-colors">
              Limpiar Búsqueda
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map(t => (
              <div key={t.id} className="card !p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:border-primary/30 transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <span className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-primary/20">
                      {t.estado}
                    </span>
                    <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">{t.deporte}</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 group-hover:text-primary transition-colors line-clamp-1 mb-2">
                    {t.nombre}
                  </h3>
                  <p className="text-slate-500 font-semibold text-sm line-clamp-2 mb-6">
                    {t.descripcion || "¡Inscríbete y participa de este gran campeonato!"}
                  </p>

                  <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-3 text-slate-600 font-bold text-sm">
                      <MapPin size={18} className="text-primary" />
                      {t.complejo_nombre}
                    </div>
                    <div className="flex items-center gap-3 text-slate-600 font-bold text-sm">
                      <Calendar size={18} className="text-primary" />
                      Inicia: {new Date(t.fecha_inicio).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-3 text-slate-600 font-bold text-sm">
                      <DollarSign size={18} className="text-primary" />
                      Inscripción: {t.costo_inscripcion > 0 ? `G. ${t.costo_inscripcion.toLocaleString()}` : "Gratuita"}
                    </div>
                  </div>
                </div>

                <Link 
                  href={`/torneos/${t.id}`}
                  className="w-full py-4 bg-slate-950 hover:bg-primary hover:text-black text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  Ver Detalles <ChevronRight size={18} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
