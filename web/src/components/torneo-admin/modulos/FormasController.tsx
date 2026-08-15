import React, { useState, useEffect } from 'react';
import { X, Save, Trophy, Users, AlertCircle, CheckCircle2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function FormasController({ match, onClose, onSaved }: { match: any, onClose: () => void, onSaved: () => void }) {
  const [numJueces, setNumJueces] = useState<3 | 5>(3);
  const [jueces, setJueces] = useState<number[]>([0, 0, 0]);
  const [saving, setSaving] = useState(false);

  // Cargar estadísticas previas si existen
  useEffect(() => {
    if (match.estadisticas) {
      try {
        const stats = typeof match.estadisticas === 'string' ? JSON.parse(match.estadisticas) : match.estadisticas;
        if (stats.jueces && Array.isArray(stats.jueces)) {
          const len = stats.jueces.length === 5 ? 5 : 3;
          setNumJueces(len);
          setJueces(stats.jueces);
        }
      } catch(e) {}
    }
  }, [match]);

  const handleNumJuecesChange = (num: 3 | 5) => {
    setNumJueces(num);
    setJueces(prev => {
      if (num === 3) return prev.slice(0, 3);
      const ext = [...prev];
      while (ext.length < 5) ext.push(0);
      return ext.slice(0, 5);
    });
  };

  const handleScoreChange = (index: number, value: string) => {
    const newJueces = [...jueces];
    const val = parseFloat(value);
    newJueces[index] = isNaN(val) ? 0 : Math.min(10, Math.max(0, val));
    setJueces(newJueces);
  };

  // Cálculo de notas con descarte estricto ASAM
  const calcularPuntaje = () => {
    const allFilled = jueces.length === numJueces && jueces.every(j => j > 0);
    if (!allFilled) {
      return { 
        total: 0, 
        highIndex: -1, 
        lowIndex: -1, 
        minValid: 0, 
        maxValid: 0, 
        minExcluded: 0, 
        maxExcluded: 0,
        validScores: []
      };
    }

    let maxVal = -1;
    let minVal = 999;
    let highIdx = -1;
    let lowIdx = -1;

    // 1. Encontrar nota más alta
    jueces.forEach((score, idx) => {
      if (score > maxVal) {
        maxVal = score;
        highIdx = idx;
      }
    });

    // 2. Encontrar nota más baja (distinta posición)
    jueces.forEach((score, idx) => {
      if (score < minVal) {
        minVal = score;
        lowIdx = idx;
      }
    });

    // Si todas las notas son iguales, descartar el primer y último índice
    if (highIdx === lowIdx) {
      highIdx = 0;
      lowIdx = jueces.length - 1;
    }

    const validScores: number[] = [];
    jueces.forEach((score, idx) => {
      if (idx !== highIdx && idx !== lowIdx) {
        validScores.push(score);
      }
    });

    const total = validScores.reduce((a, b) => a + b, 0);
    const minValid = validScores.length > 0 ? Math.min(...validScores) : 0;
    const maxValid = validScores.length > 0 ? Math.max(...validScores) : 0;

    return {
      total: Number(total.toFixed(2)),
      highIndex: highIdx,
      lowIndex: lowIdx,
      minValid,
      maxValid,
      minExcluded: minVal,
      maxExcluded: maxVal,
      validScores
    };
  };

  const { total, highIndex, lowIndex, minValid, maxValid, minExcluded, maxExcluded, validScores } = calcularPuntaje();
  const allComplete = jueces.length === numJueces && jueces.every(j => j > 0);

  const handleSave = async () => {
    if (!allComplete) {
      alert(`Por favor ingrese las notas válidas de los ${numJueces} jueces (0.0 a 10.0).`);
      return;
    }

    setSaving(true);
    try {
      const getToken = () => {
        const session = JSON.parse(localStorage.getItem('user_session') || '{}');
        return session.access_token || session.token || '';
      };
      
      const payload = {
        jueces: jueces,
        num_jueces: numJueces,
        puntaje_final: total,
        puntaje_descartado_alto: maxExcluded,
        puntaje_descartado_bajo: minExcluded,
        filtro1_min_no_descartado: minValid,
        filtro2_max_no_descartado: maxValid,
        filtro3_min_descartado: minExcluded,
        filtro4_max_descartado: maxExcluded
      };

      const res = await fetch(`${API_URL}/cancha/torneos/partidos/${match.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({
          estadisticas: payload,
          goles_local: total, // Puntaje final con precisión
          estado: 'finalizado'
        })
      });

      if (res.ok) {
        onSaved();
      } else {
        alert("Error al guardar la puntuación de formas.");
      }
    } catch(e) {
      console.error(e);
      alert("Error de conexión al guardar.");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-900 p-5 flex justify-between items-center text-white border-b-4 border-amber-500">
          <div>
            <h2 className="text-xl font-black uppercase flex items-center gap-2 tracking-wide">
              <Trophy size={22} className="text-amber-400" />
              Mesa de Jueces - Formas (ASAM)
            </h2>
            <p className="text-sm text-slate-300 font-medium mt-0.5">
              Atleta: <span className="text-amber-300 font-bold">{match.jugador_local_nombre || match.local_nombre || 'Competidor'}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto bg-slate-50 space-y-6">
          
          {/* Selector de cantidad de jueces */}
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
              <Users size={18} className="text-blue-600" />
              <span>Panel de Jueces:</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleNumJuecesChange(3)}
                className={`px-4 py-2 rounded-xl font-black text-xs transition ${numJueces === 3 ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                3 JUECES (Suma 1 nota)
              </button>
              <button 
                onClick={() => handleNumJuecesChange(5)}
                className={`px-4 py-2 rounded-xl font-black text-xs transition ${numJueces === 5 ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                5 JUECES (Suma 3 notas)
              </button>
            </div>
          </div>

          {/* Banner explicativo del reglamento */}
          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl text-xs flex gap-3 items-center">
            <AlertCircle size={24} className="text-amber-600 shrink-0" />
            <p>
              <strong>Reglamento Oficial ASAM (Art. 1.B):</strong> Se descarta la calificación más alta y la más baja. Las notas restantes se suman para obtener el total acumulado y se guardan los 4 filtros de desempate en cascada.
            </p>
          </div>

          {/* Inputs de jueces */}
          <div className={`grid ${numJueces === 3 ? 'grid-cols-3' : 'grid-cols-5'} gap-4`}>
            {Array.from({ length: numJueces }).map((_, idx) => {
              const val = jueces[idx] ?? 0;
              const isHigh = allComplete && highIndex === idx;
              const isLow = allComplete && lowIndex === idx;
              const isDiscarded = isHigh || isLow;

              return (
                <div 
                  key={idx} 
                  className={`flex flex-col items-center p-3 rounded-2xl border-2 transition shadow-sm ${
                    isDiscarded 
                      ? 'bg-red-50/70 border-red-300' 
                      : val > 0 && allComplete 
                        ? 'bg-emerald-50/50 border-emerald-300' 
                        : 'bg-white border-slate-200'
                  }`}
                >
                  <label className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">
                    Juez {idx + 1}
                  </label>
                  <input 
                    type="number" 
                    step="0.1" 
                    min="0" 
                    max="10"
                    value={val === 0 ? '' : val} 
                    onChange={e => handleScoreChange(idx, e.target.value)}
                    className={`w-full text-center text-3xl font-black rounded-xl border-2 p-2.5 focus:outline-none transition ${
                      isDiscarded 
                        ? 'bg-red-100/50 text-red-500 border-red-300 line-through' 
                        : 'bg-slate-50 text-slate-800 border-slate-200 focus:border-blue-500'
                    }`}
                    placeholder="0.0"
                  />
                  {isDiscarded && (
                    <span className="text-[10px] font-black text-red-600 mt-2 px-2 py-0.5 bg-red-100 rounded-full uppercase tracking-tighter">
                      {isHigh ? 'Máx Descartado' : 'Mín Descartado'}
                    </span>
                  )}
                  {!isDiscarded && allComplete && val > 0 && (
                    <span className="text-[10px] font-bold text-emerald-600 mt-2 px-2 py-0.5 bg-emerald-100 rounded-full uppercase tracking-tighter">
                      Válido (+{val.toFixed(1)})
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Puntaje Final y Resumen */}
          <div className="bg-slate-900 text-white p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col items-center md:items-start z-10">
              <span className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-1">
                Puntaje Final Acumulado (ASAM)
              </span>
              <div className="text-6xl font-black text-amber-400 font-mono drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                {total.toFixed(2)}
              </div>
              {allComplete && (
                <span className="text-xs text-slate-300 font-medium mt-1">
                  Suma de notas válidas: {validScores.map(v => v.toFixed(1)).join(' + ')} = {total.toFixed(2)}
                </span>
              )}
            </div>

            {/* Metadatos de Desempate */}
            {allComplete && (
              <div className="bg-slate-800/80 border border-slate-700 p-3.5 rounded-2xl text-xs space-y-1 z-10 w-full md:w-auto">
                <div className="text-amber-400 font-bold uppercase tracking-wider text-[11px] mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> Filtros de Desempate Registrados
                </div>
                <div className="text-slate-300">
                  • <strong>Filtro 1 (Mín Válido):</strong> <span className="text-emerald-400 font-bold">{minValid.toFixed(1)}</span>
                </div>
                <div className="text-slate-300">
                  • <strong>Filtro 2 (Máx Válido):</strong> <span className="text-emerald-400 font-bold">{maxValid.toFixed(1)}</span>
                </div>
                <div className="text-slate-300">
                  • <strong>Filtro 3 (Mín Descartado):</strong> <span className="text-red-400 font-bold">{minExcluded.toFixed(1)}</span>
                </div>
                <div className="text-slate-300">
                  • <strong>Filtro 4 (Máx Descartado):</strong> <span className="text-red-400 font-bold">{maxExcluded.toFixed(1)}</span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer actions */}
        <div className="p-5 bg-white border-t border-slate-200 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-3 rounded-2xl text-slate-600 font-bold hover:bg-slate-100 transition"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={saving || !allComplete}
            className="px-8 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black transition flex items-center gap-2 shadow-lg shadow-blue-600/30 text-sm uppercase tracking-wider"
          >
            {saving ? 'Guardando...' : <><Save size={18} /> Guardar Calificación Oficial</>}
          </button>
        </div>
      </div>
    </div>
  );
}

