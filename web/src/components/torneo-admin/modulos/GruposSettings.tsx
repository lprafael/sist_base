import React, { useState } from 'react';
import { ArrowLeft, Shuffle, List, Type } from 'lucide-react';

export default function GruposSettings({ 
  torneo, 
  onUpdate, 
  onBack 
}: { 
  torneo: any; 
  onUpdate: (data: any) => void; 
  onBack: () => void;
}) {
  const [gruposConfig, setGruposConfig] = useState(
    torneo.configuracion?.grupos || { cantidad: 0, asignacion: 'azar', nombresPersonalizados: false }
  );

  const handleSave = async (updatedConfig: any) => {
    setGruposConfig(updatedConfig);
    await onUpdate({ configuracion: { ...torneo.configuracion, grupos: updatedConfig } });
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 min-h-[70vh] flex flex-col relative">
      <div className="flex items-center gap-4 mb-10">
        <button onClick={onBack} className="p-2 bg-white rounded-full text-slate-500 shadow hover:bg-slate-100">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Grupos</h2>
      </div>

      <div className="flex-1 space-y-8 max-w-2xl mx-auto w-full">
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm relative pt-12">
          
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1.5 rounded-full font-bold shadow-md">
            {gruposConfig.cantidad === 0 ? 'Sin grupos' : `${gruposConfig.cantidad} Grupos`}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-600 rotate-45"></div>
          </div>

          <label className="block text-center font-semibold text-slate-700 mb-6 text-lg">
            Nº de grupos
          </label>
          <div className="px-6 flex items-center gap-4">
            <span className="text-slate-400 font-bold">0</span>
            <input 
              type="range" 
              min="0" 
              max="16" 
              value={gruposConfig.cantidad} 
              onChange={e => handleSave({ ...gruposConfig, cantidad: parseInt(e.target.value) })}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="text-slate-400 font-bold">16</span>
          </div>
        </div>

        {gruposConfig.cantidad > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
            <label className="flex items-center gap-4 p-4 hover:bg-slate-50 cursor-pointer transition">
              <input 
                type="radio" 
                name="asignacion" 
                checked={gruposConfig.asignacion === 'azar'}
                onChange={() => handleSave({ ...gruposConfig, asignacion: 'azar' })}
                className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <Shuffle className="text-slate-400" size={24} />
              <span className="text-slate-700 font-medium">Establecer grupos de equipos al azar</span>
            </label>

            <label className="flex items-center gap-4 p-4 hover:bg-slate-50 cursor-pointer transition">
              <input 
                type="radio" 
                name="asignacion" 
                checked={gruposConfig.asignacion === 'manual'}
                onChange={() => handleSave({ ...gruposConfig, asignacion: 'manual' })}
                className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <List className="text-slate-400" size={24} />
              <span className="text-slate-700 font-medium">Definir grupo de equipos (Manual)</span>
            </label>

            <label className="flex items-center gap-4 p-4 hover:bg-slate-50 cursor-pointer transition">
              <input 
                type="checkbox" 
                checked={gruposConfig.nombresPersonalizados}
                onChange={e => handleSave({ ...gruposConfig, nombresPersonalizados: e.target.checked })}
                className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <Type className="text-slate-400" size={24} />
              <span className="text-slate-700 font-medium">Personalizar nombres del grupo (Ej: Grupo de la Muerte)</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
