"use client";
import React, { useState, useEffect } from 'react';
import { X, ExternalLink, RefreshCw, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

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
  const [syncMsg, setSyncMsg] = useState<{ text: string; type: 'ok' | 'info' | 'err' } | null>(null);

  const gameId = extraerLichessId(gameUrlOrId);

  useEffect(() => {
    setSyncMsg(null);
  }, [gameUrlOrId, isOpen]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
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
              </div>
              <p className="text-xs text-slate-400 font-mono">Lichess ID: {gameId}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={canonicalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition border border-slate-700"
              title="Abrir en Lichess.org"
            >
              <ExternalLink size={13} />
              <span className="hidden sm:inline">Abrir en Lichess</span>
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

        {/* Iframe del Tablero Lichess */}
        <div className="relative flex-1 bg-slate-950 flex items-center justify-center p-2 sm:p-4 min-h-[480px]">
          <iframe
            src={embedUrl}
            className="w-full h-[470px] sm:h-[510px] rounded-2xl border border-slate-800/80 shadow-2xl bg-slate-950"
            frameBorder="0"
            allowFullScreen
          />
        </div>

        {/* Footer / Acciones */}
        <div className="px-6 py-3.5 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Tablero interactivo oficial de Lichess</span>
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
                Sincronizar Resultado con Lichess
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
