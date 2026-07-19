"use client";
import React, { useState, useEffect } from 'react';
import { Trophy, AlertCircle, ShieldAlert, Timer, Users, User, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ArbitrajeCombate({ params }: { params: { id: string } }) {
  const router = useRouter();
  
  // State mock
  const [combateId, setCombateId] = useState("123");
  const [blanco, setBlanco] = useState({ puntos: 0, salidas: 0, faltas: 0, nombre: "Juan Perez (Blanco)" });
  const [rojo, setRojo] = useState({ puntos: 0, salidas: 0, faltas: 0, nombre: "Carlos Gomez (Rojo)" });
  const [tiempo, setTiempo] = useState(90); // 1:30 en segundos
  const [corriendo, setCorriendo] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    let interval: any;
    if (corriendo && tiempo > 0) {
      interval = setInterval(() => setTiempo((t) => t - 1), 1000);
    } else if (tiempo === 0) {
      setCorriendo(false);
      setMensaje("Tiempo finalizado. Aplicar Hantei si hay empate.");
    }
    return () => clearInterval(interval);
  }, [corriendo, tiempo]);

  const registrarEvento = async (competidor: 'blanco' | 'rojo', accion: 'punto' | 'salida' | 'falta', valor: number = 1) => {
    try {
      const res = await fetch(`http://localhost:8001/asam/combates/${combateId}/evento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competidor, accion, valor })
      });
      const data = await res.json();
      
      if (res.ok) {
        setBlanco(prev => ({...prev, ...data.state.blanco}));
        setRojo(prev => ({...prev, ...data.state.rojo}));
        if (data.message && data.message !== "Evento registrado") {
          setMensaje(data.message);
        }
      } else {
        setMensaje("Error: " + data.detail);
      }
    } catch (e) {
      // Mock update si no hay backend
      if (competidor === 'blanco') setBlanco(p => ({...p, [accion + "s"]: Math.max(0, p[accion + "s"] + valor)}));
      if (competidor === 'rojo') setRojo(p => ({...p, [accion + "s"]: Math.max(0, p[accion + "s"] + valor)}));
    }
  };

  const aplicarHantei = async () => {
    try {
      const res = await fetch(`http://localhost:8001/asam/combates/${combateId}/hantei`, { method: 'POST' });
      const data = await res.json();
      setMensaje(data.message);
    } catch (e) {
      setMensaje("Hantei evaluado (Mock)");
    }
  };

  const formatTiempo = (seg: number) => {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-6 font-sans">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8 bg-neutral-800 p-4 rounded-2xl border border-neutral-700">
        <button onClick={() => router.back()} className="p-3 hover:bg-neutral-700 rounded-xl transition">
          <ArrowLeft size={24} />
        </button>
        <div className="text-center flex flex-col items-center">
          <span className="text-neutral-400 font-semibold uppercase tracking-wider text-sm mb-2">Mesa de Control ASAM</span>
          <div className="text-5xl font-black font-mono tracking-widest text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]">
            {formatTiempo(tiempo)}
          </div>
          <div className="flex gap-4 mt-4">
            <button onClick={() => setCorriendo(!corriendo)} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold">
              {corriendo ? 'Pausar' : 'Iniciar'}
            </button>
            <button onClick={() => {setTiempo(90); setCorriendo(false);}} className="px-6 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg font-bold">
              Reiniciar
            </button>
          </div>
        </div>
        <div className="w-12"></div>
      </div>

      {mensaje && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl text-center font-bold mb-6 text-xl animate-pulse">
          {mensaje}
        </div>
      )}

      {/* ARENA */}
      <div className="grid grid-cols-2 gap-6">
        
        {/* LADO BLANCO */}
        <div className="bg-white/10 rounded-3xl p-6 border-4 border-white flex flex-col items-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent z-0"></div>
          
          <h2 className="text-3xl font-black mb-8 z-10 text-white drop-shadow-lg">{blanco.nombre}</h2>
          
          <div className="text-9xl font-black mb-12 z-10 font-mono text-white">
            {blanco.puntos}
          </div>

          <div className="grid grid-cols-3 gap-2 w-full z-10">
            <button onClick={() => registrarEvento('blanco', 'punto')} className="col-span-3 py-4 bg-blue-600 hover:bg-blue-500 rounded-t-2xl font-bold text-2xl flex items-center justify-center gap-2 shadow-xl hover:scale-[1.02] transition">
              <Trophy size={28} /> +1 Punto
            </button>
            <button onClick={() => registrarEvento('blanco', 'punto', -1)} className="col-span-3 py-2 bg-blue-900 hover:bg-blue-800 text-blue-200 rounded-b-2xl font-bold text-sm flex items-center justify-center shadow-xl transition mb-2">
              -1 Punto
            </button>
            
            <div className="col-span-1 flex flex-col gap-1">
              <button onClick={() => registrarEvento('blanco', 'salida')} className="py-3 bg-orange-600 hover:bg-orange-500 rounded-t-xl font-bold text-lg flex flex-col items-center gap-1">
                <Timer size={24} /> Salida ({blanco.salidas})
              </button>
              <button onClick={() => registrarEvento('blanco', 'salida', -1)} className="py-1.5 bg-orange-900 hover:bg-orange-800 text-orange-200 rounded-b-xl font-bold text-xs flex justify-center">
                -1 Salida
              </button>
            </div>
            
            <div className="col-span-2 flex flex-col gap-1">
              <button onClick={() => registrarEvento('blanco', 'falta')} className="py-3 bg-red-600 hover:bg-red-500 rounded-t-xl font-bold text-lg flex flex-col items-center gap-1">
                <AlertCircle size={24} /> Falta ({blanco.faltas})
              </button>
              <button onClick={() => registrarEvento('blanco', 'falta', -1)} className="py-1.5 bg-red-900 hover:bg-red-800 text-red-200 rounded-b-xl font-bold text-xs flex justify-center">
                -1 Falta
              </button>
            </div>
          </div>
        </div>

        {/* LADO ROJO */}
        <div className="bg-red-900/40 rounded-3xl p-6 border-4 border-red-600 flex flex-col items-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 to-transparent z-0"></div>
          
          <h2 className="text-3xl font-black mb-8 z-10 text-red-400 drop-shadow-lg">{rojo.nombre}</h2>
          
          <div className="text-9xl font-black mb-12 z-10 font-mono text-red-500">
            {rojo.puntos}
          </div>

          <div className="grid grid-cols-3 gap-2 w-full z-10">
            <button onClick={() => registrarEvento('rojo', 'punto')} className="col-span-3 py-4 bg-blue-600 hover:bg-blue-500 rounded-t-2xl font-bold text-2xl flex items-center justify-center gap-2 shadow-xl hover:scale-[1.02] transition">
              <Trophy size={28} /> +1 Punto
            </button>
            <button onClick={() => registrarEvento('rojo', 'punto', -1)} className="col-span-3 py-2 bg-blue-900 hover:bg-blue-800 text-blue-200 rounded-b-2xl font-bold text-sm flex items-center justify-center shadow-xl transition mb-2">
              -1 Punto
            </button>
            
            <div className="col-span-1 flex flex-col gap-1">
              <button onClick={() => registrarEvento('rojo', 'salida')} className="py-3 bg-orange-600 hover:bg-orange-500 rounded-t-xl font-bold text-lg flex flex-col items-center gap-1">
                <Timer size={24} /> Salida ({rojo.salidas})
              </button>
              <button onClick={() => registrarEvento('rojo', 'salida', -1)} className="py-1.5 bg-orange-900 hover:bg-orange-800 text-orange-200 rounded-b-xl font-bold text-xs flex justify-center">
                -1 Salida
              </button>
            </div>
            
            <div className="col-span-2 flex flex-col gap-1">
              <button onClick={() => registrarEvento('rojo', 'falta')} className="py-3 bg-red-600 hover:bg-red-500 rounded-t-xl font-bold text-lg flex flex-col items-center gap-1">
                <AlertCircle size={24} /> Falta ({rojo.faltas})
              </button>
              <button onClick={() => registrarEvento('rojo', 'falta', -1)} className="py-1.5 bg-red-900 hover:bg-red-800 text-red-200 rounded-b-xl font-bold text-xs flex justify-center">
                -1 Falta
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* FOOTER ACTIONS */}
      <div className="mt-8 flex justify-center">
        <button onClick={aplicarHantei} className="px-12 py-4 bg-purple-600 hover:bg-purple-500 rounded-2xl font-black text-2xl tracking-wider shadow-lg flex items-center gap-3">
          <ShieldAlert size={32} /> APLICAR HANTEI
        </button>
      </div>
    </div>
  );
}
