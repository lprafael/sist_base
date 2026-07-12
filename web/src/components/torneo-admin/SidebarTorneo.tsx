"use client";
import React from 'react';
import { Home, Trophy, BarChart2, Image as ImageIcon, Settings, LogOut, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SidebarTorneo({ torneoNombre, activeTab, setActiveTab, isOrganizer = false }: { torneoNombre: string, activeTab: string, setActiveTab: (tab: string) => void, isOrganizer?: boolean }) {
  const router = useRouter();

  const menu = [
    { id: 'inicio', label: 'Resumen', icon: Home },
    { id: 'clasificacion', label: 'Clasificación', icon: Trophy },
    { id: 'rankings', label: 'Rankings y encuestas', icon: BarChart2 },
    { id: 'multimedia', label: 'Multimedia', icon: ImageIcon }
  ];

  if (isOrganizer) {
    menu.push({ id: 'configuracion', label: 'Configuración', icon: Settings });
  }

  return (
    <aside className="w-72 bg-[#0c112b] text-white flex flex-col min-h-screen border-r border-slate-800 shadow-2xl relative z-10">
      <div className="p-6 border-b border-white/10">
        <button onClick={() => router.push('/admin-futbol/campeonatos')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition text-sm font-bold">
          <ArrowLeft size={16} /> Volver
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white">
            <Trophy size={24} />
          </div>
          <h2 className="text-xl font-bold leading-tight">{torneoNombre || 'Cargando...'}</h2>
        </div>
      </div>

      <nav className="flex-1 py-6">
        <ul className="space-y-1">
          {menu.map(item => (
            <li key={item.id}>
              <button
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-4 px-8 py-4 font-bold text-sm transition ${activeTab === item.id
                    ? 'bg-[#151c3b] border-l-4 border-green-500 text-white'
                    : 'text-slate-400 hover:bg-[#151c3b]/50 hover:text-slate-200 border-l-4 border-transparent'
                  }`}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-6 border-t border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-700 rounded-full overflow-hidden">
            {/* Avatar placeholder */}
            <div className="w-full h-full bg-slate-600"></div>
          </div>
          <div className="text-xs font-bold text-slate-300">
            Organizador
          </div>
        </div>
        <button onClick={() => {
          localStorage.removeItem('user_session');
          window.location.href = '/login';
        }} className="text-white hover:text-red-400 transition" title="Cerrar sesión">
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
