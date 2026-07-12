"use client";

import React, { useState } from "react";
import { 
  Trophy, Calendar, MapPin, Users, ChevronLeft, Share2, 
  BarChart3, Image as ImageIcon, LogIn, ArrowRight, X, Phone, Mail, FileText
} from "lucide-react";
import Link from "next/link";
import dynamic from 'next/dynamic';

const LocationPickerMap = dynamic(() => 
  import('@/components/LocationPickerMap'), 
  { ssr: false, loading: () => <div className="h-64 w-full bg-slate-100 flex items-center justify-center text-slate-400">Cargando mapa...</div> }
);

export default function PublicTournamentView({ tournament }: { tournament: any }) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/torneos/${tournament?.id}` : '';
  const colorSidebar = tournament?.configuracion?.color_sidebar || '#0c112b';
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Por definir';
    try {
      return String(dateStr).split('T')[0].split('-').reverse().join('/');
    } catch(e) {
      return 'Fecha inválida';
    }
  };

  const contacto = tournament?.configuracion?.contacto || {};
  const reglas = tournament?.reglas || [];
  const premios = tournament?.premios || [];

  const sendMessage = () => {
    if (!chatMessage.trim()) return;
    const phone = contacto?.telefono1 || contacto?.telefono2;
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(chatMessage)}`;
      window.open(url, '_blank');
    } else if (contacto?.email) {
      const url = `mailto:${contacto.email}?subject=Consulta sobre torneo ${tournament?.nombre}&body=${encodeURIComponent(chatMessage)}`;
      window.open(url, '_blank');
    } else {
      alert("No hay información de contacto disponible para este torneo.");
    }
    setChatMessage("");
    setIsChatOpen(false);
  };

  return (
    <>
      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative w-full">
        {/* Top Header */}
        <header className="bg-white px-8 py-4 flex justify-between items-center shadow-sm z-10 sticky top-0">
          <Link href="/buscar" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-bold transition">
            <ChevronLeft size={16} /> Regresar a explorar campeonatos
          </Link>
          <div className="flex gap-3">
            <button onClick={() => setIsShareModalOpen(true)} className="flex items-center gap-2 text-blue-600 font-bold bg-blue-50 px-4 py-2 rounded border border-blue-200 hover:bg-blue-100 transition text-sm">
              <Share2 size={16} /> Compartir
            </button>
            <button className="flex items-center gap-2 text-white font-bold bg-green-600 px-6 py-2 rounded shadow hover:bg-green-700 transition text-sm">
              Inscribirse
            </button>
          </div>
        </header>

        {/* Hero Banner */}
        <div className="relative h-64 bg-slate-800 shrink-0 border-b border-slate-200">
          {tournament?.imagen_portada ? (
            <img src={tournament.imagen_portada} alt="Banner" className="w-full h-full object-cover opacity-50" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-slate-900 to-indigo-900 opacity-90" />
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          <div className="absolute bottom-6 left-8 flex gap-6 text-white text-sm">
             <div className="flex flex-col bg-black/50 px-5 py-2.5 rounded backdrop-blur-md border border-white/10 shadow-lg">
               <span className="text-white/60 uppercase text-[10px] font-bold tracking-widest mb-0.5">INICIO</span>
               <span className="font-bold text-base">{formatDate(tournament?.fecha_inicio)}</span>
             </div>
             <div className="flex flex-col bg-black/50 px-5 py-2.5 rounded backdrop-blur-md border border-white/10 shadow-lg">
               <span className="text-white/60 uppercase text-[10px] font-bold tracking-widest mb-0.5">FIN</span>
               <span className="font-bold text-base">{formatDate(tournament?.fecha_fin)}</span>
             </div>
             <div className="flex flex-col bg-black/50 px-5 py-2.5 rounded backdrop-blur-md border border-white/10 shadow-lg">
               <span className="text-white/60 uppercase text-[10px] font-bold tracking-widest mb-0.5">ORGANIZADOR</span>
               <span className="font-bold text-base">{tournament?.organizador_nombre || tournament?.complejo_nombre || 'No definido'}</span>
             </div>
          </div>
          <button onClick={() => setIsRulesModalOpen(true)} className="absolute bottom-6 right-8 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-6 py-3 flex items-center gap-2 font-bold rounded-lg transition border border-white/20 text-sm shadow-lg">
            <FileText size={18} /> REGLAS DEL TORNEO
          </button>
        </div>

        {/* Content Grids */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-[1400px] w-full pb-32">
          
          {/* About Section */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 h-fit">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3 border-b border-slate-100 pb-5">
              <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-serif italic text-xl">i</span>
              Acerca de
            </h3>
            
            <div className="space-y-6">
              <h4 className="font-bold text-slate-400 text-xs uppercase tracking-widest">Contactos</h4>
              
              <div className="grid grid-cols-1 gap-5">
                <div className="flex items-center gap-4 text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-slate-300 transition">
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 shrink-0">
                    <Phone size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-lg">{contacto?.telefono1 || 'No definido'}</div>
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">WhatsApp / Llamadas</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-slate-300 transition">
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 shrink-0">
                    <Phone size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-lg">{contacto?.telefono2 || 'No definido'}</div>
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Llamadas</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-slate-300 transition">
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 shrink-0">
                    <Mail size={20} />
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-bold text-slate-800 text-lg truncate">{contacto?.email || 'No definido'}</div>
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Email</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-10 pt-8 border-t border-slate-100">
               <h4 className="font-bold text-slate-400 text-xs uppercase tracking-widest mb-4">Ubicación</h4>
               <p className="text-slate-700 font-bold flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                 <span className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-red-400 shrink-0">
                   <MapPin size={20} />
                 </span>
                 {tournament?.configuracion?.ubicacion_texto || tournament?.complejo_nombre || 'Ubicación no especificada'}
               </p>
               
               {tournament?.configuracion?.ubicacion_lat && (
                 <div className="w-full h-[300px] border border-slate-200 rounded-xl overflow-hidden z-0">
                   <LocationPickerMap 
                     defaultLocation={{ lat: tournament.configuracion.ubicacion_lat, lng: tournament.configuracion.ubicacion_lng }}
                     readOnly={true}
                   />
                 </div>
               )}
            </div>
          </div>

          {/* Awards Section */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 h-fit">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3 border-b border-slate-100 pb-5">
              <span className="w-10 h-10 rounded-xl bg-yellow-50 text-yellow-500 flex items-center justify-center"><Trophy size={20}/></span>
              Premios
            </h3>
            
            <div className="space-y-4">
               {premios.length > 0 ? (
                 premios.map((premio: any, idx: number) => {
                   let iconColor = "text-yellow-500";
                   let bgColor = "bg-yellow-50";
                   let borderColor = "border-yellow-100";
                   let rankText = "1º Puesto";
                   
                   if (premio.puesto === 2) { 
                     iconColor = "text-slate-400"; bgColor = "bg-slate-100"; borderColor = "border-slate-200"; rankText = "2º Puesto"; 
                   } else if (premio.puesto === 3) { 
                     iconColor = "text-amber-600"; bgColor = "bg-amber-50"; borderColor = "border-amber-100"; rankText = "3º Puesto"; 
                   } else if (premio.puesto === 'otros') { 
                     iconColor = "text-blue-500"; bgColor = "bg-blue-50"; borderColor = "border-blue-100"; rankText = "Otros Premios"; 
                   }
                   
                   return (
                     <div key={idx} className={`flex items-center gap-5 p-5 rounded-xl border ${borderColor} hover:shadow-md transition-shadow`}>
                        <div className={`w-14 h-14 rounded-full ${bgColor} ${iconColor} flex items-center justify-center shrink-0`}>
                          <Trophy size={24} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-lg mb-1">{rankText}</div>
                          <div className="text-sm text-slate-600 font-medium leading-relaxed">{premio.desc}</div>
                        </div>
                     </div>
                   );
                 })
               ) : (
                 <div className="p-10 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-center">
                   <Trophy size={48} className="text-slate-300 mb-4" />
                   <p className="text-slate-500 font-medium">No hay premios definidos aún.</p>
                 </div>
               )}
            </div>
          </div>
          
        </div>
        
        {/* Messages Input Box fixed at bottom right */}
        <div className="fixed bottom-6 right-8 w-96 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-slate-200 overflow-hidden flex flex-col z-40 transition-all duration-300">
           <div 
             className="bg-[#1e3a8a] p-4 text-white font-bold flex justify-between items-center cursor-pointer" 
             style={{backgroundColor: colorSidebar}}
             onClick={() => setIsChatOpen(!isChatOpen)}
           >
             <span className="flex items-center gap-2"><Mail size={16}/> Mensajes</span>
             <button className="hover:bg-white/10 p-1 rounded transition">
               <ChevronLeft size={20} className={`transition-transform duration-300 ${isChatOpen ? 'rotate-90' : 'rotate-[270deg]'}`} />
             </button>
           </div>
           
           {isChatOpen && (
             <>
               <div className="p-6 bg-slate-50 h-40 flex flex-col items-center justify-center text-center">
                 <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3">
                   <Mail className="text-slate-300" size={24} />
                 </div>
                 <p className="text-slate-400 text-sm font-medium">Envía un mensaje o consulta directamente a la organización del torneo.</p>
               </div>
               <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
                 <input 
                   type="text" 
                   placeholder="Escribe aquí..." 
                   className="flex-1 outline-none text-sm px-3 py-2 bg-slate-100 rounded-lg border border-transparent focus:border-slate-300 transition" 
                   value={chatMessage}
                   onChange={(e) => setChatMessage(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                 />
                 <button 
                   onClick={sendMessage}
                   className="w-10 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition shrink-0" 
                   style={{backgroundColor: colorSidebar}}
                 >
                   <ArrowRight size={18} />
                 </button>
               </div>
             </>
           )}
        </div>
      </main>

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-[#f7f5f9] rounded-[2rem] w-full max-w-sm relative overflow-hidden shadow-2xl scale-100">
            <button onClick={() => setIsShareModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-800 transition">
              <X size={24} />
            </button>
            <div className="p-8 text-center pt-8">
              <h3 className="text-2xl font-bold text-slate-800 mb-8 text-left">Compartir</h3>
              
              <div className="bg-white p-6 rounded-3xl mx-auto w-64 h-64 flex items-center justify-center shadow-sm border border-slate-100 mb-8">
                 <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}&margin=0`} alt="QR Code" className="w-full h-full" />
              </div>
              
              <div 
                className="mt-4 border border-slate-300 rounded-2xl bg-transparent p-4 flex items-center justify-between cursor-pointer hover:bg-slate-200/50 transition active:scale-95"
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  alert("¡Enlace copiado al portapapeles!");
                }}
              >
                <span className="text-sm text-slate-600 truncate mr-2 border-b border-slate-400 font-medium pb-0.5">{shareUrl}</span>
                <span className="text-slate-600">
                   <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      {isRulesModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-2xl w-full max-w-3xl relative shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3"><FileText size={28} className="text-blue-600" /> Reglas del Campeonato</h3>
              <button onClick={() => setIsRulesModalOpen(false)} className="text-slate-400 hover:text-slate-800 bg-white p-2 rounded-full shadow-sm">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 overflow-y-auto flex-1 bg-white">
              {reglas.length > 0 ? (
                <ul className="space-y-6">
                  {reglas.map((r: string, i: number) => (
                    <li key={i} className="flex gap-4 text-slate-700 leading-relaxed items-start">
                      <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0 border border-blue-100 shadow-sm">{i+1}</span>
                      <span className="mt-1 text-[15px] font-medium">{r}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <FileText size={32} className="text-slate-300" />
                  </div>
                  <p className="text-slate-500 font-medium text-lg">Las reglas de este torneo no han sido publicadas aún.</p>
                </div>
              )}
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => setIsRulesModalOpen(false)} className="bg-blue-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-blue-700 transition shadow-sm">Entendido</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
