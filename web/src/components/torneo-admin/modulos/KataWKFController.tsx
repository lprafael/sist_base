import React, { useState, useEffect } from 'react';
import { X, Save, Trophy, Users, AlertCircle, CheckCircle2, ShieldAlert, Flag, Award, AlertTriangle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function KataWKFController({
  match,
  onClose,
  onSaved
}: {
  match: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [modoEvaluacion, setModoEvaluacion] = useState<'banderas' | 'decimal'>('banderas');
  
  // Estado Modo Banderas (Enfrentamiento directo AKA vs AO)
  const [numJuecesBanderas, setNumJuecesBanderas] = useState<3 | 5 | 7>(5);
  const [votosJueces, setVotosJueces] = useState<string[]>(['aka', 'aka', 'aka', 'ao', 'ao']);
  
  // Estado Modo Decimal (Calificación técnica de 5.0 a 10.0)
  const [numJuecesDecimal, setNumJuecesDecimal] = useState<3 | 5>(5);
  const [notasDecimales, setNotasDecimales] = useState<number[]>([8.0, 8.0, 8.0, 8.0, 8.0]);
  const [descalificado, setDescalificado] = useState(false);
  const [motivoDescalificacion, setMotivoDescalificacion] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const nombreAka = match.jugador_local_nombre || match.local_nombre || 'AKA (Rojo)';
  const nombreAo = match.jugador_visitante_nombre || match.visitante_nombre || 'AO (Azul)';

  // Cargar estado inicial si ya existen datos
  useEffect(() => {
    if (match.estadisticas) {
      try {
        const stats = typeof match.estadisticas === 'string' ? JSON.parse(match.estadisticas) : match.estadisticas;
        if (stats.modalidad_kata === 'banderas' && Array.isArray(stats.votos_jueces)) {
          setModoEvaluacion('banderas');
          const len = [3, 5, 7].includes(stats.votos_jueces.length) ? (stats.votos_jueces.length as 3 | 5 | 7) : 5;
          setNumJuecesBanderas(len);
          setVotosJueces(stats.votos_jueces);
        } else if (stats.modalidad_kata === 'decimal' || (stats.jueces && Array.isArray(stats.jueces))) {
          setModoEvaluacion('decimal');
          const jArr = stats.notas_tecnicas || stats.jueces || [];
          if (jArr.length > 0) {
            const len = jArr.length >= 5 ? 5 : 3;
            setNumJuecesDecimal(len as 3 | 5);
            setNotasDecimales(jArr);
          }
          if (stats.descalificado) {
            setDescalificado(true);
            setMotivoDescalificacion(stats.motivo_descalificacion);
          }
        }
      } catch (e) {}
    }
  }, [match]);

  // Atajos de teclado para digitador único en Kata
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      const key = e.key.toLowerCase();
      // Presets rápidos para 5 jueces:
      if (key === '5' || e.code === 'Numpad5') {
        // 5-0 AKA
        setVotosJueces(['aka', 'aka', 'aka', 'aka', 'aka']);
      } else if (key === '0' || e.code === 'Numpad0') {
        // 0-5 AO
        setVotosJueces(['ao', 'ao', 'ao', 'ao', 'ao']);
      } else if (key === '4' || e.code === 'Numpad4') {
        // 4-1 AKA
        setVotosJueces(['aka', 'aka', 'aka', 'aka', 'ao']);
      } else if (key === '9' || e.code === 'Numpad9') {
        // 1-4 AO
        setVotosJueces(['aka', 'ao', 'ao', 'ao', 'ao']);
      } else if (key === '3' || e.code === 'Numpad3') {
        // 3-2 AKA
        setVotosJueces(['aka', 'aka', 'aka', 'ao', 'ao']);
      } else if (key === '8' || e.code === 'Numpad8') {
        // 2-3 AO
        setVotosJueces(['aka', 'aka', 'ao', 'ao', 'ao']);
      } else if (key === 'enter' && (e.ctrlKey || e.metaKey)) {
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [votosJueces, modoEvaluacion]);

  const handleNumJuecesBanderasChange = (num: 3 | 5 | 7) => {
    setNumJuecesBanderas(num);
    setVotosJueces(prev => {
      const arr = [...prev];
      while (arr.length < num) arr.push('aka');
      return arr.slice(0, num);
    });
  };

  const handleVotoJuez = (index: number, voto: 'aka' | 'ao') => {
    const copy = [...votosJueces];
    copy[index] = voto;
    setVotosJueces(copy);
  };

  const votosAka = votosJueces.filter(v => v === 'aka').length;
  const votosAo = votosJueces.filter(v => v === 'ao').length;
  const ganadorBanderas = votosAka > votosAo ? 'local' : 'visitante';
  const diferenciaBanderas = `${Math.max(votosAka, votosAo)}-${Math.min(votosAka, votosAo)}`;

  // Modo Decimal
  const handleNumJuecesDecimalChange = (num: 3 | 5) => {
    setNumJuecesDecimal(num);
    setNotasDecimales(prev => {
      if (num === 3) return prev.slice(0, 3);
      const ext = [...prev];
      while (ext.length < 5) ext.push(8.0);
      return ext.slice(0, 5);
    });
  };

  const handleNotaChange = (index: number, valStr: string) => {
    const val = parseFloat(valStr);
    const copy = [...notasDecimales];
    copy[index] = isNaN(val) ? 0 : Math.min(10, Math.max(0, val));
    setNotasDecimales(copy);
    setDescalificado(false);
    setMotivoDescalificacion(null);
  };

  const aplicarDescalificacionDirecta = (motivo: string) => {
    setDescalificado(true);
    setMotivoDescalificacion(motivo);
    setNotasDecimales(Array(numJuecesDecimal).fill(0.0));
  };

  const calcularDecimal = () => {
    if (descalificado) {
      return { total: 0.0, maxExcluded: 0, minExcluded: 0, validScores: [] };
    }
    const allFilled = notasDecimales.length === numJuecesDecimal && notasDecimales.every(n => n >= 5.0 && n <= 10.0);
    if (!allFilled) {
      return { total: 0.0, maxExcluded: 0, minExcluded: 0, validScores: [] };
    }

    if (numJuecesDecimal === 5) {
      const maxVal = Math.max(...notasDecimales);
      const minVal = Math.min(...notasDecimales);
      const filt = [...notasDecimales];
      filt.splice(filt.indexOf(maxVal), 1);
      filt.splice(filt.indexOf(minVal), 1);
      const sum = filt.reduce((a, b) => a + b, 0);
      return {
        total: Number(sum.toFixed(2)),
        maxExcluded: maxVal,
        minExcluded: minVal,
        validScores: filt
      };
    } else {
      const sum = notasDecimales.reduce((a, b) => a + b, 0);
      return {
        total: Number(sum.toFixed(2)),
        maxExcluded: 0,
        minExcluded: 0,
        validScores: notasDecimales
      };
    }
  };

  const { total, maxExcluded, minExcluded, validScores } = calcularDecimal();

  const handleSave = async () => {
    setSaving(true);
    try {
      const getToken = () => {
        try {
          const session = JSON.parse(localStorage.getItem('user_session') || '{}');
          return session.access_token || session.token || '';
        } catch {
          return '';
        }
      };

      let payload: any = {};
      let golesLocal = 0;
      let golesVisitante = 0;
      let ganadorId: string | null = null;

      if (modoEvaluacion === 'banderas') {
        golesLocal = votosAka;
        golesVisitante = votosAo;
        ganadorId = ganadorBanderas === 'local' ? match.equipo_local_id : match.equipo_visitante_id;
        payload = {
          tipo_reglamento: 'WKF',
          modalidad_kata: 'banderas',
          num_jueces: numJuecesBanderas,
          votos_jueces: votosJueces,
          votos_aka: votosAka,
          votos_ao: votosAo,
          diferencia: diferenciaBanderas,
          ganador_lado: ganadorBanderas,
          metodo_victoria: `Decisión Mayoritaria por Banderas (${diferenciaBanderas})`
        };
      } else {
        golesLocal = total;
        golesVisitante = 0;
        ganadorId = match.equipo_local_id;
        payload = {
          tipo_reglamento: 'WKF',
          modalidad_kata: 'decimal',
          num_jueces: numJuecesDecimal,
          notas_tecnicas: notasDecimales,
          jueces: notasDecimales,
          puntaje_final: total,
          puntaje_descartado_alto: maxExcluded,
          puntaje_descartado_bajo: minExcluded,
          descalificado,
          motivo_descalificacion: motivoDescalificacion,
          metodo_victoria: descalificado ? `Descalificación (0.0: ${motivoDescalificacion})` : `Puntaje Técnico (${total.toFixed(2)} pts)`
        };
      }

      const res = await fetch(`${API_URL}/cancha/torneos/partidos/${match.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({
          estadisticas: payload,
          goles_local: golesLocal,
          goles_visitante: golesVisitante,
          ganador_id: ganadorId,
          estado: 'finalizado'
        })
      });

      if (res.ok) {
        onSaved();
      } else {
        alert("Error al guardar la puntuación oficial de Kata WKF.");
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión al guardar.");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-slate-900 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col border-2 border-red-600">
        
        {/* Header */}
        <div className="bg-slate-950 p-4 flex justify-between items-center text-white border-b-2 border-red-600">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-black text-white text-xs shadow-md">
              WKF
            </div>
            <div>
              <h2 className="text-lg font-black uppercase flex items-center gap-2 tracking-wide text-white">
                <Trophy size={18} className="text-red-500" />
                Mesa de Jueces — Kata WKF (Karate)
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {modoEvaluacion === 'banderas' ? (
                  <>Enfrentamiento: <span className="text-red-400 font-bold">{nombreAka}</span> vs <span className="text-blue-400 font-bold">{nombreAo}</span></>
                ) : (
                  <>Atleta: <span className="text-amber-400 font-bold">{nombreAka}</span></>
                )}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto bg-slate-900/60 space-y-6">
          
          {/* Selector de Modo de Evaluación Kata WKF */}
          <div className="flex justify-between items-center bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 text-slate-300 font-bold text-xs">
              <Award size={16} className="text-red-500" />
              <span>Modalidad de Evaluación WKF:</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setModoEvaluacion('banderas')}
                className={`px-4 py-2 rounded-xl font-black text-xs transition flex items-center gap-2 ${
                  modoEvaluacion === 'banderas'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <Flag size={14} /> Votación por Banderas (AKA vs AO)
              </button>
              <button
                onClick={() => setModoEvaluacion('decimal')}
                className={`px-4 py-2 rounded-xl font-black text-xs transition flex items-center gap-2 ${
                  modoEvaluacion === 'decimal'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <Trophy size={14} /> Calificación Decimal (5.0 - 10.0)
              </button>
            </div>
          </div>

          {/* ============================================================ */}
          {/* MODO 1: VOTACIÓN POR BANDERAS (AKA vs AO)                    */}
          {/* ============================================================ */}
          {modoEvaluacion === 'banderas' && (
            <div className="space-y-5 animate-fadeIn">
              
              {/* Selector de cantidad de jueces */}
              <div className="flex justify-between items-center bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
                <span className="text-xs font-bold text-slate-400">Panel Arbitral:</span>
                <div className="flex gap-2">
                  {[3, 5, 7].map(num => (
                    <button
                      key={num}
                      onClick={() => handleNumJuecesBanderasChange(num as 3 | 5 | 7)}
                      className={`px-3 py-1.5 rounded-lg font-black text-xs transition ${
                        numJuecesBanderas === num
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {num} Jueces
                    </button>
                  ))}
                </div>
              </div>

              {/* Panel de Votos por Juez */}
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3">
                {Array.from({ length: numJuecesBanderas }).map((_, idx) => {
                  const voto = votosJueces[idx] || 'aka';
                  const isAka = voto === 'aka';

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-2.5 transition shadow-sm ${
                        isAka ? 'bg-red-950/40 border-red-600' : 'bg-blue-950/40 border-blue-600'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Juez {idx + 1}
                      </span>
                      
                      <div className="flex flex-col gap-1.5 w-full">
                        <button
                          onClick={() => handleVotoJuez(idx, 'aka')}
                          className={`py-2 rounded-xl font-black text-xs transition flex items-center justify-center gap-1 ${
                            isAka ? 'bg-red-600 text-white shadow-md' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                          }`}
                        >
                          <Flag size={12} /> AKA
                        </button>
                        <button
                          onClick={() => handleVotoJuez(idx, 'ao')}
                          className={`py-2 rounded-xl font-black text-xs transition flex items-center justify-center gap-1 ${
                            !isAka ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                          }`}
                        >
                          <Flag size={12} /> AO
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Resultado de Mayoría de Banderas */}
              <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Banderas AKA</span>
                    <div className="text-4xl font-black text-red-500 font-mono">{votosAka}</div>
                  </div>
                  <span className="text-xl font-black text-slate-600 font-sans">VS</span>
                  <div className="text-center">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Banderas AO</span>
                    <div className="text-4xl font-black text-blue-500 font-mono">{votosAo}</div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Dictamen Mayoritario WKF
                  </span>
                  <div className={`text-xl font-black uppercase flex items-center gap-2 ${
                    ganadorBanderas === 'local' ? 'text-red-500' : 'text-blue-500'
                  }`}>
                    <Trophy size={20} />
                    Gana {ganadorBanderas === 'local' ? `AKA (${nombreAka})` : `AO (${nombreAo})`} por {diferenciaBanderas}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ============================================================ */}
          {/* MODO 2: EVALUACIÓN TÉCNICA DECIMAL (5.0 a 10.0)             */}
          {/* ============================================================ */}
          {modoEvaluacion === 'decimal' && (
            <div className="space-y-5 animate-fadeIn">
              
              <div className="flex justify-between items-center bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
                <span className="text-xs font-bold text-slate-400">Escala Oficial WKF: 5.0 a 10.0 (o 0.0 Descalificación)</span>
                <div className="flex gap-2">
                  {[3, 5].map(num => (
                    <button
                      key={num}
                      onClick={() => handleNumJuecesDecimalChange(num as 3 | 5)}
                      className={`px-3 py-1.5 rounded-lg font-black text-xs transition ${
                        numJuecesDecimal === num
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {num} Jueces
                    </button>
                  ))}
                </div>
              </div>

              {/* Botones de Descalificación Directa (Art. 2.3 WKF) */}
              <div className="bg-red-950/30 border border-red-900/40 p-3.5 rounded-2xl">
                <div className="text-[11px] font-black text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ShieldAlert size={14} /> Descalificación Inmediata (Score 0.0):
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => aplicarDescalificacionDirecta('Omitir saludo oficial (Rei) al iniciar o finalizar')}
                    className="px-3 py-1.5 bg-red-900/40 hover:bg-red-900/70 text-red-200 rounded-xl text-xs font-bold border border-red-700/50"
                  >
                    Omitir Rei (Saludo)
                  </button>
                  <button
                    onClick={() => aplicarDescalificacionDirecta('No anunciar el kata, anuncio erróneo o ejecución distinta')}
                    className="px-3 py-1.5 bg-red-900/40 hover:bg-red-900/70 text-red-200 rounded-xl text-xs font-bold border border-red-700/50"
                  >
                    Anuncio Erróneo de Kata
                  </button>
                  <button
                    onClick={() => aplicarDescalificacionDirecta('No iniciar el kata de frente al panel de jueces')}
                    className="px-3 py-1.5 bg-red-900/40 hover:bg-red-900/70 text-red-200 rounded-xl text-xs font-bold border border-red-700/50"
                  >
                    No Iniciar de Frente
                  </button>
                </div>
              </div>

              {/* Inputs de Notas de Jueces */}
              <div className={`grid ${numJuecesDecimal === 3 ? 'grid-cols-3' : 'grid-cols-5'} gap-3`}>
                {Array.from({ length: numJuecesDecimal }).map((_, idx) => {
                  const val = notasDecimales[idx] ?? 8.0;
                  const isHigh = numJuecesDecimal === 5 && !descalificado && val === maxExcluded;
                  const isLow = numJuecesDecimal === 5 && !descalificado && val === minExcluded;
                  const isDiscarded = isHigh || isLow;

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border-2 flex flex-col items-center transition shadow-sm ${
                        descalificado
                          ? 'bg-red-950/60 border-red-700'
                          : isDiscarded
                          ? 'bg-red-950/30 border-red-800/60'
                          : 'bg-slate-950/80 border-slate-800'
                      }`}
                    >
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Juez {idx + 1}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="5.0"
                        max="10.0"
                        value={val}
                        onChange={e => handleNotaChange(idx, e.target.value)}
                        className={`w-full text-center text-3xl font-black rounded-xl p-2 focus:outline-none transition font-mono ${
                          descalificado
                            ? 'bg-red-900/30 text-red-400 border border-red-700'
                            : isDiscarded
                            ? 'bg-red-900/20 text-red-400 line-through border border-red-800'
                            : 'bg-slate-900 text-white border border-slate-700 focus:border-red-500'
                        }`}
                      />
                      {isDiscarded && !descalificado && (
                        <span className="text-[9px] font-bold text-red-400 mt-1.5 px-2 py-0.5 bg-red-950 rounded-full uppercase">
                          {isHigh ? 'Máx Descartado' : 'Mín Descartado'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Resumen Decimal */}
              <div className="bg-slate-950 text-white p-5 rounded-3xl flex items-center justify-between border border-slate-800">
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px] block mb-1">
                    Puntaje Técnico Total WKF
                  </span>
                  <div className="text-5xl font-black text-amber-400 font-mono drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                    {descalificado ? '0.00 (HANSOKU)' : total.toFixed(2)}
                  </div>
                  {descalificado && (
                    <span className="text-xs text-red-400 font-bold mt-1 block">
                      Motivo: {motivoDescalificacion}
                    </span>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl text-slate-400 font-bold hover:bg-slate-800 transition text-xs"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black transition flex items-center gap-2 shadow-lg shadow-red-600/30 text-xs uppercase tracking-wider"
          >
            {saving ? 'Guardando...' : <><Save size={16} /> Guardar Calificación Oficial (WKF)</>}
          </button>
        </div>

      </div>
    </div>
  );
}
