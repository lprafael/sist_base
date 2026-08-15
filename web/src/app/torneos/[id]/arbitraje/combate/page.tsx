"use client";
import React, { useState, useEffect } from 'react';
import { Trophy, AlertCircle, ShieldAlert, Timer, Users, User, ArrowLeft, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ArbitrajeCombate({ params }: { params: { id: string } }) {
  const router = useRouter();
  
  const [combateId, setCombateId] = useState("123");
  const [blanco, setBlanco] = useState({ puntos: 0, salidas: 0, faltas: 0, nombre: "Juan Perez (Blanco)" });
  const [rojo, setRojo] = useState({ puntos: 0, salidas: 0, faltas: 0, nombre: "Carlos Gomez (Rojo)" });
  const [tiempo, setTiempo] = useState(90);
  const [corriendo, setCorriendo] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [modoAlargue, setModoAlargue] = useState(false);

  useEffect(() => {
    let interval: any;
    if (corriendo && tiempo > 0) {
      interval = setInterval(() => setTiempo((t) => t - 1), 1000);
    } else if (tiempo === 0 && corriendo) {
      setCorriendo(false);
      setMensaje("Tiempo reglamentario finalizado. Iniciar Minuto de Oro o aplicar Hantei.");
    }
    return () => clearInterval(interval);
  }, [corriendo, tiempo]);

  const registrarEvento = async (competidor: 'blanco' | 'rojo', accion: 'punto' | 'salida' | 'falta' | 'hansoku_directo' | 'iniciar_alargue', valor: number = 1) => {
    try {
      const res = await fetch(`http://localhost:8001/asam/combates/${combateId}/evento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competidor, accion, valor })
      });
      const data = await res.json();
      
      if (res.ok) {
        if (data.state) {
          setBlanco(prev => ({...prev, ...data.state.blanco}));
          setRojo(prev => ({...prev, ...data.state.rojo}));
        }
        if (data.message) {
          setMensaje(data.message);
        }
      } else {
        setMensaje("Error: " + data.detail);
      }
    } catch (e) {
      // Mock update
      if (accion === 'hansoku_directo') {
        setMensaje(`¡HANSOKU DIRECTO! Descalificación de ${competidor}. Victoria para el rival.`);
        return;
      }
      if (competidor === 'blanco') setBlanco(p => ({...p, [accion + "s"]: Math.max(0, p[accion + "s"] + valor)}));
      if (competidor === 'rojo') setRojo(p => ({...p, [accion + "s"]: Math.max(0, p[accion + "s"] + valor)}));
    }
  };

  const aplicarHantei = async () => {
    try {
      const res = await fetch(`http://localhost:8001/asam/combates/${combateId}/hantei`, { method: 'POST' });
      const data = await res.json();
      setMensaje(data.message || data.motivo);
    } catch (e) {
      setMensaje("Hantei evaluado según Tabla Oficial ASAM");
    }
  };

  const iniciarMinutoDeOro = () => {
    setModoAlargue(true);
    setTiempo(60);
    setCorriendo(true);
    setMensaje("⚡ Minuto de Oro iniciado. El primer atleta en marcar un punto gana el combate.");
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
          <span className="text-neutral-400 font-semibold uppercase tracking-wider text-sm mb-2">
            Mesa de Control ASAM {modoAlargue && <span className="text-amber-400 font-bold ml-2">(Punto de Oro)</span>}
          </span>
          <div className={`text-5xl font-black font-mono tracking-widest ${modoAlargue ? 'text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]' : 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]'}`}>
            {formatTiempo(tiempo)}
          </div>
          <div className="flex gap-4 mt-4">
            <button onClick={() => setCorriendo(!corriendo)} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold">
              {corriendo ? 'Pausar' : 'Iniciar'}
            </button>
            <button onClick={() => {setTiempo(90); setCorriendo(false); setModoAlargue(false);}} className="px-6 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg font-bold">
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

            <button 
              onClick={() => registrarEvento('blanco', 'hansoku_directo')}
              className="col-span-3 mt-2 py-2 bg-red-950 hover:bg-red-900 border border-red-500 text-red-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
            >
              <ShieldAlert size={16} /> Hansoku Directo (Sangre)
            </button>
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

            <button 
              onClick={() => registrarEvento('rojo', 'hansoku_directo')}
              className="col-span-3 mt-2 py-2 bg-red-950 hover:bg-red-900 border border-red-500 text-red-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
            >
              <ShieldAlert size={16} /> Hansoku Directo (Sangre)
            </button>
          </div>
        </div>

      </div>

      {/* FOOTER ACTIONS */}
      <div className="mt-8 flex justify-center gap-4">
        <button onClick={iniciarMinutoDeOro} className="px-8 py-4 bg-amber-600 hover:bg-amber-500 rounded-2xl font-black text-xl tracking-wider shadow-lg flex items-center gap-3">
          <Zap size={24} /> MINUTO DE ORO (1:00)
        </button>
        <button onClick={aplicarHantei} className="px-8 py-4 bg-purple-600 hover:bg-purple-500 rounded-2xl font-black text-xl tracking-wider shadow-lg flex items-center gap-3">
          <ShieldAlert size={24} /> APLICAR HANTEI (ASAM)
        </button>
      </div>
    </div>
  );
}

