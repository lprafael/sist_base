"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, ListTodo, Users, LayoutTemplate, BookOpen, UserCog, Menu, X, LogOut, MessageSquare, Send, Check, CheckCheck, Bell, Star, MapPin, Lock } from 'lucide-react';
import SitiosView from '../../components/torneo-admin/modulos/SitiosView';

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.micancha.com.py';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMsg({ text: 'Las contraseñas no coinciden', type: 'error' });
      return;
    }
    setLoading(true);
    setMsg({ text: '', type: '' });
    try {
      const sessionStr = localStorage.getItem('user_session');
      const token = sessionStr ? JSON.parse(sessionStr).access_token : '';
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
      });
      if (res.ok) {
        setMsg({ text: 'Contraseña cambiada exitosamente', type: 'success' });
        setTimeout(onClose, 1500);
      } else {
        const err = await res.json();
        setMsg({ text: err.detail || 'Error al cambiar contraseña', type: 'error' });
      }
    } catch (e: any) {
      setMsg({ text: 'Error de red', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl relative overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-800">Cambiar Contraseña</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>
        
        {msg.text && (
          <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${msg.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Contraseña Actual</label>
            <input type="password" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-700" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Nueva Contraseña</label>
            <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-700" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Confirmar Nueva Contraseña</label>
            <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-700" />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-2">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminFutbolLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("Cargando...");
  const [showSitiosModal, setShowSitiosModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  React.useEffect(() => {
    const sessionData = JSON.parse(localStorage.getItem('user_session') || '{}');
    if (sessionData.name) {
      setUserName(sessionData.name);
    } else {
      setUserName("Organizador");
    }
  }, []);

  const navItems = [
    { name: "Mis campeonatos", href: "/admin-futbol/campeonatos", icon: <Trophy size={22} /> },
    { name: "Registro de equipos", href: "/admin-futbol/equipos", icon: <ListTodo size={22} /> },
    { name: "Registro de jugadores", href: "/admin-futbol/jugadores", icon: <Users size={22} /> },
    { name: "Mis Sitios y Complejos", isModal: true, onClick: () => setShowSitiosModal(true), icon: <MapPin size={22} /> },
    { name: "Página del organizador", href: "/admin-futbol/perfil", icon: <LayoutTemplate size={22} /> },
    { name: "Patrocinios y Apoyos", href: "/admin-futbol/patrocinios", icon: <Star size={22} /> },
    { name: "Planes de suscripción", href: "/admin-futbol/suscripciones", icon: <BookOpen size={22} /> },
    { name: "Arbitraje", href: "/admin-futbol/arbitraje", icon: <UserCog size={22} /> },
    { name: "Cambiar contraseña", isModal: true, onClick: () => setShowPasswordModal(true), icon: <Lock size={22} /> },
  ];

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

  // Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userId, setUserId] = useState<string>("0");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const sessionData = JSON.parse(localStorage.getItem('user_session') || '{}');
    if (sessionData.usuario_id) setUserId(String(sessionData.usuario_id));
  }, []);

  // Participant Chat State
  const [participantUnreadCount, setParticipantUnreadCount] = useState(0);
  const [participantInboxOpen, setParticipantInboxOpen] = useState(false);
  const [participantInbox, setParticipantInbox] = useState<any[]>([]);
  const [activeParticipantChat, setActiveParticipantChat] = useState<any>(null);
  const [participantChatMessages, setParticipantChatMessages] = useState<any[]>([]);
  const [participantNewMessage, setParticipantNewMessage] = useState("");
  const participantMessagesEndRef = useRef<HTMLDivElement>(null);

  // Poll participant unread count
  useEffect(() => {
    if (userId === "0") return;
    const fetchUnread = async () => {
      try {
        const res = await fetch(`${API_URL}/api/chat/organizador/participantes/unread/${userId}`);
        if (res.ok) {
          const data = await res.json();
          setParticipantUnreadCount(data.unread_count);
        }
      } catch (e) {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 10000);
    return () => clearInterval(interval);
  }, [userId]);

  // Fetch Inbox
  const loadInbox = async () => {
    if (userId === "0") return;
    try {
      const res = await fetch(`${API_URL}/api/chat/organizador/bandeja/${userId}`);
      if (res.ok) {
        setParticipantInbox(await res.json());
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (participantInboxOpen) loadInbox();
  }, [participantInboxOpen]);

  // Poll specific participant chat
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeParticipantChat && userId !== "0") {
      const loadParticipantChat = async () => {
        try {
          const { torneo_id, participante_id } = activeParticipantChat;
          const res = await fetch(`${API_URL}/api/chat/participante/${torneo_id}/${participante_id}`);
          if (res.ok) {
            const data = await res.json();
            setParticipantChatMessages(data);
            
            // Mark as read if there are unread messages from participant
            if (data.some((m: any) => !m.leido && m.sender === 'participante')) {
              await fetch(`${API_URL}/api/chat/participante/${torneo_id}/${participante_id}/leer`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reader: 'organizador' })
              });
              loadInbox();
              // Update global count
              const unreadRes = await fetch(`${API_URL}/api/chat/organizador/participantes/unread/${userId}`);
              if (unreadRes.ok) {
                const unreadData = await unreadRes.json();
                setParticipantUnreadCount(unreadData.unread_count);
              }
            }
          }
        } catch (e) {}
      };
      
      loadParticipantChat();
      interval = setInterval(loadParticipantChat, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeParticipantChat, userId]);

  useEffect(() => {
    participantMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [participantChatMessages]);

  const handleSendParticipantMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participantNewMessage.trim() || !activeParticipantChat || userId === "0") return;
    try {
      const { torneo_id, participante_id } = activeParticipantChat;
      const res = await fetch(`${API_URL}/api/chat/participante`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          torneo_id,
          organizador_id: Number(userId),
          participante_id,
          sender: 'organizador',
          mensaje: participantNewMessage.trim()
        })
      });
      if (res.ok) {
        setParticipantNewMessage("");
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (userId === "0") return;

    const loadMessages = async () => {
      try {
        const res = await fetch(`${API_URL}/api/chat/organizador/${userId}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
          
          const unread = data.filter((m: any) => m.sender === 'admin' && !m.leido).length;
          setUnreadCount(unread);

          if (chatOpen && unread > 0) {
            await fetch(`${API_URL}/api/chat/organizador/${userId}/leer?reader=organizador`, { method: 'PUT' });
            setUnreadCount(0);
          }
        }
      } catch (e) {
        console.error("Error loading messages", e);
      }
    };

    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [chatOpen, userId]);

  useEffect(() => {
    if (chatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || userId === "0") return;

    try {
      const res = await fetch(`${API_URL}/api/chat/organizador`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizador_id: Number(userId),
          sender: 'organizador',
          mensaje: newMessage.trim()
        })
      });

      if (res.ok) {
        const newMsg = await res.json();
        setMessages(prev => [...prev, newMsg]);
        setNewMessage("");
      }
    } catch (e) {
      console.error("Error sending message", e);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* SIDEBAR MOBILE OVERLAY */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* SIDEBAR */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#1b264f] text-white transform transition-transform duration-300 md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-6 border-b border-[#2a3a72]">
          <h2 className="text-2xl font-bold tracking-wider">Mesa de Control</h2>
          <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>
        
        <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-80px)] custom-scrollbar">
          {navItems.map(item => {
            if (item.isModal && item.onClick) {
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    setSidebarOpen(false);
                    item.onClick();
                  }}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-xl transition hover:bg-[#2a3a72]/50 text-gray-300 hover:text-white text-left"
                >
                  {item.icon}
                  <span className="text-lg">{item.name}</span>
                </button>
              );
            }
            const isActive = item.href ? pathname.startsWith(item.href) : false;
            return (
              <Link 
                key={item.name} 
                href={item.href || '#'}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-4 px-4 py-4 rounded-xl transition ${isActive ? 'bg-[#2a3a72] font-bold shadow-inner' : 'hover:bg-[#2a3a72]/50 text-gray-300 hover:text-white'}`}
              >
                {item.icon}
                <span className="text-lg">{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200 p-4 flex items-center justify-between z-10">
          <div className="flex items-center">
            <button onClick={() => setSidebarOpen(true)} className="text-[#1b264f] md:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100">
              <Menu size={28} />
            </button>
            <span className="ml-2 font-bold text-lg text-[#1b264f] md:hidden">Menu</span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Notifications Bell */}
            <button 
              onClick={() => setParticipantInboxOpen(true)}
              className="relative p-2 rounded-full hover:bg-gray-100 transition"
              title="Mensajes de Participantes"
            >
              <Bell size={24} className={participantUnreadCount > 0 ? 'text-red-500 animate-pulse' : 'text-gray-500'} />
              {participantUnreadCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {participantUnreadCount}
                </span>
              )}
            </button>
            
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-sm font-bold text-gray-800" id="user-name-display">{userName}</span>
              <span className="text-xs text-gray-500">Organizador</span>
            </div>
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold border-2 border-indigo-200">
              <UserCog size={20} />
            </div>
            <button 
              onClick={() => {
                localStorage.removeItem('user_session');
                window.location.href = 'https://micancha.com.py';
              }}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors flex items-center gap-2"
              title="Cerrar Sesión"
            >
              <LogOut size={20} className="hidden sm:block" />
              <span className="text-sm font-bold sm:hidden">Salir</span>
            </button>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {/* Script para cargar el nombre de usuario de localStorage */}
          <script dangerouslySetInnerHTML={{__html: `
            setTimeout(function() {
              try {
                var s = localStorage.getItem('user_session');
                if(s) {
                  var data = JSON.parse(s);
                  var el = document.getElementById('user-name-display');
                  if(el && data.username) el.textContent = data.username;
                }
              } catch(e) {}
            }, 100);
          `}} />
          {children}
        </main>
      </div>

      {/* PARTICIPANT INBOX MODAL */}
      {participantInboxOpen && !activeParticipantChat && (
        <div className="fixed inset-0 bg-black/40 z-[3000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg h-[70vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#1b264f] text-white rounded-t-2xl">
              <h3 className="font-bold flex items-center gap-2"><MessageSquare size={18} /> Bandeja de Mensajes (Participantes)</h3>
              <button onClick={() => setParticipantInboxOpen(false)} className="p-1 hover:bg-white/10 rounded"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 bg-gray-50 custom-scrollbar">
              {participantInbox.length === 0 ? (
                <div className="text-center text-gray-500 mt-20 text-sm">No tienes mensajes de participantes.</div>
              ) : (
                <div className="space-y-2">
                  {participantInbox.map((chat: any) => (
                    <button 
                      key={`${chat.torneo_id}-${chat.participante_id}`}
                      onClick={() => setActiveParticipantChat(chat)}
                      className="w-full text-left p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-indigo-300 transition flex justify-between items-center group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-800 text-sm truncate">Jugador #{chat.participante_id}</span>
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200 truncate max-w-[120px]">Torneo: {chat.torneo_id}</span>
                        </div>
                        <p className="text-gray-600 text-xs truncate">{chat.last_message}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-4">
                        <span className="text-[10px] text-gray-400 font-medium">
                          {new Date(chat.last_message_date).toLocaleDateString()}
                        </span>
                        {chat.unread_count > 0 && (
                          <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                            {chat.unread_count}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PARTICIPANT CHAT MODAL */}
      {activeParticipantChat && (
        <div className="fixed inset-0 bg-black/40 z-[3100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg h-[80vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setActiveParticipantChat(null)} 
                  className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition"
                >
                  <X size={16} />
                </button>
                <div>
                  <h3 className="font-bold text-sm">Jugador #{activeParticipantChat.participante_id}</h3>
                  <p className="text-[10px] opacity-80">Torneo: {activeParticipantChat.torneo_id}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gray-50 custom-scrollbar">
              {participantChatMessages.length === 0 ? (
                <div className="text-center text-gray-400 text-xs mt-10">Sin mensajes anteriores</div>
              ) : (
                participantChatMessages.map(m => {
                  const isMe = m.sender === 'organizador';
                  return (
                    <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`
                        max-w-[85%] p-3 rounded-2xl text-sm shadow-sm
                        ${isMe 
                          ? 'bg-indigo-600 text-white rounded-br-sm' 
                          : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'}
                      `}>
                        {m.mensaje}
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1 mx-1 flex items-center gap-1">
                        {new Date(m.fecha_envio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  )
                })
              )}
              <div ref={participantMessagesEndRef} />
            </div>

            <form onSubmit={handleSendParticipantMessage} className="p-3 bg-white border-t border-gray-200 rounded-b-2xl flex gap-2">
              <input 
                type="text" 
                value={participantNewMessage}
                onChange={e => setParticipantNewMessage(e.target.value)}
                placeholder="Escribe tu respuesta..."
                className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button 
                type="submit" 
                disabled={!participantNewMessage.trim()}
                className="bg-indigo-600 text-white p-2 w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-50 disabled:bg-gray-400 hover:bg-indigo-700 transition"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FLOATING CHAT BOT (ADMIN) */}
      <div className="fixed bottom-6 right-6 z-50">
        {!chatOpen ? (
          <button 
            onClick={() => setChatOpen(true)}
            className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-xl hover:bg-indigo-700 hover:scale-105 transition-all relative"
          >
            <MessageSquare size={24} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white">
                {unreadCount}
              </span>
            )}
          </button>
        ) : (
          <div className="bg-white rounded-2xl shadow-2xl w-80 sm:w-96 flex flex-col overflow-hidden border border-gray-100" style={{ height: '500px' }}>
            <div className="bg-[#1b264f] p-4 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold">Soporte y Ajustes</h3>
                <p className="text-xs text-indigo-200">Indícanos tus requerimientos para mejorar</p>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-white hover:text-gray-300">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 text-sm mt-10">
                  No hay mensajes aún. ¡Escríbenos!
                </div>
              ) : (
                messages.map(m => (
                  <div key={m.id} className={`flex flex-col max-w-[85%] ${m.sender === 'organizador' ? 'self-end items-end' : 'self-start items-start'}`}>
                    <div className={`p-3 rounded-2xl text-sm ${m.sender === 'organizador' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'}`}>
                      {m.mensaje}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                      <span>{new Date(m.fecha_envio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      {m.sender === 'organizador' && (
                        <span>
                          {m.leido ? <CheckCheck size={12} className="text-blue-500" /> : m.entregado ? <Check size={12} /> : null}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-100 flex gap-2">
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="flex-1 bg-gray-100 border-transparent rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
              />
              <button 
                type="submit"
                disabled={!newMessage.trim()}
                className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        )}
      </div>

      {showSitiosModal && (
        <SitiosView onClose={() => setShowSitiosModal(false)} />
      )}
      
      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  );
}
