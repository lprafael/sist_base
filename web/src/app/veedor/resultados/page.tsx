/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Save, RefreshCw, Check, AlertTriangle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';
function getAuthHeaders() {
  const token = JSON.parse(localStorage.getItem('user_session') || '{}').access_token || '';
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

export default function VeedorResultados() {
  const [torneos, setTorneos] = useState<any[]>([]);
  const [selectedTorneo, setSelectedTorneo] = useState('');
  const [partidos, setPartidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [scores, setScores] = useState<Record<string, { local: string; visitante: string; estado: string }>>({});

  const cargarTorneos = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/futbol/torneos`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const lista = Array.isArray(data) ? data : data.torneos || [];
        setTorneos(lista);
        if (lista.length > 0 && !selectedTorneo) setSelectedTorneo(lista[0].id);
      }
    } catch { /* silencioso */ }
  }, [selectedTorneo]);

  const cargarPartidos = useCallback(async () => {
    if (!selectedTorneo) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/futbol/torneos/${selectedTorneo}/partidos`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const lista = Array.isArray(data) ? data : data.partidos || [];
        setPartidos(lista);
        // Inicializar scores desde los datos existentes
        const initialScores: Record<string, any> = {};
        lista.forEach((p: any) => {
          initialScores[p.id] = {
            local: p.goles_local?.toString() ?? '',
            visitante: p.goles_visitante?.toString() ?? '',
            estado: p.estado || 'pendiente',
          };
        });
        setScores(initialScores);
      }
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, [selectedTorneo]);

  useEffect(() => { cargarTorneos(); }, [cargarTorneos]);
  useEffect(() => { cargarPartidos(); }, [cargarPartidos]);

  const guardarResultado = async (partidoId: string) => {
    const s = scores[partidoId];
    if (!s) return;
    setSaving(partidoId);
    try {
      const res = await fetch(`${API_URL}/futbol/partidos/${partidoId}/resultado`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          goles_local: s.local !== '' ? parseInt(s.local) : null,
          goles_visitante: s.visitante !== '' ? parseInt(s.visitante) : null,
          estado: s.estado,
        })
      });
      if (res.ok) {
        setSavedIds(prev => [...prev, partidoId]);
        setTimeout(() => setSavedIds(prev => prev.filter(id => id !== partidoId)), 3000);
      }
    } catch { /* error silencioso */ }
    finally { setSaving(null); }
  };

  const partidosPendientes = partidos.filter(p => p.estado !== 'finalizado');
  const partidosFinalizados = partidos.filter(p => p.estado === 'finalizado');

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardList className="text-emerald-600" size={26} />
          Cargar resultados
        </h2>
        <div className="flex gap-2">
          <select value={selectedTorneo} onChange={e => setSelectedTorneo(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-emerald-500 outline-none flex-1 sm:flex-none">
            {torneos.map((t: any) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
          <button onClick={cargarPartidos}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl px-3 py-2 text-sm font-semibold flex items-center gap-1.5 transition">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="mb-2">
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
          <AlertTriangle size={15} />
          Solo los partidos pendientes o en curso pueden modificarse.
        </div>
      </div>

      {/* Partidos pendientes */}
      {loading ? (
        <div className="py-16 flex justify-center"><div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {partidosPendientes.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">No hay partidos pendientes de carga.</p>}
          {partidosPendientes.map((partido: any) => {
            const sc = scores[partido.id] || { local: '', visitante: '', estado: 'pendiente' };
            const isSaving = saving === partido.id;
            const isSaved = savedIds.includes(partido.id);
            return (
              <div key={partido.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">
                      {partido.equipo_local || 'Local'} <span className="text-gray-400 font-normal">vs</span> {partido.equipo_visitante || 'Visitante'}
                    </p>
                    {partido.fecha && <p className="text-xs text-gray-500 mt-0.5">{new Date(partido.fecha).toLocaleString('es-PY', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Marcador */}
                    <div className="flex items-center gap-1">
                      <input type="number" min="0" max="99" value={sc.local}
                        onChange={e => setScores(prev => ({ ...prev, [partido.id]: { ...sc, local: e.target.value } }))}
                        className="w-12 text-center border border-gray-200 rounded-lg py-1.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500" />
                      <span className="text-gray-400 font-bold">:</span>
                      <input type="number" min="0" max="99" value={sc.visitante}
                        onChange={e => setScores(prev => ({ ...prev, [partido.id]: { ...sc, visitante: e.target.value } }))}
                        className="w-12 text-center border border-gray-200 rounded-lg py-1.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    {/* Estado */}
                    <select value={sc.estado} onChange={e => setScores(prev => ({ ...prev, [partido.id]: { ...sc, estado: e.target.value } }))}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 bg-white outline-none focus:ring-2 focus:ring-emerald-500">
                      <option value="pendiente">Pendiente</option>
                      <option value="en_curso">En curso</option>
                      <option value="finalizado">Finalizado</option>
                    </select>
                    {/* Guardar */}
                    <button onClick={() => guardarResultado(partido.id)} disabled={isSaving}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${isSaved ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
                      {isSaving ? <RefreshCw size={13} className="animate-spin" /> : isSaved ? <Check size={13} /> : <Save size={13} />}
                      {isSaving ? 'Guardando' : isSaved ? 'Guardado' : 'Guardar'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Finalizados (solo lectura) */}
          {partidosFinalizados.length > 0 && (
            <>
              <div className="pt-4 pb-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Finalizados</p>
              </div>
              {partidosFinalizados.map((partido: any) => (
                <div key={partido.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 opacity-70">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-700 text-sm">
                      {partido.equipo_local} <span className="font-black text-gray-900">{partido.goles_local ?? 0} : {partido.goles_visitante ?? 0}</span> {partido.equipo_visitante}
                    </p>
                    <span className="text-[11px] bg-green-100 text-green-700 border border-green-200 font-bold px-2 py-0.5 rounded-full">✓ Finalizado</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
