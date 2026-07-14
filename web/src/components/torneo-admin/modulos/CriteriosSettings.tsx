import React, { useState } from 'react';
import { ArrowLeft, ArrowUp, ArrowDown, Check } from 'lucide-react';

const DEFAULT_CRITERIOS = [
  'Puntos',
  'Diferencia de Goles',
  'Goles a Favor',
  'Goles en Contra',
  'Partidos Ganados',
  'Enfrentamiento Directo',
  'Tarjetas Rojas (Menor Cantidad)',
  'Tarjetas Amarillas (Menor Cantidad)'
];

export default function CriteriosSettings({ 
  torneo, 
  onUpdate, 
  onBack 
}: { 
  torneo: any; 
  onUpdate: (data: any) => void; 
  onBack: () => void;
}) {
  const [criterios, setCriterios] = useState<string[]>(
    torneo.configuracion?.criterios?.length ? torneo.configuracion.criterios : DEFAULT_CRITERIOS
  );

  const handleSave = async (newCriterios: string[]) => {
    setCriterios(newCriterios);
    await onUpdate({ configuracion: { ...torneo.configuracion, criterios: newCriterios } });
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const updated = [...criterios];
    [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
    handleSave(updated);
  };

  const moveDown = (idx: number) => {
    if (idx === criterios.length - 1) return;
    const updated = [...criterios];
    [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
    handleSave(updated);
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 min-h-[70vh] flex flex-col relative">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 bg-white rounded-full text-slate-500 shadow hover:bg-slate-100">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Criterios de Clasificación</h2>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full">
        <p className="text-slate-500 mb-6 text-sm">
          Ordena los criterios que se utilizarán para determinar la posición en la tabla en caso de empate. El criterio superior (1º) es el más importante.
        </p>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {criterios.map((criterio, idx) => (
            <div key={criterio} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                {idx + 1}
              </div>
              <span className="text-slate-700 font-medium flex-1">{criterio}</span>
              
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => moveUp(idx)} 
                  disabled={idx === 0}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ArrowUp size={18} />
                </button>
                <button 
                  onClick={() => moveDown(idx)} 
                  disabled={idx === criterios.length - 1}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ArrowDown size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-8 flex justify-center">
          <div className="bg-green-100 text-green-700 px-6 py-3 rounded-full text-sm font-medium flex items-center gap-2">
            <Check size={18} /> Los criterios se guardan automáticamente al ordenar
          </div>
        </div>
      </div>
    </div>
  );
}
