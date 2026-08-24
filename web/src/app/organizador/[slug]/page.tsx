"use client";
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Trophy, CalendarDays, MapPin, Share2, Users, Medal, Phone, Mail, Link as LinkIcon, MessageSquare, X, Send, Image as ImageIcon, QrCode, Download, Copy, ExternalLink } from 'lucide-react';
import PatrocinadoresCarousel from '@/components/PatrocinadoresCarousel';

const API_URL = "https://api.micancha.com.py";

interface PerfilLiga {
  logo_url: string;
  banner_url: string;
  color_primario: string;
  nombre_liga: string;
  descripcion: string;
  acerca_de: string;
  idioma: string;
  pais: string;
  departamento: string;
  ciudad: string;
  ubicacion_exacta: string;
  facebook: string;
  instagram: string;
  youtube: string;
  twitch: string;
  twitter: string;
  whatsapp: string;
  email: string;
  telefono: string;
  opcion_chat: boolean;
  usuario_id: number;
  opcion_publicidad?: string;
  posicion_banner?: 'inferior_flotante' | 'cabecera' | 'lateral';
  plantilla?: string;
}

interface Torneo {
  id: string;
  nombre: string;
  deporte: string;
  formato: string;
  tipo: string;
  logo_url?: string;
  banner_url?: string;
}

export default function PublicOrganizerPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [perfil, setPerfil] = useState<PerfilLiga | null>(null);
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [patrocinadores, setPatrocinadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showQrModal, setShowQrModal] = useState(false);
  
  const [session, setSession] = useState<any>(null);
  const [activeChatTorneo, setActiveChatTorneo] = useState<Torneo | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatNewMessage, setChatNewMessage] = useState("");
  const chatMessagesEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = localStorage.getItem('user_session');
    if (s) {
      setSession(JSON.parse(s));
    }
  }, []);

  // Poll chat messages
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeChatTorneo && session) {
      fetchChatMessages();
      interval = setInterval(fetchChatMessages, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeChatTorneo, session]);

  const fetchChatMessages = async () => {
    if (!activeChatTorneo || !session || !perfil) return;
    try {
      const res = await fetch(`${API_URL}/api/chat/participante/${activeChatTorneo.id}/${session.usuario_id}`);
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data);
        // Mark as read
        if (data.some((m: any) => !m.leido && m.sender === 'organizador')) {
          await fetch(`${API_URL}/api/chat/participante/${activeChatTorneo.id}/${session.usuario_id}/leer`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reader: 'participante' })
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatNewMessage.trim() || !activeChatTorneo || !session || !perfil) return;
    try {
      const res = await fetch(`${API_URL}/api/chat/participante`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          torneo_id: activeChatTorneo.id,
          organizador_id: perfil.usuario_id,
          participante_id: session.usuario_id,
          sender: 'participante',
          mensaje: chatNewMessage.trim()
        })
      });
      if (res.ok) {
        setChatNewMessage("");
        fetchChatMessages();
      }
    } catch (e) {
      console.error(e);
    }
  };

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
        if (data.patrocinadores) setPatrocinadores(data.patrocinadores);
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

  const galeriaImagenes = torneos
    .flatMap(t => {
      const arr = [];
      if (t.banner_url) arr.push({ url: t.banner_url, alt: `Banner ${t.nombre}` });
      if (t.logo_url) arr.push({ url: t.logo_url, alt: `Logo ${t.nombre}` });
      return arr;
    })
    .filter(Boolean);

  const plantilla = perfil.plantilla || "clasica";

  const handleShare = () => {
    setShowQrModal(true);
  };

  const renderTorneosGrid = (isDark = false, isMinimal = false) => {
    if (torneos.length === 0) {
      return (
        <div className={`${isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-gray-200 text-gray-700'} rounded-2xl border p-12 text-center shadow-sm`}>
          <Trophy size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-bold">No hay torneos activos</h3>
          <p className="text-gray-500 mt-2">El organizador aún no ha publicado ningún torneo.</p>
        </div>
      );
    }

    return (
      <div className={isMinimal ? "space-y-4" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
        {torneos.map(t => (
          <div 
            key={t.id} 
            onClick={() => window.location.href = `/torneos/${t.id}`}
            className={`${
              isDark 
                ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700 text-slate-100' 
                : isMinimal
                ? 'bg-white border-stone-200 hover:border-stone-400 text-stone-900'
                : 'bg-white border-gray-200 text-gray-800'
            } rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition cursor-pointer group p-6 relative`}
          >
            {!isMinimal && <div className="h-2 -mx-6 -mt-6 mb-6" style={{ backgroundColor: primaryColor }}></div>}
            
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-lg group-hover:opacity-80 transition line-clamp-2">{t.nombre}</h3>
              <span className={`text-xs font-bold px-2 py-1 rounded ${isDark ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' : 'bg-blue-50 text-blue-700'}`}>
                Activo
              </span>
            </div>
            
            <div className="space-y-2 mt-4">
              <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                <Users size={16} />
                <span>{t.deporte}</span>
              </div>
              <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                <Trophy size={16} />
                <span>{t.formato}</span>
              </div>
            </div>
            
            <button 
              className="w-full mt-6 py-2.5 rounded-lg font-bold text-white transition opacity-90 hover:opacity-100 shadow-sm flex items-center justify-center gap-2"
              style={{ backgroundColor: primaryColor }}
            >
              Ver Estadísticas
            </button>
            
            {session && session.usuario_id !== perfil?.usuario_id && perfil?.opcion_chat && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveChatTorneo(t);
                }}
                className={`w-full mt-3 py-2 rounded-lg font-bold transition flex items-center justify-center gap-2 border ${
                  isDark ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : ''
                }`}
                style={!isDark ? { borderColor: primaryColor, color: primaryColor } : {}}
              >
                <MessageSquare size={16} />
                Consultar al Organizador
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderGaleria = (isDark = false) => {
    if (galeriaImagenes.length === 0) return null;
    return (
      <div className={`mb-8 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'} rounded-2xl shadow-sm border p-6`}>
        <h3 className={`font-bold text-lg mb-4 flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>
          <span className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: primaryColor }}>
            <ImageIcon size={16} />
          </span>
          Galería de Imágenes
        </h3>
        <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory" style={{ scrollbarWidth: 'thin' }}>
          {galeriaImagenes.map((img, idx) => (
            <div key={idx} className={`shrink-0 w-64 h-40 md:w-80 md:h-48 rounded-xl overflow-hidden snap-center relative shadow-sm border ${isDark ? 'border-slate-800 bg-slate-950' : 'border-gray-100 bg-gray-50'} flex items-center justify-center`}>
              <img src={img.url} alt={img.alt} className="w-full h-full object-cover hover:scale-105 transition duration-300" />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen font-sans pb-20 ${plantilla === 'deportiva' ? 'bg-slate-950 text-slate-100' : 'bg-gray-100 text-gray-900'}`}>

      {/* ========================================================================= */}
      {/* PLANTILLA 1: CLÁSICA (DEFAULT) */}
      {/* ========================================================================= */}
      {plantilla === 'clasica' && (
        <>
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
                
                {/* TITULOS */}
                <div className="flex-1 text-center md:text-left md:mb-16 z-10">
                  <h1 className="text-3xl md:text-4xl font-black text-white drop-shadow-lg">{perfil.nombre_liga || "Organización Deportiva"}</h1>
                  <p className="text-gray-100 font-medium mt-1 drop-shadow-md text-lg">{perfil.descripcion || "¡Bienvenidos a nuestra liga!"}</p>
                </div>
                
                {/* ACCIONES */}
                <div className="md:mb-16 z-10 flex gap-2">
                  <button 
                    onClick={() => setShowQrModal(true)}
                    className="flex items-center gap-2 bg-white text-gray-900 px-4 py-2 rounded-full font-bold transition shadow-md hover:bg-gray-100 text-sm"
                  >
                    <QrCode size={18} /> Código QR
                  </button>
                  <button 
                    onClick={handleShare}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-4 py-2 rounded-full font-bold transition shadow-sm border border-white/30 text-sm"
                  >
                    <Share2 size={18} /> Compartir
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-24 md:mt-12">
            {perfil.opcion_publicidad !== 'ninguno' && perfil.posicion_banner === 'cabecera' && (
              <PatrocinadoresCarousel patrocinadores={patrocinadores} posicion="cabecera" />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="col-span-1 space-y-6">
                {perfil.opcion_publicidad !== 'ninguno' && perfil.posicion_banner === 'lateral' && (
                  <PatrocinadoresCarousel patrocinadores={patrocinadores} posicion="lateral" />
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: primaryColor }}>
                      <MapPin size={16} />
                    </span>
                    Acerca de
                  </h3>
                  
                  {(perfil.pais || perfil.departamento || perfil.ubicacion_exacta) && (
                    <p className="text-gray-500 text-sm mb-4 font-medium flex items-center gap-2">
                      <MapPin size={14} />
                      {[perfil.ubicacion_exacta, perfil.departamento, perfil.pais].filter(Boolean).join(', ')}
                    </p>
                  )}

                  <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-line">
                    {perfil.acerca_de || `Esta es la página pública oficial de ${perfil.nombre_liga || "esta liga"}. Aquí podrás encontrar todos los torneos activos, estadísticas y resultados de nuestros eventos deportivos.`}
                  </p>
                  
                  {(perfil.email || perfil.telefono) && (
                     <div className="mt-6 space-y-3">
                       {perfil.email && (
                         <a href={`mailto:${perfil.email}`} className="flex items-center gap-3 text-sm text-gray-600 hover:text-blue-600 transition">
                           <Mail size={16} /> {perfil.email}
                         </a>
                       )}
                       {perfil.telefono && (
                         <a href={`tel:${perfil.telefono}`} className="flex items-center gap-3 text-sm text-gray-600 hover:text-blue-600 transition">
                           <Phone size={16} /> {perfil.telefono}
                         </a>
                       )}
                     </div>
                  )}

                  <div className="mt-6 flex flex-wrap gap-3">
                    {perfil.facebook && <a href={perfil.facebook} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition"><LinkIcon size={20}/></a>}
                    {perfil.instagram && <a href={perfil.instagram} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center hover:bg-pink-100 transition"><LinkIcon size={20}/></a>}
                    {perfil.youtube && <a href={perfil.youtube} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition"><LinkIcon size={20}/></a>}
                    {perfil.twitter && <a href={perfil.twitter} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center hover:bg-sky-100 transition"><LinkIcon size={20}/></a>}
                    {perfil.twitch && <a href={perfil.twitch} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center hover:bg-purple-100 transition"><LinkIcon size={20}/></a>}
                  </div>

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
              
              <div className="col-span-1 lg:col-span-2">
                {renderGaleria(false)}

                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                    <Medal size={28} style={{ color: primaryColor }} />
                    Nuestros Torneos
                  </h2>
                </div>
                
                {renderTorneosGrid(false, false)}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* PLANTILLA 2: DEPORTIVA / ARENA PRO (DARK STADIUM THEME) */}
      {/* ========================================================================= */}
      {plantilla === 'deportiva' && (
        <>
          {/* HERO BANNER DEPORTIVO */}
          <div 
            className="w-full relative py-16 px-4 border-b border-slate-800 overflow-hidden"
            style={{ 
              backgroundImage: perfil.banner_url ? `linear-gradient(to bottom, rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.95)), url(${perfil.banner_url})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: '#0f172a'
            }}
          >
            <div className="max-w-5xl mx-auto flex flex-col items-center text-center relative z-10">
              {/* LOGO ESCUDO */}
              <div 
                className="w-36 h-36 rounded-full border-4 border-white/20 p-1 shadow-2xl mb-6 flex items-center justify-center bg-slate-900 overflow-hidden group hover:scale-105 transition"
                style={{ boxShadow: `0 0 30px ${primaryColor}66` }}
              >
                {perfil.logo_url ? (
                  <img src={perfil.logo_url} alt="Logo" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <Trophy size={60} style={{ color: primaryColor }} />
                )}
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider text-cyan-400 bg-cyan-950/80 border border-cyan-800 mb-2">
                Organización Deportiva
              </span>

              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-md">
                {perfil.nombre_liga || "Organización Deportiva"}
              </h1>
              
              <p className="text-slate-300 max-w-2xl text-base md:text-lg mt-2 font-medium">
                {perfil.descripcion || "¡Bienvenidos a la plataforma de torneos oficiales!"}
              </p>

              {/* BARRA DE METRICAS Y ACCION */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <div className="bg-slate-900/80 border border-slate-800 backdrop-blur px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold text-slate-200">
                  <Medal size={18} style={{ color: primaryColor }} />
                  <span>{torneos.length} Torneos Activos</span>
                </div>
                {(perfil.pais || perfil.departamento || perfil.ubicacion_exacta) && (
                  <div className="bg-slate-900/80 border border-slate-800 backdrop-blur px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold text-slate-200">
                    <MapPin size={18} className="text-cyan-400" />
                    <span>{[perfil.ubicacion_exacta, perfil.departamento, perfil.pais].filter(Boolean).join(', ')}</span>
                  </div>
                )}
                <button 
                  onClick={() => setShowQrModal(true)}
                  className="px-4 py-2 rounded-xl font-bold text-sm bg-white/10 text-white hover:bg-white/20 border border-white/20 flex items-center gap-2 transition backdrop-blur shadow-md"
                >
                  <QrCode size={16} /> QR
                </button>
                <button 
                  onClick={handleShare}
                  className="px-5 py-2 rounded-xl font-bold text-sm text-white flex items-center gap-2 transition hover:opacity-90 shadow-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Share2 size={16} /> Compartir
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
            {perfil.opcion_publicidad !== 'ninguno' && perfil.posicion_banner === 'cabecera' && (
              <PatrocinadoresCarousel patrocinadores={patrocinadores} posicion="cabecera" />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="col-span-1 space-y-6">
                {perfil.opcion_publicidad !== 'ninguno' && perfil.posicion_banner === 'lateral' && (
                  <PatrocinadoresCarousel patrocinadores={patrocinadores} posicion="lateral" />
                )}

                <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl backdrop-blur">
                  <h3 className="font-bold text-slate-100 text-lg mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: primaryColor }}>
                      <MapPin size={16} />
                    </span>
                    Sobre Nosotros
                  </h3>

                  <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-line">
                    {perfil.acerca_de || `Bienvenidos a la central de competencias de ${perfil.nombre_liga || "nuestra organización"}. Consulta torneos, calendarios y estadísticas.`}
                  </p>
                  
                  {(perfil.email || perfil.telefono) && (
                     <div className="mt-6 space-y-3 pt-4 border-t border-slate-800">
                       {perfil.email && (
                         <a href={`mailto:${perfil.email}`} className="flex items-center gap-3 text-sm text-slate-300 hover:text-cyan-400 transition">
                           <Mail size={16} /> {perfil.email}
                         </a>
                       )}
                       {perfil.telefono && (
                         <a href={`tel:${perfil.telefono}`} className="flex items-center gap-3 text-sm text-slate-300 hover:text-cyan-400 transition">
                           <Phone size={16} /> {perfil.telefono}
                         </a>
                       )}
                     </div>
                  )}

                  <div className="mt-6 flex flex-wrap gap-3">
                    {perfil.facebook && <a href={perfil.facebook} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-slate-800 text-blue-400 border border-slate-700 flex items-center justify-center hover:bg-slate-700 transition"><LinkIcon size={20}/></a>}
                    {perfil.instagram && <a href={perfil.instagram} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-slate-800 text-pink-400 border border-slate-700 flex items-center justify-center hover:bg-slate-700 transition"><LinkIcon size={20}/></a>}
                    {perfil.youtube && <a href={perfil.youtube} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-slate-800 text-red-400 border border-slate-700 flex items-center justify-center hover:bg-slate-700 transition"><LinkIcon size={20}/></a>}
                    {perfil.twitter && <a href={perfil.twitter} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-slate-800 text-sky-400 border border-slate-700 flex items-center justify-center hover:bg-slate-700 transition"><LinkIcon size={20}/></a>}
                    {perfil.twitch && <a href={perfil.twitch} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-slate-800 text-purple-400 border border-slate-700 flex items-center justify-center hover:bg-slate-700 transition"><LinkIcon size={20}/></a>}
                  </div>
                </div>
              </div>

              <div className="col-span-1 lg:col-span-2">
                {renderGaleria(true)}

                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-black text-slate-100 flex items-center gap-3">
                    <Trophy size={28} style={{ color: primaryColor }} />
                    Campeonatos y Torneos
                  </h2>
                </div>

                {renderTorneosGrid(true, false)}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* PLANTILLA 3: MINIMALISTA / EDITORIAL PRO */}
      {/* ========================================================================= */}
      {plantilla === 'minimalista' && (
        <>
          {/* HEADER MINIMALISTA */}
          <div className="bg-stone-50 border-b border-stone-200 py-12">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl border-2 border-stone-300 bg-white p-1 overflow-hidden shrink-0 shadow-sm flex items-center justify-center">
                    {perfil.logo_url ? (
                      <img src={perfil.logo_url} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Trophy size={36} className="text-stone-400" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs uppercase font-bold tracking-widest text-stone-500">Organización</span>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight">{perfil.nombre_liga || "Organización Deportiva"}</h1>
                    <p className="text-stone-600 font-medium mt-1 text-base">{perfil.descripcion || "Plataforma oficial de campeonatos."}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowQrModal(true)}
                    className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold text-sm hover:bg-stone-100 transition flex items-center gap-2"
                  >
                    <QrCode size={16} /> QR
                  </button>
                  <button 
                    onClick={handleShare}
                    className="px-5 py-2.5 rounded-xl border-2 border-stone-800 text-stone-900 font-bold text-sm hover:bg-stone-900 hover:text-white transition flex items-center gap-2"
                  >
                    <Share2 size={16} /> Compartir
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
            {perfil.opcion_publicidad !== 'ninguno' && perfil.posicion_banner === 'cabecera' && (
              <PatrocinadoresCarousel patrocinadores={patrocinadores} posicion="cabecera" />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="col-span-1 space-y-6">
                {perfil.opcion_publicidad !== 'ninguno' && perfil.posicion_banner === 'lateral' && (
                  <PatrocinadoresCarousel patrocinadores={patrocinadores} posicion="lateral" />
                )}

                <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
                  <h3 className="font-bold text-stone-900 text-lg mb-3 pb-2 border-b border-stone-100 flex items-center gap-2">
                    <MapPin size={18} style={{ color: primaryColor }} />
                    Información
                  </h3>

                  {(perfil.pais || perfil.departamento || perfil.ubicacion_exacta) && (
                    <p className="text-stone-500 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-1.5">
                      <MapPin size={12} />
                      {[perfil.ubicacion_exacta, perfil.departamento, perfil.pais].filter(Boolean).join(', ')}
                    </p>
                  )}

                  <p className="text-stone-700 leading-relaxed text-sm whitespace-pre-line">
                    {perfil.acerca_de || `Página oficial de ${perfil.nombre_liga || "la liga"}. Información sobre torneos, clasificaciones y fechas.`}
                  </p>

                  {(perfil.email || perfil.telefono) && (
                     <div className="mt-6 space-y-2 pt-4 border-t border-stone-100">
                       {perfil.email && (
                         <a href={`mailto:${perfil.email}`} className="flex items-center gap-3 text-xs font-bold text-stone-700 hover:text-stone-900 transition">
                           <Mail size={14} /> {perfil.email}
                         </a>
                       )}
                       {perfil.telefono && (
                         <a href={`tel:${perfil.telefono}`} className="flex items-center gap-3 text-xs font-bold text-stone-700 hover:text-stone-900 transition">
                           <Phone size={14} /> {perfil.telefono}
                         </a>
                       )}
                     </div>
                  )}

                  <div className="mt-6 pt-4 border-t border-stone-100 flex flex-wrap gap-2">
                    {perfil.facebook && <a href={perfil.facebook} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 transition"><LinkIcon size={16}/></a>}
                    {perfil.instagram && <a href={perfil.instagram} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 transition"><LinkIcon size={16}/></a>}
                    {perfil.youtube && <a href={perfil.youtube} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 transition"><LinkIcon size={16}/></a>}
                    {perfil.twitter && <a href={perfil.twitter} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 transition"><LinkIcon size={16}/></a>}
                    {perfil.twitch && <a href={perfil.twitch} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 transition"><LinkIcon size={16}/></a>}
                  </div>
                </div>
              </div>

              <div className="col-span-1 lg:col-span-2">
                {renderGaleria(false)}

                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
                    <Medal size={24} style={{ color: primaryColor }} />
                    Lista de Torneos
                  </h2>
                </div>

                {renderTorneosGrid(false, true)}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Chat Modal for Participant */}
      {activeChatTorneo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', height: '80vh', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
            
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: primaryColor, color: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ background: 'rgba(255,255,255,0.2)', width: 40, height: 40, borderRadius: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageSquare size={20} color="#fff" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Consulta: {activeChatTorneo.nombre}</h3>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', margin: 0 }}>Hablando con {perfil?.nombre_liga}</p>
                </div>
              </div>
              <button onClick={() => setActiveChatTorneo(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16, background: '#f8fafc' }}>
              {chatMessages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13, marginTop: 40 }}>
                  Escribe tu primer mensaje al organizador sobre este torneo.
                </div>
              ) : (
                chatMessages.map(m => {
                  const isMe = m.sender === 'participante';
                  return (
                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '80%',
                        background: isMe ? primaryColor : '#fff',
                        color: isMe ? '#fff' : '#0f172a',
                        padding: '12px 16px',
                        borderRadius: 16,
                        borderBottomRightRadius: isMe ? 4 : 16,
                        borderBottomLeftRadius: !isMe ? 4 : 16,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                        border: isMe ? 'none' : '1px solid #e2e8f0',
                        fontSize: 14,
                        lineHeight: 1.5
                      }}>
                        {m.mensaje}
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
                        {new Date(m.fecha_envio || m.creado_en).toLocaleString('es-PY', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={chatMessagesEndRef} />
            </div>

            <form onSubmit={handleSendChatMessage} style={{ padding: 20, background: '#fff', borderTop: '1px solid #f1f5f9', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, display: 'flex', gap: 12 }}>
              <input 
                type="text" 
                value={chatNewMessage}
                onChange={e => setChatNewMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }}
              />
              <button 
                type="submit" 
                disabled={!chatNewMessage.trim()}
                style={{ background: chatNewMessage.trim() ? primaryColor : '#cbd5e1', color: '#fff', border: 'none', padding: '0 20px', borderRadius: 12, fontWeight: 700, cursor: chatNewMessage.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}
              >
                Enviar
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* BANNER FLOTANTE INFERIOR */}
      {perfil.opcion_publicidad !== 'ninguno' && perfil.posicion_banner === 'inferior_flotante' && (
        <PatrocinadoresCarousel patrocinadores={patrocinadores} posicion="inferior_flotante" />
      )}

      {/* MODAL CÓDIGO QR Y COMPARTIR */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-gray-900 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button 
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-4">
              <div className="inline-flex p-3 bg-blue-50 text-blue-600 rounded-2xl mb-2">
                <QrCode size={30} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Código QR Oficial</h3>
              <p className="text-sm text-gray-500 mt-1">
                {perfil.nombre_liga || "Organización Deportiva"}
              </p>
            </div>

            {/* QR Code Container con fondo blanco puro y marco nítido para máximo contraste */}
            <div className="flex flex-col items-center justify-center p-4 bg-gray-50 border border-gray-200 rounded-xl mb-4">
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=12&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : 'https://micancha.com.py'}/organizador/${slug}`)}`}
                  alt="Código QR de la Liga"
                  className="w-52 h-52 object-contain"
                />
              </div>
              <p className="text-xs font-mono text-blue-600 font-bold mt-2.5 break-all text-center">
                micancha.com.py/organizador/{slug}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/organizador/${slug}`;
                  navigator.clipboard.writeText(url);
                  alert("✅ Enlace copiado al portapapeles: " + url);
                }}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs transition"
              >
                <Copy size={16} /> Copiar Enlace
              </button>
              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=20&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : 'https://micancha.com.py'}/organizador/${slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                download={`QR_${slug || 'organizador'}.png`}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold text-xs transition border border-blue-200 text-center"
              >
                <Download size={16} /> Descargar QR
              </a>
            </div>

            <div className="space-y-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`🏆 ¡Visita la página oficial de ${perfil.nombre_liga || 'nuestra liga'}!\n${typeof window !== 'undefined' ? window.location.origin : 'https://micancha.com.py'}/organizador/${slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition shadow-sm"
              >
                📱 Compartir por WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
