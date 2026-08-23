"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  Printer, 
  Play, 
  Pause, 
  Clock, 
  Users, 
  Plus, 
  Minus, 
  Maximize2, 
  FileText, 
  RefreshCw, 
  Radio, 
  Award,
  Video,
  ChevronRight,
  Settings2,
  AlertCircle
} from 'lucide-react';
import KarateWKFController from './KarateWKFController';
import KataWKFController from './KataWKFController';
import ActaCombateWKFModal from './ActaCombateWKFModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

interface TatamiInfo {
  id: number;
  nombre: string;
  matchActualId?: string;
  bloqueado?: boolean;
}

export default function MesaCentralWKFView({
  torneoId,
  torneo,
  onOpenMatchController
}: {
  torneoId: string;
  torneo?: any;
  onOpenMatchController?: (match: any) => void;
}) {
  const [partidos, setPartidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Configuración de Tatamis Dinámicos (Default: 3 Tatamis, ampliable a 1..12)
  const [numTatamis, setNumTatamis] = useState<number>(3);
  const [tatamisConfig, setTatamisConfig] = useState<TatamiInfo[]>([
    { id: 1, nombre: 'Tatami 1', bloqueado: false },
    { id: 2, nombre: 'Tatami 2', bloqueado: false },
    { id: 3, nombre: 'Tatami 3', bloqueado: false },
  ]);

  // Estado de bloqueos y validaciones de Mesa Central
  const [tatamisBloqueados, setTatamisBloqueados] = useState<{ [tatamiId: number]: boolean }>({});
  const [partidosValidados, setPartidosValidados] = useState<{ [matchId: string]: boolean }>({});

  // Modales
  const [actaMatch, setActaMatch] = useState<any | null>(null);
  const [activeControllerMatch, setActiveControllerMatch] = useState<any | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Cargar configuración de tatamis guardada en LocalStorage
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem(`wkf_tatamis_${torneoId}`);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTatamisConfig(parsed);
          setNumTatamis(parsed.length);
        }
      }
      const savedLocks = localStorage.getItem(`wkf_locks_${torneoId}`);
      if (savedLocks) setTatamisBloqueados(JSON.parse(savedLocks));
      const savedValids = localStorage.getItem(`wkf_valids_${torneoId}`);
      if (savedValids) setPartidosValidados(JSON.parse(savedValids));
    } catch (e) {
      console.error(e);
    }
  }, [torneoId]);

  // Guardar configuración al cambiar
  const saveTatamisConfig = (newConfig: TatamiInfo[]) => {
    setTatamisConfig(newConfig);
    setNumTatamis(newConfig.length);
    localStorage.setItem(`wkf_tatamis_${torneoId}`, JSON.stringify(newConfig));
  };

  const updateNumTatamis = (newTotal: number) => {
    const clamped = Math.max(1, Math.min(12, newTotal));
    let nextList = [...tatamisConfig];
    if (clamped > nextList.length) {
      for (let i = nextList.length + 1; i <= clamped; i++) {
        nextList.push({ id: i, nombre: `Tatami ${i}`, bloqueado: false });
      }
    } else if (clamped < nextList.length) {
      nextList = nextList.slice(0, clamped);
    }
    saveTatamisConfig(nextList);
  };

  const fetchPartidos = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/cancha/torneos/${torneoId}/partidos`);
      if (res.ok) {
        const data = await res.json();
        setPartidos(data);
        setLastUpdated(new Date());
      }
    } catch (e) {
      console.error('Error fetching matches for Mesa Central:', e);
    } finally {
      setLoading(false);
    }
  }, [torneoId]);

  useEffect(() => {
    fetchPartidos();
    const interval = setInterval(fetchPartidos, 3000); // Polling cada 3 segundos
    return () => clearInterval(interval);
  }, [fetchPartidos]);

  // Acciones de Mesa Central
  const toggleBloqueoTatami = (tatamiId: number) => {
    setTatamisBloqueados(prev => {
      const next = { ...prev, [tatamiId]: !prev[tatamiId] };
      localStorage.setItem(`wkf_locks_${torneoId}`, JSON.stringify(next));
      return next;
    });
  };

  const validarResultadoOficial = async (match: any) => {
    try {
      const sessionData = JSON.parse(localStorage.getItem('user_session') || '{}');
      const token = sessionData.access_token || sessionData.token || '';

      // Actualizar estado en servidor a finalizado y validado
      await fetch(`${API_URL}/cancha/torneos/partidos/${match.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          estado: 'finalizado',
          observaciones: 'Resultado validado y auditado por Mesa Central (Jefe de Árbitros).'
        })
      });

      setPartidosValidados(prev => {
        const next = { ...prev, [match.id]: true };
        localStorage.setItem(`wkf_valids_${torneoId}`, JSON.stringify(next));
        return next;
      });

      // Bloquear tatami correspondiente para evitar alteraciones
      const tatamiIndex = match.area || 1;
      setTatamisBloqueados(prev => {
        const next = { ...prev, [tatamiIndex]: true };
        localStorage.setItem(`wkf_locks_${torneoId}`, JSON.stringify(next));
        return next;
      });

      fetchPartidos();
    } catch (e) {
      console.error('Error validando resultado:', e);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-100">
      
      {/* HEADER DE MESA CENTRAL */}
      <div className="bg-slate-950 border-2 border-red-600 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-red-500 uppercase tracking-widest mb-1">
            <Radio size={16} className="text-red-500 animate-pulse" />
            Red Oficial de Arbitraje • Mesa Central WKF
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <Shield className="text-red-500" size={28} />
            Panel de Control del Jefe de Árbitros
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Monitoreo en tiempo real, validación oficial de actas y bloqueo de seguridad de tatamis.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2 text-xs flex items-center gap-3">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Tatamis Activos:</span>
              <span className="font-black text-white text-base">{tatamisConfig.length} Tatamis</span>
            </div>
            <button
              onClick={() => setShowConfigModal(true)}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition"
              title="Configurar Tatamis"
            >
              <Settings2 size={16} />
            </button>
          </div>

          <button
            onClick={() => fetchPartidos()}
            className="px-4 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {/* GRID DE TATAMIS DINÁMICOS */}
      <div className={`grid gap-6 ${
        tatamisConfig.length === 1 ? 'grid-cols-1' :
        tatamisConfig.length === 2 ? 'grid-cols-1 lg:grid-cols-2' :
        tatamisConfig.length === 3 ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' :
        'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
      }`}>
        {tatamisConfig.map((tatami) => {
          // Buscar el combate en vivo o más reciente asignado a este tatami (por match.area === tatami.id)
          const matchTatami = partidos.find(p => Number(p.area) === tatami.id && (p.estado === 'en_juego' || p.estado === 'pausado'))
            || partidos.find(p => Number(p.area) === tatami.id && p.estado === 'programado')
            || partidos.find(p => Number(p.area) === tatami.id && p.estado === 'finalizado')
            || null;

          const stats = typeof matchTatami?.estadisticas === 'string'
            ? JSON.parse(matchTatami.estadisticas || '{}')
            : (matchTatami?.estadisticas || {});

          const ptAka = stats?.local?.puntos ?? matchTatami?.goles_local ?? (stats?.votos_aka ?? 0);
          const ptAo = stats?.visitante?.puntos ?? matchTatami?.goles_visitante ?? (stats?.votos_ao ?? 0);
          const senshuAka = Boolean(stats?.local?.senshu);
          const senshuAo = Boolean(stats?.visitante?.senshu);
          const estaBloqueado = Boolean(tatamisBloqueados[tatami.id]);
          const estaValidado = matchTatami ? Boolean(partidosValidados[matchTatami.id]) : false;

          return (
            <div 
              key={tatami.id}
              className={`bg-slate-900 border-2 rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between transition-all ${
                estaBloqueado ? 'border-amber-600/70 bg-slate-900/95' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Encabezado del Tatami */}
              <div className={`p-4 flex items-center justify-between border-b ${
                matchTatami?.estado === 'en_juego' ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400' :
                matchTatami?.estado === 'finalizado' ? 'bg-slate-950 border-slate-800 text-slate-300' :
                'bg-slate-950 border-slate-800 text-slate-400'
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${matchTatami?.estado === 'en_juego' ? 'bg-emerald-500 animate-ping' : 'bg-slate-600'}`} />
                  <span className="font-black text-sm uppercase tracking-wider text-white">
                    {tatami.nombre}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {estaBloqueado && (
                    <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                      <Lock size={10} /> BLOQUEADO
                    </span>
                  )}
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                    matchTatami?.estado === 'en_juego' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                    matchTatami?.estado === 'finalizado' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {matchTatami?.estado ? matchTatami.estado.replace('_', ' ') : 'LIBRE'}
                  </span>
                </div>
              </div>

              {/* Contenido del Combate */}
              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                {matchTatami ? (
                  <>
                    <div className="text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block truncate">
                        {matchTatami.categoria || matchTatami.fase || 'Categoría Kumite WKF'}
                      </span>
                    </div>

                    {/* Duelo Visual AKA vs AO */}
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80">
                      {/* AKA */}
                      <div className="text-left overflow-hidden">
                        <span className="text-[9px] font-black text-red-400 uppercase tracking-wider block">AKA (ROJO)</span>
                        <div className="text-xs font-bold text-slate-100 truncate">{matchTatami.jugador_local_nombre || matchTatami.local_nombre || 'AKA'}</div>
                        <div className="text-3xl font-black font-mono text-red-500 mt-1">{ptAka}</div>
                        {senshuAka && <span className="text-[8px] bg-amber-400 text-slate-950 font-black px-1 rounded inline-block mt-0.5">SENSHU</span>}
                      </div>

                      <div className="text-slate-600 font-black text-xs">VS</div>

                      {/* AO */}
                      <div className="text-right overflow-hidden">
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-wider block">AO (AZUL)</span>
                        <div className="text-xs font-bold text-slate-100 truncate">{matchTatami.jugador_visitante_nombre || matchTatami.visitante_nombre || 'AO'}</div>
                        <div className="text-3xl font-black font-mono text-blue-500 mt-1">{ptAo}</div>
                        {senshuAo && <span className="text-[8px] bg-amber-400 text-slate-950 font-black px-1 rounded inline-block mt-0.5">SENSHU</span>}
                      </div>
                    </div>

                    {/* Estado de Sanciones y Criterio */}
                    <div className="flex justify-between items-center text-[10px] text-slate-400 px-1">
                      <span>Faltas AKA: <strong className="text-red-400">{stats?.local?.penalizaciones || 0}</strong></span>
                      <span>Diferencia: <strong className="text-white">{Math.abs(ptAka - ptAo)} pts</strong></span>
                      <span>Faltas AO: <strong className="text-blue-400">{stats?.visitante?.penalizaciones || 0}</strong></span>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    <p className="font-bold">Tatami sin combate activo</p>
                    <p className="text-[10px] text-slate-600 mt-1">Listo para asignar el siguiente combate de la llave.</p>
                  </div>
                )}

                {/* Acciones del Jefe de Árbitros para este Tatami */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  {matchTatami && (
                    <div className="grid grid-cols-2 gap-2">
                      {/* Botón Validar Oficialmente */}
                      <button
                        onClick={() => validarResultadoOficial(matchTatami)}
                        disabled={matchTatami.estado !== 'finalizado' || estaValidado}
                        className={`py-2 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                          estaValidado
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                            : matchTatami.estado === 'finalizado'
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                            : 'bg-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <CheckCircle2 size={14} />
                        {estaValidado ? 'Validado' : 'Validar Resultado'}
                      </button>

                      {/* Botón Imprimir Acta */}
                      <button
                        onClick={() => setActaMatch(matchTatami)}
                        className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5"
                      >
                        <Printer size={14} /> Acta Combate
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {/* Bloqueo de Tatami */}
                    <button
                      onClick={() => toggleBloqueoTatami(tatami.id)}
                      className={`py-2 px-3 rounded-xl font-bold text-xs transition border flex items-center justify-center gap-1.5 ${
                        estaBloqueado
                          ? 'bg-amber-950/50 text-amber-300 border-amber-600 hover:bg-amber-900/60'
                          : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                    >
                      {estaBloqueado ? <><Unlock size={14} /> Desbloquear</> : <><Lock size={14} /> Bloquear Mesa</>}
                    </button>

                    {/* Abrir Controlador Standalone */}
                    {matchTatami && (
                      <button
                        onClick={() => {
                          if (onOpenMatchController) onOpenMatchController(matchTatami);
                          else setActiveControllerMatch(matchTatami);
                        }}
                        className="py-2 px-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 shadow"
                      >
                        <Maximize2 size={14} /> Controlar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DE CONFIGURACIÓN DINÁMICA DE TATAMIS */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[160] flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-red-600 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-base font-black uppercase text-red-500 flex items-center gap-2">
                <Settings2 size={20} />
                Configurar Tatamis del Torneo
              </h3>
              <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-300">
                Define cuántos tatamis físicos operarán simultáneamente en el evento:
              </p>

              <div className="flex items-center justify-center gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <button
                  onClick={() => updateNumTatamis(tatamisConfig.length - 1)}
                  disabled={tatamisConfig.length <= 1}
                  className="w-10 h-10 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-xl flex items-center justify-center font-bold text-lg"
                >
                  -
                </button>
                <div className="text-center">
                  <span className="text-3xl font-black text-white font-mono">{tatamisConfig.length}</span>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Tatamis Activos</span>
                </div>
                <button
                  onClick={() => updateNumTatamis(tatamisConfig.length + 1)}
                  disabled={tatamisConfig.length >= 12}
                  className="w-10 h-10 bg-red-600 hover:bg-red-500 disabled:opacity-30 rounded-xl flex items-center justify-center font-bold text-lg"
                >
                  +
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {tatamisConfig.map((tatami, idx) => (
                  <div key={tatami.id} className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                    <span className="text-slate-500 font-bold px-2">#{idx + 1}</span>
                    <input
                      type="text"
                      value={tatami.nombre}
                      onChange={e => {
                        const next = [...tatamisConfig];
                        next[idx].nombre = e.target.value;
                        saveTatamisConfig(next);
                      }}
                      className="flex-1 bg-transparent text-white font-bold outline-none text-xs"
                      placeholder={`Tatami ${idx + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-xs uppercase tracking-wider transition shadow-lg"
              >
                Guardar y Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ACTA OFICIAL WKF */}
      {actaMatch && (
        <ActaCombateWKFModal
          match={actaMatch}
          torneo={torneo}
          onClose={() => setActaMatch(null)}
        />
      )}

      {/* MODAL DE CONTROLADOR WKF (KUMITE O KATA) */}
      {activeControllerMatch && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[170] flex items-center justify-center p-2 md:p-6 animate-fadeIn">
          <div className="w-full max-w-7xl max-h-[96vh] overflow-y-auto">
            {activeControllerMatch?.estadisticas?.modalidad_kata !== undefined ? (
              <KataWKFController
                match={activeControllerMatch}
                torneoId={torneoId}
                onClose={() => {
                  setActiveControllerMatch(null);
                  fetchPartidos();
                }}
              />
            ) : (
              <KarateWKFController
                match={activeControllerMatch}
                torneoId={torneoId}
                onClose={() => {
                  setActiveControllerMatch(null);
                  fetchPartidos();
                }}
              />
            )}
          </div>
        </div>
      )}

    </div>
  );
}
