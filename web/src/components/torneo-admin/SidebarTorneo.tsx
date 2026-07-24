"use client";
import React from 'react';
import { Home, Trophy, BarChart2, Image as ImageIcon, Settings, LogOut, ArrowLeft, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SidebarTorneo({ torneo, activeTab, setActiveTab, isOrganizer = false, isPublicView = false }: { torneo: any, activeTab: string, setActiveTab: (tab: string) => void, isOrganizer?: boolean, isPublicView?: boolean }) {
  const router = useRouter();
  const colorSidebar = torneo?.configuracion?.color_sidebar || '#0c112b';

  const menu = [
    { id: 'inicio', label: 'Inicio', icon: Trophy },
    { id: 'clasificacion', label: 'Partidos y Clasificación', icon: BarChart2 },
    { id: 'rankings', label: 'Rankings y encuestas', icon: Users },
    { id: 'multimedia', label: 'Fotos, videos y noticias', icon: ImageIcon }
  ];

  if (isOrganizer) {
    menu.push({ id: 'configuracion', label: 'Configuración', icon: Settings });
  }

  return (
    <aside className="w-64 text-white flex flex-col shrink-0 min-h-screen relative z-10 transition-colors duration-300" style={{ backgroundColor: colorSidebar }}>
      {!isPublicView && (
        <div className="px-6 pt-6">
          <button onClick={() => router.push('/admin-futbol/campeonatos')} className="flex items-center gap-2 text-white/70 hover:text-white transition text-sm font-bold">
            <ArrowLeft size={16} /> Volver
          </button>
        </div>
      )}
      
      <div className="p-8 flex flex-col items-center text-center border-b border-white/10 mt-2">
        <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-4 overflow-hidden shadow-lg border-2 border-white/20">
          {torneo?.imagen_portada ? (
            <img src={torneo.imagen_portada} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <Trophy size={40} className="text-white" />
          )}
        </div>
        <h2 className="text-xl font-bold leading-tight">{torneo?.nombre || 'Cargando...'}</h2>
      </div>

      <nav className="flex-1 py-4">
        <ul className="space-y-2">
          {menu.map(item => {
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-8 py-4 font-bold text-sm transition ${
                    isActive
                      ? 'bg-white/10 border-l-4 border-white text-white'
                      : 'text-white/70 hover:bg-white/5 hover:text-white border-l-4 border-transparent'
                  }`}
                >
                  <item.icon size={18} /> {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {isPublicView && (
        <div className="p-6 mt-auto border-t border-white/10">
          <button onClick={() => router.push('/torneos/login')} className="flex items-center justify-center gap-3 text-white/70 hover:text-white transition font-bold text-sm w-full py-2">
            <LogOut size={18} className="rotate-180" /> Iniciar sesión
          </button>
        </div>
      )}

      {!isPublicView && (
        <div className="p-6 mt-auto border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black/20 rounded-full overflow-hidden flex items-center justify-center">
              <Users size={16} className="text-white/50" />
            </div>
            <div className="text-xs font-bold text-white/70">
              Organizador
            </div>
          </div>
          <button onClick={() => {
            localStorage.removeItem('user_session');
            window.location.href = '/torneos/login';
          }} className="text-white/70 hover:text-red-400 transition" title="Cerrar sesión">
            <LogOut size={18} />
          </button>
        </div>
      )}
    </aside>
  );
}
