"use client";
import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Loader2, User } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function ArbitrajeView({ torneoId }: { torneoId: string }) {
  const [arbitros, setArbitros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    dni: '',
    rol: 'Arbitro Principal'
  });

  useEffect(() => {
    fetchArbitros();
  }, [torneoId]);

  const getToken = () => {
    const session = JSON.parse(localStorage.getItem('user_session') || '{}');
    return session.access_token || session.token || '';
  };

  const fetchArbitros = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/futbol/torneos/${torneoId}/arbitros`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if(res.ok) setArbitros(await res.json());
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/futbol/torneos/${torneoId}/arbitros`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify(formData)
      });
      if(res.ok) {
        setIsCreating(false);
        setFormData({ nombre: '', dni: '', rol: 'Arbitro Principal' });
        fetchArbitros();
      }
    } catch(e) { console.error(e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if(!confirm("¿Eliminar este registro del equipo arbitral?")) return;
    try {
      await fetch(`${API_URL}/futbol/arbitros/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      fetchArbitros();
    } catch(e) { console.error(e); }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800">
          <Shield size={20} className="text-blue-500"/>
          Equipo Arbitral (Jueces / Veedores)
        </h3>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus size={18} /> Registrar Juez/Árbitro
        </button>
      </div>

      {arbitros.length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center p-12 text-slate-400 bg-slate-50 border border-slate-200 border-dashed rounded-xl">
          <Shield size={48} className="mb-4 opacity-50" />
          <p>No hay jueces, árbitros ni veedores registrados.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-bold">Nombre Completo</th>
                <th className="px-6 py-3 font-bold">Rol</th>
                <th className="px-6 py-3 font-bold">Documento / DNI</th>
                <th className="px-6 py-3 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {arbitros.map(a => (
                <tr key={a.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-medium text-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                      <User size={16} />
                    </div>
                    {a.nombre}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-bold border border-slate-200">
                      {a.rol}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{a.dni || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(a.id)} className="text-slate-400 hover:text-red-500 transition p-1">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Registrar Miembro del Equipo Arbitral</h3>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Completo</label>
                <input type="text" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-blue-500 focus:border-blue-500 text-sm" placeholder="Ej: Mario Santos" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Documento / DNI (Opcional)</label>
                <input type="text" value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-blue-500 focus:border-blue-500 text-sm" placeholder="Ej: 1234567" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Rol</label>
                <select value={formData.rol} onChange={e => setFormData({...formData, rol: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-blue-500 focus:border-blue-500 text-sm">
                  <option value="Arbitro Principal">Árbitro Principal / Referee</option>
                  <option value="Juez">Juez (Mesa o Silla)</option>
                  <option value="Veedor">Veedor / Supervisor</option>
                  <option value="Planillero">Planillero</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded text-sm">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium">
                  {saving ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
