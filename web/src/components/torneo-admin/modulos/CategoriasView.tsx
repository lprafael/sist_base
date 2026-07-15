"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Layers, Tag, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function CategoriasView({ torneoId }: { torneoId: string }) {
  const [categorias, setCategorias] = useState<any[]>([]);
  const [divisiones, setDivisiones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States for Category Form
  const [showCatForm, setShowCatForm] = useState(false);
  const [formCat, setFormCat] = useState({ 
    id: '', nombre: '', descripcion: '', 
    genero: '', edad_min: '', edad_max: '', 
    peso_min: '', peso_max: '', modalidad: '', cinturon: '' 
  });
  const nombreInputRef = useRef<HTMLInputElement>(null);

  // States for Division Form
  const [showDivForm, setShowDivForm] = useState(false);
  const [formDiv, setFormDiv] = useState({ id: '', nombre: '', categoria_id: '' });
  const divInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, [torneoId]);

  const getToken = () => {
    const session = JSON.parse(localStorage.getItem('user_session') || '{}');
    return session.access_token || session.token || '';
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${getToken()}` };
      const [resCat, resDiv] = await Promise.all([
        fetch(`${API_URL}/futbol/torneos/${torneoId}/categorias`, { headers }),
        fetch(`${API_URL}/futbol/torneos/${torneoId}/divisiones`, { headers })
      ]);
      
      if(resCat.ok) setCategorias(await resCat.json());
      if(resDiv.ok) setDivisiones(await resDiv.json());
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  };

  // CATEGORIAS
  const handleSaveCat = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    const url = formCat.id 
      ? `${API_URL}/futbol/categorias/${formCat.id}`
      : `${API_URL}/futbol/torneos/${torneoId}/categorias`;
    const method = formCat.id ? 'PUT' : 'POST';

    // Parse numeric fields properly
    const payload: any = { ...formCat };
    if (payload.edad_min) payload.edad_min = parseInt(payload.edad_min); else payload.edad_min = null;
    if (payload.edad_max) payload.edad_max = parseInt(payload.edad_max); else payload.edad_max = null;
    if (payload.peso_min) payload.peso_min = parseFloat(payload.peso_min); else payload.peso_min = null;
    if (payload.peso_max) payload.peso_max = parseFloat(payload.peso_max); else payload.peso_max = null;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if(res.ok) {
        if (formCat.id) {
          setShowCatForm(false);
        } else {
          setTimeout(() => {
            if (nombreInputRef.current) {
              nombreInputRef.current.focus();
            }
          }, 100);
        }
        setFormCat({ id: '', nombre: '', descripcion: '', genero: '', edad_min: '', edad_max: '', peso_min: '', peso_max: '', modalidad: '', cinturon: '' });
        fetchData();
      }
    } catch(e) { console.error(e); }
  };

  const handleDeleteCat = async (id: string) => {
    if(!confirm("¿Eliminar categoría? Las divisiones asociadas también podrían borrarse.")) return;
    try {
      await fetch(`${API_URL}/futbol/categorias/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      fetchData();
    } catch(e) { console.error(e); }
  };

  // DIVISIONES
  const handleSaveDiv = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    const url = formDiv.id 
      ? `${API_URL}/futbol/divisiones/${formDiv.id}`
      : `${API_URL}/futbol/categorias/${formDiv.categoria_id}/divisiones`;
    const method = formDiv.id ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ nombre: formDiv.nombre })
      });
      if(res.ok) {
        if (formDiv.id) {
          setShowDivForm(false);
          setFormDiv({ id: '', nombre: '', categoria_id: '' });
        } else {
          const currentCatId = formDiv.categoria_id;
          setFormDiv({ id: '', nombre: '', categoria_id: currentCatId });
          setTimeout(() => {
            if (divInputRef.current) {
              divInputRef.current.focus();
            }
          }, 100);
        }
        fetchData();
      }
    } catch(e) { console.error(e); }
  };

  const handleDeleteDiv = async (id: string) => {
    if(!confirm("¿Eliminar división?")) return;
    try {
      await fetch(`${API_URL}/futbol/divisiones/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      fetchData();
    } catch(e) { console.error(e); }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="space-y-8">
      {/* SECCION CATEGORIAS */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800">
            <Layers size={20} className="text-blue-500"/>
            Categorías
          </h3>
          <button 
            onClick={() => { setFormCat({ id: '', nombre: '', descripcion: '', genero: '', edad_min: '', edad_max: '', peso_min: '', peso_max: '', modalidad: '', cinturon: '' }); setShowCatForm(true); }}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1 transition"
          >
            <Plus size={16} /> Nueva Categoría
          </button>
        </div>

        {showCatForm && (
          <form onSubmit={handleSaveCat} className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-6 space-y-4 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">Nombre de Categoría *</label>
                <input ref={nombreInputRef} required type="text" value={formCat.nombre} onChange={e => setFormCat({...formCat, nombre: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm" placeholder="Ej: Masculino, Libre, Sub-18" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Género</label>
                <select value={formCat.genero} onChange={e => setFormCat({...formCat, genero: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white">
                  <option value="">Cualquiera</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Mixto">Mixto</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Edad Min y Max</label>
                <div className="flex items-center gap-2">
                  <input type="number" placeholder="Min" value={formCat.edad_min} onChange={e => setFormCat({...formCat, edad_min: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
                  <span className="text-slate-400">-</span>
                  <input type="number" placeholder="Max" value={formCat.edad_max} onChange={e => setFormCat({...formCat, edad_max: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Peso Min y Max (kg)</label>
                <div className="flex items-center gap-2">
                  <input type="number" step="0.1" placeholder="Min" value={formCat.peso_min} onChange={e => setFormCat({...formCat, peso_min: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
                  <span className="text-slate-400">-</span>
                  <input type="number" step="0.1" placeholder="Max" value={formCat.peso_max} onChange={e => setFormCat({...formCat, peso_max: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Cinturón / Rango</label>
                <input type="text" value={formCat.cinturon} onChange={e => setFormCat({...formCat, cinturon: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm" placeholder="Ej: Blanco a Azul" />
              </div>
              
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">Modalidad de Combate / Estilo</label>
                <input type="text" value={formCat.modalidad} onChange={e => setFormCat({...formCat, modalidad: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm" placeholder="Ej: No-Gi, Kickboxing, Grappling" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Descripción extra</label>
                <input type="text" value={formCat.descripcion} onChange={e => setFormCat({...formCat, descripcion: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm" placeholder="Opcional" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setShowCatForm(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
              <button type="submit" className="px-5 py-2 text-sm bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Guardar Categoría</button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 gap-4">
          {categorias.length === 0 ? (
             <div className="text-center p-8 border border-dashed border-slate-300 rounded-xl text-slate-500">
               No hay categorías creadas.
             </div>
          ) : (
            categorias.map(cat => (
              <div key={cat.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-800">{cat.nombre}</h4>
                    {cat.descripcion && <p className="text-xs text-slate-500">{cat.descripcion}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setFormCat(cat); setShowCatForm(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 rounded bg-white border border-slate-200"><Edit2 size={14}/></button>
                    <button onClick={() => handleDeleteCat(cat.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded bg-white border border-slate-200"><Trash2 size={14}/></button>
                  </div>
                </div>
                
                {/* DIVISIONES DE ESTA CATEGORIA */}
                <div className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Tag size={14} className="text-slate-400"/> Divisiones (Ej: Peso Pluma, Peso Pesado)
                    </h5>
                    <button 
                      onClick={() => { setFormDiv({ id: '', nombre: '', categoria_id: cat.id }); setShowDivForm(true); }}
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >
                      + Añadir División
                    </button>
                  </div>

                  {showDivForm && formDiv.categoria_id === cat.id && (
                    <form onSubmit={handleSaveDiv} className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 mb-3 flex gap-2">
                      <input ref={divInputRef} required type="text" value={formDiv.nombre} onChange={e => setFormDiv({...formDiv, nombre: e.target.value})} className="flex-1 border border-slate-300 rounded px-3 py-1.5 text-sm" placeholder="Nombre de la división" />
                      <button type="button" onClick={() => setShowDivForm(false)} className="px-3 py-1.5 text-sm text-slate-500">Cancelar</button>
                      <button type="submit" className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded">Guardar</button>
                    </form>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {divisiones.filter(d => d.categoria_id === cat.id).length === 0 ? (
                      <span className="text-xs text-slate-400 italic">No hay divisiones en esta categoría.</span>
                    ) : (
                      divisiones.filter(d => d.categoria_id === cat.id).map(div => (
                        <div key={div.id} className="bg-slate-100 border border-slate-200 rounded-full px-3 py-1 text-sm flex items-center gap-2 text-slate-700">
                          {div.nombre}
                          <button onClick={() => { setFormDiv({ id: div.id, nombre: div.nombre, categoria_id: cat.id }); setShowDivForm(true); }} className="text-slate-400 hover:text-blue-600"><Edit2 size={12}/></button>
                          <button onClick={() => handleDeleteDiv(div.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={12}/></button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
