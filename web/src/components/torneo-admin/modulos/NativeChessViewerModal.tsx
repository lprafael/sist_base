"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, ArrowLeftRight, Clock, Trophy, Volume2,
  VolumeX, Copy, Check, Radio, RotateCcw, Sparkles
} from 'lucide-react';
import {
  ChessGame, Square, PieceType, Color,
  coordsToSquare, squareToCoords, BoardState
} from './chessEngine';

interface NativeChessViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  partidaId: string;
  blancasNombre?: string;
  negrasNombre?: string;
  tableroNumero?: number;
  numeroRonda?: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

/* ─── Web Audio API Sound Synthesizer ─── */
function playSynthSound(type: 'move' | 'capture' | 'check' | 'gameover', enabled: boolean = true) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'move') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'capture') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(250, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'check') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.setValueAtTime(850, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } else if (type === 'gameover') {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0.3, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.25);
      });
    }
  } catch {
    // Ignorar si el navegador bloquea audio antes de interacción
  }
}

/* ─── Piezas Vectoriales SVG ─── */
const SVG_PIECES: Record<string, React.ReactNode> = {
  // Blancas
  wp: (
    <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md">
      <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  wn: (
    <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md">
      <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
      <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
      <circle cx="15.5" cy="15.5" r="1.5" fill="#1e293b" />
    </svg>
  ),
  wb: (
    <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md">
      <g fill="none" fillRule="evenodd" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <g fill="#ffffff" stroke="#1e293b">
          <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2zM15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2zM25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" />
          <path d="M17.5 26h10M15 30h15M22.5 15.5v5M20 18h5" stroke="#1e293b" />
        </g>
      </g>
    </svg>
  ),
  wr: (
    <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md">
      <g fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" />
        <path d="M34 14l-3 3H14l-3-3" />
        <path d="M31 17v12.5H14V17" />
        <path d="M31 29.5l1.5 2.5h-20l1.5-2.5" />
        <path d="M11 14h23" />
      </g>
    </svg>
  ),
  wq: (
    <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md">
      <g fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM24.5 7.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM33 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0z" />
        <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 2-1 .5-2.5 0 0 0-1.5-1.5-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" />
        <path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none" />
        <path d="M9 26c0-1.5 2-2.5 3-4 1.5-2 2-6 2-6l5 13 5-13s.5 4 2 6c1 1.5 3 2.5 3 4" />
      </g>
    </svg>
  ),
  wk: (
    <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md">
      <g fill="none" fillRule="evenodd" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.5 11.63V6M20 8h5" stroke="#1e293b" />
        <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#ffffff" stroke="#1e293b" />
        <path d="M11.5 37c5.5 3.5 16.5 3.5 22 0v-3c-5.5 2-16.5 2-22 0v3z" fill="#ffffff" stroke="#1e293b" />
        <path d="M11.5 30c5.5-3 16.5-3 22 0m-22 4c5.5-2 16.5-2 22 0" />
      </g>
    </svg>
  ),
  // Negras
  bp: (
    <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md">
      <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#1e293b" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  bn: (
    <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md">
      <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#1e293b" stroke="#ffffff" strokeWidth="1.5" />
      <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="#1e293b" stroke="#ffffff" strokeWidth="1.5" />
      <circle cx="15.5" cy="15.5" r="1.5" fill="#ffffff" />
    </svg>
  ),
  bb: (
    <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md">
      <g fill="none" fillRule="evenodd" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <g fill="#1e293b" stroke="#ffffff">
          <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2zM15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2zM25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" />
          <path d="M17.5 26h10M15 30h15M22.5 15.5v5M20 18h5" stroke="#ffffff" />
        </g>
      </g>
    </svg>
  ),
  br: (
    <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md">
      <g fill="#1e293b" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" />
        <path d="M34 14l-3 3H14l-3-3" />
        <path d="M31 17v12.5H14V17" />
        <path d="M31 29.5l1.5 2.5h-20l1.5-2.5" />
        <path d="M11 14h23" />
      </g>
    </svg>
  ),
  bq: (
    <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md">
      <g fill="#1e293b" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM24.5 7.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM33 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0z" />
        <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 2-1 .5-2.5 0 0 0-1.5-1.5-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" />
        <path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none" />
        <path d="M9 26c0-1.5 2-2.5 3-4 1.5-2 2-6 2-6l5 13 5-13s.5 4 2 6c1 1.5 3 2.5 3 4" />
      </g>
    </svg>
  ),
  bk: (
    <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md">
      <g fill="none" fillRule="evenodd" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.5 11.63V6M20 8h5" stroke="#ffffff" />
        <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#1e293b" stroke="#ffffff" />
        <path d="M11.5 37c5.5 3.5 16.5 3.5 22 0v-3c-5.5 2-16.5 2-22 0v3z" fill="#1e293b" stroke="#ffffff" />
        <path d="M11.5 30c5.5-3 16.5-3 22 0m-22 4c5.5-2 16.5-2 22 0" />
      </g>
    </svg>
  ),
};

export default function NativeChessViewerModal({
  isOpen,
  onClose,
  partidaId,
  blancasNombre = 'Blancas',
  negrasNombre = 'Negras',
  tableroNumero = 1,
  numeroRonda = 1,
}: NativeChessViewerModalProps) {
  const [engine] = useState(() => new ChessGame());
  const [board, setBoard] = useState<BoardState>(() => engine.getBoard());
  const [turn, setTurn] = useState<Color>('w');
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [whiteTime, setWhiteTime] = useState<number>(300);
  const [blackTime, setBlackTime] = useState<number>(300);
  const [history, setHistory] = useState<any[]>([]);
  const [pgn, setPgn] = useState<string>('');
  const [gameOver, setGameOver] = useState<{ over: boolean; result?: string; reason?: string }>({ over: false });
  const [flipBoard, setFlipBoard] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copiedPgn, setCopiedPgn] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(true);

  const prevHistoryLenRef = useRef<number>(0);
  const prevFenRef = useRef<string>('');
  const historyScrollRef = useRef<HTMLDivElement>(null);

  const fetchLiveState = useCallback(async () => {
    if (!partidaId) return;
    try {
      const res = await fetch(`${API_URL}/api/ajedrez/partidas/${partidaId}/live`);
      if (!res.ok) return;
      const data = await res.json();

      const live = data.live || {};
      const fen = live.fen || data.analisis_partida?.fen_final || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const hist = live.history || data.analisis_partida?.movimientos || [];
      const currentPgn = live.pgn || data.pgn || data.analisis_partida?.pgn || '';

      // Tiempos
      if (live.white_time !== undefined) setWhiteTime(live.white_time);
      if (live.black_time !== undefined) setBlackTime(live.black_time);

      // Historial y PGN
      setHistory(hist);
      if (currentPgn) setPgn(currentPgn);

      // Estado de juego terminado
      if (data.resultado || live.game_over?.over || data.estado === 'finalizada') {
        setIsLiveActive(false);
        setGameOver({
          over: true,
          result: data.resultado || live.game_over?.result || '1-0',
          reason: live.game_over?.reason || data.notas || 'Partida Finalizada',
        });
      } else {
        setIsLiveActive(data.estado === 'en_curso');
      }

      // Si cambió la posición FEN
      if (fen !== prevFenRef.current) {
        prevFenRef.current = fen;
        engine.loadFen(fen);
        setBoard(engine.getBoard());
        setTurn(engine.getTurn());

        if (live.last_move) {
          setLastMove({ from: live.last_move.from, to: live.last_move.to });
        }

        // Sonido de nueva jugada
        if (hist.length > prevHistoryLenRef.current) {
          prevHistoryLenRef.current = hist.length;
          const lastH = hist[hist.length - 1];
          if (lastH?.flags?.isCheckmate || live.game_over?.over) {
            playSynthSound('gameover', soundEnabled);
          } else if (lastH?.flags?.isCheck) {
            playSynthSound('check', soundEnabled);
          } else if (lastH?.flags?.isCapture) {
            playSynthSound('capture', soundEnabled);
          } else {
            playSynthSound('move', soundEnabled);
          }
        }
      }
    } catch {
      // Ignorar errores de red transitorios en polling
    }
  }, [partidaId, engine, soundEnabled]);

  // Polling continuo en tiempo real (cada 1.5s)
  useEffect(() => {
    if (!isOpen || !partidaId) return;

    fetchLiveState();
    const interval = setInterval(fetchLiveState, 1500);

    return () => clearInterval(interval);
  }, [isOpen, partidaId, fetchLiveState]);

  // Auto-scroll del historial al llegar nuevas jugadas
  useEffect(() => {
    if (historyScrollRef.current) {
      historyScrollRef.current.scrollTop = historyScrollRef.current.scrollHeight;
    }
  }, [history.length]);

  const handleCopyPGN = () => {
    if (!pgn) return;
    navigator.clipboard.writeText(pgn);
    setCopiedPgn(true);
    setTimeout(() => setCopiedPgn(false), 2500);
  };

  const formatClock = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[96vh] overflow-hidden shadow-2xl flex flex-col text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
              <Radio size={20} className={isLiveActive ? 'animate-pulse text-red-950' : ''} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">
                  Tablero {tableroNumero}: {blancasNombre} vs {negrasNombre}
                </h3>
                <span className="bg-slate-800 text-slate-300 text-[11px] font-bold px-2 py-0.5 rounded-full border border-slate-700">
                  Ronda {numeroRonda}
                </span>
                <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1.5 border ${
                  isLiveActive
                    ? 'bg-red-500/20 text-red-300 border-red-500/30 animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isLiveActive ? 'bg-red-400' : 'bg-emerald-400'}`} />
                  {isLiveActive ? 'TRANSMISIÓN EN VIVO' : 'PARTIDA CONCLUIDA'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Visor Oficial de Espectadores · Tablero Nativo en Tiempo Real
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFlipBoard(!flipBoard)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Girar tablero"
            >
              <ArrowLeftRight size={16} />
            </button>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl transition ${
                soundEnabled ? 'bg-slate-800 text-amber-400' : 'bg-slate-800 text-slate-500'
              }`}
              title={soundEnabled ? 'Sonido activado' : 'Sonido desactivado'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6">
          
          {/* TABLERO 8x8 CON RELOJES */}
          <div className="w-full max-w-[480px] flex flex-col items-center">
            {/* Reloj Superior */}
            <div className="w-full flex items-center justify-between px-3 py-2 bg-slate-900/90 border border-slate-800 rounded-2xl mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">{flipBoard ? '♔' : '♚'}</span>
                <span className="font-bold text-xs text-slate-200">
                  {flipBoard ? blancasNombre : negrasNombre}
                </span>
                {(flipBoard ? turn === 'w' : turn === 'b') && isLiveActive && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </div>
              <div
                className={`font-mono font-black text-sm px-3 py-1 rounded-xl border flex items-center gap-1.5 ${
                  (flipBoard ? turn === 'w' : turn === 'b') && isLiveActive
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                <Clock size={13} />
                <span>{formatClock(flipBoard ? whiteTime : blackTime)}</span>
              </div>
            </div>

            {/* TABLERO 8x8 */}
            <div className="relative w-full aspect-square bg-[#769656] rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800 grid grid-cols-8 grid-rows-8 select-none">
              {(flipBoard ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7]).map((r) =>
                (flipBoard ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7]).map((c) => {
                  const sq = coordsToSquare(r, c);
                  const isLight = (r + c) % 2 === 0;
                  const piece = board[r]?.[c];
                  const isLastMoveFrom = lastMove?.from === sq;
                  const isLastMoveTo = lastMove?.to === sq;
                  const isCheckSquare = piece?.type === 'k' && piece?.color === turn && engine.inCheck(turn);

                  let squareBg = isLight ? 'bg-[#eeeed2]' : 'bg-[#769656]';
                  if (isLastMoveFrom || isLastMoveTo) squareBg = isLight ? 'bg-[#f7ec7d]' : 'bg-[#baca44]';
                  else if (isCheckSquare) squareBg = 'bg-red-500/80 ring-4 ring-red-600 animate-pulse';

                  return (
                    <div
                      key={sq}
                      className={`relative flex items-center justify-center transition-colors ${squareBg}`}
                    >
                      {/* Coordenadas en esquinas */}
                      {c === (flipBoard ? 7 : 0) && (
                        <span className={`absolute top-0.5 left-1 text-[9px] font-black pointer-events-none ${isLight ? 'text-[#769656]' : 'text-[#eeeed2]'}`}>
                          {8 - r}
                        </span>
                      )}
                      {r === (flipBoard ? 0 : 7) && (
                        <span className={`absolute bottom-0.5 right-1 text-[9px] font-black pointer-events-none ${isLight ? 'text-[#769656]' : 'text-[#eeeed2]'}`}>
                          {String.fromCharCode(97 + c)}
                        </span>
                      )}

                      {/* Pieza SVG */}
                      {piece && (
                        <div className="w-[82%] h-[82%] pointer-events-none transition-transform duration-200">
                          {SVG_PIECES[`${piece.color}${piece.type}`]}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Reloj Inferior */}
            <div className="w-full flex items-center justify-between px-3 py-2 bg-slate-900/90 border border-slate-800 rounded-2xl mt-2.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">{flipBoard ? '♚' : '♔'}</span>
                <span className="font-bold text-xs text-slate-200">
                  {flipBoard ? negrasNombre : blancasNombre}
                </span>
                {(flipBoard ? turn === 'b' : turn === 'w') && isLiveActive && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </div>
              <div
                className={`font-mono font-black text-sm px-3 py-1 rounded-xl border flex items-center gap-1.5 ${
                  (flipBoard ? turn === 'b' : turn === 'w') && isLiveActive
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                <Clock size={13} />
                <span>{formatClock(flipBoard ? blackTime : whiteTime)}</span>
              </div>
            </div>
          </div>

          {/* PANEL DERECHO: ESTADO EN VIVO Y PGN */}
          <div className="flex-1 w-full max-w-[420px] flex flex-col space-y-4">
            
            {/* Banner de Estado */}
            {gameOver.over ? (
              <div className="bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-900 border-2 border-amber-500/40 rounded-3xl p-4 shadow-xl space-y-2 animate-in zoom-in-95">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg shadow-amber-500/30">
                    <Trophy size={26} />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                      Resultado Final
                    </span>
                    <h4 className="text-xl font-black text-white">
                      {gameOver.result} · {gameOver.reason}
                    </h4>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-lg">
                  {turn === 'w' ? '♔' : '♚'}
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider">
                    Turno actual
                  </span>
                  <h4 className="text-sm font-bold text-white">
                    Mueven {turn === 'w' ? `Blancas (${blancasNombre})` : `Negras (${negrasNombre})`}
                  </h4>
                </div>
              </div>
            )}

            {/* Historial de Movimientos PGN */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 flex-1 flex flex-col min-h-[220px] max-h-[300px]">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-bold text-slate-400">
                <span>Historial de Jugadas ({history.length})</span>
                <div className="flex items-center gap-2">
                  {pgn && (
                    <button
                      onClick={handleCopyPGN}
                      className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-amber-400 transition"
                      title="Copiar notación PGN completa"
                    >
                      {copiedPgn ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedPgn ? 'Copiado' : 'Copiar PGN'}</span>
                    </button>
                  )}
                  <span className="font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-amber-400">PGN</span>
                </div>
              </div>

              <div ref={historyScrollRef} className="overflow-y-auto flex-1 pt-2 space-y-1 text-xs font-mono">
                {history.length === 0 ? (
                  <p className="text-slate-600 text-center py-8">Esperando los primeros movimientos de la partida...</p>
                ) : (
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    {Array.from({ length: Math.ceil(history.length / 2) }).map((_, i) => {
                      const wMove = history[i * 2];
                      const bMove = history[i * 2 + 1];
                      return (
                        <React.Fragment key={i}>
                          <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900/60 text-slate-200">
                            <span className="text-slate-500 font-bold text-[11px] w-5">{i + 1}.</span>
                            <span className="font-bold text-amber-300">{wMove?.san || wMove}</span>
                          </div>
                          {bMove ? (
                            <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900/60 text-slate-200">
                              <span className="text-slate-500 font-bold text-[11px] w-5">{i + 1}...</span>
                              <span className="font-bold text-slate-300">{bMove?.san || bMove}</span>
                            </div>
                          ) : <div />}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Sparkles size={12} className="text-amber-400" />
                Sincronización en vivo activa
              </span>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                Cerrar Visor
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
