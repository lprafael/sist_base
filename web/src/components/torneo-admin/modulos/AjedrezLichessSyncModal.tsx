'use client';

import React, { useState, useEffect } from 'react';
import {
  X, Search, CheckCircle, AlertCircle, RefreshCw, UploadCloud,
  Zap, Trophy, Clock, ShieldCheck, ExternalLink, Sparkles, Users, HelpCircle
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

interface AjedrezLichessSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  torneoId: string;
  onSuccess: () => void;
}

const PRESETS = [
  { id: '1+0', l: '1 min', sub: 'Bullet 1+0', min: 1, inc: 0, icon: '⚡' },
  { id: '3+2', l: '3 + 2', sub: 'Blitz 3+2', min: 3, inc: 2, icon: '🔥' },
  { id: '5+3', l: '5 + 3', sub: 'Blitz 5+3', min: 5, inc: 3, icon: '⏱️' },
  { id: '10+0', l: '10 min', sub: 'Rápido 10+0', min: 10, inc: 0, icon: '⏳' },
  { id: '15+10', l: '15 + 10', sub: 'Clásico FIDE', min: 15, inc: 10, icon: '🏆' },
];

export default function AjedrezLichessSyncModal({ isOpen, onClose, torneoId, onSuccess }: AjedrezLichessSyncModalProps) {
  const [activeTab, setActiveTab] = useState<'crear' | 'importar'>('crear');

  // Estado de sincronización actual del torneo
  const [statusLoading, setStatusLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);

  // Estados de "Crear en Lichess"
  const [tipoTorneo, setTipoTorneo] = useState<'swiss' | 'arena'>('swiss');
  const [nombreTorneo, setNombreTorneo] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('5+3');
  const [minutos, setMinutos] = useState(5);
  const [incremento, setIncremento] = useState(3);
  const [rondas, setRondas] = useState(5);
  const [duracionArena, setDuracionArena] = useState(60);
  const [rated, setRated] = useState(true);
  const [minutosInicio, setMinutosInicio] = useState(10);
  const [teamId, setTeamId] = useState('');
  const [lichessToken, setLichessToken] = useState('');
  const [crearLoading, setCrearLoading] = useState(false);
  const [crearResult, setCrearResult] = useState<any>(null);
  const [crearError, setCrearError] = useState<string | null>(null);

  // Estados de "Importar Existente"
  const [lichessUrl, setLichessUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState(true);

  useEffect(() => {
    if (isOpen && torneoId) {
      cargarEstadoSync();
    }
  }, [isOpen, torneoId]);

  const cargarEstadoSync = async () => {
    setStatusLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/ajedrez/torneos/${torneoId}/lichess/status`);
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(data);
      }
    } catch {
      // Ignorar fallo de status
    } finally {
      setStatusLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSelectPreset = (p: typeof PRESETS[0]) => {
    setSelectedPreset(p.id);
    setMinutos(p.min);
    setIncremento(p.inc);
  };

  const handleCrearTorneo = async () => {
    setCrearError(null);
    setCrearResult(null);

    if (tipoTorneo === 'swiss' && !teamId.trim()) {
      setCrearError("Lichess exige que los torneos Suizos pertenezcan a un Club/Equipo (Team). Ingresá el ID de tu equipo en Lichess.");
      return;
    }

    if (!lichessToken.trim()) {
      setCrearError("Por favor ingresa tu API Token de Lichess con permiso 'tournament:write'.");
      return;
    }

    setCrearLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/ajedrez/torneos/${torneoId}/lichess/crear-torneo-automatico`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          tipo: tipoTorneo,
          nombre: nombreTorneo.trim() || undefined,
          minutos,
          incremento,
          rondas: tipoTorneo === 'swiss' ? rondas : undefined,
          duracion_minutos: tipoTorneo === 'arena' ? duracionArena : undefined,
          rated,
          team_id: teamId.trim() || undefined,
          lichess_token: lichessToken.trim(),
          minutos_para_inicio: minutosInicio,
          auto_sync: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Error al crear el torneo en Lichess.");
      }

      setCrearResult(data);
      cargarEstadoSync();
      onSuccess();
    } catch (err: any) {
      setCrearError(err.message || "Error al comunicarse con Lichess");
    } finally {
      setCrearLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!lichessUrl.trim()) {
      setError("Por favor ingresa la URL del torneo de Lichess.");
      return;
    }
    setError(null);
    setLoading(true);
    setPreviewData(null);
    try {
      const res = await fetch(`${API_URL}/api/ajedrez/torneos/${torneoId}/lichess/preview-torneo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lichess_url: lichessUrl.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Error al obtener vista previa.");
      }
      const data = await res.json();
      setPreviewData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!previewData?.lichess_id) return;

    const confirmed = window.confirm(
      "⚠️ ADVERTENCIA: Esta acción actualizará las RONDAS y PARTIDAS de este torneo en MiCancha con los datos de Lichess.\n\n¿Estás seguro de continuar?"
    );
    if (!confirmed) return;

    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/ajedrez/torneos/${torneoId}/lichess/sync-torneo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lichess_id: previewData.lichess_id,
          crear_usuarios_faltantes: true,
          auto_sync: autoSync,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Error al sincronizar el torneo.");
      }
      const data = await res.json();
      alert(`✅ Torneo sincronizado exitosamente.\nSe procesaron las partidas.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden relative max-h-[90vh]">
        {/* Barra superior decorativa */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-blue-500 to-indigo-500"></div>

        {/* Encabezado */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                Integración con Lichess <span className="text-xs bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full">Oficial</span>
              </h2>
              <p className="text-xs text-slate-400">Creá el torneo automáticamente o vinculá uno existente para sincronización en tiempo real.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Estado actual si ya está vinculado */}
        {syncStatus?.vinculado && (
          <div className="mx-6 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-emerald-400 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-emerald-300">Torneo Vinculado con Lichess: </span>
                <span className="text-slate-300 font-mono">{syncStatus.lichess_id}</span>
                {syncStatus.auto_sync && <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">Auto-Sync Activo</span>}
              </div>
            </div>
            <a
              href={syncStatus.lichess_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 shadow"
            >
              Abrir en Lichess <ExternalLink size={12} />
            </a>
          </div>
        )}

        {/* Pestañas */}
        <div className="flex border-b border-slate-800 px-6 pt-2 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('crear')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'crear'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap size={14} /> ⚡ Crear Automático en Lichess
          </button>
          <button
            onClick={() => setActiveTab('importar')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'importar'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud size={14} /> 📥 Vincular Torneo Existente
          </button>
        </div>

        {/* Contenido según pestaña */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
          {activeTab === 'crear' ? (
            <div className="space-y-5">
              {/* Selector de tipo */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTipoTorneo('swiss')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    tipoTorneo === 'swiss'
                      ? 'border-amber-500 bg-amber-500/10 text-white'
                      : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-black text-sm flex items-center gap-2">
                    <Trophy size={16} className={tipoTorneo === 'swiss' ? 'text-amber-400' : 'text-slate-500'} />
                    Torneo Suizo (Swiss)
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Formato oficial FIDE por rondas fijas y desempates automáticos. (Requiere ID de Club).
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTipoTorneo('arena')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    tipoTorneo === 'arena'
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-black text-sm flex items-center gap-2">
                    <Zap size={16} className={tipoTorneo === 'arena' ? 'text-blue-400' : 'text-slate-500'} />
                    Torneo Arena
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Emparejamientos continuos por tiempo total de duración (ideal para torneos rápidos).
                  </p>
                </button>
              </div>

              {/* Selector de Ritmo de Juego */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Clock size={14} className="text-amber-400" /> Ritmo de Juego Oficial
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        selectedPreset === p.id
                          ? 'border-amber-500 bg-amber-500/20 text-white font-bold'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-sm">{p.icon} {p.l}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{p.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Configuración de Rondas / Duración */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tipoTorneo === 'swiss' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Cantidad de Rondas</label>
                    <select
                      value={rondas}
                      onChange={(e) => setRondas(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm outline-none focus:border-amber-500"
                    >
                      {[3, 5, 6, 7, 9, 11].map((r) => (
                        <option key={r} value={r}>{r} Rondas oficiales</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Duración Total del Torneo</label>
                    <select
                      value={duracionArena}
                      onChange={(e) => setDuracionArena(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm outline-none focus:border-blue-500"
                    >
                      {[30, 45, 60, 90, 120].map((d) => (
                        <option key={d} value={d}>{d} Minutos</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Inicio del Torneo</label>
                  <select
                    value={minutosInicio}
                    onChange={(e) => setMinutosInicio(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm outline-none focus:border-amber-500"
                  >
                    <option value={5}>En 5 minutos a partir de ahora</option>
                    <option value={10}>En 10 minutos a partir de ahora</option>
                    <option value={30}>En 30 minutos</option>
                    <option value={60}>En 1 hora</option>
                  </select>
                </div>
              </div>

              {/* Parámetros de Autenticación de Lichess */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1">
                    <ShieldCheck size={14} /> Credenciales de Lichess
                  </span>
                  <a
                    href="https://lichess.org/account/oauth/token"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                  >
                    Generar Token en Lichess <ExternalLink size={11} />
                  </a>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    Personal API Token (permiso <code className="text-amber-300 font-mono">tournament:write</code>) *
                  </label>
                  <input
                    type="password"
                    value={lichessToken}
                    onChange={(e) => setLichessToken(e.target.value)}
                    placeholder="Pegá tu token de Lichess aquí"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white text-sm font-mono outline-none focus:border-amber-500"
                  />
                </div>

                {tipoTorneo === 'swiss' && (
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      ID de Club / Equipo (Team ID) de Lichess *
                    </label>
                    <input
                      type="text"
                      value={teamId}
                      onChange={(e) => setTeamId(e.target.value)}
                      placeholder="Ej: mi-club-de-ajedrez"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white text-sm font-mono outline-none focus:border-amber-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      En Lichess, los torneos Suizos se crean bajo un Equipo. El ID es la última parte de la URL de tu equipo (<code className="text-slate-400">lichess.org/team/<strong>tu-equipo</strong></code>).
                    </p>
                  </div>
                )}
              </div>

              {/* Error */}
              {crearError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-xs">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <p>{crearError}</p>
                </div>
              )}

              {/* Éxito */}
              {crearResult && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-2">
                  <div className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                    <CheckCircle size={18} /> ¡Torneo creado exitosamente en Lichess!
                  </div>
                  <p className="text-xs text-slate-300">
                    URL: <a href={crearResult.lichess_url} target="_blank" rel="noopener noreferrer" className="text-amber-400 underline font-mono">{crearResult.lichess_url}</a>
                  </p>
                  <p className="text-xs text-slate-400">
                    La sincronización en tiempo real quedó activada. Los emparejamientos y partidas se actualizarán automáticamente en MiCancha.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* TAB: IMPORTAR EXISTENTE */
            <div className="space-y-5">
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                  URL del Torneo en Lichess
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Search size={18} />
                    </div>
                    <input
                      type="text"
                      value={lichessUrl}
                      onChange={(e) => setLichessUrl(e.target.value)}
                      placeholder="https://lichess.org/swiss/Tz01xXhB"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-mono text-sm"
                    />
                  </div>
                  <button
                    onClick={handlePreview}
                    disabled={loading || !lichessUrl.trim()}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 text-xs"
                  >
                    {loading && !previewData ? <RefreshCw size={16} className="animate-spin" /> : "Analizar"}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-xs">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              {/* Preview */}
              {previewData && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-base font-bold text-white">{previewData.nombre}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          ID: <span className="text-slate-300 font-mono">{previewData.lichess_id}</span> •
                          Estado: <span className="capitalize text-emerald-400 font-bold">{previewData.status}</span>
                        </p>
                      </div>
                      <div className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-lg border border-indigo-500/20">
                        {previewData.rondas_totales} Rondas
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                        <div className="text-xs text-slate-400 mb-1">Jugadores Vinculados</div>
                        <div className="text-xl font-bold text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle size={16} />
                          {previewData.jugadores_empatados}
                        </div>
                      </div>
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                        <div className="text-xs text-slate-400 mb-1">Jugadores a Crear</div>
                        <div className="text-xl font-bold text-blue-400 flex items-center gap-1.5">
                          <AlertCircle size={16} />
                          {previewData.jugadores_faltantes?.length || 0}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                    <input
                      type="checkbox"
                      id="autoSync"
                      checked={autoSync}
                      onChange={(e) => setAutoSync(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500"
                    />
                    <div>
                      <label htmlFor="autoSync" className="text-xs font-bold text-blue-400 cursor-pointer">
                        Mantener sincronizado automáticamente en segundo plano
                      </label>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        MiCancha consultará Lichess periódicamente para actualizar las rondas y posiciones en vivo.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-800 bg-slate-950/60 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs text-slate-400 hover:text-white font-medium transition-colors"
          >
            Cerrar
          </button>

          {activeTab === 'crear' ? (
            <button
              onClick={handleCrearTorneo}
              disabled={crearLoading}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {crearLoading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Creando en Lichess...
                </>
              ) : (
                <>
                  <Zap size={14} /> Crear Torneo en Lichess y Vincular
                </>
              )}
            </button>
          ) : (
            previewData && (
              <button
                onClick={handleSync}
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <RefreshCw size={14} className="animate-spin" /> : "Iniciar Importación Completa"}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
