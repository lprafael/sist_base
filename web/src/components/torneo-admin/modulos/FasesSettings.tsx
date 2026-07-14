import React, { useState } from 'react';
import { ArrowLeft, Plus, Edit3, Trash2 } from 'lucide-react';

export default function FasesSettings({ 
  torneo, 
  onUpdate, 
  onBack 
}: { 
  torneo: any; 
  onUpdate: (data: any) => void; 
  onBack: () => void;
}) {
  const [fases, setFases] = useState<any[]>(
    Array.isArray(torneo.configuracion?.fases) && typeof torneo.configuracion.fases[0] === 'object'
      ? torneo.configuracion.fases
      : (Array.isArray(torneo.configuracion?.fases) ? torneo.configuracion.fases.map((f: string, i: number) => ({ id: `f_${i}`, name: f, type: 'Todos contra Todos' })) : [])
  );

  const [showForm, setShowForm] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'Todos contra Todos'
  });

  const handleSaveFases = async (newFases: any[]) => {
    setFases(newFases);
    await onUpdate({ configuracion: { ...torneo.configuracion, fases: newFases } });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    let updated = [...fases];
    if (editIndex !== null) {
      updated[editIndex] = { ...updated[editIndex], ...formData };
    } else {
      updated.push({ id: `fase_${Date.now()}`, ...formData });
    }
    
    handleSaveFases(updated);
    setShowForm(false);
    setEditIndex(null);
    setFormData({ name: '', type: 'Todos contra Todos' });
  };

  const handleEdit = (idx: number) => {
    setFormData({ name: fases[idx].name, type: fases[idx].type });
    setEditIndex(idx);
    setShowForm(true);
  };

  const handleDelete = (idx: number) => {
    if (confirm("¿Estás seguro de eliminar esta fase?")) {
      const updated = fases.filter((_, i) => i !== idx);
      handleSaveFases(updated);
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 min-h-[70vh] flex flex-col relative">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 bg-white rounded-full text-slate-500 shadow hover:bg-slate-100">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Fases</h2>
      </div>

      {!showForm ? (
        <>
          <div className="flex-1 space-y-4">
            {fases.length === 0 ? (
              <div className="text-center text-slate-400 py-12">
                No hay fases configuradas.
              </div>
            ) : (
              fases.map((f, idx) => (
                <div key={f.id} className="group flex items-center justify-between p-4 bg-transparent border-b border-slate-200 hover:bg-slate-100 transition rounded-lg">
                  <div>
                    <div className="text-lg text-slate-800">{f.name}</div>
                    <div className="text-sm text-slate-500 mt-1">{f.type}</div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => handleEdit(idx)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-full">
                      <Edit3 size={18} />
                    </button>
                    <button onClick={() => handleDelete(idx)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-8 flex justify-center pb-4">
            <button 
              onClick={() => {
                setEditIndex(null);
                setFormData({ name: '', type: 'Todos contra Todos' });
                setShowForm(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-full shadow-lg transition flex items-center gap-2"
            >
              Nueva fase
            </button>
          </div>
        </>
      ) : (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-lg mb-4">{editIndex !== null ? 'Editar Fase' : 'Nueva Fase'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Nombre de la Fase</label>
              <input 
                type="text" 
                autoFocus
                required
                placeholder="ej: 1º Fase"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Tipo de Competición</label>
              <select 
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:border-blue-500 outline-none"
              >
                <option value="Todos contra Todos">Todos contra Todos</option>
                <option value="Eliminatoria">Eliminatoria</option>
                <option value="Grupos + Eliminatoria">Grupos + Eliminatoria</option>
                <option value="Suizo">Sistema Suizo</option>
              </select>
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setShowForm(false)}
                className="px-6 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-medium"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
