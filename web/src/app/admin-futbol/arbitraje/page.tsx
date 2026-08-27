/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, User, RefreshCw, Trash2, Save, UserCog } from 'lucide-react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';
function getAuthHeaders() {
  const token = JSON.parse(localStorage.getItem('user_session') || '{}').access_token || '';
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

export default function ArbitrajePage() {
  const router = useRouter();
  const [torneos, setTorneos] = useState<any[]>([]);
  const [selectedTorneo, setSelectedTorneo] = useState('');
  const [arbitros, setArbitros] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentArbitro, setCurrentArbitro] = useState({ nombre: '', dni: '', rol: 'Árbitro Principal' });
  const [error, setError] = useState('');

  const FUNCIONES = ['Árbitro Principal', 'Árbitro Asistente', 'Cuarto Árbitro', 'Veedor', 'Anotador'];

  const cargarTorneos = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/futbol/torneos`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const lista = Array.isArray(data) ? data : data.torneos || [];
        setTorneos(lista);
        if (lista.length > 0 && !selectedTorneo) setSelectedTorneo(lista[0].id);
      }
    } catch { /* silent */ }
  }, [selectedTorneo]);

  const cargarArbitros = useCallback(async () => {
    if (!selectedTorneo) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/futbol/torneos/${selectedTorneo}/arbitros`, { headers: getAuthHeaders() });
      if (res.ok) setArbitros(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [selectedTorneo]);

  useEffect(() => { cargarTorneos(); }, [cargarTorneos]);
  useEffect(() => { cargarArbitros(); }, [cargarArbitros]);

  const handleOpenNew = () => { setEditingId(null); setCurrentArbitro({ nombre: '', dni: '', rol: 'Árbitro Principal' }); setError(''); setShowModal(true); };
  const handleOpenEdit = (a: any) => { setEditingId(a.id); setCurrentArbitro({ nombre: a.nombre || '', dni: a.dni || '', rol: a.rol || 'Árbitro Principal' }); setError(''); setShowModal(true); };

  const handleGuardar = async () => {
    if (!currentArbitro.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    if (!selectedTorneo) { setError('Seleccioná un torneo'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API_URL}/futbol/torneos/${selectedTorneo}/arbitros`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ nombre: currentArbitro.nombre, dni: currentArbitro.dni || null, rol: currentArbitro.rol })
      });
      if (res.ok) { setShowModal(false); cargarArbitros(); }
      else { const err = await res.json(); setError(err.detail || 'Error al guardar'); }
    } catch { setError('Error de red'); }
    finally { setSaving(false); }
  };

  const handleEliminar = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/futbol/arbitros/${editingId}`, { method: 'DELETE', headers: getAuthHeaders() });
      setShowModal(false); cargarArbitros();
    } catch { setError('Error al eliminar'); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-[#1e293b] text-white px-4 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="hover:bg-white/10 p-2 rounded-full transition"><ArrowLeft size={22} /></button>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2"><UserCog size={20} /> Arbitraje</h1>
            <p className="text-xs text-slate-400">Árbitros y veedores por torneo</p>
          </div>
        </div>
        <button onClick={handleOpenNew} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-1.5 transition">
          <Plus size={18} /> Agregar
        </button>
      </div>

      <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center gap-3">
        <label className="text-sm font-semibold text-gray-600 shrink-0">Torneo:</label>
        <select value={selectedTorneo} onChange={e => setSelectedTorneo(e.target.value)}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
          {torneos.length === 0 && <option value="">Sin torneos</option>}
          {torneos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
        <button onClick={cargarArbitros} className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition">
          <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 p-4">
        {loading ? (
          <div className="py-16 flex justify-center"><div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : arbitros.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <UserCog size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No hay árbitros para este torneo</p>
            <p className="text-sm mt-1">Presioná <strong>Agregar</strong> para añadir uno</p>
          </div>
        ) : (
          <div className="space-y-2">
            {arbitros.map(a => (
              <button key={a.id} onClick={() => handleOpenEdit(a)}
                className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 hover:shadow-md hover:border-emerald-200 transition text-left flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                  <User size={20} className="text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{a.nombre}</p>
                  <p className="text-xs text-gray-500">{a.rol}{a.dni ? ` · DNI: ${a.dni}` : ''}</p>
                </div>
                <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium border border-slate-200">{a.rol}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800 mb-5">{editingId ? 'Editar árbitro' : 'Nuevo árbitro'}</h2>
            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">{error}</div>}
            <div className="space-y-4">
              {[['Nombre *', 'nombre', 'text', 'Nombre completo'], ['DNI / Cédula', 'dni', 'text', 'Opcional']].map(([label, field, type, ph]: any) => (
                <div key={field}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
                  <input type={type} value={(currentArbitro as any)[field]} placeholder={ph}
                    onChange={e => setCurrentArbitro({ ...currentArbitro, [field]: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Función</label>
                <select value={currentArbitro.rol} onChange={e => setCurrentArbitro({ ...currentArbitro, rol: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                  {FUNCIONES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-between mt-6">
              {editingId ? (
                <button onClick={handleEliminar} disabled={saving} className="flex items-center gap-1.5 text-red-500 font-bold px-4 py-2.5 hover:bg-red-50 rounded-xl transition text-sm">
                  <Trash2 size={15} /> Eliminar
                </button>
              ) : (
                <button onClick={() => setShowModal(false)} className="text-gray-500 font-medium px-4 py-2.5 hover:bg-gray-100 rounded-xl transition text-sm">Cancelar</button>
              )}
              <button onClick={handleGuardar} disabled={saving} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl transition text-sm">
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
