"use client";
import React, { useState, useEffect } from 'react';
import { Trophy, LayoutGrid, ArrowRight, Loader2, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function CampeonatosPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [deportes, setDeportes] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    nombre: "",
    tipo_campeonato: "",
    deporte: "",
    formato: "",
    categorias: [] as { nombre: string, divisiones: {nombre: string}[] }[]
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const sessionData = JSON.parse(localStorage.getItem('user_session') || '{}');
      const token = sessionData.access_token || sessionData.token || '';
      const res = await fetch(`${API_URL}/organizador/deportes-formatos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if(res.ok) {
        const data = await res.json();
        setDeportes(data.deportes);
        if(data.deportes.length > 0) {
          setFormData(f => ({ ...f, deporte: data.deportes[0].nombre, formato: data.deportes[0].formatos[0]?.nombre || "" }));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    setMessage("");
    try {
      const sessionData = JSON.parse(localStorage.getItem('user_session') || '{}');
      const token = sessionData.access_token || sessionData.token || '';
      const res = await fetch(`${API_URL}/futbol/torneos`, {
        method: "POST",
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if(res.ok) {
        setMessage("✅ Campeonato creado exitosamente.");
        setTimeout(() => {
          router.push("/admin-futbol/equipos");
        }, 1500);
      } else {
        setMessage("❌ " + data.detail);
      }
    } catch(e) {
      setMessage("❌ Error de conexión al guardar.");
    }
    setLoading(false);
  };

  const addCategoria = () => {
    setFormData({
      ...formData,
      categorias: [...formData.categorias, { nombre: "", divisiones: [] }]
    });
  };

  const addDivision = (catIndex: number) => {
    const newCats = [...formData.categorias];
    newCats[catIndex].divisiones.push({ nombre: "" });
    setFormData({ ...formData, categorias: newCats });
  };

  const updateCategoriaName = (idx: number, val: string) => {
    const newCats = [...formData.categorias];
    newCats[idx].nombre = val;
    setFormData({ ...formData, categorias: newCats });
  };

  const updateDivisionName = (catIdx: number, divIdx: number, val: string) => {
    const newCats = [...formData.categorias];
    newCats[catIdx].divisiones[divIdx].nombre = val;
    setFormData({ ...formData, categorias: newCats });
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-black text-[#1b264f] mb-8">Mis campeonatos</h1>

      {message && (
        <div className={`p-4 mb-6 rounded-lg font-bold ${message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}

      {step === 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-bold mb-6 text-gray-800">Elige el tipo de campeonato</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div 
              onClick={() => { setFormData({...formData, tipo_campeonato: 'unico'}); setStep(2); }}
              className="border-2 border-gray-100 hover:border-green-500 rounded-2xl p-6 cursor-pointer transition flex gap-4 items-start hover:bg-green-50/50"
            >
              <div className="p-3 bg-green-100 text-green-600 rounded-xl">
                <Trophy size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Campeonato único</h3>
                <p className="text-gray-500 text-sm">Campeonato de una sola modalidad con una sola categoría.</p>
              </div>
            </div>

            <div 
              onClick={() => { setFormData({...formData, tipo_campeonato: 'categorias'}); setStep(2); }}
              className="border-2 border-gray-100 hover:border-blue-500 rounded-2xl p-6 cursor-pointer transition flex gap-4 items-start hover:bg-blue-50/50"
            >
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                <LayoutGrid size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Campeonato con categorías</h3>
                <p className="text-gray-500 text-sm">Campeonato con más de una categoría. Por ejemplo, divisiones por edad, hombre/mujer, diferentes deportes o categorías.</p>
              </div>
            </div>

          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <button onClick={() => setStep(1)} className="text-gray-400 hover:text-gray-800 mb-6 flex items-center gap-2 text-sm font-bold">
            Volver a la selección
          </button>
          
          <h2 className="text-2xl font-bold mb-6 text-gray-800">
            {formData.tipo_campeonato === 'unico' ? 'Configurar Campeonato Único' : 'Configurar Categorías'}
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Nombre del Campeonato</label>
              <input 
                type="text" 
                value={formData.nombre}
                onChange={e => setFormData({...formData, nombre: e.target.value})}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#1b264f] outline-none transition"
                placeholder="Ej. Copa de Verano 2026"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Deporte</label>
                <select
                  value={formData.deporte}
                  onChange={e => {
                    const dep = deportes.find(d => d.nombre === e.target.value);
                    setFormData({
                      ...formData, 
                      deporte: e.target.value, 
                      formato: dep?.formatos[0]?.nombre || ""
                    });
                  }}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#1b264f] outline-none transition"
                >
                  {deportes.map(d => (
                    <option key={d.id} value={d.nombre}>{d.nombre}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Formato</label>
                <select
                  value={formData.formato}
                  onChange={e => setFormData({...formData, formato: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#1b264f] outline-none transition"
                >
                  {deportes.find(d => d.nombre === formData.deporte)?.formatos.map((f: any) => (
                    <option key={f.id} value={f.nombre}>{f.nombre}</option>
                  )) || <option value="">-</option>}
                </select>
              </div>
            </div>

            {formData.tipo_campeonato === 'categorias' && (
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-800">Categorías y Divisiones</h3>
                  <button onClick={addCategoria} className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1">
                    <Plus size={16} /> Agregar Categoría
                  </button>
                </div>
                
                <div className="space-y-4">
                  {formData.categorias.map((cat, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Nombre de la categoría (Ej. Femenino, Sub-15)"
                          value={cat.nombre}
                          onChange={e => updateCategoriaName(idx, e.target.value)}
                          className="flex-1 border-b border-gray-300 py-2 outline-none focus:border-blue-500 font-bold"
                        />
                      </div>
                      
                      <div className="mt-4 pl-6 border-l-2 border-gray-100 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-500">Divisiones</span>
                          <button onClick={() => addDivision(idx)} className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1">
                            <Plus size={14} /> Nueva División
                          </button>
                        </div>
                        {cat.divisiones.map((div, dIdx) => (
                          <div key={dIdx} className="flex gap-2 items-center">
                            <ArrowRight size={16} className="text-gray-300" />
                            <input 
                              type="text" 
                              placeholder="Nombre (Ej. Primera A)"
                              value={div.nombre}
                              onChange={e => updateDivisionName(idx, dIdx, e.target.value)}
                              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                            />
                          </div>
                        ))}
                        {cat.divisiones.length === 0 && (
                          <p className="text-xs text-gray-400 italic">No hay divisiones, la categoría funcionará como división única.</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {formData.categorias.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      Haz clic en "Agregar Categoría" para comenzar.
                    </div>
                  )}
                </div>
              </div>
            )}

            <button 
              disabled={loading || !formData.nombre || (formData.tipo_campeonato === 'categorias' && formData.categorias.length === 0)}
              onClick={handleCreate}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition"
            >
              {loading ? <Loader2 size={24} className="animate-spin"/> : <Trophy size={24}/>}
              Crear Campeonato
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
