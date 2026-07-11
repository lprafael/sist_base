"use client";
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Trophy, CalendarDays, MapPin, Share2, Users, Medal } from 'lucide-react';

const API_URL = "https://api.micancha.com.py";

interface PerfilLiga {
  logo_url: string;
  banner_url: string;
  color_primario: string;
  nombre_liga: string;
  descripcion: string;
}

interface Torneo {
  id: string;
  nombre: string;
  deporte: string;
  formato: string;
  tipo: string;
}

export default function PublicOrganizerPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [perfil, setPerfil] = useState<PerfilLiga | null>(null);
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (slug) {
      fetchLigaData();
    }
  }, [slug]);

  const fetchLigaData = async () => {
    try {
      const res = await fetch(`${API_URL}/liga/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setPerfil(data.perfil);
        setTorneos(data.torneos);
      } else {
        const errData = await res.json();
        setError(errData.detail || "Liga no encontrada");
      }
    } catch (e) {
      setError("Error de conexión al servidor");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500 font-medium">Cargando perfil...</p>
      </div>
    );
  }

  if (error || !perfil) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Trophy size={64} className="text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-gray-700">{error || "Liga no encontrada"}</h1>
        <p className="text-gray-500 mt-2">Es posible que este organizador no exista o sea privado.</p>
      </div>
    );
  }

  const primaryColor = perfil.color_primario || "#1e3a8a";

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-20">
      {/* BANNER HEADER */}
      <div 
        className="w-full h-64 md:h-80 bg-gray-800 relative shadow-md"
        style={{ 
          backgroundImage: perfil.banner_url ? `url(${perfil.banner_url})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: perfil.banner_url ? 'transparent' : primaryColor
        }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
        
        {/* ENCABEZADO Y LOGO */}
        <div className="absolute -bottom-16 left-0 right-0">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center md:items-end gap-6">
            
            {/* LOGO */}
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white bg-white shadow-xl overflow-hidden shrink-0 z-10 flex items-center justify-center">
              {perfil.logo_url ? (
                <img src={perfil.logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Trophy size={64} className="text-gray-300" />
              )}
            </div>
            
            {/* TITULOS (Se ubican encima del banner en desktop, debajo en mobile) */}
            <div className="flex-1 text-center md:text-left md:mb-16 z-10">
              <h1 className="text-3xl md:text-4xl font-black text-white drop-shadow-lg">{perfil.nombre_liga || "Organización Deportiva"}</h1>
              <p className="text-gray-100 font-medium mt-1 drop-shadow-md text-lg">{perfil.descripcion || "¡Bienvenidos a nuestra liga!"}</p>
            </div>
            
            {/* ACCIONES */}
            <div className="md:mb-16 z-10 hidden md:block">
               <button 
                  onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      alert("Enlace copiado");
                  }}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-4 py-2 rounded-full font-bold transition shadow-sm border border-white/30"
               >
                 <Share2 size={18} /> Compartir
               </button>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-24 md:mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLUMNA IZQUIERDA: INFORMACION */}
          <div className="col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: primaryColor }}>
                  <MapPin size={16} />
                </span>
                Acerca de
              </h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                Esta es la página pública oficial de {perfil.nombre_liga || "esta liga"}. Aquí podrás encontrar todos los torneos activos, estadísticas y resultados de nuestros eventos deportivos.
              </p>
              
              <div className="mt-6 pt-6 border-t border-gray-100 flex justify-between text-center">
                 <div>
                   <p className="text-2xl font-black text-gray-800">{torneos.length}</p>
                   <p className="text-xs text-gray-500 font-bold uppercase">Torneos</p>
                 </div>
                 <div>
                   <p className="text-2xl font-black text-gray-800">100%</p>
                   <p className="text-xs text-gray-500 font-bold uppercase">Pasión</p>
                 </div>
              </div>
            </div>
          </div>
          
          {/* COLUMNA DERECHA: TORNEOS */}
          <div className="col-span-1 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                <Medal size={28} style={{ color: primaryColor }} />
                Nuestros Torneos
              </h2>
            </div>
            
            {torneos.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
                <Trophy size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-bold text-gray-700">No hay torneos activos</h3>
                <p className="text-gray-500 mt-2">El organizador aún no ha publicado ningún torneo.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {torneos.map(t => (
                  <div key={t.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition cursor-pointer group">
                    <div className="h-2" style={{ backgroundColor: primaryColor }}></div>
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-lg text-gray-800 group-hover:text-blue-600 transition line-clamp-2">{t.nombre}</h3>
                        <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded">Activo</span>
                      </div>
                      
                      <div className="space-y-2 mt-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users size={16} />
                          <span>{t.deporte}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Trophy size={16} />
                          <span>{t.formato}</span>
                        </div>
                      </div>
                      
                      <button 
                        className="w-full mt-6 py-2 rounded-lg font-bold text-white transition opacity-90 hover:opacity-100"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Ver Estadísticas
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
