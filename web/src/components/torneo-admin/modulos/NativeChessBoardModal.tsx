"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, RotateCcw, ArrowLeftRight, Flag, Handshake,
  Play, Pause, Trophy, Clock, CheckCircle2, Volume2,
  VolumeX, Sparkles, AlertTriangle, ShieldCheck, ChevronRight
} from 'lucide-react';
import {
  ChessGame, Square, PieceType, Color, Move,
  coordsToSquare, squareToCoords
} from './chessEngine';

interface NativeChessBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  partidaId?: string;
  blancasNombre?: string;
  negrasNombre?: string;
  tableroNumero?: number;
  numeroRonda?: number;
  initialTimeMinutes?: number;
  initialIncrementSeconds?: number;
  onResultadoFinal?: (resultado: string) => void;
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

/* ─── Web Audio API Sound Synthesizer ─── */
function playSynthSound(type: 'move' | 'capture' | 'check' | 'gameover', enabled: boolean = true) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'move') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.08);
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
  } catch (e) {
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
        <path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-14V25L7 14l2 12z" />
        <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 2-1 .5-2.5 0 0 0-1.5-1.5-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" />
        <path d="M11.5 30c3.5-.5 18.5-.5 22 0M12 33.5c6-1 15-1 21 0" fill="none" />
      </g>
    </svg>
  ),
  wk: (
    <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md">
      <g fill="none" fillRule="evenodd" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.5 11.63V6M20 8h5" stroke="#1e293b" />
        <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#ffffff" stroke="#1e293b" />
        <path d="M11.5 37c5.5 3.5 16.5 3.5 22 0v-7s9-4.5 6-10.5c-4-1-6 2.5-6 2.5s-3-5.5-11-5.5-11 5.5-11 5.5-2-3.5-6-2.5c-3 6 6 10.5 6 10.5v7z" fill="#ffffff" stroke="#1e293b" />
        <path d="M11.5 30c5.5-3 16.5-3 22 0M11.5 33.5c5.5-3 16.5-3 22 0M11.5 37c5.5-3 16.5-3 22 0" />
      </g>
    </svg>
  ),

  // Negras
  bp: (
    <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md">
      <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#1e293b" stroke="#f8fafc" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  bn: (
    <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md">
      <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#1e293b" stroke="#f8fafc" strokeWidth="1.2" />
      <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="#1e293b" stroke="#f8fafc" strokeWidth="1.2" />
      <circle cx="15.5" cy="15.5" r="1.5" fill="#f8fafc" />
    </svg>
  ),
  bb: (
    <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md">
      <g fill="none" fillRule="evenodd" stroke="#f8fafc" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <g fill="#1e293b" stroke="#f8fafc">
          <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2zM15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2zM25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" />
          <path d="M17.5 26h10M15 30h15M22.5 15.5v5M20 18h5" stroke="#f8fafc" />
        </g>
      </g>
    </svg>
  ),
  br: (
    <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md">
      <g fill="#1e293b" stroke="#f8fafc" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
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
      <g fill="#1e293b" stroke="#f8fafc" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM24.5 7.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM33 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0z" />
        <path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-14V25L7 14l2 12z" />
        <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 2-1 .5-2.5 0 0 0-1.5-1.5-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" />
        <path d="M11.5 30c3.5-.5 18.5-.5 22 0M12 33.5c6-1 15-1 21 0" fill="none" />
      </g>
    </svg>
  ),
  bk: (
    <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-md">
      <g fill="none" fillRule="evenodd" stroke="#f8fafc" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.5 11.63V6M20 8h5" stroke="#f8fafc" />
        <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#1e293b" stroke="#f8fafc" />
        <path d="M11.5 37c5.5 3.5 16.5 3.5 22 0v-7s9-4.5 6-10.5c-4-1-6 2.5-6 2.5s-3-5.5-11-5.5-11 5.5-11 5.5-2-3.5-6-2.5c-3 6 6 10.5 6 10.5v7z" fill="#1e293b" stroke="#f8fafc" />
        <path d="M11.5 30c5.5-3 16.5-3 22 0M11.5 33.5c5.5-3 16.5-3 22 0M11.5 37c5.5-3 16.5-3 22 0" />
      </g>
    </svg>
  ),
};

export default function NativeChessBoardModal({
  isOpen,
  onClose,
  partidaId,
  blancasNombre = 'Blancas',
  negrasNombre = 'Negras',
  tableroNumero = 1,
  numeroRonda = 1,
  initialTimeMinutes = 5,
  initialIncrementSeconds = 3,
  onResultadoFinal,
}: NativeChessBoardModalProps) {
  const [game, setGame] = useState<ChessGame>(() => new ChessGame());
  const [board, setBoard] = useState(game.getBoard());
  const [turn, setTurn] = useState<Color>('w');
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [flipBoard, setFlipBoard] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Coronación
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

  // Relojes
  const [whiteTime, setWhiteTime] = useState<number>(initialTimeMinutes * 60);
  const [blackTime, setBlackTime] = useState<number>(initialTimeMinutes * 60);
  const [clockRunning, setClockRunning] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<{
    over: boolean;
    result?: '1-0' | '0-1' | '0.5-0.5';
    reason?: string;
  }>({ over: false });

  const [savingResult, setSavingResult] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Reset al abrir
  useEffect(() => {
    if (isOpen) {
      const g = new ChessGame();
      setGame(g);
      setBoard(g.getBoard());
      setTurn('w');
      setSelectedSquare(null);
      setLegalMoves([]);
      setLastMove(null);
      setPendingPromotion(null);
      setWhiteTime(initialTimeMinutes * 60);
      setBlackTime(initialTimeMinutes * 60);
      setClockRunning(false);
      setGameOver({ over: false });
      setSavedSuccess(false);
    }
  }, [isOpen, initialTimeMinutes]);

  // Intervalo de Reloj
  useEffect(() => {
    if (!clockRunning || gameOver.over) return;
    const interval = setInterval(() => {
      if (turn === 'w') {
        setWhiteTime((t) => {
          if (t <= 1) {
            setGameOver({
              over: true,
              result: '0-1',
              reason: 'Tiempo agotado (Ganan Negras por Bandera ⏱️)',
            });
            playSynthSound('gameover', soundEnabled);
            setClockRunning(false);
            return 0;
          }
          return t - 1;
        });
      } else {
        setBlackTime((t) => {
          if (t <= 1) {
            setGameOver({
              over: true,
              result: '1-0',
              reason: 'Tiempo agotado (Ganan Blancas por Bandera ⏱️)',
            });
            playSynthSound('gameover', soundEnabled);
            setClockRunning(false);
            return 0;
          }
          return t - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [clockRunning, turn, gameOver.over, soundEnabled]);

  const executeMove = useCallback((from: Square, to: Square, promoPiece: PieceType = 'q') => {
    const move = game.makeMove(from, to, promoPiece);
    if (!move) return;

    // Actualizar estado del juego
    setBoard(game.getBoard());
    setTurn(game.getTurn());
    setLastMove({ from, to });
    setSelectedSquare(null);
    setLegalMoves([]);
    setPendingPromotion(null);

    // Iniciar reloj en el primer movimiento
    if (!clockRunning && !gameOver.over) {
      setClockRunning(true);
    }

    // Aplicar incremento de tiempo al jugador que acaba de mover
    if (move.color === 'w') {
      setWhiteTime((t) => t + initialIncrementSeconds);
    } else {
      setBlackTime((t) => t + initialIncrementSeconds);
    }

    // Sonidos
    if (move.flags.isCheckmate) {
      playSynthSound('gameover', soundEnabled);
    } else if (move.flags.isCheck) {
      playSynthSound('check', soundEnabled);
    } else if (move.flags.isCapture) {
      playSynthSound('capture', soundEnabled);
    } else {
      playSynthSound('move', soundEnabled);
    }

    // Comprobar fin de juego
    const status = game.isGameOver();
    if (status.over) {
      setGameOver(status);
      setClockRunning(false);
      if (!move.flags.isCheckmate) {
        playSynthSound('gameover', soundEnabled);
      }
    }
  }, [game, clockRunning, gameOver.over, initialIncrementSeconds, soundEnabled]);

  const handleSquareClick = (sq: Square) => {
    if (gameOver.over) return;

    const piece = game.getPiece(sq);

    // Si ya seleccionó una casilla de origen
    if (selectedSquare) {
      if (sq === selectedSquare) {
        // Deseleccionar
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      if (legalMoves.includes(sq)) {
        // Verificar si es coronación
        const fromPiece = game.getPiece(selectedSquare);
        const [tr] = squareToCoords(sq);
        if (fromPiece && fromPiece.type === 'p' && (tr === 0 || tr === 7)) {
          setPendingPromotion({ from: selectedSquare, to: sq });
          return;
        }

        executeMove(selectedSquare, sq);
        return;
      }
    }

    // Seleccionar pieza propia
    if (piece && piece.color === turn) {
      setSelectedSquare(sq);
      const moves = game.getLegalMoves(sq);
      setLegalMoves(moves.map((m) => m.to));
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  const handleRendirse = (color: Color) => {
    const res = color === 'w' ? '0-1' : '1-0';
    const ganador = color === 'w' ? 'Negras' : 'Blancas';
    setGameOver({
      over: true,
      result: res,
      reason: `Rendición de ${color === 'w' ? 'Blancas' : 'Negras'} (Ganan ${ganador})`,
    });
    setClockRunning(false);
    playSynthSound('gameover', soundEnabled);
  };

  const handleTablasAcordadas = () => {
    setGameOver({
      over: true,
      result: '0.5-0.5',
      reason: 'Tablas por Mutuo Acuerdo 🤝',
    });
    setClockRunning(false);
    playSynthSound('gameover', soundEnabled);
  };

  const handleGuardarResultado = async () => {
    if (!partidaId || !gameOver.result) return;
    setSavingResult(true);
    try {
      const res = await fetch(`${API_URL}/api/ajedrez/partidas/${partidaId}/resultado`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          resultado: gameOver.result,
        }),
      });
      if (!res.ok) throw new Error('Error al guardar resultado');

      setSavedSuccess(true);
      if (onResultadoFinal) {
        onResultadoFinal(gameOver.result);
      }
    } catch (err: any) {
      alert(err.message || 'No se pudo guardar el resultado');
    } finally {
      setSavingResult(false);
    }
  };

  const formatClock = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  const history = game.getHistory();
  const kingInCheckSq = game.inCheck(turn) ? coordsToSquare(...(turn === 'w' ? [7, 4] : [0, 4])) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[96vh] overflow-hidden shadow-2xl flex flex-col text-slate-100">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
              <span>♟️</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">
                  Tablero {tableroNumero}: {blancasNombre} vs {negrasNombre}
                </h3>
                <span className="bg-slate-800 text-slate-300 text-[11px] font-bold px-2 py-0.5 rounded-full border border-slate-700">
                  Ronda {numeroRonda}
                </span>
                <span className="bg-amber-500/20 text-amber-300 text-[11px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                  <Clock size={11} /> {initialTimeMinutes}+{initialIncrementSeconds}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tablero Nativo de Juego Interno con Validación FIDE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title={soundEnabled ? 'Silenciar sonidos' : 'Activar sonidos'}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button
              onClick={() => setFlipBoard(!flipBoard)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Girar perspectiva del tablero"
            >
              <ArrowLeftRight size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Content: Tablero a la izquierda, Panel a la derecha */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col lg:flex-row gap-6 items-center lg:items-start justify-center bg-slate-950/40">
          {/* TABLERO & RELOJES */}
          <div className="flex flex-col items-center w-full max-w-[460px] sm:max-w-[490px]">
            {/* Reloj Superior (Negras por defecto o Blancas si girado) */}
            <div className="w-full flex items-center justify-between px-3 py-2 bg-slate-900/90 border border-slate-800 rounded-2xl mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">{flipBoard ? '♔' : '♚'}</span>
                <span className="font-bold text-xs text-slate-200">
                  {flipBoard ? blancasNombre : negrasNombre}
                </span>
                {(flipBoard ? turn === 'w' : turn === 'b') && !gameOver.over && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </div>
              <div
                className={`font-mono font-black text-sm px-3 py-1 rounded-xl border flex items-center gap-1.5 ${
                  (flipBoard ? turn === 'w' : turn === 'b') && clockRunning
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
                  const piece = board[r][c];
                  const isSelected = selectedSquare === sq;
                  const isLegalTarget = legalMoves.includes(sq);
                  const isLastMoveFrom = lastMove?.from === sq;
                  const isLastMoveTo = lastMove?.to === sq;
                  const isCheckSquare = piece?.type === 'k' && piece?.color === turn && game.inCheck(turn);

                  let squareBg = isLight ? 'bg-[#eeeed2]' : 'bg-[#769656]';
                  if (isSelected) squareBg = 'bg-amber-300/90 ring-4 ring-amber-400 inset-0';
                  else if (isLastMoveFrom || isLastMoveTo) squareBg = isLight ? 'bg-[#f7ec7d]' : 'bg-[#baca44]';
                  else if (isCheckSquare) squareBg = 'bg-red-500/80 ring-4 ring-red-600 animate-pulse';

                  return (
                    <div
                      key={sq}
                      onClick={() => handleSquareClick(sq)}
                      className={`relative flex items-center justify-center cursor-pointer transition-colors ${squareBg}`}
                    >
                      {/* Coordenadas en las esquinas */}
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
                        <div className="w-[82%] h-[82%] pointer-events-none transition-transform duration-100 hover:scale-105">
                          {SVG_PIECES[`${piece.color}${piece.type}`]}
                        </div>
                      )}

                      {/* Indicador de jugada legal */}
                      {isLegalTarget && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          {piece ? (
                            <div className="w-full h-full rounded-full border-4 border-black/30" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full bg-black/25 shadow-sm" />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Selector de Coronación de Peón */}
              {pendingPromotion && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-20">
                  <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-2xl text-center space-y-3">
                    <span className="text-xs font-black text-amber-400 block uppercase">
                      Elige pieza de coronación
                    </span>
                    <div className="flex gap-2">
                      {['q', 'r', 'b', 'n'].map((pType) => (
                        <button
                          key={pType}
                          onClick={() => executeMove(pendingPromotion.from, pendingPromotion.to, pType as PieceType)}
                          className="w-14 h-14 bg-slate-800 hover:bg-amber-500 rounded-xl p-2 transition border border-slate-700 hover:border-amber-400 group"
                        >
                          {SVG_PIECES[`${turn}${pType}`]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Reloj Inferior (Blancas por defecto o Negras si girado) */}
            <div className="w-full flex items-center justify-between px-3 py-2 bg-slate-900/90 border border-slate-800 rounded-2xl mt-2.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">{flipBoard ? '♚' : '♔'}</span>
                <span className="font-bold text-xs text-slate-200">
                  {flipBoard ? negrasNombre : blancasNombre}
                </span>
                {(flipBoard ? turn === 'b' : turn === 'w') && !gameOver.over && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </div>
              <div
                className={`font-mono font-black text-sm px-3 py-1 rounded-xl border flex items-center gap-1.5 ${
                  (flipBoard ? turn === 'b' : turn === 'w') && clockRunning
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                <Clock size={13} />
                <span>{formatClock(flipBoard ? blackTime : whiteTime)}</span>
              </div>
            </div>
          </div>

          {/* PANEL DERECHO: ACCIONES, HISTORIAL Y FINALIZACIÓN */}
          <div className="flex-1 w-full max-w-[420px] flex flex-col space-y-4">
            {/* Banner de Fin de Partida */}
            {gameOver.over ? (
              <div className="bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-900 border-2 border-amber-500/40 rounded-3xl p-4 shadow-xl space-y-3 animate-in zoom-in-95">
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

                {partidaId && (
                  <div className="pt-2">
                    {savedSuccess ? (
                      <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        <span>¡Resultado registrado con éxito en la tabla del torneo!</span>
                      </div>
                    ) : (
                      <button
                        onClick={handleGuardarResultado}
                        disabled={savingResult}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.99] text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Sparkles size={16} />
                        <span>{savingResult ? 'Guardando...' : `Guardar Resultado Oficial (${gameOver.result})`}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Turno en Vivo */
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{turn === 'w' ? '♔' : '♚'}</span>
                  <div>
                    <span className="text-xs text-slate-400 font-bold block">Turno Actual:</span>
                    <span className="text-sm font-black text-white">
                      {turn === 'w' ? `Blancas (${blancasNombre})` : `Negras (${negrasNombre})`}
                    </span>
                  </div>
                </div>
                {game.inCheck(turn) && (
                  <span className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-black animate-pulse flex items-center gap-1">
                    <AlertTriangle size={13} /> ¡Jaque!
                  </span>
                )}
              </div>
            )}

            {/* Acciones de Juego */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                onClick={() => setClockRunning(!clockRunning)}
                disabled={gameOver.over}
                className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              >
                {clockRunning ? <Pause size={14} /> : <Play size={14} />}
                <span>{clockRunning ? 'Pausar' : 'Reanudar'}</span>
              </button>
              <button
                onClick={() => handleRendirse(turn)}
                disabled={gameOver.over}
                className="py-2.5 px-3 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-200 font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              >
                <Flag size={14} />
                <span>Rendirse</span>
              </button>
              <button
                onClick={handleTablasAcordadas}
                disabled={gameOver.over}
                className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              >
                <Handshake size={14} />
                <span>Tablas</span>
              </button>
            </div>

            {/* Historial de Movimientos PGN */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 flex-1 flex flex-col min-h-[160px] max-h-[220px]">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-bold text-slate-400">
                <span>Historial de Jugadas ({history.length})</span>
                <span className="font-mono text-[11px] text-amber-400">PGN</span>
              </div>
              <div className="overflow-y-auto flex-1 pt-2 space-y-1 text-xs font-mono">
                {history.length === 0 ? (
                  <p className="text-slate-600 text-center py-4">Sin jugadas aún. Haz el primer movimiento.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    {Array.from({ length: Math.ceil(history.length / 2) }).map((_, i) => {
                      const wMove = history[i * 2];
                      const bMove = history[i * 2 + 1];
                      return (
                        <React.Fragment key={i}>
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900/60 text-slate-200">
                            <span className="text-slate-500 font-bold text-[11px] w-5">{i + 1}.</span>
                            <span className="font-bold text-amber-300">{wMove.san}</span>
                          </div>
                          {bMove ? (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900/60 text-slate-200">
                              <span className="text-slate-500 font-bold text-[11px] w-5">{i + 1}...</span>
                              <span className="font-bold text-slate-300">{bMove.san}</span>
                            </div>
                          ) : <div />}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer / Salir */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
