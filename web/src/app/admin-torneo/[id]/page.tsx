"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Trophy } from 'lucide-react';
import SidebarTorneo from '@/components/torneo-admin/SidebarTorneo';
import ConfiguracionTab from '@/components/torneo-admin/ConfiguracionTab';
import CategoriasView from '@/components/torneo-admin/modulos/CategoriasView';
import CheckinView from '@/components/torneo-admin/modulos/CheckinView';
import GruposView from '@/components/torneo-admin/modulos/GruposView';
import AgrupacionView from '@/components/torneo-admin/modulos/AgrupacionView';
import ParticipantesView from '@/components/torneo-admin/modulos/ParticipantesView';
import ArbitrajeView from '@/components/torneo-admin/modulos/ArbitrajeView';
import ClasificacionView from '@/components/torneo-admin/modulos/ClasificacionView';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function TorneoAdminPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [torneo, setTorneo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inicio');
  const [isOrganizer, setIsOrganizer] = useState(false);
  
  // Si en la configuración se selecciona una sub-sección (ej. 'categorias', 'grupos', 'checkin')
  const [activeSubSection, setActiveSubSection] = useState<string | null>(null);

  useEffect(() => {
    fetchTorneo();
  }, [id]);

  const fetchTorneo = async () => {
    try {
      const sessionData = JSON.parse(localStorage.getItem('user_session') || '{}');
      const token = sessionData.access_token || sessionData.token || '';
      
      const res = await fetch(`${API_URL}/futbol/torneos/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if(res.ok) {
        const data = await res.json();
        setTorneo(data);
        if (sessionData.usuario_id && data.organizador_usuario_id === sessionData.usuario_id) {
          setIsOrganizer(true);
        }
      } else {
        console.error("No se pudo cargar el torneo");
      }
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  };

  const updateTorneo = async (updateData: any) => {
    try {
      const sessionData = JSON.parse(localStorage.getItem('user_session') || '{}');
      const token = sessionData.access_token || sessionData.token || '';
      
      await fetch(`${API_URL}/futbol/torneos/${id}`, {
        method: "PUT",
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      // Optionally reload data or just optimistically update
      setTorneo({ ...torneo, ...updateData });
    } catch(e) {
      console.error(e);
    }
  };

  if(loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;
  }

  if(!torneo) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><p>Torneo no encontrado.</p></div>;
  }

  // Render logic based on tabs and subsections
  const renderMainContent = () => {
    if (activeSubSection) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 min-h-[60vh]">
          <button onClick={() => setActiveSubSection(null)} className="text-blue-500 hover:underline mb-4 text-sm font-bold block">
            &larr; Volver a Configuración
          </button>
          <h2 className="text-2xl font-bold mb-4 capitalize text-slate-800">Gestionar {activeSubSection}</h2>
          
          {activeSubSection === 'categorias' ? (
            <CategoriasView torneoId={id as string} />
          ) : activeSubSection === 'checkin' ? (
            <CheckinView torneoId={id as string} />
          ) : activeSubSection === 'grupos' ? (
            <GruposView torneoId={id as string} />
          ) : activeSubSection === 'agrupacion' ? (
            <AgrupacionView torneoId={id as string} />
          ) : activeSubSection === 'participantes' ? (
            <ParticipantesView torneoId={id as string} />
          ) : activeSubSection === 'arbitraje' ? (
            <ArbitrajeView torneoId={id as string} />
          ) : activeSubSection === 'clasificacion' ? (
            <ClasificacionView torneoId={id as string} />
          ) : (
            <div className="p-8 border-2 border-dashed border-slate-300 rounded-xl text-center">
              <p className="text-slate-500 mb-2">Aquí se inyectará la lógica correspondiente a <strong>{activeSubSection}</strong></p>
              <p className="text-xs text-slate-400"> (Por ejemplo, el gestor de llaves, el check-in, o las categorías, tal como estaban en admin-generales)</p>
            </div>
          )}
        </div>
      );
    }

    switch(activeTab) {
      case 'configuracion':
        return (
          <ConfiguracionTab 
            torneo={torneo} 
            onUpdate={updateTorneo} 
            onSubSectionSelect={setActiveSubSection} 
          />
        );
      case 'inicio':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
              <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy size={40} />
              </div>
              <h2 className="text-3xl font-black text-slate-800 mb-2">{torneo.nombre}</h2>
              <p className="text-slate-500 mb-6">{torneo.subtitulo || "Organiza y gestiona tu torneo de manera profesional"}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                <div className="border border-slate-100 bg-slate-50 p-4 rounded-xl">
                  <div className="text-2xl font-bold text-slate-800">0</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Equipos</div>
                </div>
                <div className="border border-slate-100 bg-slate-50 p-4 rounded-xl">
                  <div className="text-2xl font-bold text-slate-800">0</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Jugadores</div>
                </div>
                <div className="border border-slate-100 bg-slate-50 p-4 rounded-xl">
                  <div className="text-2xl font-bold text-slate-800">0</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Partidos</div>
                </div>
                <div className="border border-slate-100 bg-slate-50 p-4 rounded-xl">
                  <div className="text-2xl font-bold text-slate-800 text-green-600">{torneo.estado === 'en_curso' ? 'Activo' : 'Prep.'}</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Estado</div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'clasificacion':
      case 'rankings':
      case 'multimedia':
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      <SidebarTorneo 
        torneoNombre={torneo.nombre} 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setActiveSubSection(null); // Reset sub section if switching main tabs
        }} 
        isOrganizer={isOrganizer}
      />
      
      <main className="flex-1 ml-0 h-screen overflow-y-auto">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-10 shadow-sm flex justify-between items-center">
          <h1 className="text-2xl font-black text-slate-800">
            {activeSubSection 
              ? `Editando ${activeSubSection}` 
              : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          </h1>
          <div className="flex gap-2">
            <button 
              onClick={() => window.open(`/torneos/${id}`, '_blank')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold text-sm transition shadow"
            >
              Ver página pública
            </button>
          </div>
        </header>

        <div className="p-8">
          {renderMainContent()}
        </div>
      </main>
    </div>
  );
}
