"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, ListTodo, Users, LayoutTemplate, BookOpen, UserCog, Menu, X, LogOut } from 'lucide-react';

export default function AdminFutbolLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("Cargando...");

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
    { name: "Página del organizador", href: "/admin-futbol/perfil", icon: <LayoutTemplate size={22} /> },
    { name: "Planes de suscripción", href: "/admin-futbol/suscripciones", icon: <BookOpen size={22} /> },
    { name: "Arbitraje", href: "/admin-futbol/arbitraje", icon: <UserCog size={22} /> },
  ];

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
            const isActive = pathname.startsWith(item.href);
            return (
              <Link 
                key={item.name} 
                href={item.href}
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
                window.location.href = '/login';
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
    </div>
  );
}
