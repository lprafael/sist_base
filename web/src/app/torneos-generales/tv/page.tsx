'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Trophy, AlertTriangle } from 'lucide-react';

function TVPantallaContent() {
  const searchParams = useSearchParams();
  const torneoId = searchParams.get('torneo');
  
  const [puntajeRojo, setPuntajeRojo] = useState(0);
  const [puntajeAzul, setPuntajeAzul] = useState(0);
  const [status, setStatus] = useState('Conectando...');
  
  useEffect(() => {
    if (!torneoId) {
      setStatus('No se proporcionó un ID de torneo en la URL.');
      return;
    }

    // Determine the WS protocol and host based on current origin
    const isSecure = window.location.protocol === 'https:';
    const wsProtocol = isSecure ? 'wss:' : 'ws:';
    // For local development, backend is usually on 8002
    const wsHost = process.env.NEXT_PUBLIC_API_URL 
      ? process.env.NEXT_PUBLIC_API_URL.replace(/^https?:\/\//, '')
      : 'localhost:8002';

    const wsUrl = `${wsProtocol}//${wsHost}/api/marciales/torneos/${torneoId}/ws`;
    
    let ws: WebSocket;
    
    const connect = () => {
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setStatus('EN VIVO');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Expected payload: { nota: 'rojo' | 'azul', puntos_agregados: number, tipo: string }
          if (data.tipo === 'Punto') {
            if (data.nota === 'rojo') {
              setPuntajeRojo(prev => prev + data.puntos_agregados);
            } else if (data.nota === 'azul') {
              setPuntajeAzul(prev => prev + data.puntos_agregados);
            }
          }
        } catch (e) {
          console.error("Error parseando mensaje WS:", e);
        }
      };
      
      ws.onclose = () => {
        setStatus('Desconectado. Reconectando...');
        setTimeout(connect, 3000);
      };
      
      ws.onerror = (err) => {
        console.error('WebSocket Error:', err);
        ws.close();
      };
    };

    connect();

    return () => {
      if (ws) ws.close();
    };
  }, [torneoId]);

  if (!torneoId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white p-8 text-center">
        <div>
          <AlertTriangle className="text-yellow-500 w-24 h-24 mx-auto mb-6" />
          <h1 className="text-4xl font-black mb-4">Falta ID del Torneo</h1>
          <p className="text-xl text-slate-400">Por favor accede a esta pantalla mediante un enlace válido desde la consola de Veedores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black overflow-hidden flex flex-col font-sans select-none cursor-none">
      {/* Header TV */}
      <div className="h-24 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-12">
        <div className="flex items-center gap-4">
          <Trophy className="text-yellow-500 w-10 h-10" />
          <h1 className="text-3xl font-black text-white uppercase tracking-widest">Pantalla Principal</h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="bg-slate-800 px-6 py-2 rounded-full border border-slate-700">
            <span className="text-slate-300 font-bold uppercase tracking-wider text-xl">Tatami 1</span>
          </div>
          <div className={`px-4 py-2 rounded-full font-bold text-sm border flex items-center gap-2 ${
            status === 'EN VIVO' ? 'bg-red-950 text-red-500 border-red-900' : 'bg-yellow-950 text-yellow-500 border-yellow-900'
          }`}>
            <div className={`w-3 h-3 rounded-full ${status === 'EN VIVO' ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`}></div>
            {status}
          </div>
        </div>
      </div>

      {/* Main Scoreboard */}
      <div className="flex-1 flex w-full">
        {/* Rojo */}
        <div className="flex-1 bg-red-600 border-r-8 border-black flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-12 w-full text-center">
            <span className="bg-black/30 text-white font-black text-4xl px-12 py-4 rounded-2xl tracking-[0.2em]">ROJO</span>
          </div>
          <div className="text-[25rem] font-black text-white tabular-nums leading-none tracking-tighter drop-shadow-2xl">
            {puntajeRojo}
          </div>
        </div>
        
        {/* Azul */}
        <div className="flex-1 bg-blue-600 border-l-8 border-black flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-12 w-full text-center">
            <span className="bg-black/30 text-white font-black text-4xl px-12 py-4 rounded-2xl tracking-[0.2em]">AZUL</span>
          </div>
          <div className="text-[25rem] font-black text-white tabular-nums leading-none tracking-tighter drop-shadow-2xl">
            {puntajeAzul}
          </div>
        </div>
      </div>
      
      {/* Footer info (Match details) */}
      <div className="h-20 bg-slate-900 border-t border-slate-800 flex items-center justify-center">
        <p className="text-2xl font-bold text-slate-300 uppercase tracking-widest">Semifinal - Categoría Adultos - Hasta 75kg</p>
      </div>
    </div>
  );
}

export default function TVPantallaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white"><h1 className="text-4xl font-black">Cargando Tablero...</h1></div>}>
      <TVPantallaContent />
    </Suspense>
  );
}
