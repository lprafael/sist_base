import React, { useState, useEffect } from 'react';
import { X, Save, Trophy, Users } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function FormasController({ match, onClose, onSaved }: { match: any, onClose: () => void, onSaved: () => void }) {
  const [jueces, setJueces] = useState<number[]>([0, 0, 0, 0, 0]);
  const [saving, setSaving] = useState(false);

  // Load existing stats if available
  useEffect(() => {
    if (match.estadisticas) {
      try {
        const stats = typeof match.estadisticas === 'string' ? JSON.parse(match.estadisticas) : match.estadisticas;
        if (stats.jueces && stats.jueces.length === 5) {
          setJueces(stats.jueces);
        }
      } catch(e) {}
    }
  }, [match]);

  const handleScoreChange = (index: number, value: string) => {
    const newJueces = [...jueces];
    const val = parseFloat(value);
    newJueces[index] = isNaN(val) ? 0 : val;
    setJueces(newJueces);
  };

  const calcularPuntaje = () => {
    const validScores = jueces.filter(j => j > 0);
    if (validScores.length < 3) return { total: 0, highIndex: -1, lowIndex: -1 };

    let highIndex = 0;
    let lowIndex = 0;

    for (let i = 1; i < validScores.length; i++) {
      if (validScores[i] > validScores[highIndex]) highIndex = i;
      if (validScores[i] < validScores[lowIndex]) lowIndex = i;
    }

    let total = 0;
    let minValid = 100;
    let maxValid = -1;

    for (let i = 0; i < validScores.length; i++) {
      if (i !== highIndex && i !== lowIndex) {
        total += validScores[i];
        if (validScores[i] < minValid) minValid = validScores[i];
        if (validScores[i] > maxValid) maxValid = validScores[i];
      }
    }

    if (minValid === 100) minValid = 0;
    if (maxValid === -1) maxValid = 0;

    // Map back to original indices
    const allHighIndex = jueces.indexOf(validScores[highIndex]);
    let allLowIndex = -1;
    // Handle case where low and high are the same value (find first instance not equal to high index)
    for (let i = 0; i < jueces.length; i++) {
        if (jueces[i] === validScores[lowIndex] && i !== allHighIndex) {
            allLowIndex = i;
            break;
        }
    }
    // Fallback if somehow they are exactly the same elements (e.g. all 10s)
    if (allLowIndex === -1 && validScores.length >= 3) {
        allLowIndex = jueces.lastIndexOf(validScores[lowIndex]);
    }

    return { total, highIndex: allHighIndex, lowIndex: allLowIndex, minValid, maxValid, minExcluded: validScores[lowIndex], maxExcluded: validScores[highIndex] };
  };

  const { total, highIndex, lowIndex, minValid, maxValid, minExcluded, maxExcluded } = calcularPuntaje();

  const handleSave = async () => {
    if (jueces.filter(j => j > 0).length < 3) {
      alert("Se requieren al menos 3 puntajes válidos.");
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
        puntaje_final: total,
        puntaje_descartado_alto: jueces[highIndex],
        puntaje_descartado_bajo: jueces[lowIndex],
        filtro1_min_valido: minValid,
        filtro2_max_valido: maxValid,
        filtro3_min_descartado: minExcluded,
        filtro4_max_descartado: maxExcluded
      };

      const res = await fetch(`${API_URL}/cancha/torneos/partidos/${match.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({
          estadisticas: payload,
          goles_local: total, // Usar goles local para renderizar rapido en la tabla si se requiere
          estado: 'finalizado'
        })
      });

      if (res.ok) {
        onSaved();
      } else {
        alert("Error al guardar puntuación.");
      }
    } catch(e) {
      console.error(e);
      alert("Error de conexión al guardar.");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
          <div>
            <h2 className="text-xl font-black uppercase flex items-center gap-2">
              <Trophy size={20} className="text-yellow-400" />
              Mesa de Jueces - Formas (ASAM)
            </h2>
            <p className="text-sm text-slate-300 font-medium">Calificando a: {match.jugador_local_nombre || match.local_nombre}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto bg-slate-50">
          <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl text-sm font-medium">
            Ingrese el puntaje de cada juez. El sistema descartará automáticamente la nota más alta y la más baja.
          </div>

          <div className="grid grid-cols-5 gap-4 mb-8">
            {[0, 1, 2, 3, 4].map(idx => {
              const isHigh = idx === highIndex && jueces[idx] > 0;
              const isLow = idx === lowIndex && jueces[idx] > 0;
              const isDiscarded = isHigh || isLow;

              return (
                <div key={idx} className={`flex flex-col items-center bg-white p-3 rounded-xl border-2 transition ${isDiscarded ? 'border-red-300 opacity-60' : 'border-slate-200 shadow-sm'}`}>
                  <label className="font-bold text-slate-500 mb-2">Juez {idx + 1}</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    min="0" 
                    max="10"
                    value={jueces[idx] === 0 ? '' : jueces[idx]} 
                    onChange={e => handleScoreChange(idx, e.target.value)}
                    className={`w-full text-center text-2xl font-black rounded-lg border-2 p-2 focus:outline-none focus:border-blue-500 ${isDiscarded ? 'bg-red-50 text-red-400 line-through' : 'bg-slate-50 text-slate-700 border-slate-200'}`}
                    placeholder="0.0"
                  />
                  {isDiscarded && (
                    <span className="text-[10px] font-bold text-red-500 mt-1 uppercase">{isHigh ? 'MAX Descartado' : 'MIN Descartado'}</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-slate-800 text-white p-6 rounded-2xl flex flex-col items-center shadow-inner relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 flex items-center justify-center">
              <Users size={120} />
            </div>
            <span className="text-slate-300 font-bold uppercase tracking-widest text-sm z-10 mb-1">Puntaje Final Acumulado</span>
            <span className="text-6xl font-black z-10 text-yellow-400 drop-shadow-md">
              {total.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition flex items-center gap-2 shadow-lg shadow-blue-600/30"
          >
            {saving ? 'Guardando...' : <><Save size={18} /> Guardar Calificación</>}
          </button>
        </div>
      </div>
    </div>
  );
}
