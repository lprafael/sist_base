"use client";
import React, { useState } from 'react';
import {
  X, Zap, ExternalLink, Copy, Check, Sparkles,
  Loader2, Clock, ShieldCheck, PlayCircle, Eye
} from 'lucide-react';

interface CrearLichessModalProps {
  isOpen: boolean;
  onClose: () => void;
  partidaId: string;
  blancasNombre?: string;
  negrasNombre?: string;
  tableroNumero?: number;
  numeroRonda?: number;
  onDesafioCreado?: (data: { url: string; embedUrl: string; gameId: string }) => void;
  onAbrirVisor?: (url: string) => void;
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

const PRESETS = [
  { id: '1+0',  l: '1 min',     sub: 'Bullet 1+0',  min: 1,  inc: 0, icon: '⚡' },
  { id: '3+2',  l: '3 + 2',     sub: 'Blitz 3+2',   min: 3,  inc: 2, icon: '🔥' },
  { id: '5+3',  l: '5 + 3',     sub: 'Blitz 5+3',   min: 5,  inc: 3, icon: '⏱️' },
  { id: '10+0', l: '10 min',    sub: 'Rápido 10+0', min: 10, inc: 0, icon: '⏳' },
  { id: '15+10',l: '15 + 10',   sub: 'Clásico FIDE',min: 15, inc: 10,icon: '🏆' },
];

export default function CrearLichessModal({
  isOpen,
  onClose,
  partidaId,
  blancasNombre = 'Blancas',
  negrasNombre = 'Negras',
  tableroNumero = 1,
  numeroRonda = 1,
  onDesafioCreado,
  onAbrirVisor,
}: CrearLichessModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('5+3');
  const [minutos, setMinutos] = useState<number>(5);
  const [incremento, setIncremento] = useState<number>(3);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (p: typeof PRESETS[0]) => {
    setSelectedPreset(p.id);
    setMinutos(p.min);
    setIncremento(p.inc);
  };

  const handleCrear = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/ajedrez/partidas/${partidaId}/crear-desafio-lichess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          tiempo_minutos: minutos,
          incremento_segundos: incremento,
          nombre_desafio: `MiCancha R${numeroRonda} T${tableroNumero}: ${blancasNombre} vs ${negrasNombre}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Error al conectar con Lichess');
      }

      setResultado(data);
      if (onDesafioCreado) {
        onDesafioCreado({
          url: data.url_partida,
          embedUrl: data.embed_url,
          gameId: data.game_id,
        });
      }
    } catch (err: any) {
      setError(err.message || 'No se pudo generar el desafío en Lichess');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black">
              <Zap size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                Crear Partida en Lichess con 1 Clic
              </h3>
              <p className="text-xs text-slate-400">
                Tablero {tableroNumero} · Ronda {numeroRonda} ({blancasNombre} vs {negrasNombre})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {!resultado ? (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Clock size={14} className="text-amber-400" /> Ritmo de Juego (Control de Tiempo)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {PRESETS.map((p) => {
                    const isSel = selectedPreset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPreset(p)}
                        className={`p-2.5 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                          isSel
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        <span className="text-lg">{p.icon}</span>
                        <span className="font-black text-xs leading-none">{p.l}</span>
                        <span className="text-[10px] text-slate-400">{p.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Parámetros personalizados */}
              <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Minutos base:</span>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={minutos}
                    onChange={(e) => {
                      setMinutos(Math.max(1, parseInt(e.target.value) || 1));
                      setSelectedPreset('custom');
                    }}
                    className="w-14 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Incremento (seg):</span>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={incremento}
                    onChange={(e) => {
                      setIncremento(Math.max(0, parseInt(e.target.value) || 0));
                      setSelectedPreset('custom');
                    }}
                    className="w-14 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-950/80 border border-red-800/80 text-red-200 rounded-xl text-xs">
                  {error}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCrear}
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.99] text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Conectando con Lichess API...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      <span>Generar Partida en Lichess</span>
                    </>
                  )}
                </button>
                <p className="text-[11px] text-slate-400 text-center mt-2.5">
                  Crea un desafío oficial con ritmo {minutos}m + {incremento}s y asigna el tablero automáticamente.
                </p>
              </div>
            </>
          ) : (
            /* Vista de Partida Creada con Enlaces */
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/50 rounded-2xl text-emerald-300 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center font-black flex-shrink-0">
                  <Check size={18} />
                </div>
                <div className="text-xs">
                  <span className="font-black block text-sm">¡Partida Creada con Éxito!</span>
                  <span>ID: <code className="font-mono font-bold text-white">{resultado.game_id}</code></span>
                </div>
              </div>

              {/* Enlace para Blancas */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-amber-300 flex items-center gap-1.5">
                    <span>♔</span> Blancas: {blancasNombre}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">Enlace de juego</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={resultado.url_blancas}
                    className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-mono select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(resultado.url_blancas, 'b')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
                      copiedKey === 'b'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                  >
                    {copiedKey === 'b' ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedKey === 'b' ? 'Copiado' : 'Copiar'}</span>
                  </button>
                  <a
                    href={resultado.url_blancas}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition font-bold"
                    title="Jugar con Blancas en Lichess"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>

              {/* Enlace para Negras */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-slate-200 flex items-center gap-1.5">
                    <span>♚</span> Negras: {negrasNombre}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">Enlace de juego</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={resultado.url_negras}
                    className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-mono select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(resultado.url_negras, 'n')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
                      copiedKey === 'n'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                  >
                    {copiedKey === 'n' ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedKey === 'n' ? 'Copiado' : 'Copiar'}</span>
                  </button>
                  <a
                    href={resultado.url_negras}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition font-bold"
                    title="Jugar con Negras en Lichess"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>

              {/* Botón para abrir el visor embebido directamente */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                {onAbrirVisor && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onAbrirVisor(resultado.url_partida);
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition"
                  >
                    <Eye size={16} />
                    <span>Abrir Tablero Embebido</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
