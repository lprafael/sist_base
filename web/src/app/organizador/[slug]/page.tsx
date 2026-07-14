"use client";
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Trophy, CalendarDays, MapPin, Share2, Users, Medal, Phone, Mail, Link as LinkIcon, MessageSquare, X, Send } from 'lucide-react';
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
  const [patrocinadores, setPatrocinadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
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
        
        {/* Banners en Cabecera */}
        {perfil.opcion_publicidad !== 'ninguno' && perfil.posicion_banner === 'cabecera' && (
          <PatrocinadoresCarousel patrocinadores={patrocinadores} posicion="cabecera" />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLUMNA IZQUIERDA: INFORMACION */}
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
              
              {/* UBICACION */}
              {(perfil.pais || perfil.departamento || perfil.ubicacion_exacta) && (
                <p className="text-gray-500 text-sm mb-4 font-medium flex items-center gap-2">
                  <MapPin size={14} />
                  {[perfil.ubicacion_exacta, perfil.departamento, perfil.pais].filter(Boolean).join(', ')}
                </p>
              )}

              <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-line">
                {perfil.acerca_de || `Esta es la página pública oficial de ${perfil.nombre_liga || "esta liga"}. Aquí podrás encontrar todos los torneos activos, estadísticas y resultados de nuestros eventos deportivos.`}
              </p>
              
              {/* CONTACTOS */}
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

              {/* REDES SOCIALES */}
              <div className="mt-6 flex flex-wrap gap-3">
                {perfil.facebook && <a href={perfil.facebook} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition" title="Facebook"><LinkIcon size={20}/></a>}
                {perfil.instagram && <a href={perfil.instagram} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center hover:bg-pink-100 transition" title="Instagram"><LinkIcon size={20}/></a>}
                {perfil.youtube && <a href={perfil.youtube} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition" title="YouTube"><LinkIcon size={20}/></a>}
                {perfil.twitter && <a href={perfil.twitter} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center hover:bg-sky-100 transition" title="Twitter"><LinkIcon size={20}/></a>}
                {perfil.twitch && <a href={perfil.twitch} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center hover:bg-purple-100 transition" title="Twitch"><LinkIcon size={20}/></a>}
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
                  <div 
                    key={t.id} 
                    onClick={() => window.location.href = `/torneos/${t.id}`}
                    className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition cursor-pointer group"
                  >
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
                      
                      {session && session.usuario_id !== perfil?.usuario_id && perfil?.opcion_chat && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveChatTorneo(t);
                          }}
                          className="w-full mt-3 py-2 rounded-lg font-bold transition flex items-center justify-center gap-2 border"
                          style={{ borderColor: primaryColor, color: primaryColor }}
                        >
                          <MessageSquare size={16} />
                          Consultar al Organizador
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
        </div>
      </div>

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
    </div>
  );
}
