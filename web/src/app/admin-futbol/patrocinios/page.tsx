"use client";
import React, { useState, useEffect } from 'react';
import { Plus, X, Image as ImageIcon, Save, Trash2, Edit2, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.micancha.com.py";

export default function PatrociniosPage() {
  const [patrocinadores, setPatrocinadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    titulo: '',
    logo_url: '',
    banner_app_url: '',
    banner_sitio_url: '',
    tiempo_banner: 7,
    sitio_web: '',
    telefono: ''
  });

  const getToken = () => {
    try {
      const s = JSON.parse(localStorage.getItem('user_session') || '{}');
      return s.access_token || s.token || localStorage.getItem('token') || '';
    } catch {
      return localStorage.getItem('token') || '';
    }
  };

  const loadPatrocinios = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/patrocinadores`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setPatrocinadores(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPatrocinios();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await fetch(`${API_URL}/organizador/perfil/logo`, {
        method: "POST",
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setForm(prev => ({ ...prev, [field]: data.url }));
      } else {
        alert("Error al subir la imagen");
      }
    } catch(err) {
      alert("Error de conexión al subir imagen");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo) return alert("El título es obligatorio");
    setSaving(true);
    
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `${API_URL}/api/patrocinadores/${editingId}` : `${API_URL}/api/patrocinadores`;
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}` 
        },
        body: JSON.stringify(form)
      });
      
      if (res.ok) {
        setShowModal(false);
        loadPatrocinios();
      } else {
        alert("Error al guardar");
      }
    } catch (e) {
      alert("Error de red");
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este patrocinador?")) return;
    try {
      await fetch(`${API_URL}/api/patrocinadores/${id}`, {
        method: "DELETE",
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      loadPatrocinios();
    } catch (e) {
      alert("Error al eliminar");
    }
  };

  const openNew = () => {
    setForm({
      titulo: '', logo_url: '', banner_app_url: '', banner_sitio_url: '',
      tiempo_banner: 7, sitio_web: '', telefono: ''
    });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (p: any) => {
    setForm(p);
    setEditingId(p.id);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#1b264f]">Patrocinios y Apoyos</h1>
          <button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg transition">
            <Plus size={24} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500" size={48}/></div>
        ) : patrocinadores.length === 0 ? (
          <div className="bg-white p-12 rounded-xl text-center shadow-sm border border-gray-200">
            <h3 className="text-xl font-bold text-gray-500">No hay patrocinadores registrados</h3>
            <p className="text-gray-400 mt-2">Haz clic en el botón + para añadir uno nuevo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {patrocinadores.map(p => (
              <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="h-32 bg-gray-100 relative">
                  {p.banner_app_url || p.banner_sitio_url ? (
                    <img src={p.banner_app_url || p.banner_sitio_url} className="w-full h-full object-cover" alt="Banner" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400"><ImageIcon size={32}/></div>
                  )}
                  {p.logo_url && (
                    <img src={p.logo_url} className="absolute -bottom-6 left-4 w-12 h-12 rounded-full border-2 border-white object-cover shadow-sm bg-white" alt="Logo" />
                  )}
                </div>
                <div className="p-4 pt-8">
                  <h3 className="font-bold text-lg text-gray-800 truncate">{p.titulo}</h3>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => openEdit(p)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 rounded flex justify-center items-center gap-2 text-sm transition"><Edit2 size={16}/> Editar</button>
                    <button onClick={() => handleDelete(p.id)} className="bg-red-50 hover:bg-red-100 text-red-600 px-3 rounded flex justify-center items-center transition"><Trash2 size={16}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold">{editingId ? 'Editar Patrocinio' : 'Nuevo Patrocinio'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-full"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Título</label>
                <input 
                  type="text" 
                  value={form.titulo}
                  onChange={e => setForm({...form, titulo: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="col-span-1">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Logo (150x150)</label>
                  <div className="w-full aspect-square bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center relative cursor-pointer hover:bg-gray-200 overflow-hidden">
                    {form.logo_url ? <img src={form.logo_url} className="w-full h-full object-cover" /> : <ImageIcon className="text-gray-400" size={32}/>}
                    <input type="file" onChange={e => handleUpload(e, 'logo_url')} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                  </div>
                </div>
                
                <div className="col-span-2 space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Banner de Aplicación (805x453)</label>
                    <div className="w-full h-24 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center relative cursor-pointer hover:bg-gray-200 overflow-hidden">
                      {form.banner_app_url ? <img src={form.banner_app_url} className="w-full h-full object-cover" /> : <span className="text-gray-500 font-medium">+ Añadir</span>}
                      <input type="file" onChange={e => handleUpload(e, 'banner_app_url')} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Banner del Sitio (970x90)</label>
                    <div className="w-full h-16 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center relative cursor-pointer hover:bg-gray-200 overflow-hidden">
                      {form.banner_sitio_url ? <img src={form.banner_sitio_url} className="w-full h-full object-cover" /> : <span className="text-gray-500 font-medium">+ Añadir</span>}
                      <input type="file" onChange={e => handleUpload(e, 'banner_sitio_url')} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 flex justify-between">
                  <span>Tiempo del banner</span>
                  <span className="text-blue-600 font-bold">{form.tiempo_banner} Segundos</span>
                </label>
                <input 
                  type="range" 
                  min="1" max="15" 
                  value={form.tiempo_banner} 
                  onChange={e => setForm({...form, tiempo_banner: parseInt(e.target.value)})} 
                  className="w-full"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Sitio Web (URL)</label>
                  <input 
                    type="url" 
                    placeholder="https://"
                    value={form.sitio_web}
                    onChange={e => setForm({...form, sitio_web: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Teléfono</label>
                  <input 
                    type="tel" 
                    value={form.telefono}
                    onChange={e => setForm({...form, telefono: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </form>
            
            <div className="p-4 border-t flex justify-end gap-3 bg-gray-50">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
                {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
