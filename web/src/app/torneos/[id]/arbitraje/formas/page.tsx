"use client";
import React, { useState } from 'react';
import { ArrowLeft, User, Trophy, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ArbitrajeFormas({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [jueces, setJueces] = useState<string[]>(['', '', '', '', '']);
  const [resultado, setResultado] = useState<{final: number, max: number, min: number} | null>(null);
  const [mensaje, setMensaje] = useState("");
  
  const competidor = "Maria Gonzalez (Rojo - Cinturón Negro)";

  const handleScoreChange = (index: number, value: string) => {
    const newJueces = [...jueces];
    newJueces[index] = value;
    setJueces(newJueces);
  };

  const calcularPuntaje = async () => {
    const puntajes = jueces.map(j => parseFloat(j)).filter(j => !isNaN(j));
    if (puntajes.length !== 3 && puntajes.length !== 5) {
      setMensaje("Debes ingresar 3 o 5 puntajes válidos.");
      return;
    }

    setMensaje("");
    try {
      const res = await fetch(`http://localhost:8001/asam/formas/123/calcular`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jueces: puntajes })
      });
      const data = await res.json();
      if (res.ok) {
        setResultado({ final: data.puntaje_final, max: data.max, min: data.min });
        setMensaje("Puntaje guardado exitosamente");
      } else {
        setMensaje(data.detail);
      }
    } catch (e) {
      // Mock logic for demo
      const maxVal = Math.max(...puntajes);
      const minVal = Math.min(...puntajes);
      const filt = [...puntajes];
      filt.splice(filt.indexOf(maxVal), 1);
      filt.splice(filt.indexOf(minVal), 1);
      const total = filt.reduce((a,b) => a+b, 0);
      setResultado({ final: total, max: maxVal, min: minVal });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-6 font-sans">
      <div className="flex items-center mb-8 bg-neutral-800 p-4 rounded-2xl border border-neutral-700">
        <button onClick={() => router.back()} className="p-3 hover:bg-neutral-700 rounded-xl transition mr-4">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Mesa de Jueces - Formas ASAM</h1>
          <p className="text-neutral-400">Modalidad: Fórmulas Tradicionales</p>
        </div>
      </div>

      {mensaje && (
        <div className={`p-4 rounded-xl text-center font-bold mb-6 text-xl ${resultado ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' : 'bg-red-500/20 text-red-300 border-red-500/50'}`}>
          {mensaje}
        </div>
      )}

      <div className="bg-neutral-800 p-8 rounded-3xl border border-neutral-700">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center">
            <User size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black">{competidor}</h2>
            <p className="text-red-400 font-bold uppercase tracking-widest text-sm">Esperando Calificación</p>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-6 mb-12">
          {jueces.map((val, idx) => {
            const num = parseFloat(val);
            const isDescartado = resultado && !isNaN(num) && (num === resultado.max || num === resultado.min);
            
            return (
              <div key={idx} className="flex flex-col items-center">
                <label className="text-neutral-400 font-bold mb-2">Juez {idx + 1}</label>
                <input 
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={val}
                  onChange={(e) => handleScoreChange(idx, e.target.value)}
                  className={`w-full text-center text-4xl font-black p-4 rounded-xl bg-neutral-900 border-2 outline-none transition ${isDescartado ? 'border-red-500 text-neutral-500 line-through opacity-75' : 'border-neutral-600 focus:border-blue-500 text-white'}`}
                  placeholder="0.0"
                />
                {isDescartado && (
                  <span className="text-red-500 font-bold mt-2 text-sm uppercase">Descartado</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center bg-neutral-900 p-8 rounded-2xl border-2 border-neutral-700">
          <div>
            <h3 className="text-neutral-400 font-bold uppercase tracking-wider mb-2">Puntaje Final</h3>
            <div className="text-7xl font-black text-emerald-400 font-mono">
              {resultado ? resultado.final.toFixed(1) : "0.0"}
            </div>
          </div>

          <button onClick={calcularPuntaje} className="px-12 py-6 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-2xl shadow-xl flex items-center gap-3 transition hover:scale-105">
            <Trophy size={32} /> CALCULAR Y GUARDAR
          </button>
        </div>
      </div>
    </div>
  );
}
