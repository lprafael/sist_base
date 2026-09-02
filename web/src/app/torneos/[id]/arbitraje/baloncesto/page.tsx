"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Trophy, Flame, AlertCircle, Clock, Volume2, VolumeX } from 'lucide-react';
import BasketballController from '@/components/torneo-admin/modulos/BasketballController';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function ArbitrajeBaloncestoPage() {
  const router = useRouter();
  const params = useParams();
  const torneoId = params?.id as string;

  const [partidos, setPartidos] = useState<any[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchPartidos = async () => {
    try {
      const res = await fetch(`${API_URL}/cancha/torneos/${torneoId}/partidos`);
      if (res.ok) {
        const data = await res.json();
        setPartidos(data);
        if (data.length > 0) {
          setSelectedMatch(data[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (torneoId) {
      fetchPartidos();
    } else {
      setLoading(false);
    }
  }, [torneoId]);

  // Si hay un partido seleccionado y estamos en modo control directo:
  if (selectedMatch) {
    return (
      <BasketballController
        match={selectedMatch}
        onClose={() => {
          setSelectedMatch(null);
        }}
        onSaved={() => {
          fetchPartidos();
        }}
      />
    );
  }

  // Si no hay partidos de baloncesto o se está seleccionando:
  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl">
          <button
            onClick={() => router.back()}
            className="p-3 hover:bg-slate-800 rounded-xl transition flex items-center gap-2 text-slate-300 hover:text-white"
          >
            <ArrowLeft size={20} />
            <span className="text-xs font-bold uppercase">Volver</span>
          </button>

          <div className="flex items-center gap-2 text-amber-400 font-black text-lg uppercase tracking-wider">
            <span>🏀</span>
            <span>Mesa de Control y Arbitraje de Baloncesto</span>
          </div>

          <div className="w-12"></div>
        </div>

        {/* Lista de Partidos */}
        <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
            Selecciona un Partido para Operar la Mesa Oficial:
          </h2>

          {loading ? (
            <div className="py-12 text-center text-slate-500 font-bold">Cargando partidos...</div>
          ) : partidos.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <p className="text-slate-400">No se encontraron partidos programados en este torneo.</p>
              <button
                onClick={() => {
                  setSelectedMatch({
                    id: 'demo-basket',
                    local_nombre: 'Lakers Local',
                    visitante_nombre: 'Celtics Visitante',
                    goles_local: 0,
                    goles_visitante: 0,
                    estado: 'en_curso',
                    cancha: 'Cancha 1 - Tablero Oficial'
                  });
                }}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition shadow-lg"
              >
                Abrir Tablero de Baloncesto (Modo Demostración)
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {partidos.map(p => (
                <div
                  key={p.id}
                  onClick={() => setSelectedMatch(p)}
                  className="bg-slate-950 hover:bg-slate-800/80 border border-slate-800 p-4 rounded-2xl cursor-pointer transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">🏀</span>
                    <div>
                      <div className="text-base font-black text-white group-hover:text-amber-400 transition">
                        {p.jugador_local_nombre || p.local_nombre || 'Local'} vs {p.jugador_visitante_nombre || p.visitante_nombre || 'Visitante'}
                      </div>
                      <div className="text-xs text-slate-400 font-medium">
                        {p.fase || 'Fase regular'} • Cancha: {p.cancha || p.area || 'Principal'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {p.goles_local ?? 0} - {p.goles_visitante ?? 0}
                      </span>
                      <div className="text-[10px] text-slate-500 uppercase mt-1">
                        {p.estado}
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-amber-500 group-hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition">
                      Abrir Tablero
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
