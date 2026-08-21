"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, ArrowLeftRight, Clock, Trophy, Volume2,
  VolumeX, Copy, Check, Radio, RotateCcw, Sparkles,
  ChevronLeft, ChevronRight, SkipBack, SkipForward, Play, Pause, AlertTriangle,
  ShieldCheck, ShieldAlert, SlidersHorizontal, Eye
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
  isPublic?: boolean;
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
  wp: <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" /></svg>,
  wn: <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" /><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" /><circle cx="15.5" cy="15.5" r="1.5" fill="#1e293b" /></svg>,
  wb: <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md"><g fill="none" fillRule="evenodd" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><g fill="#ffffff" stroke="#1e293b"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2zM15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2zM25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" /><path d="M17.5 26h10M15 30h15M22.5 15.5v5M20 18h5" stroke="#1e293b" /></g></g></svg>,
  wr: <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md"><g fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" /><path d="M34 14l-3 3H14l-3-3" /><path d="M31 17v12.5H14V17" /><path d="M31 29.5l1.5 2.5h-20l1.5-2.5" /><path d="M11 14h23" /></g></svg>,
  wq: <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md"><g fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM24.5 7.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM33 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0z" /><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 2-1 .5-2.5 0 0 0-1.5-1.5-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" /><path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none" /><path d="M9 26c0-1.5 2-2.5 3-4 1.5-2 2-6 2-6l5 13 5-13s.5 4 2 6c1 1.5 3 2.5 3 4" /></g></svg>,
  wk: <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md"><g fill="none" fillRule="evenodd" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22.5 11.63V6M20 8h5" stroke="#1e293b" /><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#ffffff" stroke="#1e293b" /><path d="M11.5 37c5.5 3.5 16.5 3.5 22 0v-3c-5.5 2-16.5 2-22 0v3z" fill="#ffffff" stroke="#1e293b" /><path d="M11.5 30c5.5-3 16.5-3 22 0m-22 4c5.5-2 16.5-2 22 0" /></g></svg>,
  bp: <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#1e293b" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" /></svg>,
  bn: <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#1e293b" stroke="#ffffff" strokeWidth="1.5" /><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="#1e293b" stroke="#ffffff" strokeWidth="1.5" /><circle cx="15.5" cy="15.5" r="1.5" fill="#ffffff" /></svg>,
  bb: <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md"><g fill="none" fillRule="evenodd" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><g fill="#1e293b" stroke="#ffffff"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2zM15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2zM25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" /><path d="M17.5 26h10M15 30h15M22.5 15.5v5M20 18h5" stroke="#ffffff" /></g></g></svg>,
  br: <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md"><g fill="#1e293b" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" /><path d="M34 14l-3 3H14l-3-3" /><path d="M31 17v12.5H14V17" /><path d="M31 29.5l1.5 2.5h-20l1.5-2.5" /><path d="M11 14h23" /></g></svg>,
  bq: <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md"><g fill="#1e293b" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM24.5 7.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM33 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0z" /><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 2-1 .5-2.5 0 0 0-1.5-1.5-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" /><path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none" /><path d="M9 26c0-1.5 2-2.5 3-4 1.5-2 2-6 2-6l5 13 5-13s.5 4 2 6c1 1.5 3 2.5 3 4" /></g></svg>,
  bk: <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md"><g fill="none" fillRule="evenodd" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22.5 11.63V6M20 8h5" stroke="#ffffff" /><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#1e293b" stroke="#ffffff" /><path d="M11.5 37c5.5 3.5 16.5 3.5 22 0v-3c-5.5 2-16.5 2-22 0v3z" fill="#1e293b" stroke="#ffffff" /><path d="M11.5 30c5.5-3 16.5-3 22 0m-22 4c5.5-2 16.5-2 22 0" /></g></svg>,
};

interface GameStep {
  index: number;
  fen: string;
  board: BoardState;
  lastMove: { from: Square; to: Square } | null;
  turn: Color;
  san?: string;
  moveLabel: string;
  isCheck?: boolean;
  piece?: PieceType;
  isCapture?: boolean;
}

function buildGameSteps(historyList: any[]): GameStep[] {
  const sim = new ChessGame();
  const steps: GameStep[] = [
    {
      index: 0,
      fen: sim.getFen(),
      board: sim.getBoard(),
      lastMove: null,
      turn: sim.getTurn(),
      moveLabel: 'Posición Inicial',
      isCheck: false,
    }
  ];

  for (let i = 0; i < historyList.length; i++) {
    const m = historyList[i];
    if (m && m.from && m.to) {
      const executed = sim.makeMove(m.from, m.to, m.promotion || 'q');
      const isCheck = sim.inCheck(sim.getTurn());
      const moveNum = Math.floor(i / 2) + 1;
      const isWhite = i % 2 === 0;
      const san = m.san || executed?.san || `${m.from}-${m.to}`;
      const label = `${moveNum}${isWhite ? '.' : '...'} ${san}`;

      steps.push({
        index: i + 1,
        fen: sim.getFen(),
        board: sim.getBoard(),
        lastMove: { from: m.from, to: m.to },
        turn: sim.getTurn(),
        san: san,
        moveLabel: label,
        isCheck: isCheck,
        piece: m.piece || m.pieza,
        isCapture: Boolean(m.flags?.isCapture || m.captura),
      });
    }
  }

  return steps;
}

export default function NativeChessViewerModal({
  isOpen,
  onClose,
  partidaId,
  blancasNombre = 'Blancas',
  negrasNombre = 'Negras',
  tableroNumero = 1,
  numeroRonda = 1,
  isPublic = false,
}: NativeChessViewerModalProps) {
  const [whiteTime, setWhiteTime] = useState<number>(300);
  const [blackTime, setBlackTime] = useState<number>(300);
  const [history, setHistory] = useState<any[]>([]);
  const [pgn, setPgn] = useState<string>('');
  const [gameOver, setGameOver] = useState<{ over: boolean; result?: string; reason?: string }>({ over: false });
  const [flipBoard, setFlipBoard] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copiedPgn, setCopiedPgn] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(true);

  const [steps, setSteps] = useState<GameStep[]>([
    {
      index: 0,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      board: new ChessGame().getBoard(),
      lastMove: null,
      turn: 'w',
      moveLabel: 'Posición Inicial',
      isCheck: false,
    }
  ]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);

  // Telemetría Antitrampa & Retardo de Retransmisión
  const [antitrampa, setAntitrampa] = useState<any>(null);
  const [showFairPlayModal, setShowFairPlayModal] = useState<boolean>(false);
  const [broadcastDelay, setBroadcastDelay] = useState<number>(0);

  const prevHistoryLenRef = useRef<number>(0);
  const historyScrollRef = useRef<HTMLDivElement>(null);
  const activeMoveButtonRef = useRef<HTMLButtonElement | null>(null);

  const goToStep = useCallback((idx: number, playSound: boolean = true) => {
    setSteps((currentSteps) => {
      if (currentSteps.length === 0) return currentSteps;
      const target = Math.max(0, Math.min(currentSteps.length - 1, idx));
      setCurrentStepIndex(target);

      if (playSound && target > 0 && target < currentSteps.length) {
        const step = currentSteps[target];
        if (step.isCheck) {
          playSynthSound('check', soundEnabled);
        } else if (step.isCapture) {
          playSynthSound('capture', soundEnabled);
        } else {
          playSynthSound('move', soundEnabled);
        }
      }
      return currentSteps;
    });
  }, [soundEnabled]);

  const fetchLiveState = useCallback(async () => {
    if (!partidaId) return;
    try {
      const res = await fetch(`${API_URL}/api/ajedrez/partidas/${partidaId}/live`);
      if (!res.ok) return;
      const data = await res.json();

      const live = data.live || {};
      const hist = live.history || data.analisis_partida?.movimientos || [];
      const currentPgn = live.pgn || data.pgn || data.analisis_partida?.pgn || '';

      if (data.antitrampa) setAntitrampa(data.antitrampa);
      if (live.white_time !== undefined) setWhiteTime(live.white_time);
      if (live.black_time !== undefined) setBlackTime(live.black_time);
      if (currentPgn) setPgn(currentPgn);

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

      if (hist.length !== prevHistoryLenRef.current || history.length === 0) {
        const isAtEnd = currentStepIndex === prevHistoryLenRef.current;
        prevHistoryLenRef.current = hist.length;
        setHistory(hist);

        const newSteps = buildGameSteps(hist);
        setSteps(newSteps);

        if (isAtEnd || currentStepIndex === 0) {
          setCurrentStepIndex(newSteps.length - 1);
        }

        if (hist.length > 0) {
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
    } catch {}
  }, [partidaId, history.length, currentStepIndex, soundEnabled]);

  useEffect(() => {
    if (!isOpen || !partidaId) return;
    fetchLiveState();
    const interval = setInterval(fetchLiveState, 1500);
    return () => clearInterval(interval);
  }, [isOpen, partidaId, fetchLiveState]);

  // Intervalo de Reloj en Vivo para Espectadores
  useEffect(() => {
    if (!isOpen || !isLiveActive || gameOver.over) return;
    const interval = setInterval(() => {
      const activeTurn = steps[steps.length - 1]?.turn || 'w';
      if (activeTurn === 'w') {
        setWhiteTime((t) => Math.max(0, t - 1));
      } else {
        setBlackTime((t) => Math.max(0, t - 1));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, isLiveActive, gameOver.over, steps]);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev >= steps.length - 1) {
          setIsAutoPlaying(false);
          return prev;
        }
        const next = prev + 1;
        const step = steps[next];
        if (step) {
          if (step.isCheck) playSynthSound('check', soundEnabled);
          else if (step.isCapture) playSynthSound('capture', soundEnabled);
          else playSynthSound('move', soundEnabled);
        }
        return next;
      });
    }, 1100);
    return () => clearInterval(timer);
  }, [isAutoPlaying, steps, soundEnabled]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsAutoPlaying(false);
        goToStep(currentStepIndex - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsAutoPlaying(false);
        goToStep(currentStepIndex + 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        setIsAutoPlaying(false);
        goToStep(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setIsAutoPlaying(false);
        goToStep(steps.length - 1);
      } else if (e.key === ' ') {
        e.preventDefault();
        if (steps.length > 1) {
          if (currentStepIndex >= steps.length - 1) goToStep(0);
          setIsAutoPlaying((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, steps.length, goToStep]);

  useEffect(() => {
    if (activeMoveButtonRef.current && historyScrollRef.current) {
      activeMoveButtonRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentStepIndex]);

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

  const currentStep = steps[currentStepIndex] || steps[0];
  const isViewingLiveOrLatest = currentStepIndex === steps.length - 1;
  const kingInCheckSq = currentStep.isCheck
    ? coordsToSquare(...(currentStep.turn === 'w' ? [7, 4] : [0, 4]))
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[96vh] overflow-hidden shadow-2xl flex flex-col text-slate-100">
        <div className="px-6 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
              <Radio size={20} className={isLiveActive ? 'animate-pulse text-red-950' : ''} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-white">
                  Tablero {tableroNumero}: {blancasNombre} vs {negrasNombre}
                </h3>
                <span className="bg-slate-800 text-slate-300 text-[11px] font-bold px-2 py-0.5 rounded-full border border-slate-700">
                  Ronda {numeroRonda}
                </span>
                <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1.5 border ${
                  isLiveActive ? 'bg-red-500/20 text-red-300 border-red-500/30 animate-pulse' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isLiveActive ? 'bg-red-400' : 'bg-emerald-400'}`} />
                  {isLiveActive ? 'TRANSMISIÓN EN VIVO' : 'PARTIDA CONCLUIDA'}
                </span>
              </div>
              <p className="text-xs text-slate-400">Visor Interactivo · Reproducción jugada por jugada & Transmisión en tiempo real</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isPublic && (
              <>
                {/* Retardo de Retransmisión */}
                <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-xl border border-slate-700 text-xs">
                  <SlidersHorizontal size={12} className="text-slate-400" />
                  <select
                    value={broadcastDelay}
                    onChange={(e) => setBroadcastDelay(Number(e.target.value))}
                    className="bg-transparent text-slate-300 font-bold text-[11px] outline-none cursor-pointer"
                    title="Retardo de retransmisión para evitar asistencia externa"
                  >
                    <option value={0} className="bg-slate-900 text-slate-100">Directo (0s)</option>
                    <option value={15} className="bg-slate-900 text-slate-100">Delay +15s</option>
                    <option value={30} className="bg-slate-900 text-slate-100">Delay +30s</option>
                    <option value={60} className="bg-slate-900 text-slate-100">Delay +60s</option>
                  </select>
                </div>

                {/* Botón Auditoría Fair Play */}
                <button
                  onClick={() => setShowFairPlayModal(true)}
                  className={`px-2.5 py-1 rounded-xl transition flex items-center gap-1.5 text-xs font-bold ${
                    antitrampa?.alerta_sospecha
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                  title="Ver auditoría Fair Play y telemetría de juego"
                >
                  {antitrampa?.alerta_sospecha ? <ShieldAlert size={14} className="text-amber-400 animate-pulse" /> : <ShieldCheck size={14} className="text-emerald-400" />}
                  <span className="hidden sm:inline">Fair Play</span>
                </button>
              </>
            )}

            <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition" title={soundEnabled ? 'Silenciar sonidos' : 'Activar sonidos'}>
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button onClick={() => setFlipBoard(!flipBoard)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition" title="Girar perspectiva del tablero">
              <ArrowLeftRight size={18} />
            </button>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal de Auditoría Fair Play */}
        {showFairPlayModal && (
          <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-4 text-slate-200 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h4 className="font-black text-white text-sm">Auditoría Fair Play & Telemetría</h4>
                    <p className="text-[11px] text-slate-400">Controles de integridad y detección de asistencia</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFairPlayModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Resumen de Alerta */}
              <div className={`p-3 rounded-2xl border text-xs ${
                antitrampa?.alerta_sospecha
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              }`}>
                <div className="flex items-center gap-2 font-bold mb-1">
                  {antitrampa?.alerta_sospecha ? <ShieldAlert size={14} className="text-amber-400" /> : <ShieldCheck size={14} className="text-emerald-400" />}
                  <span>{antitrampa?.alerta_sospecha ? 'Alerta de Detección Fair Play' : 'Partida con Parámetros Normales'}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {antitrampa?.resumen_alerta || 'No se han detectado anomalías de foco o patrones de tiempo planos.'}
                </p>
              </div>

              {/* Estadísticas por Jugador */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Blancas */}
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2">
                  <span className="font-black text-slate-200 flex items-center gap-1.5">
                    <span>♔</span> {blancasNombre || 'Blancas'}
                  </span>
                  <div className="space-y-1 text-[11px] text-slate-400">
                    <div className="flex justify-between">
                      <span>Salidas de pestaña:</span>
                      <strong className={antitrampa?.blur_count_w >= 3 ? 'text-amber-400' : 'text-slate-200'}>
                        {antitrampa?.blur_count_w || 0}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Promedio tiempo:</span>
                      <strong className="text-slate-200">{antitrampa?.blancas_ritmo?.promedio || 0}s</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Desviación (σ):</span>
                      <strong className={antitrampa?.blancas_ritmo?.sospechoso ? 'text-amber-400' : 'text-slate-200'}>
                        ±{antitrampa?.blancas_ritmo?.desviacion || 0}s
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Negras */}
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2">
                  <span className="font-black text-slate-200 flex items-center gap-1.5">
                    <span>♚</span> {negrasNombre || 'Negras'}
                  </span>
                  <div className="space-y-1 text-[11px] text-slate-400">
                    <div className="flex justify-between">
                      <span>Salidas de pestaña:</span>
                      <strong className={antitrampa?.blur_count_b >= 3 ? 'text-amber-400' : 'text-slate-200'}>
                        {antitrampa?.blur_count_b || 0}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Promedio tiempo:</span>
                      <strong className="text-slate-200">{antitrampa?.negras_ritmo?.promedio || 0}s</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Desviación (σ):</span>
                      <strong className={antitrampa?.negras_ritmo?.sospechoso ? 'text-amber-400' : 'text-slate-200'}>
                        ±{antitrampa?.negras_ritmo?.desviacion || 0}s
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowFairPlayModal(false)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition"
                >
                  Cerrar Auditoría
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col lg:flex-row gap-6 items-center lg:items-start justify-center bg-slate-950/40">
          <div className="flex flex-col items-center w-full max-w-[460px] sm:max-w-[490px]">
            {!isViewingLiveOrLatest ? (
              <div className="w-full mb-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs text-amber-300 animate-in fade-in">
                <span className="font-bold">🔍 Revisando {currentStep.moveLabel} ({currentStepIndex}/{steps.length - 1})</span>
                <button onClick={() => { setIsAutoPlaying(false); goToStep(steps.length - 1); }} className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-[11px] shadow-sm transition">
                  {isLiveActive ? '🔴 Volver al Vivo' : 'Ir al Final ⏭'}
                </button>
              </div>
            ) : null}

            <div className="w-full flex items-center justify-between px-3 py-2 bg-slate-900/90 border border-slate-800 rounded-2xl mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">{flipBoard ? '♔' : '♚'}</span>
                <span className="font-bold text-xs text-slate-200">{flipBoard ? blancasNombre : negrasNombre}</span>
                {(flipBoard ? currentStep.turn === 'w' : currentStep.turn === 'b') && isLiveActive && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
              </div>
              <div className={`font-mono font-black text-sm px-3 py-1 rounded-xl border flex items-center gap-1.5 ${(flipBoard ? currentStep.turn === 'w' : currentStep.turn === 'b') && isLiveActive ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse' : 'bg-slate-950 text-slate-400 border-slate-800'}`}>
                <Clock size={13} />
                <span>{formatClock(flipBoard ? whiteTime : blackTime)}</span>
              </div>
            </div>

            <div className="relative w-full aspect-square bg-[#769656] rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800 grid grid-cols-8 grid-rows-8 select-none">
              {(flipBoard ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7]).map((r) =>
                (flipBoard ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7]).map((c) => {
                  const sq = coordsToSquare(r, c);
                  const piece = currentStep.board[r][c];
                  const isLight = (r + c) % 2 === 0;
                  const isLastMoveFrom = currentStep.lastMove?.from === sq;
                  const isLastMoveTo = currentStep.lastMove?.to === sq;
                  const isKingInCheck = kingInCheckSq === sq;
                  return (
                    <div key={sq} className={`relative flex items-center justify-center transition-colors duration-150 ${isLight ? 'bg-[#eeeed2]' : 'bg-[#769656]'}`}>
                      {(isLastMoveFrom || isLastMoveTo) && <div className="absolute inset-0 bg-yellow-400/40 pointer-events-none" />}
                      {isKingInCheck && <div className="absolute inset-0 bg-red-600/60 animate-pulse pointer-events-none" />}
                      {c === (flipBoard ? 7 : 0) && <span className={`absolute top-0.5 left-1 text-[10px] font-bold pointer-events-none ${isLight ? 'text-[#769656]' : 'text-[#eeeed2]'}`}>{8 - r}</span>}
                      {r === (flipBoard ? 0 : 7) && <span className={`absolute bottom-0.5 right-1 text-[10px] font-bold pointer-events-none ${isLight ? 'text-[#769656]' : 'text-[#eeeed2]'}`}>{String.fromCharCode(97 + c)}</span>}
                      {piece && <div className="w-[84%] h-[84%] relative pointer-events-none z-10">{SVG_PIECES[`${piece.color}${piece.type}`]}</div>}
                    </div>
                  );
                })
              )}
            </div>

            <div className="w-full flex items-center justify-between px-3 py-2 bg-slate-900/90 border border-slate-800 rounded-2xl mt-2.5 shadow-sm">
              <div className="flex items-center gap-1.5">
                <button onClick={() => { setIsAutoPlaying(false); goToStep(0); }} disabled={currentStepIndex === 0} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-35 transition"><SkipBack size={15} /></button>
                <button onClick={() => { setIsAutoPlaying(false); goToStep(currentStepIndex - 1); }} disabled={currentStepIndex === 0} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-35 transition"><ChevronLeft size={16} /></button>
                <button onClick={() => { if (currentStepIndex >= steps.length - 1) goToStep(0); setIsAutoPlaying(!isAutoPlaying); }} disabled={steps.length <= 1} className={`px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition ${isAutoPlaying ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 font-black' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}>
                  {isAutoPlaying ? <Pause size={14} /> : <Play size={14} />} <span>{isAutoPlaying ? 'Pausa' : 'Auto'}</span>
                </button>
                <button onClick={() => { setIsAutoPlaying(false); goToStep(currentStepIndex + 1); }} disabled={currentStepIndex >= steps.length - 1} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-35 transition"><ChevronRight size={16} /></button>
                <button onClick={() => { setIsAutoPlaying(false); goToStep(steps.length - 1); }} disabled={currentStepIndex >= steps.length - 1} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-35 transition"><SkipForward size={15} /></button>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-black text-amber-400 font-mono block">{currentStepIndex === 0 ? 'Posición Inicial' : `Jugada ${currentStepIndex} de ${steps.length - 1}`}</span>
                <span className="text-[10px] text-slate-500 font-semibold block">{isViewingLiveOrLatest ? (isLiveActive ? '🔴 En Vivo' : 'Final') : 'Revisión'}</span>
              </div>
            </div>

            <div className="w-full flex items-center justify-between px-3 py-2 bg-slate-900/90 border border-slate-800 rounded-2xl mt-2.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">{flipBoard ? '♚' : '♔'}</span>
                <span className="font-bold text-xs text-slate-200">{flipBoard ? negrasNombre : blancasNombre}</span>
                {(flipBoard ? currentStep.turn === 'b' : currentStep.turn === 'w') && isLiveActive && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
              </div>
              <div className={`font-mono font-black text-sm px-3 py-1 rounded-xl border flex items-center gap-1.5 ${(flipBoard ? currentStep.turn === 'b' : currentStep.turn === 'w') && isLiveActive ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse' : 'bg-slate-950 text-slate-400 border-slate-800'}`}>
                <Clock size={13} />
                <span>{formatClock(flipBoard ? blackTime : whiteTime)}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full max-w-[420px] flex flex-col space-y-4">
            {gameOver.over ? (
              <div className="bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-900 border-2 border-amber-500/40 rounded-3xl p-4 shadow-xl space-y-2 animate-in zoom-in-95">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg shadow-amber-500/30"><Trophy size={26} /></div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400">Resultado Final</span>
                    <h4 className="text-xl font-black text-white">{gameOver.result} · {gameOver.reason}</h4>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-lg">{currentStep.turn === 'w' ? '♔' : '♚'}</div>
                <div>
                  <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider">Turno actual en tablero</span>
                  <h4 className="text-sm font-bold text-white">Mueven {currentStep.turn === 'w' ? `Blancas (${blancasNombre})` : `Negras (${negrasNombre})`}</h4>
                </div>
              </div>
            )}

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 flex-1 flex flex-col min-h-[240px] max-h-[320px]">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-bold text-slate-400">
                <span className="flex items-center gap-1.5"><span>Historial de Jugadas</span><span className="bg-slate-900 px-2 py-0.5 rounded-full text-[10px] text-amber-400 border border-slate-800">{history.length}</span></span>
                {pgn && <button onClick={handleCopyPGN} className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-amber-400 transition">{copiedPgn ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />} <span>{copiedPgn ? 'Copiado' : 'PGN'}</span></button>}
              </div>

              <div ref={historyScrollRef} className="overflow-y-auto flex-1 pt-2 space-y-1 text-xs font-mono">
                {history.length === 0 ? <p className="text-slate-600 text-center py-10">Esperando movimientos...</p> : (
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    {Array.from({ length: Math.ceil(history.length / 2) }).map((_, i) => {
                      const wStepIdx = i * 2 + 1;
                      const bStepIdx = i * 2 + 2;
                      const wMove = history[i * 2];
                      const bMove = history[i * 2 + 1];
                      const isWActive = currentStepIndex === wStepIdx;
                      const isBActive = currentStepIndex === bStepIdx;
                      return (
                        <React.Fragment key={i}>
                          <button ref={isWActive ? activeMoveButtonRef : null} onClick={() => { setIsAutoPlaying(false); goToStep(wStepIdx); }} className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition text-left ${isWActive ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-900/60 hover:bg-slate-800 text-slate-200'}`}>
                            <span className={`font-bold text-[11px] w-6 ${isWActive ? 'text-slate-950' : 'text-slate-500'}`}>{i + 1}.</span>
                            <span className="font-black truncate">{wMove?.san || wMove}</span>
                          </button>
                          {bMove ? (
                            <button ref={isBActive ? activeMoveButtonRef : null} onClick={() => { setIsAutoPlaying(false); goToStep(bStepIdx); }} className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition text-left ${isBActive ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-900/60 hover:bg-slate-800 text-slate-200'}`}>
                              <span className={`font-bold text-[11px] w-6 ${isBActive ? 'text-slate-950' : 'text-slate-500'}`}>{i + 1}...</span>
                              <span className="font-black truncate">{bMove?.san || bMove}</span>
                            </button>
                          ) : <div />}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500 flex items-center gap-1"><Sparkles size={12} className="text-amber-400" />Usa teclas ← / → o haz clic en jugadas</span>
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition">Cerrar Visor</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
