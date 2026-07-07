"use client";
import React, { useState, useEffect } from 'react';
import { Trophy, Activity, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TVLiveDashboard({ params }: { params: { id: string } }) {
  const router = useRouter();
  
  // Dummy state para MVP, asumiendo 4 áreas activas
  const [areas, setAreas] = useState([
    { id: 1, tipo: 'Combate', estado: 'en_curso', blanco: { nombre: 'J. Perez', puntos: 4 }, rojo: { nombre: 'M. Gonzalez', puntos: 2 }, tiempo: '0:45' },
    { id: 2, tipo: 'Formas', estado: 'evaluando', competidor: 'A. Ramirez', puntaje: '...' },
    { id: 3, tipo: 'Combate', estado: 'en_curso', blanco: { nombre: 'L. Gomez', puntos: 0 }, rojo: { nombre: 'F. Rojas', puntos: 0 }, tiempo: '1:12' },
    { id: 4, tipo: 'Combate', estado: 'finalizado', blanco: { nombre: 'C. Diaz', puntos: 1 }, rojo: { nombre: 'R. Silva', puntos: 3, ganador: true }, tiempo: 'Final' },
  ]);

  const [ultimosResultados, setUltimosResultados] = useState([
    "Área 1: J. Perez vence a L. Silva (5-2)",
    "Área 2: M. Torres (Formas) - 27.5 pts",
    "Área 3: R. Gomez vence por Descalificación",
    "Área 1: A. Ruiz vence por Hantei"
  ]);

  // Polling simulado
  useEffect(() => {
    const interval = setInterval(() => {
      // Aquí se haría fetch a /asam/torneos/{id}/live
      // setAreas(data.areas)
      // setUltimosResultados(data.resultados)
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Determinar CSS Grid basado en cantidad de áreas (2, 4 o 6)
  const gridCols = areas.length <= 2 ? 'grid-cols-1 md:grid-cols-2' : 
                   areas.length <= 4 ? 'grid-cols-2' : 
                   'grid-cols-3';

  return (
    <div className="min-h-screen bg-black text-white p-4 font-sans flex flex-col h-screen overflow-hidden">
      {/* HEADER TV */}
      <div className="flex justify-between items-center mb-6 bg-neutral-900 p-4 rounded-2xl border-b-4 border-emerald-500">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-3 hover:bg-neutral-800 rounded-xl transition text-neutral-400">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-widest uppercase">Resultados en Vivo</h1>
            <p className="text-emerald-400 font-bold">Torneo Nacional ASAM</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-red-600 px-6 py-2 rounded-full animate-pulse">
          <Activity size={24} />
          <span className="font-bold tracking-widest">LIVE</span>
        </div>
      </div>

      <div className="flex gap-6 flex-1 h-full overflow-hidden">
        {/* GRILLA PRINCIPAL DE ÁREAS */}
        <div className={`flex-1 grid ${gridCols} gap-4 h-full`}>
          {areas.map((area) => (
            <div key={area.id} className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-neutral-800 px-4 py-1 rounded-bl-xl font-bold text-neutral-400">
                ÁREA {area.id}
              </div>
              <h2 className="text-xl font-black text-emerald-400 mb-4">{area.tipo}</h2>
              
              {area.tipo === 'Combate' ? (
                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex justify-between items-center bg-white/10 rounded-xl p-4 mb-2 border-l-4 border-white">
                    <span className="text-2xl font-bold truncate pr-4">{area.blanco?.nombre}</span>
                    <span className="text-5xl font-black font-mono">{area.blanco?.puntos}</span>
                  </div>
                  <div className="flex justify-between items-center bg-red-900/40 rounded-xl p-4 border-l-4 border-red-500">
                    <span className="text-2xl font-bold truncate pr-4 text-red-100">{area.rojo?.nombre}</span>
                    <span className="text-5xl font-black font-mono text-red-500">{area.rojo?.puntos}</span>
                  </div>
                  <div className="text-center mt-4 text-3xl font-mono text-yellow-500 font-black">
                    {area.tiempo}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center items-center">
                  <span className="text-2xl font-bold mb-4">{area.competidor}</span>
                  <div className="text-6xl font-black font-mono text-blue-400 mb-4">
                    {area.puntaje}
                  </div>
                  <span className="uppercase text-neutral-500 font-bold tracking-widest">{area.estado}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* PANEL LATERAL: RESULTADOS HISTÓRICOS */}
        <div className="w-96 bg-neutral-900 rounded-2xl border border-neutral-800 p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-700">
            <Trophy className="text-yellow-500" size={28} />
            <h2 className="text-2xl font-black">Últimos Finalizados</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
            {ultimosResultados.map((res, idx) => (
              <div key={idx} className="bg-neutral-800 p-4 rounded-xl border border-neutral-700">
                <p className="font-bold text-lg">{res}</p>
                <p className="text-sm text-neutral-400 mt-1">Hace {idx + 1} min</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
