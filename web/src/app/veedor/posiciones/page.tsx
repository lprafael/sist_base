/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart2, RefreshCw, Trophy, TrendingUp } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';
function getAuthHeaders() {
  const token = JSON.parse(localStorage.getItem('user_session') || '{}').access_token || '';
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

export default function VeedorPosiciones() {
  const [torneos, setTorneos] = useState<any[]>([]);
  const [selectedTorneo, setSelectedTorneo] = useState('');
  const [grupos, setGrupos] = useState<any[]>([]);
  const [posiciones, setPosiciones] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);

  const cargarTorneos = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/futbol/torneos`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const lista = Array.isArray(data) ? data : data.torneos || [];
        setTorneos(lista);
        if (lista.length > 0) setSelectedTorneo(lista[0].id);
      }
    } catch { /* silencioso */ }
  }, []);

  const cargarPosiciones = useCallback(async () => {
    if (!selectedTorneo) return;
    setLoading(true);
    try {
      // Intentar cargar grupos
      const gruposRes = await fetch(`${API_URL}/futbol/torneos/${selectedTorneo}/grupos`, { headers: getAuthHeaders() });
      if (gruposRes.ok) {
        const gruposData = await gruposRes.json();
        const listaGrupos = Array.isArray(gruposData) ? gruposData : [];
        setGrupos(listaGrupos);

        // Cargar posiciones por grupo
        const possPorGrupo: Record<string, any[]> = {};
        for (const g of listaGrupos) {
          try {
            const posRes = await fetch(`${API_URL}/futbol/torneos/${selectedTorneo}/grupos/${g.id}/tabla`, { headers: getAuthHeaders() });
            if (posRes.ok) {
              possPorGrupo[g.id] = await posRes.json();
            }
          } catch { /* silencioso */ }
        }
        setPosiciones(possPorGrupo);
      }
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, [selectedTorneo]);

  useEffect(() => { cargarTorneos(); }, [cargarTorneos]);
  useEffect(() => { cargarPosiciones(); }, [cargarPosiciones]);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart2 className="text-emerald-600" size={26} />
          Tabla de posiciones
        </h2>
        <div className="flex gap-2">
          <select value={selectedTorneo} onChange={e => setSelectedTorneo(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
            {torneos.map((t: any) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
          <button onClick={cargarPosiciones}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl px-3 py-2 text-sm font-semibold flex items-center gap-1.5 transition">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : grupos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
          <Trophy size={48} className="text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-500 mb-1">No hay grupos disponibles</h3>
          <p className="text-sm text-gray-400">Seleccioná un torneo con grupos configurados.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map((grupo: any) => {
            const tabla = posiciones[grupo.id] || [];
            return (
              <div key={grupo.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-gradient-to-r from-emerald-900 to-emerald-700 flex items-center gap-2">
                  <TrendingUp size={16} color="white" />
                  <h3 className="font-bold text-white text-sm">{grupo.nombre || `Grupo ${grupo.id}`}</h3>
                </div>
                {tabla.length === 0 ? (
                  <p className="text-sm text-gray-400 p-5">Sin datos de posiciones.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide w-8">#</th>
                          <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Equipo</th>
                          <th className="text-center px-3 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide">PJ</th>
                          <th className="text-center px-3 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide">PG</th>
                          <th className="text-center px-3 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide">PE</th>
                          <th className="text-center px-3 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide">PP</th>
                          <th className="text-center px-3 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide">GF</th>
                          <th className="text-center px-3 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide">GC</th>
                          <th className="text-center px-3 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide">DG</th>
                          <th className="text-center px-4 py-2.5 text-xs font-bold text-emerald-700 uppercase tracking-wide">Pts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {tabla.map((row: any, idx: number) => (
                          <tr key={row.equipo_id || idx} className={`hover:bg-gray-50 transition ${idx === 0 ? 'bg-emerald-50/30' : ''}`}>
                            <td className="px-4 py-3 text-center">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mx-auto ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-gray-300 text-gray-700' : idx === 2 ? 'bg-orange-300 text-orange-900' : 'text-gray-500'}`}>
                                {idx + 1}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-900">{row.equipo_nombre || row.equipo || `Equipo ${idx + 1}`}</td>
                            <td className="px-3 py-3 text-center text-gray-600">{row.pj ?? row.partidos_jugados ?? '-'}</td>
                            <td className="px-3 py-3 text-center text-green-600 font-semibold">{row.pg ?? row.ganados ?? '-'}</td>
                            <td className="px-3 py-3 text-center text-yellow-600">{row.pe ?? row.empatados ?? '-'}</td>
                            <td className="px-3 py-3 text-center text-red-500">{row.pp ?? row.perdidos ?? '-'}</td>
                            <td className="px-3 py-3 text-center text-gray-600">{row.gf ?? row.goles_favor ?? '-'}</td>
                            <td className="px-3 py-3 text-center text-gray-600">{row.gc ?? row.goles_contra ?? '-'}</td>
                            <td className="px-3 py-3 text-center text-gray-600">{row.dg ?? row.diferencia_goles ?? '-'}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-black text-emerald-700 text-base">{row.pts ?? row.puntos ?? '-'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
