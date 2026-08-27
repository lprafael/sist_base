/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, MapPin, CheckCircle, AlertCircle, RefreshCw, Trophy } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

function getAuthHeaders() {
  const token = JSON.parse(localStorage.getItem('user_session') || '{}').access_token || '';
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

export default function VeedorDashboard() {
  const [partidos, setPartidos] = useState<any[]>([]);
  const [torneos, setTorneos] = useState<any[]>([]);
  const [selectedTorneo, setSelectedTorneo] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const cargarTorneos = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/futbol/torneos`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTorneos(Array.isArray(data) ? data : data.torneos || []);
      }
    } catch { /* silencioso */ }
  }, []);

  const cargarPartidos = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedTorneo
        ? `${API_URL}/futbol/torneos/${selectedTorneo}/partidos`
        : `${API_URL}/futbol/partidos/hoy`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPartidos(Array.isArray(data) ? data : data.partidos || []);
        setLastUpdate(new Date());
      }
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, [selectedTorneo]);

  useEffect(() => { cargarTorneos(); }, [cargarTorneos]);
  useEffect(() => { cargarPartidos(); }, [cargarPartidos]);

  const estadoColor: Record<string, string> = {
    pendiente: 'bg-gray-100 text-gray-600 border-gray-200',
    en_curso: 'bg-blue-100 text-blue-700 border-blue-200',
    finalizado: 'bg-green-100 text-green-700 border-green-200',
    suspendido: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="text-emerald-600" size={26} />
            Fixture del día
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Última actualización: {lastUpdate.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedTorneo}
            onChange={e => setSelectedTorneo(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="">Todos los torneos</option>
            {torneos.map((t: any) => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
          <button
            onClick={cargarPartidos}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl px-3 py-2 text-sm font-semibold flex items-center gap-1.5 transition"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : partidos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
          <Trophy size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-1">No hay partidos para hoy</h3>
          <p className="text-sm text-gray-400">Seleccioná un torneo o revisá más tarde.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {partidos.map((partido: any) => (
            <div key={partido.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  {/* Equipos y marcador */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold text-gray-900 text-base">{partido.equipo_local || 'Local'}</span>
                      <div className="flex items-center gap-2 bg-gray-900 text-white rounded-lg px-3 py-1 text-base font-black">
                        <span>{partido.goles_local ?? '-'}</span>
                        <span className="text-gray-400 text-xs">:</span>
                        <span>{partido.goles_visitante ?? '-'}</span>
                      </div>
                      <span className="font-bold text-gray-900 text-base">{partido.equipo_visitante || 'Visitante'}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-2">
                      {partido.fecha && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(partido.fecha).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {partido.cancha && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {partido.cancha}
                        </span>
                      )}
                      {partido.torneo_nombre && (
                        <span className="flex items-center gap-1">
                          <Trophy size={12} />
                          {partido.torneo_nombre}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Estado */}
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${estadoColor[partido.estado] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {partido.estado === 'en_curso' ? '● En curso' :
                       partido.estado === 'finalizado' ? '✓ Finalizado' :
                       partido.estado === 'pendiente' ? 'Pendiente' :
                       partido.estado || 'Sin estado'}
                    </span>
                    {partido.estado === 'finalizado' && (
                      <CheckCircle size={16} className="text-green-500" />
                    )}
                    {partido.estado === 'en_curso' && (
                      <AlertCircle size={16} className="text-blue-500 animate-pulse" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
