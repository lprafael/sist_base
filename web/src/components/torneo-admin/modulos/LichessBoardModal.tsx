"use client";
import React, { useState, useEffect } from 'react';
import {
  X, ExternalLink, RefreshCw, Loader2,
  CheckCircle2, AlertCircle, Sparkles, ShieldCheck,
  ShieldAlert, Activity, BarChart2, Eye
} from 'lucide-react';

interface LichessBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameUrlOrId: string;
  partidaId?: string;
  blancasNombre?: string;
  negrasNombre?: string;
  tableroNumero?: number;
  resultadoActual?: string;
  onResultadoSincronizado?: (resultado: string) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

const getToken = () => {
  try {
    const s = JSON.parse(localStorage.getItem('user_session') || '{}');
    return s.access_token || s.token || '';
  } catch {
    return '';
  }
};

const authHdrs = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

export function extraerLichessId(urlOId?: string): string | null {
  if (!urlOId) return null;
  const s = urlOId.trim();
  const match = s.match(/(?:lichess\.org\/(?:embed\/game\/)?|lichess\.org\/)?([a-zA-Z0-9]{8})/);
  return match ? match[1] : null;
}

export default function LichessBoardModal({
  isOpen,
  onClose,
  gameUrlOrId,
  partidaId,
  blancasNombre = 'Blancas',
  negrasNombre = 'Negras',
  tableroNumero,
  resultadoActual,
  onResultadoSincronizado,
}: LichessBoardModalProps) {
  const [syncing, setSyncing] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [gameData, setGameData] = useState<any>(null);
  const [syncMsg, setSyncMsg] = useState<{ text: string; type: 'ok' | 'info' | 'err' } | null>(null);
  const [showAntitrampa, setShowAntitrampa] = useState(false);

  const gameId = extraerLichessId(gameUrlOrId);

  useEffect(() => {
    setSyncMsg(null);
    setGameData(null);
    setShowAntitrampa(false);

    if (isOpen && gameId) {
      // Cargar datos de análisis y métricas antitrampa
      setLoadingAnalysis(true);
      fetch(`${API_URL}/api/ajedrez/lichess/game/${gameId}`)
        .then(r => (r.ok ? r.json() : null))
        .then(d => {
          if (d) setGameData(d);
        })
        .catch(err => console.error(err))
        .finally(() => setLoadingAnalysis(false));
    }
  }, [gameUrlOrId, isOpen, gameId]);

  if (!isOpen || !gameId) return null;

  const embedUrl = `https://lichess.org/embed/game/${gameId}?theme=auto&bg=auto`;
  const canonicalUrl = `https://lichess.org/${gameId}`;

  const handleSincronizar = async () => {
    if (!partidaId) return;
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/ajedrez/partidas/${partidaId}/sincronizar-lichess`, {
        method: 'POST',
        headers: authHdrs(),
        body: JSON.stringify({ url_partida: canonicalUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al sincronizar');

      if (data.antitrampa) {
        setGameData((prev: any) => ({ ...(prev || {}), antitrampa: data.antitrampa }));
      }

      if (data.resultado) {
        setSyncMsg({
          text: `¡Partida finalizada! Resultado: ${data.resultado}. Posiciones actualizadas.`,
          type: 'ok',
        });
        if (onResultadoSincronizado) {
          onResultadoSincronizado(data.resultado);
        }
      } else {
        setSyncMsg({
          text: data.mensaje || 'La partida aún está en juego en Lichess.',
          type: 'info',
        });
      }
    } catch (err: any) {
      setSyncMsg({ text: err.message, type: 'err' });
    } finally {
      setSyncing(false);
    }
  };

  const antitrampa = gameData?.antitrampa;
  const alertaSospecha = antitrampa?.alerta_sospecha;
  const blancasEval = antitrampa?.blancas;
  const negrasEval = antitrampa?.negras;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[96vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900">
          <div className="flex items-center gap-3">
            <span className="text-3xl">♟️</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">
                  {tableroNumero ? `Tablero ${tableroNumero}: ` : ''}
                  <span className="text-amber-400">{blancasNombre}</span>
                  <span className="text-slate-500 font-light mx-1">vs</span>
                  <span className="text-slate-300">{negrasNombre}</span>
                </h3>
                {resultadoActual && (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {resultadoActual}
                  </span>
                )}
                {alertaSospecha && (
                  <span className="bg-red-500/20 text-red-300 border border-red-500/40 text-xs px-2.5 py-0.5 rounded-full font-black flex items-center gap-1 animate-pulse">
                    <ShieldAlert size={12} /> Alerta Sospecha
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono">Lichess ID: {gameId}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAntitrampa(!showAntitrampa)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border ${
                showAntitrampa
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : alertaSospecha
                  ? 'bg-red-950 text-red-300 border-red-800'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Ver análisis de centipeones y control antitrampa"
            >
              {alertaSospecha ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
              <span>Antitrampa / ACPL</span>
            </button>
            <a
              href={canonicalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition border border-slate-700"
              title="Abrir en Lichess.org"
            >
              <ExternalLink size={13} />
              <span className="hidden sm:inline">Lichess</span>
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Notificación de sincronización */}
        {syncMsg && (
          <div
            className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between border-b ${
              syncMsg.type === 'ok'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/50'
                : syncMsg.type === 'info'
                ? 'bg-blue-950/80 text-blue-300 border-blue-800/50'
                : 'bg-red-950/80 text-red-300 border-red-800/50'
            }`}
          >
            <div className="flex items-center gap-2">
              {syncMsg.type === 'ok' && <CheckCircle2 size={15} />}
              {syncMsg.type === 'info' && <Sparkles size={15} />}
              {syncMsg.type === 'err' && <AlertCircle size={15} />}
              <span>{syncMsg.text}</span>
            </div>
            <button onClick={() => setSyncMsg(null)} className="opacity-70 hover:opacity-100">
              <X size={13} />
            </button>
          </div>
        )}

        {/* Panel Desplegable de Control Antitrampa */}
        {showAntitrampa && (
          <div className="bg-slate-950/95 border-b border-slate-800 p-4 text-xs animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart2 size={16} className="text-amber-400" />
                <h4 className="font-black text-white text-sm">Auditoría Antitrampa & Precisión (ACPL)</h4>
              </div>
              {antitrampa?.cheat_flag_lichess && (
                <span className="bg-red-600 text-white font-black px-2.5 py-0.5 rounded-full text-[11px]">
                  Sanción Lichess (Cheat)
                </span>
              )}
            </div>

            {loadingAnalysis ? (
              <div className="py-4 text-center text-slate-400 flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin text-amber-500" />
                <span>Analizando métricas de centipeones en Lichess...</span>
              </div>
            ) : antitrampa ? (
              <div className="space-y-3">
                {/* Banner de veredicto */}
                <div
                  className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                    alertaSospecha
                      ? 'bg-red-950/60 border-red-800/60 text-red-200'
                      : 'bg-emerald-950/40 border-emerald-800/50 text-emerald-200'
                  }`}
                >
                  {alertaSospecha ? (
                    <ShieldAlert size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <ShieldCheck size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-black block text-[13px]">
                      {alertaSospecha ? '⚠️ Sospecha de Asistencia Externa / Motor' : '✅ Comportamiento Estadístico Normal'}
                    </span>
                    <span className="text-[11px] opacity-90">{antitrampa.resumen_alerta}</span>
                  </div>
                </div>

                {/* Métricas por lado */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Blancas */}
                  <div className={`p-3 rounded-xl border ${blancasEval?.sospechoso ? 'bg-red-950/30 border-red-800/50' : 'bg-slate-900 border-slate-800'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-amber-300 flex items-center gap-1.5">
                        <span>♔</span> Blancas ({blancasNombre})
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        blancasEval?.acpl !== null && blancasEval?.acpl <= 16
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {blancasEval?.precision_nivel}
                      </span>
                    </div>
                    {blancasEval?.disponible ? (
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="bg-slate-950/60 p-2 rounded-lg">
                          <span className="text-slate-400 block text-[10px]">ACPL (Pérdida)</span>
                          <span className={`font-mono font-black text-sm ${blancasEval.acpl <= 16 ? 'text-red-400' : 'text-slate-200'}`}>
                            {blancasEval.acpl ?? '—'}
                          </span>
                        </div>
                        <div className="bg-slate-950/60 p-2 rounded-lg">
                          <span className="text-slate-400 block text-[10px]">Blunders</span>
                          <span className="font-mono font-bold text-sm text-slate-200">{blancasEval.blunder}</span>
                        </div>
                        <div className="bg-slate-950/60 p-2 rounded-lg">
                          <span className="text-slate-400 block text-[10px]">Mistakes</span>
                          <span className="font-mono font-bold text-sm text-slate-200">{blancasEval.mistake}</span>
                        </div>
                        <div className="bg-slate-950/60 p-2 rounded-lg">
                          <span className="text-slate-400 block text-[10px]">Inaccuracies</span>
                          <span className="font-mono font-bold text-sm text-slate-200">{blancasEval.inaccuracy}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-500 text-[11px]">Sin evaluación de jugadas disponible en Lichess</p>
                    )}
                  </div>

                  {/* Negras */}
                  <div className={`p-3 rounded-xl border ${negrasEval?.sospechoso ? 'bg-red-950/30 border-red-800/50' : 'bg-slate-900 border-slate-800'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-300 flex items-center gap-1.5">
                        <span>♚</span> Negras ({negrasNombre})
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        negrasEval?.acpl !== null && negrasEval?.acpl <= 16
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {negrasEval?.precision_nivel}
                      </span>
                    </div>
                    {negrasEval?.disponible ? (
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="bg-slate-950/60 p-2 rounded-lg">
                          <span className="text-slate-400 block text-[10px]">ACPL (Pérdida)</span>
                          <span className={`font-mono font-black text-sm ${negrasEval.acpl <= 16 ? 'text-red-400' : 'text-slate-200'}`}>
                            {negrasEval.acpl ?? '—'}
                          </span>
                        </div>
                        <div className="bg-slate-950/60 p-2 rounded-lg">
                          <span className="text-slate-400 block text-[10px]">Blunders</span>
                          <span className="font-mono font-bold text-sm text-slate-200">{negrasEval.blunder}</span>
                        </div>
                        <div className="bg-slate-950/60 p-2 rounded-lg">
                          <span className="text-slate-400 block text-[10px]">Mistakes</span>
                          <span className="font-mono font-bold text-sm text-slate-200">{negrasEval.mistake}</span>
                        </div>
                        <div className="bg-slate-950/60 p-2 rounded-lg">
                          <span className="text-slate-400 block text-[10px]">Inaccuracies</span>
                          <span className="font-mono font-bold text-sm text-slate-200">{negrasEval.inaccuracy}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-500 text-[11px]">Sin evaluación de jugadas disponible en Lichess</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-center py-2">
                La partida aún no cuenta con análisis de Stockfish en Lichess. Al solicitar análisis en Lichess se actualizarán estas métricas.
              </p>
            )}
          </div>
        )}

        {/* Iframe del Tablero Lichess */}
        <div className="relative flex-1 bg-slate-950 flex items-center justify-center p-2 sm:p-4 min-h-[460px]">
          <iframe
            src={embedUrl}
            className="w-full h-[450px] sm:h-[490px] rounded-2xl border border-slate-800/80 shadow-2xl bg-slate-950"
            frameBorder="0"
            allowFullScreen
          />
        </div>

        {/* Footer / Acciones */}
        <div className="px-6 py-3.5 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Tablero interactivo Lichess
            </span>
            {gameData?.total_moves ? (
              <span className="text-slate-500">· {gameData.total_moves} jugadas</span>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            {partidaId && (
              <button
                onClick={handleSincronizar}
                disabled={syncing}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
              >
                {syncing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                Sincronizar Resultado & Auditoría
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
