"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Trophy } from 'lucide-react';
import MesaCentralWKFView from '@/components/torneo-admin/modulos/MesaCentralWKFView';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function MesaCentralPage() {
  const { id } = useParams();
  const router = useRouter();
  const [torneo, setTorneo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTorneo();
  }, [id]);

  const fetchTorneo = async () => {
    try {
      const res = await fetch(`${API_URL}/cancha/torneos/${id}`);
      if (res.ok) {
        const data = await res.json();
        setTorneo(data);
      }
    } catch (e) {
      console.error('Error fetching torneo for Mesa Central:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="animate-spin text-red-500 mb-4" size={48} />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cargando Mesa Central WKF...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Barra superior de navegación */}
        <div className="flex justify-between items-center bg-slate-900/80 border border-slate-800 px-6 py-3 rounded-2xl">
          <button
            onClick={() => router.push(`/torneos/${id}`)}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-bold transition"
          >
            <ArrowLeft size={16} /> Volver al Torneo
          </button>

          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-red-500" />
            <span className="font-bold text-xs text-white uppercase">{torneo?.nombre || 'Torneo WKF'}</span>
          </div>
        </div>

        {/* Módulo Principal de Mesa Central */}
        <MesaCentralWKFView
          torneoId={id as string}
          torneo={torneo}
        />

      </div>
    </div>
  );
}
