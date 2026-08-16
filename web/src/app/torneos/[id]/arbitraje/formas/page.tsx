"use client";
import React, { useState } from 'react';
import { ArrowLeft, User, Trophy, ShieldAlert, Flag, Award, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ArbitrajeFormas({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [reglamento, setReglamento] = useState<'WKF' | 'ASAM'>('WKF');
  
  // Estado Modo Banderas WKF (AKA vs AO)
  const [numJuecesBanderas, setNumJuecesBanderas] = useState<3 | 5 | 7>(5);
  const [votosJueces, setVotosJueces] = useState<string[]>(['aka', 'aka', 'aka', 'ao', 'ao']);
  
  // Estado Modo Decimal (WKF 5.0 a 10.0 / ASAM 0.0 a 10.0)
  const [juecesDecimal, setJuecesDecimal] = useState<string[]>(['8.0', '8.0', '8.0', '8.0', '8.0']);
  const [descalificadoWKF, setDescalificadoWKF] = useState(false);
  const [motivoDesc, setMotivoDesc] = useState<string | null>(null);

  const [resultadoDecimal, setResultadoDecimal] = useState<{ final: number; max: number; min: number } | null>(null);
  const [mensaje, setMensaje] = useState("");

  const competidorAka = "Juan Pérez (AKA - Rojo)";
  const competidorAo = "Carlos Gómez (AO - Azul)";

  const handleVotoJuez = (idx: number, voto: 'aka' | 'ao') => {
    const copy = [...votosJueces];
    copy[idx] = voto;
    setVotosJueces(copy);
  };

  const handleScoreChange = (index: number, value: string) => {
    const newJueces = [...juecesDecimal];
    newJueces[index] = value;
    setJuecesDecimal(newJueces);
    setDescalificadoWKF(false);
    setMotivoDesc(null);
  };

  const aplicarDescalificacionWKF = (motivo: string) => {
    setDescalificadoWKF(true);
    setMotivoDesc(motivo);
    setJuecesDecimal(['0.0', '0.0', '0.0', '0.0', '0.0']);
    setResultadoDecimal({ final: 0.0, max: 0.0, min: 0.0 });
    setMensaje(`🛑 Descalificación Oficial WKF (0.0): ${motivo}`);
  };

  const calcularPuntajeDecimal = async () => {
    if (descalificadoWKF) {
      setResultadoDecimal({ final: 0.0, max: 0.0, min: 0.0 });
      setMensaje("Puntaje guardado: 0.0 (Descalificado)");
      return;
    }

    const puntajes = juecesDecimal.map(j => parseFloat(j)).filter(j => !isNaN(j));
    if (puntajes.length !== 3 && puntajes.length !== 5) {
      setMensaje("Debes ingresar 3 o 5 puntajes válidos.");
      return;
    }

    const minScore = reglamento === 'WKF' ? 5.0 : 0.0;
    if (puntajes.some(p => p < minScore || p > 10.0)) {
      setMensaje(`En reglamento ${reglamento}, las calificaciones deben estar entre ${minScore.toFixed(1)} y 10.0`);
      return;
    }

    if (puntajes.length === 5) {
      const maxVal = Math.max(...puntajes);
      const minVal = Math.min(...puntajes);
      const filt = [...puntajes];
      filt.splice(filt.indexOf(maxVal), 1);
      filt.splice(filt.indexOf(minVal), 1);
      const total = Number(filt.reduce((a, b) => a + b, 0).toFixed(2));
      setResultadoDecimal({ final: total, max: maxVal, min: minVal });
    } else {
      const total = Number(puntajes.reduce((a, b) => a + b, 0).toFixed(2));
      setResultadoDecimal({ final: total, max: 0, min: 0 });
    }
    setMensaje("✅ Calificación técnica procesada exitosamente.");
  };

  const votosAka = votosJueces.filter(v => v === 'aka').length;
  const votosAo = votosJueces.filter(v => v === 'ao').length;
  const ganadorBanderas = votosAka > votosAo ? 'AKA (Rojo)' : 'AO (Azul)';

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 font-sans">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center">
          <button onClick={() => router.back()} className="p-3 hover:bg-slate-800 rounded-xl transition mr-4">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              <Trophy className="text-red-500" size={24} />
              Mesa de Jueces — {reglamento === 'WKF' ? 'Kata Oficial (WKF Karate)' : 'Formas (ASAM MMA)'}
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Sistema de Evaluación Oficial y Decisión Arbitral
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { setReglamento('WKF'); setResultadoDecimal(null); setMensaje(''); }}
            className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition ${
              reglamento === 'WKF' ? 'bg-red-600 text-white shadow-md' : 'bg-slate-800 text-slate-400'
            }`}
          >
            Reglamento WKF (Karate)
          </button>
          <button
            onClick={() => { setReglamento('ASAM'); setResultadoDecimal(null); setMensaje(''); }}
            className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition ${
              reglamento === 'ASAM' ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-800 text-slate-400'
            }`}
          >
            Reglamento ASAM (MMA)
          </button>
        </div>
      </div>

      {mensaje && (
        <div className="bg-red-600 text-white p-3 rounded-2xl text-center font-black mb-6 text-sm shadow-lg animate-pulse flex items-center justify-center gap-2">
          <AlertTriangle size={18} />
          <span>{mensaje}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* EVALUACIÓN KATA WKF POR BANDERAS                             */}
      {/* ============================================================ */}
      {reglamento === 'WKF' && (
        <div className="space-y-6">
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-6">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-black uppercase text-white flex items-center gap-2">
                  <Flag size={18} className="text-red-500" />
                  Votación por Banderas (Enfrentamiento Directo)
                </h2>
                <p className="text-xs text-slate-400">Panel impar con determinación de ganador por Mayoría Absoluta</p>
              </div>

              <div className="flex gap-2">
                {[3, 5, 7].map(num => (
                  <button
                    key={num}
                    onClick={() => {
                      setNumJuecesBanderas(num as 3 | 5 | 7);
                      setVotosJueces(Array(num).fill('aka'));
                    }}
                    className={`px-3 py-1.5 rounded-lg font-black text-xs transition ${
                      numJuecesBanderas === num ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {num} Jueces
                  </button>
                ))}
              </div>
            </div>

            {/* Atletas AKA vs AO */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-red-950/40 border-2 border-red-600 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-red-400 uppercase tracking-widest block">AKA (ROJO)</span>
                  <span className="text-lg font-black text-white">{competidorAka}</span>
                </div>
                <div className="text-3xl font-black text-red-500 font-mono">{votosAka} votos</div>
              </div>

              <div className="bg-blue-950/40 border-2 border-blue-600 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">AO (AZUL)</span>
                  <span className="text-lg font-black text-white">{competidorAo}</span>
                </div>
                <div className="text-3xl font-black text-blue-500 font-mono">{votosAo} votos</div>
              </div>
            </div>

            {/* Panel de Votos de Jueces */}
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3">
              {Array.from({ length: numJuecesBanderas }).map((_, idx) => {
                const isAka = votosJueces[idx] === 'aka';
                return (
                  <div key={idx} className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-2 ${isAka ? 'bg-red-950/30 border-red-600' : 'bg-blue-950/30 border-blue-600'}`}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Juez {idx + 1}</span>
                    <button
                      onClick={() => handleVotoJuez(idx, 'aka')}
                      className={`w-full py-1.5 rounded-lg font-black text-xs transition ${isAka ? 'bg-red-600 text-white shadow' : 'bg-slate-800 text-slate-400'}`}
                    >
                      AKA
                    </button>
                    <button
                      onClick={() => handleVotoJuez(idx, 'ao')}
                      className={`w-full py-1.5 rounded-lg font-black text-xs transition ${!isAka ? 'bg-blue-600 text-white shadow' : 'bg-slate-800 text-slate-400'}`}
                    >
                      AO
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">Dictamen Oficial WKF:</span>
              <div className="text-xl font-black text-amber-400 uppercase flex items-center gap-2">
                <Award size={20} />
                Gana {ganadorBanderas} ({Math.max(votosAka, votosAo)} - {Math.min(votosAka, votosAo)})
              </div>
            </div>

          </div>

          {/* EVALUACIÓN TÉCNICA DECIMAL WKF */}
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-black uppercase text-white flex items-center gap-2">
                  <Trophy size={18} className="text-amber-400" />
                  Calificación Técnica Decimal (Escala 5.0 a 10.0)
                </h2>
                <p className="text-xs text-slate-400">Evaluación individual de Kata con descarte de extremos y penalizaciones directas</p>
              </div>
            </div>

            {/* Botones de Descalificación Directa 0.0 */}
            <div className="bg-red-950/30 border border-red-900/40 p-3.5 rounded-2xl">
              <div className="text-[11px] font-black text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldAlert size={14} /> Descalificación Inmediata WKF (Score 0.0):
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => aplicarDescalificacionWKF('Omitir saludo oficial (Rei) al iniciar o finalizar')}
                  className="px-3 py-1.5 bg-red-900/40 hover:bg-red-900/70 text-red-200 rounded-xl text-xs font-bold border border-red-700/50"
                >
                  Omitir Rei (Saludo)
                </button>
                <button
                  onClick={() => aplicarDescalificacionWKF('No anunciar el kata, anuncio erróneo o ejecución distinta')}
                  className="px-3 py-1.5 bg-red-900/40 hover:bg-red-900/70 text-red-200 rounded-xl text-xs font-bold border border-red-700/50"
                >
                  Anuncio Erróneo de Kata
                </button>
                <button
                  onClick={() => aplicarDescalificacionWKF('No iniciar el kata de frente al panel de jueces')}
                  className="px-3 py-1.5 bg-red-900/40 hover:bg-red-900/70 text-red-200 rounded-xl text-xs font-bold border border-red-700/50"
                >
                  No Iniciar de Frente
                </button>
              </div>
            </div>

            {/* Inputs de Jueces */}
            <div className="grid grid-cols-5 gap-4">
              {juecesDecimal.map((val, idx) => {
                const num = parseFloat(val);
                const isDescartado = resultadoDecimal && !isNaN(num) && (num === resultadoDecimal.max || num === resultadoDecimal.min);
                return (
                  <div key={idx} className="flex flex-col items-center">
                    <label className="text-slate-400 font-bold mb-1 text-xs uppercase">Juez {idx + 1}</label>
                    <input
                      type="number"
                      step="0.1"
                      min="5.0"
                      max="10.0"
                      value={val}
                      onChange={(e) => handleScoreChange(idx, e.target.value)}
                      className={`w-full text-center text-3xl font-black p-3 rounded-2xl bg-slate-950 border-2 outline-none transition font-mono ${
                        isDescartado ? 'border-red-500 text-red-400 line-through' : 'border-slate-800 text-white focus:border-red-500'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={calcularPuntajeDecimal}
                className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition"
              >
                Calcular Puntaje Técnico
              </button>

              {resultadoDecimal && (
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Oficial WKF</span>
                  <div className="text-4xl font-black text-amber-400 font-mono">{resultadoDecimal.final.toFixed(2)} pts</div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* EVALUACIÓN FORMAS ASAM                                       */}
      {/* ============================================================ */}
      {reglamento === 'ASAM' && (
        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-amber-600 rounded-2xl flex items-center justify-center font-black text-xl">
              <User size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">{competidorAka}</h2>
              <p className="text-amber-400 font-bold uppercase tracking-widest text-xs">Evaluación Decimal Oficial ASAM</p>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4">
            {juecesDecimal.map((val, idx) => {
              const num = parseFloat(val);
              const isDescartado = resultadoDecimal && !isNaN(num) && (num === resultadoDecimal.max || num === resultadoDecimal.min);
              return (
                <div key={idx} className="flex flex-col items-center">
                  <label className="text-slate-400 font-bold mb-1 text-xs uppercase">Juez {idx + 1}</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.0"
                    max="10.0"
                    value={val}
                    onChange={(e) => handleScoreChange(idx, e.target.value)}
                    className={`w-full text-center text-3xl font-black p-3 rounded-2xl bg-slate-950 border-2 outline-none transition font-mono ${
                      isDescartado ? 'border-red-500 text-red-400 line-through' : 'border-slate-800 text-white focus:border-amber-500'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-800">
            <button
              onClick={calcularPuntajeDecimal}
              className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition"
            >
              Calcular Puntaje Oficial ASAM
            </button>

            {resultadoDecimal && (
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Final</span>
                <div className="text-4xl font-black text-amber-400 font-mono">{resultadoDecimal.final.toFixed(2)} pts</div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
