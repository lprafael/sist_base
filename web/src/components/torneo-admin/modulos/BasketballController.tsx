import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Play, Pause, RotateCcw, Check, Trophy, Clock, AlertTriangle,
  Volume2, VolumeX, ShieldAlert, ArrowLeftRight, HelpCircle, FileText,
  Flame, ChevronRight, Zap, RefreshCw, Edit2, Users
} from 'lucide-react';
import ActaBaloncestoModal from './ActaBaloncestoModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

// Generador de audio sintetizado con Web Audio API (100% nativo, sin dependencias de audio externas)
class ArenaSoundEffects {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Bocina / Buzzer potente de estadio (cuerno grave con armónicos)
  playBuzzer() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const freqs = [164.81, 220.0, 329.63, 440.0]; // E3, A3, E4, A4
      freqs.forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.2);
      });
    } catch (e) {
      console.error("Audio error:", e);
    }
  }

  // Silbato arbitral (Whistle)
  playWhistle() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2600, now);
      osc.frequency.exponentialRampToValueAtTime(2200, now + 0.3);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      console.error(e);
    }
  }

  // Canasta / Swish sonido positivo
  playScore(pts: number) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const baseFreq = pts === 3 ? 587.33 : (pts === 2 ? 440 : 349.23); // D5, A4, F4
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.18);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {
      console.error(e);
    }
  }
}

const arenaSounds = new ArenaSoundEffects();

export default function BasketballController({
  match,
  onClose,
  onSaved,
  onUpdate
}: {
  match: any;
  onClose: () => void;
  onSaved?: () => void;
  onUpdate?: () => void;
}) {
  const [estado, setEstado] = useState(match.estado || 'programado');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Parsear estadísticas
  const [estadisticas, setEstadisticas] = useState<any>(() => {
    const raw = match.estadisticas || {};
    const obj = typeof raw === 'string' ? (JSON.parse(raw) || {}) : raw;
    const reglamento = obj.reglamento || 'FIBA';

    return {
      tipo_deporte: 'Baloncesto',
      reglamento: reglamento,
      periodo_actual: obj.periodo_actual || 'Q1',
      duracion_cuarto: obj.duracion_cuarto || (reglamento === 'NBA' ? 720 : 600),
      reloj_tiro: obj.reloj_tiro ?? 24,
      flecha_posesion: obj.flecha_posesion || 'local',
      en_alargue: Boolean(obj.en_alargue),
      numero_alargue: obj.numero_alargue || 0,
      limite_faltas_bonus: obj.limite_faltas_bonus || 5,
      limite_faltas_jugador: obj.limite_faltas_jugador || (reglamento === 'NBA' ? 6 : 5),
      local: {
        puntos: typeof obj.local === 'object' ? (obj.local.puntos ?? (match.goles_local || 0)) : (match.goles_local || 0),
        tiros_libres: typeof obj.local === 'object' ? obj.local.tiros_libres || 0 : 0,
        dobles: typeof obj.local === 'object' ? obj.local.dobles || 0 : 0,
        triples: typeof obj.local === 'object' ? obj.local.triples || 0 : 0,
        faltas_periodo: typeof obj.local === 'object' ? obj.local.faltas_periodo || 0 : 0,
        faltas_totales: typeof obj.local === 'object' ? obj.local.faltas_totales || 0 : 0,
        faltas_tecnicas: typeof obj.local === 'object' ? obj.local.faltas_tecnicas || 0 : 0,
        faltas_antideportivas: typeof obj.local === 'object' ? obj.local.faltas_antideportivas || 0 : 0,
        tiempos_muertos: typeof obj.local === 'object' ? obj.local.tiempos_muertos || 0 : 0,
        tiempos_muertos_restantes: typeof obj.local === 'object' ? (obj.local.tiempos_muertos_restantes ?? (reglamento === 'NBA' ? 7 : 5)) : (reglamento === 'NBA' ? 7 : 5),
        en_bonus: typeof obj.local === 'object' ? Boolean(obj.local.en_bonus) : false,
        puntos_por_cuarto: typeof obj.local === 'object' && obj.local.puntos_por_cuarto ? obj.local.puntos_por_cuarto : { Q1: 0, Q2: 0, Q3: 0, Q4: 0, OT: 0 }
      },
      visitante: {
        puntos: typeof obj.visitante === 'object' ? (obj.visitante.puntos ?? (match.goles_visitante || 0)) : (match.goles_visitante || 0),
        tiros_libres: typeof obj.visitante === 'object' ? obj.visitante.tiros_libres || 0 : 0,
        dobles: typeof obj.visitante === 'object' ? obj.visitante.dobles || 0 : 0,
        triples: typeof obj.visitante === 'object' ? obj.visitante.triples || 0 : 0,
        faltas_periodo: typeof obj.visitante === 'object' ? obj.visitante.faltas_periodo || 0 : 0,
        faltas_totales: typeof obj.visitante === 'object' ? obj.visitante.faltas_totales || 0 : 0,
        faltas_tecnicas: typeof obj.visitante === 'object' ? obj.visitante.faltas_tecnicas || 0 : 0,
        faltas_antideportivas: typeof obj.visitante === 'object' ? obj.visitante.faltas_antideportivas || 0 : 0,
        tiempos_muertos: typeof obj.visitante === 'object' ? obj.visitante.tiempos_muertos || 0 : 0,
        tiempos_muertos_restantes: typeof obj.visitante === 'object' ? (obj.visitante.tiempos_muertos_restantes ?? (reglamento === 'NBA' ? 7 : 5)) : (reglamento === 'NBA' ? 7 : 5),
        en_bonus: typeof obj.visitante === 'object' ? Boolean(obj.visitante.en_bonus) : false,
        puntos_por_cuarto: typeof obj.visitante === 'object' && obj.visitante.puntos_por_cuarto ? obj.visitante.puntos_por_cuarto : { Q1: 0, Q2: 0, Q3: 0, Q4: 0, OT: 0 }
      },
      eventos_log: obj.eventos_log || [],
      ganador_lado: obj.ganador_lado || null,
      metodo_victoria: obj.metodo_victoria || null
    };
  });

  // Cronómetro del partido (Game Clock)
  const defaultQuarterTime = estadisticas.reglamento === 'NBA' ? 720 : (estadisticas.reglamento === '3x3' ? 600 : 600);
  const [timer, setTimer] = useState<number>(estadisticas.tiempo_restante ?? defaultQuarterTime);
  const [isRunning, setIsRunning] = useState(false);

  // Reloj de posesión (Shot Clock - 24 segundos / 14 segundos)
  const [shotClock, setShotClock] = useState<number>(estadisticas.reloj_tiro ?? 24);
  const [isShotClockRunning, setIsShotClockRunning] = useState(false);

  // Notificaciones & Alertas
  const [alerta, setAlerta] = useState<string | null>(null);

  // Modales
  const [showKeyboardModal, setShowKeyboardModal] = useState(false);
  const [showTimeoutModal, setShowTimeoutModal] = useState<{ visible: boolean; equipo: 'local' | 'visitante'; segundos: number } | null>(null);
  const [showEditTimeModal, setShowEditTimeModal] = useState(false);
  const [editMinutes, setEditMinutes] = useState(Math.floor(timer / 60));
  const [editSeconds, setEditSeconds] = useState(timer % 60);
  const [showScoresheet, setShowScoresheet] = useState(false);

  // Nombres de equipos
  const nombreLocal = match.jugador_local_nombre || match.local_nombre || match.equipo_local || 'Equipo Local (HOME)';
  const nombreVisitante = match.jugador_visitante_nombre || match.visitante_nombre || match.equipo_visitante || 'Equipo Visitante (AWAY)';

  // Audio trigger
  arenaSounds.enabled = soundEnabled;

  // -------------------------------------------------------------
  // CRONÓMETROS PRINCIPALES
  // -------------------------------------------------------------
  useEffect(() => {
    let interval: any;
    if (isRunning) {
      interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            arenaSounds.playBuzzer();
            evaluarFinDePeriodo();
            return 0;
          }
          return prev - 1;
        });

        // Reloj de posesión sincronizado con el cronómetro de juego
        setShotClock(prevShot => {
          if (prevShot <= 1) {
            arenaSounds.playBuzzer();
            setAlerta("🚨 ¡VIOLACIÓN DE 24 SEGUNDOS! Se agotó el reloj de posesión.");
            return 24; // Reset automático
          }
          return prevShot - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, estadisticas.periodo_actual]);

  // Manejo de cuenta regresiva de Tiempo Muerto (Timeout)
  useEffect(() => {
    let toInterval: any;
    if (showTimeoutModal && showTimeoutModal.segundos > 0) {
      toInterval = setInterval(() => {
        setShowTimeoutModal(prev => {
          if (!prev) return null;
          if (prev.segundos <= 1) {
            arenaSounds.playBuzzer();
            setAlerta(`🔔 Tiempo Muerto Finalizado para ${prev.equipo.toUpperCase()}. Los equipos regresan a la cancha.`);
            return null;
          }
          // Aviso sonoro a los 10 segundos restantes (50s en timeout de 60s)
          if (prev.segundos === 11) {
            arenaSounds.playWhistle();
          }
          return { ...prev, segundos: prev.segundos - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(toInterval);
  }, [showTimeoutModal]);

  // Formato mm:ss
  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // -------------------------------------------------------------
  // AJUSTE FINO DEL CRONÓMETRO (AUMENTAR O DISMINUIR SEGUNDOS)
  // Según solicitado: "disminuir el cronómetro en caso de que haya pasado"
  // -------------------------------------------------------------
  const adjustTimer = (seconds: number) => {
    setTimer(prev => {
      const next = Math.max(0, prev + seconds);
      const signo = seconds > 0 ? '+' : '';
      setAlerta(`⏱️ Tiempo ajustado: ${signo}${seconds}s (Ahora: ${formatTime(next)})`);
      return next;
    });
  };

  const setExactTimer = (mins: number, secs: number) => {
    const total = Math.max(0, mins * 60 + secs);
    setTimer(total);
    setShowEditTimeModal(false);
    setAlerta(`⏱️ Cronómetro fijado a ${formatTime(total)}`);
  };

  // Shot Clock Resets
  const resetShotClock = (seconds: 24 | 14 | 12) => {
    setShotClock(seconds);
    setAlerta(`🏀 Reloj de tiro reiniciado a ${seconds} segundos.`);
  };

  // -------------------------------------------------------------
  // GUARDADO EN BACKEND
  // -------------------------------------------------------------
  const getToken = () => {
    try {
      const session = JSON.parse(localStorage.getItem('user_session') || '{}');
      return session.access_token || session.token || '';
    } catch {
      return '';
    }
  };

  const handleSave = async (nuevoEstado?: string, ganadorId?: string | null, customStats?: any) => {
    const estadoFinal = nuevoEstado || estado;
    const statsToSave = customStats || estadisticas;
    statsToSave.tiempo_restante = timer;
    statsToSave.reloj_tiro = shotClock;

    try {
      await fetch(`${API_URL}/cancha/torneos/partidos/${match.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({
          goles_local: statsToSave.local.puntos,
          goles_visitante: statsToSave.visitante.puntos,
          estado: estadoFinal,
          estadisticas: statsToSave,
          ...(ganadorId ? { ganador_id: ganadorId } : {})
        })
      });
      if (onSaved) onSaved();
      if (onUpdate) onUpdate();
    } catch (e) {
      console.error("Error guardando partido de baloncesto:", e);
    }
  };

  // -------------------------------------------------------------
  // MOTOR DE PUNTUACIÓN (TIROS LIBRES, DOBLES, TRIPLES)
  // -------------------------------------------------------------
  const addPoints = (lado: 'local' | 'visitante', pts: 1 | 2 | 3, delta: number = 1) => {
    const teamName = lado === 'local' ? nombreLocal : nombreVisitante;
    const actionType = pts === 1 ? 'tiros_libres' : (pts === 2 ? 'dobles' : 'triples');
    const labelType = pts === 1 ? 'Tiro Libre (+1)' : (pts === 2 ? 'Canasta Doble (+2)' : 'Triple (+3)');

    if (delta > 0) {
      arenaSounds.playScore(pts);
    }

    setEstadisticas((prev: any) => {
      const n = JSON.parse(JSON.stringify(prev));
      const currentPoints = n[lado].puntos || 0;
      const totalDelta = pts * delta;
      const newPoints = Math.max(0, currentPoints + totalDelta);
      n[lado].puntos = newPoints;

      // Conteo de tiro específico
      n[lado][actionType] = Math.max(0, (n[lado][actionType] || 0) + delta);

      // Desglose por cuarto
      const pKey = n.periodo_actual.startsWith('OT') ? 'OT' : n.periodo_actual;
      if (!n[lado].puntos_por_cuarto) {
        n[lado].puntos_por_cuarto = { Q1: 0, Q2: 0, Q3: 0, Q4: 0, OT: 0 };
      }
      n[lado].puntos_por_cuarto[pKey] = Math.max(0, (n[lado].puntos_por_cuarto[pKey] || 0) + totalDelta);

      // Resetear shot clock a 24s tras canasta de campo (doble o triple)
      if (delta > 0 && pts >= 2) {
        setShotClock(24);
      }

      const signo = delta > 0 ? '+' : '';
      setAlerta(`🏀 ${signo}${totalDelta} pt(s) [${labelType}] para ${teamName}. Total: ${newPoints} pts.`);

      // Registrar evento en log interno
      n.eventos_log = n.eventos_log || [];
      n.eventos_log.unshift({
        tiempo: formatTime(timer),
        periodo: n.periodo_actual,
        equipo: lado,
        accion: `${delta > 0 ? 'Anotación' : 'Corrección'}: ${labelType}`,
        marcador: `${lado === 'local' ? newPoints : n.local.puntos} - ${lado === 'visitante' ? newPoints : n.visitante.puntos}`
      });

      return n;
    });
  };

  // -------------------------------------------------------------
  // FALTAS Y SITUACIÓN DE BONUS
  // Regla FIBA/NBA: La 5ª falta de equipo por cuarto entra en situación de BONUS/PENALTY
  // -------------------------------------------------------------
  const addFoul = (lado: 'local' | 'visitante', tipo: 'personal' | 'tecnica' | 'antideportiva', delta: number = 1) => {
    const teamName = lado === 'local' ? nombreLocal : nombreVisitante;
    const rivalName = lado === 'local' ? nombreVisitante : nombreLocal;

    if (delta > 0) {
      arenaSounds.playWhistle();
    }

    setEstadisticas((prev: any) => {
      const n = JSON.parse(JSON.stringify(prev));
      const currentPeriodFouls = n[lado].faltas_periodo || 0;
      const newPeriodFouls = Math.max(0, currentPeriodFouls + delta);
      n[lado].faltas_periodo = newPeriodFouls;
      n[lado].faltas_totales = Math.max(0, (n[lado].faltas_totales || 0) + delta);

      if (tipo === 'tecnica') {
        n[lado].faltas_tecnicas = Math.max(0, (n[lado].faltas_tecnicas || 0) + delta);
      } else if (tipo === 'antideportiva') {
        n[lado].faltas_antideportivas = Math.max(0, (n[lado].faltas_antideportivas || 0) + delta);
      }

      // Evaluar BONUS (5ta falta colectiva en el cuarto)
      const limite = n.limite_faltas_bonus || 5;
      const isBonus = newPeriodFouls >= limite;
      n[lado].en_bonus = isBonus;

      if (isBonus && delta > 0) {
        setAlerta(`⚠️ ¡FALTA COLECTIVA #${newPeriodFouls} DE ${teamName.toUpperCase()}! Entra en situación de BONUS (Penalización). Tiros libres para ${rivalName}.`);
      } else {
        setAlerta(`Falta ${tipo} registrada para ${teamName} (${newPeriodFouls}/${limite} en ${n.periodo_actual}).`);
      }

      n.eventos_log = n.eventos_log || [];
      n.eventos_log.unshift({
        tiempo: formatTime(timer),
        periodo: n.periodo_actual,
        equipo: lado,
        accion: `Falta ${tipo} (${newPeriodFouls}/${limite})`,
        marcador: `${n.local.puntos} - ${n.visitante.puntos}`
      });

      return n;
    });
  };

  // -------------------------------------------------------------
  // TIEMPOS MUERTOS (TIMEOUTS)
  // -------------------------------------------------------------
  const solicitarTiempoMuerto = (lado: 'local' | 'visitante', segundos: number = 60) => {
    const teamName = lado === 'local' ? nombreLocal : nombreVisitante;
    arenaSounds.playWhistle();

    setEstadisticas((prev: any) => {
      const n = JSON.parse(JSON.stringify(prev));
      const restantes = Math.max(0, (n[lado].tiempos_muertos_restantes ?? 5) - 1);
      n[lado].tiempos_muertos_restantes = restantes;
      n[lado].tiempos_muertos = (n[lado].tiempos_muertos || 0) + 1;
      return n;
    });

    setIsRunning(false);
    setShowTimeoutModal({ visible: true, equipo: lado, segundos });
  };

  // -------------------------------------------------------------
  // FLECHA DE POSESIÓN ALTERNA
  // -------------------------------------------------------------
  const togglePossession = () => {
    setEstadisticas((prev: any) => {
      const n = JSON.parse(JSON.stringify(prev));
      const next = n.flecha_posesion === 'local' ? 'visitante' : 'local';
      n.flecha_posesion = next;
      setAlerta(`🔄 Flecha de posesión alterna ahora apunta a: ${next === 'local' ? nombreLocal : nombreVisitante}`);
      return n;
    });
  };

  // -------------------------------------------------------------
  // CAMBIO DE PERÍODOS Y ALARGUES (OVERTIME)
  // -------------------------------------------------------------
  const cambiarPeriodo = (nuevoPeriodo: string) => {
    setIsRunning(false);
    setEstadisticas((prev: any) => {
      const n = JSON.parse(JSON.stringify(prev));
      n.periodo_actual = nuevoPeriodo;

      // Al cambiar de cuarto regular (Q1->Q2, Q2->Q3, Q3->Q4), se reinician las faltas colectivas del período
      if (!nuevoPeriodo.startsWith('OT')) {
        n.local.faltas_periodo = 0;
        n.local.en_bonus = false;
        n.visitante.faltas_periodo = 0;
        n.visitante.en_bonus = false;
        const dur = n.duracion_cuarto || (n.reglamento === 'NBA' ? 720 : 600);
        setTimer(dur);
      } else {
        // En prórroga / alargue: 5 minutos oficiales (300s)
        n.en_alargue = true;
        setTimer(300);
        // Cada equipo recibe +1 tiempo muerto en cada alargue (Regla FIBA/NBA)
        n.local.tiempos_muertos_restantes = (n.local.tiempos_muertos_restantes || 0) + 1;
        n.visitante.tiempos_muertos_restantes = (n.visitante.tiempos_muertos_restantes || 0) + 1;
      }

      setShotClock(24);
      setAlerta(`🔔 Período ${nuevoPeriodo} iniciado. Faltas de período reiniciadas y cronómetro listo.`);
      return n;
    });
  };

  // Evaluación al finalizar el cronómetro a 00:00
  const evaluarFinDePeriodo = () => {
    const ptLoc = estadisticas.local.puntos;
    const ptVis = estadisticas.visitante.puntos;
    const curP = estadisticas.periodo_actual;

    if (curP === 'Q4' || curP.startsWith('OT')) {
      if (ptLoc === ptVis) {
        setAlerta("⏰ ¡TIEMPO REGLAMENTARIO FINALIZADO EN EMPATE! Debe disputarse una prórroga (Alargue de 5 minutos).");
      } else {
        const ganador = ptLoc > ptVis ? nombreLocal : nombreVisitante;
        setAlerta(`🏆 ¡PARTIDO FINALIZADO! Victoria para ${ganador} (${ptLoc} - ${ptVis}).`);
      }
    } else {
      setAlerta(`⏰ Fin del período ${curP}. Proceder al siguiente período.`);
    }
  };

  // Iniciar Alargue oficial
  const iniciarAlargue = () => {
    const ptLoc = estadisticas.local.puntos;
    const ptVis = estadisticas.visitante.puntos;
    if (ptLoc !== ptVis) {
      alert("El alargue o prórroga sólo se disputa si existe empate estricto en el marcador.");
      return;
    }

    const nextOtNum = (estadisticas.numero_alargue || 0) + 1;
    const nextOt = `OT${nextOtNum}`;

    setEstadisticas((prev: any) => {
      const n = JSON.parse(JSON.stringify(prev));
      n.en_alargue = true;
      n.numero_alargue = nextOtNum;
      n.periodo_actual = nextOt;
      n.local.tiempos_muertos_restantes = (n.local.tiempos_muertos_restantes || 0) + 1;
      n.visitante.tiempos_muertos_restantes = (n.visitante.tiempos_muertos_restantes || 0) + 1;
      return n;
    });

    setTimer(300); // 5:00
    setShotClock(24);
    setIsRunning(false);
    setAlerta(`🔥 ¡PRÓRROGA ${nextOt} INICIADA (5:00)! +1 Tiempo Muerto concedido a cada equipo.`);
  };

  // Finalizar Partido
  const handleFinalizarPartido = () => {
    const ptLoc = estadisticas.local.puntos;
    const ptVis = estadisticas.visitante.puntos;

    if (ptLoc === ptVis) {
      if (!confirm("El marcador está EMPATADO. Según las reglas oficiales del baloncesto, los partidos no pueden terminar en empate (debe jugarse alargue). ¿Deseas finalizar de todas formas?")) {
        return;
      }
    }

    const ganadorLado = ptLoc > ptVis ? 'local' : (ptVis > ptLoc ? 'visitante' : null);
    const ganadorId = ganadorLado === 'local' ? match.equipo_local_id : (ganadorLado === 'visitante' ? match.equipo_visitante_id : null);
    const ganadorNombre = ganadorLado === 'local' ? nombreLocal : (ganadorLado === 'visitante' ? nombreVisitante : 'Empate');

    const n = JSON.parse(JSON.stringify(estadisticas));
    n.ganador_lado = ganadorLado;
    n.metodo_victoria = `Puntuación Final (${ptLoc} - ${ptVis})`;

    setEstado('finalizado');
    setEstadisticas(n);
    handleSave('finalizado', ganadorId, n);
    setAlerta(`🏆 Partido finalizado oficialmente. Ganador: ${ganadorNombre}.`);
  };

  // -------------------------------------------------------------
  // ATAJOS DE TECLADO Y NUMPAD PROFESIONAL
  // -------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          setIsRunning(prev => !prev);
          break;
        case 'Digit1':
        case 'Numpad1':
          e.preventDefault();
          addPoints('local', 1, 1);
          break;
        case 'Digit2':
        case 'Numpad2':
          e.preventDefault();
          addPoints('local', 2, 1);
          break;
        case 'Digit3':
        case 'Numpad3':
          e.preventDefault();
          addPoints('local', 3, 1);
          break;
        case 'Digit7':
        case 'Numpad7':
          e.preventDefault();
          addPoints('visitante', 1, 1);
          break;
        case 'Digit8':
        case 'Numpad8':
          e.preventDefault();
          addPoints('visitante', 2, 1);
          break;
        case 'Digit9':
        case 'Numpad9':
          e.preventDefault();
          addPoints('visitante', 3, 1);
          break;
        case 'KeyZ':
          e.preventDefault();
          resetShotClock(24);
          break;
        case 'KeyX':
          e.preventDefault();
          resetShotClock(14);
          break;
        case 'KeyP':
          e.preventDefault();
          togglePossession();
          break;
        case 'KeyB':
          e.preventDefault();
          arenaSounds.playBuzzer();
          break;
        case 'ArrowRight':
          e.preventDefault();
          adjustTimer(e.shiftKey ? 5 : 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          adjustTimer(e.shiftKey ? -5 : -1);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [timer, shotClock, estadisticas]);

  // Variables calculadas
  const ptLocal = estadisticas.local.puntos;
  const ptVisitante = estadisticas.visitante.puntos;
  const isTied = ptLocal === ptVisitante;
  const curPeriod = estadisticas.periodo_actual;

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[140] flex flex-col justify-between overflow-y-auto font-sans text-white">
      {/* ============================================================ */}
      {/* 1. TOP HEADER & METADATOS                                    */}
      {/* ============================================================ */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition"
            title="Cerrar tablero"
          >
            <X size={22} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🏀</span>
              <h1 className="text-lg font-black tracking-wide text-amber-400 uppercase">
                Tablero de Baloncesto Oficial
              </h1>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                {estadisticas.reglamento}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              {match.fase || 'Fase de Torneo'} • Cancha: {match.cancha || match.area || 'Principal'}
            </p>
          </div>
        </div>

        {/* SELECTOR DE REGLAMENTO */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {(['FIBA', 'NBA', '3x3'] as const).map(reg => (
            <button
              key={reg}
              onClick={() => {
                setEstadisticas((p: any) => ({
                  ...p,
                  reglamento: reg,
                  duracion_cuarto: reg === 'NBA' ? 720 : 600,
                  limite_faltas_bonus: reg === '3x3' ? 7 : 5,
                  limite_faltas_jugador: reg === 'NBA' ? 6 : 5
                }));
                if (timer === 600 || timer === 720) {
                  setTimer(reg === 'NBA' ? 720 : 600);
                }
                setAlerta(`Reglamento actualizado a ${reg}.`);
              }}
              className={`px-3 py-1 text-xs font-black rounded-lg transition ${
                estadisticas.reglamento === reg
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {reg}
            </button>
          ))}
        </div>

        {/* BOTONES DE ACCIÓN: SONIDO, ATAJOS, ACTA, GUARDAR */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl transition border ${
              soundEnabled
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title={soundEnabled ? "Silenciar bocina y efectos" : "Activar sonido"}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          <button
            onClick={() => arenaSounds.playBuzzer()}
            className="px-3 py-1.5 bg-red-600/30 hover:bg-red-600/50 text-red-300 border border-red-600/50 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            title="Sonar bocina de mesa"
          >
            <Flame size={14} /> Bocina
          </button>

          <button
            onClick={() => setShowKeyboardModal(true)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700"
            title="Ver atajos de teclado"
          >
            <HelpCircle size={18} />
          </button>

          <button
            onClick={() => setShowScoresheet(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <FileText size={14} /> Acta Oficial
          </button>

          <button
            onClick={() => handleSave()}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-lg flex items-center gap-1.5"
          >
            <Check size={14} /> Guardar
          </button>

          <button
            onClick={handleFinalizarPartido}
            className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition shadow-lg flex items-center gap-1.5 ${
              estado === 'finalizado'
                ? 'bg-purple-700 text-white'
                : 'bg-red-600 hover:bg-red-500 text-white'
            }`}
          >
            <Trophy size={14} /> {estado === 'finalizado' ? 'Finalizado' : 'Terminar Partido'}
          </button>
        </div>
      </div>

      {/* MENSAJE O ALERTA */}
      {alerta && (
        <div className="bg-amber-600/90 text-slate-950 px-4 py-2 text-center text-xs font-black shadow-md flex items-center justify-center gap-2 animate-pulse">
          <AlertTriangle size={16} />
          <span>{alerta}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. TABLERO ELECTRÓNICO LED PRINCIPAL                        */}
      {/* ============================================================ */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 flex flex-col justify-center gap-6">

        {/* BARRA SUPERIOR: SELECTOR DE CUARTOS & FLECHA DE POSESIÓN */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
          {/* PERÍODOS: Q1, Q2, Q3, Q4, OT */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase mr-1">Período:</span>
            {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
              <button
                key={q}
                onClick={() => cambiarPeriodo(q)}
                className={`px-3 py-1 rounded-xl text-xs font-black tracking-wider transition ${
                  curPeriod === q
                    ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {q}
              </button>
            ))}

            {/* ALARGUES (OT1, OT2...) */}
            {['OT1', 'OT2', 'OT3'].map(ot => (
              <button
                key={ot}
                onClick={() => cambiarPeriodo(ot)}
                className={`px-3 py-1 rounded-xl text-xs font-black tracking-wider transition ${
                  curPeriod === ot
                    ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.6)] animate-pulse'
                    : 'bg-slate-800 text-slate-400 hover:text-red-400'
                }`}
              >
                {ot}
              </button>
            ))}

            {/* BOTÓN ALARGUE SI HAY EMPATE */}
            {isTied && (curPeriod === 'Q4' || curPeriod.startsWith('OT')) && (
              <button
                onClick={iniciarAlargue}
                className="ml-2 px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-lg animate-bounce flex items-center gap-1"
              >
                <Flame size={14} /> + Alargue (OT 5:00)
              </button>
            )}
          </div>

          {/* FLECHA DE POSESIÓN (POSSESSION ARROW) */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase">Posesión:</span>
            <button
              onClick={togglePossession}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl border text-xs font-black transition ${
                estadisticas.flecha_posesion === 'local'
                  ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : 'bg-amber-950/60 border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
              }`}
            >
              <ArrowLeftRight size={14} />
              <span>
                {estadisticas.flecha_posesion === 'local' ? `◄ LOCAL (${nombreLocal})` : `VISITANTE (${nombreVisitante}) ►`}
              </span>
            </button>
          </div>
        </div>

        {/* TABLERO CENTRAL DE 3 COLUMNAS: LOCAL | CRONÓMETROS | VISITANTE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

          {/* ============================================================ */}
          {/* LADO LOCAL (HOME)                                            */}
          {/* ============================================================ */}
          <div className="lg:col-span-4 bg-slate-900/90 rounded-3xl p-6 border-2 border-cyan-500/40 shadow-2xl flex flex-col justify-between relative overflow-hidden">
            {/* Header Local */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="bg-cyan-600/30 text-cyan-300 border border-cyan-500/50 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                  LOCAL (HOME)
                </span>
                {estadisticas.local.en_bonus && (
                  <span className="bg-red-600 text-white text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse">
                    ★ BONUS / PENALTY
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-black text-white line-clamp-1 mb-2">
                {nombreLocal}
              </h2>
            </div>

            {/* MARCADOR GIGANTE */}
            <div className="my-4 text-center">
              <div className="text-8xl md:text-9xl font-black font-mono tracking-tighter text-cyan-400 drop-shadow-[0_0_25px_rgba(6,182,212,0.4)]">
                {ptLocal}
              </div>

              {/* Indicadores LED de Faltas Colectivas */}
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-xs font-bold text-slate-400 uppercase mr-1">Faltas:</span>
                {[1, 2, 3, 4, 5].map(num => (
                  <div
                    key={num}
                    className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] font-black transition ${
                      estadisticas.local.faltas_periodo >= num
                        ? (num === 5 ? 'bg-red-500 border-red-400 text-white animate-pulse' : 'bg-amber-400 border-amber-300 text-slate-950')
                        : 'bg-slate-800 border-slate-700 text-slate-500'
                    }`}
                  >
                    {num === 5 ? 'B' : num}
                  </div>
                ))}
                <span className="text-xs font-bold text-slate-300 ml-1">
                  ({estadisticas.local.faltas_periodo}/5)
                </span>
              </div>
            </div>

            {/* BOTONES DE PUNTUACIÓN RÁPIDA: +1 TL, +2 DOBLE, +3 TRIPLE */}
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => addPoints('local', 1, 1)}
                  className="py-3.5 bg-cyan-700 hover:bg-cyan-600 rounded-2xl font-black text-sm transition shadow-lg flex flex-col items-center justify-center"
                >
                  <span className="text-lg">+1</span>
                  <span className="text-[10px] uppercase font-bold text-cyan-200">Tiro Libre</span>
                </button>
                <button
                  onClick={() => addPoints('local', 2, 1)}
                  className="py-3.5 bg-cyan-600 hover:bg-cyan-500 rounded-2xl font-black text-sm transition shadow-lg flex flex-col items-center justify-center"
                >
                  <span className="text-lg">+2</span>
                  <span className="text-[10px] uppercase font-bold text-cyan-200">Doble</span>
                </button>
                <button
                  onClick={() => addPoints('local', 3, 1)}
                  className="py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-2xl font-black text-sm transition shadow-lg flex flex-col items-center justify-center"
                >
                  <span className="text-lg">+3</span>
                  <span className="text-[10px] uppercase font-bold text-cyan-950">Triple</span>
                </button>
              </div>

              {/* Botones de corrección / resta */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => addPoints('local', 1, -1)}
                  className="py-1 bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold"
                >
                  -1 TL
                </button>
                <button
                  onClick={() => addPoints('local', 2, -1)}
                  className="py-1 bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold"
                >
                  -2 Doble
                </button>
                <button
                  onClick={() => addPoints('local', 3, -1)}
                  className="py-1 bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold"
                >
                  -3 Triple
                </button>
              </div>

              {/* FALTAS Y TIEMPO MUERTO */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => addFoul('local', 'personal', 1)}
                  className="py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <ShieldAlert size={14} /> + Falta ({estadisticas.local.faltas_periodo})
                </button>
                <button
                  onClick={() => solicitarTiempoMuerto('local', 60)}
                  className="py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <Clock size={14} /> Timeout ({estadisticas.local.tiempos_muertos_restantes})
                </button>
              </div>
            </div>
          </div>


          {/* ============================================================ */}
          {/* CENTRO: CRONÓMETRO DE JUEGO & RELOJ DE TIRO (SHOT CLOCK)     */}
          {/* ============================================================ */}
          <div className="lg:col-span-4 bg-slate-950/90 rounded-3xl p-6 border-2 border-slate-800 shadow-2xl flex flex-col justify-between items-center text-center">

            {/* CRONÓMETRO DE JUEGO (GAME CLOCK) */}
            <div className="w-full">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 px-2">
                <span>Reloj de Juego</span>
                <span className="text-amber-400">{curPeriod}</span>
              </div>

              <div className="bg-black/60 border-2 border-slate-800 rounded-2xl py-4 px-6 relative group">
                <div className="text-6xl md:text-7xl font-black font-mono tracking-widest text-slate-100 drop-shadow-[0_0_20px_rgba(255,255,255,0.25)]">
                  {formatTime(timer)}
                </div>
                <button
                  onClick={() => {
                    setEditMinutes(Math.floor(timer / 60));
                    setEditSeconds(timer % 60);
                    setShowEditTimeModal(true);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition"
                  title="Fijar tiempo exacto"
                >
                  <Edit2 size={14} />
                </button>
              </div>

              {/* CONTROLES PLAY / PAUSE / RESET */}
              <div className="flex items-center justify-center gap-3 mt-3">
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className={`px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-wider transition shadow-xl flex items-center gap-2 ${
                    isRunning
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                  }`}
                >
                  {isRunning ? <Pause size={18} /> : <Play size={18} />}
                  <span>{isRunning ? 'Pausar' : 'Iniciar'}</span>
                </button>

                <button
                  onClick={() => {
                    const dur = curPeriod.startsWith('OT') ? 300 : (estadisticas.duracion_cuarto || 600);
                    setTimer(dur);
                    setIsRunning(false);
                    setAlerta(`⏱️ Cronómetro reiniciado a ${formatTime(dur)}.`);
                  }}
                  className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold transition border border-slate-700"
                  title="Reiniciar cuarto"
                >
                  <RotateCcw size={18} />
                </button>
              </div>

              {/* BOTONES DE AJUSTE FINO (DISMINUIR Y AUMENTAR SEGUNDOS) */}
              {/* "disminuir el cronómetro en caso de que haya pasado (parecido al de WKF)" */}
              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                  Ajuste Fino de Tiempo (Silbato / Yame)
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => adjustTimer(-1)}
                    className="py-1.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 rounded-xl text-xs font-black transition"
                    title="Restar 1 segundo"
                  >
                    -1s
                  </button>
                  <button
                    onClick={() => adjustTimer(-5)}
                    className="py-1.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 rounded-xl text-xs font-black transition"
                    title="Restar 5 segundos"
                  >
                    -5s
                  </button>
                  <button
                    onClick={() => adjustTimer(1)}
                    className="py-1.5 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/40 rounded-xl text-xs font-black transition"
                    title="Sumar 1 segundo"
                  >
                    +1s
                  </button>
                  <button
                    onClick={() => adjustTimer(5)}
                    className="py-1.5 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/40 rounded-xl text-xs font-black transition"
                    title="Sumar 5 segundos"
                  >
                    +5s
                  </button>
                </div>
              </div>
            </div>

            {/* RELOJ DE TIRO / POSESIÓN (SHOT CLOCK - 24s / 14s) */}
            <div className="w-full mt-4 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 px-2">
                <span>Reloj de Posesión</span>
                <span className={shotClock <= 5 ? "text-red-500 font-black animate-pulse" : "text-amber-400"}>
                  {shotClock <= 5 ? '¡PELIGRO!' : 'SHOT CLOCK'}
                </span>
              </div>

              <div className="flex items-center justify-center gap-4 bg-black/60 border-2 border-slate-800 rounded-2xl py-3 px-6">
                <div className={`text-6xl font-black font-mono tracking-tighter ${
                  shotClock <= 5
                    ? 'text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-pulse'
                    : 'text-amber-400 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                }`}>
                  {shotClock.toString().padStart(2, '0')}
                </div>

                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => resetShotClock(24)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider transition shadow"
                  >
                    Reset 24s
                  </button>
                  <button
                    onClick={() => resetShotClock(14)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl font-bold text-xs uppercase tracking-wider transition"
                  >
                    Reset 14s
                  </button>
                </div>
              </div>
            </div>

          </div>


          {/* ============================================================ */}
          {/* LADO VISITANTE (AWAY)                                        */}
          {/* ============================================================ */}
          <div className="lg:col-span-4 bg-slate-900/90 rounded-3xl p-6 border-2 border-amber-500/40 shadow-2xl flex flex-col justify-between relative overflow-hidden">
            {/* Header Visitante */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="bg-amber-600/30 text-amber-300 border border-amber-500/50 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                  VISITANTE (AWAY)
                </span>
                {estadisticas.visitante.en_bonus && (
                  <span className="bg-red-600 text-white text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse">
                    ★ BONUS / PENALTY
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-black text-white line-clamp-1 mb-2">
                {nombreVisitante}
              </h2>
            </div>

            {/* MARCADOR GIGANTE */}
            <div className="my-4 text-center">
              <div className="text-8xl md:text-9xl font-black font-mono tracking-tighter text-amber-400 drop-shadow-[0_0_25px_rgba(245,158,11,0.4)]">
                {ptVisitante}
              </div>

              {/* Indicadores LED de Faltas Colectivas */}
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-xs font-bold text-slate-400 uppercase mr-1">Faltas:</span>
                {[1, 2, 3, 4, 5].map(num => (
                  <div
                    key={num}
                    className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] font-black transition ${
                      estadisticas.visitante.faltas_periodo >= num
                        ? (num === 5 ? 'bg-red-500 border-red-400 text-white animate-pulse' : 'bg-amber-400 border-amber-300 text-slate-950')
                        : 'bg-slate-800 border-slate-700 text-slate-500'
                    }`}
                  >
                    {num === 5 ? 'B' : num}
                  </div>
                ))}
                <span className="text-xs font-bold text-slate-300 ml-1">
                  ({estadisticas.visitante.faltas_periodo}/5)
                </span>
              </div>
            </div>

            {/* BOTONES DE PUNTUACIÓN RÁPIDA: +1 TL, +2 DOBLE, +3 TRIPLE */}
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => addPoints('visitante', 1, 1)}
                  className="py-3.5 bg-amber-700 hover:bg-amber-600 rounded-2xl font-black text-sm transition shadow-lg flex flex-col items-center justify-center"
                >
                  <span className="text-lg">+1</span>
                  <span className="text-[10px] uppercase font-bold text-amber-200">Tiro Libre</span>
                </button>
                <button
                  onClick={() => addPoints('visitante', 2, 1)}
                  className="py-3.5 bg-amber-600 hover:bg-amber-500 rounded-2xl font-black text-sm transition shadow-lg flex flex-col items-center justify-center"
                >
                  <span className="text-lg">+2</span>
                  <span className="text-[10px] uppercase font-bold text-amber-200">Doble</span>
                </button>
                <button
                  onClick={() => addPoints('visitante', 3, 1)}
                  className="py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl font-black text-sm transition shadow-lg flex flex-col items-center justify-center"
                >
                  <span className="text-lg">+3</span>
                  <span className="text-[10px] uppercase font-bold text-amber-950">Triple</span>
                </button>
              </div>

              {/* Botones de corrección / resta */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => addPoints('visitante', 1, -1)}
                  className="py-1 bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold"
                >
                  -1 TL
                </button>
                <button
                  onClick={() => addPoints('visitante', 2, -1)}
                  className="py-1 bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold"
                >
                  -2 Doble
                </button>
                <button
                  onClick={() => addPoints('visitante', 3, -1)}
                  className="py-1 bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold"
                >
                  -3 Triple
                </button>
              </div>

              {/* FALTAS Y TIEMPO MUERTO */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => addFoul('visitante', 'personal', 1)}
                  className="py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <ShieldAlert size={14} /> + Falta ({estadisticas.visitante.faltas_periodo})
                </button>
                <button
                  onClick={() => solicitarTiempoMuerto('visitante', 60)}
                  className="py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <Clock size={14} /> Timeout ({estadisticas.visitante.tiempos_muertos_restantes})
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* TABLA RESUMEN POR CUARTOS (BOX SCORE RESUMIDO) */}
        <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800 overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase font-black tracking-wider">
                <th className="py-2 text-left px-4">Equipo</th>
                <th className="py-2 px-3">Q1</th>
                <th className="py-2 px-3">Q2</th>
                <th className="py-2 px-3">Q3</th>
                <th className="py-2 px-3">Q4</th>
                <th className="py-2 px-3">OT</th>
                <th className="py-2 px-4 font-black text-amber-400 text-sm">TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-bold">
              <tr>
                <td className="py-2.5 px-4 text-left font-black text-cyan-300 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400"></div>
                  <span>{nombreLocal}</span>
                </td>
                <td className="py-2.5 px-3">{estadisticas.local.puntos_por_cuarto?.Q1 || 0}</td>
                <td className="py-2.5 px-3">{estadisticas.local.puntos_por_cuarto?.Q2 || 0}</td>
                <td className="py-2.5 px-3">{estadisticas.local.puntos_por_cuarto?.Q3 || 0}</td>
                <td className="py-2.5 px-3">{estadisticas.local.puntos_por_cuarto?.Q4 || 0}</td>
                <td className="py-2.5 px-3">{estadisticas.local.puntos_por_cuarto?.OT || 0}</td>
                <td className="py-2.5 px-4 text-base font-black text-cyan-400">{ptLocal}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 text-left font-black text-amber-300 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                  <span>{nombreVisitante}</span>
                </td>
                <td className="py-2.5 px-3">{estadisticas.visitante.puntos_por_cuarto?.Q1 || 0}</td>
                <td className="py-2.5 px-3">{estadisticas.visitante.puntos_por_cuarto?.Q2 || 0}</td>
                <td className="py-2.5 px-3">{estadisticas.visitante.puntos_por_cuarto?.Q3 || 0}</td>
                <td className="py-2.5 px-3">{estadisticas.visitante.puntos_por_cuarto?.Q4 || 0}</td>
                <td className="py-2.5 px-3">{estadisticas.visitante.puntos_por_cuarto?.OT || 0}</td>
                <td className="py-2.5 px-4 text-base font-black text-amber-400">{ptVisitante}</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>

      {/* ============================================================ */}
      {/* 3. MODALES DE APOYO                                          */}
      {/* ============================================================ */}

      {/* MODAL EDITAR TIEMPO EXACTO */}
      {showEditTimeModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[160] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center">
            <h3 className="text-lg font-black text-amber-400 mb-4 uppercase">
              Ajuste Exacto de Cronómetro
            </h3>
            <div className="flex items-center justify-center gap-3 my-4">
              <div>
                <label className="text-[10px] text-slate-400 block font-bold mb-1">MINUTOS</label>
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={editMinutes}
                  onChange={e => setEditMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-20 bg-slate-950 border border-slate-700 rounded-xl p-3 text-center text-3xl font-black font-mono text-white"
                />
              </div>
              <span className="text-3xl font-black text-slate-500 mt-4">:</span>
              <div>
                <label className="text-[10px] text-slate-400 block font-bold mb-1">SEGUNDOS</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={editSeconds}
                  onChange={e => setEditSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-20 bg-slate-950 border border-slate-700 rounded-xl p-3 text-center text-3xl font-black font-mono text-white"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowEditTimeModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={() => setExactTimer(editMinutes, editSeconds)}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black text-xs uppercase"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TIEMPO MUERTO EN VIVO */}
      {showTimeoutModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[160] flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center animate-fadeIn">
            <div className="flex items-center justify-center gap-2 text-amber-400 text-xl font-black mb-2 uppercase">
              <Clock size={24} /> Tiempo Muerto en Curso
            </div>
            <p className="text-sm font-bold text-slate-300 mb-6">
              Solicitado por: <span className="text-white uppercase font-black">{showTimeoutModal.equipo === 'local' ? nombreLocal : nombreVisitante}</span>
            </p>

            <div className="text-8xl font-black font-mono text-amber-400 my-4 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]">
              {showTimeoutModal.segundos.toString().padStart(2, '0')}
            </div>

            <p className="text-xs text-slate-400 mb-6">
              {showTimeoutModal.segundos <= 10 ? "⚠️ ¡10 Segundos restantes! Equipos regresan." : "Cuenta regresiva oficial"}
            </p>

            <button
              onClick={() => {
                arenaSounds.playWhistle();
                setShowTimeoutModal(null);
              }}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition shadow-lg"
            >
              Reanudar Juego
            </button>
          </div>
        </div>
      )}

      {/* MODAL GUÍA DE ATAJOS DE TECLADO */}
      {showKeyboardModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[170] flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-2xl w-full p-6 text-white shadow-2xl border-2 border-amber-500 animate-fadeIn">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-black text-lg">
                <span className="text-xl">⌨️</span>
                <span>Atajos Rápidos de Teclado (Mesa de Baloncesto)</span>
              </div>
              <button
                onClick={() => setShowKeyboardModal(false)}
                className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Local */}
              <div className="bg-cyan-950/30 border border-cyan-800/50 rounded-2xl p-3 space-y-2">
                <span className="font-black text-cyan-400 uppercase tracking-wider block border-b border-cyan-900/40 pb-1">
                  Atajos LOCAL (HOME)
                </span>
                <div className="flex justify-between items-center"><span className="text-slate-300">+1 Tiro Libre:</span><kbd className="bg-cyan-900/50 text-white font-mono px-2 py-0.5 rounded border border-cyan-700">1 / Num 1</kbd></div>
                <div className="flex justify-between items-center"><span className="text-slate-300">+2 Doble:</span><kbd className="bg-cyan-900/50 text-white font-mono px-2 py-0.5 rounded border border-cyan-700">2 / Num 2</kbd></div>
                <div className="flex justify-between items-center"><span className="text-slate-300">+3 Triple:</span><kbd className="bg-cyan-900/50 text-white font-mono px-2 py-0.5 rounded border border-cyan-700">3 / Num 3</kbd></div>
              </div>

              {/* Visitante */}
              <div className="bg-amber-950/30 border border-amber-800/50 rounded-2xl p-3 space-y-2">
                <span className="font-black text-amber-400 uppercase tracking-wider block border-b border-amber-900/40 pb-1">
                  Atajos VISITANTE (AWAY)
                </span>
                <div className="flex justify-between items-center"><span className="text-slate-300">+1 Tiro Libre:</span><kbd className="bg-amber-900/50 text-white font-mono px-2 py-0.5 rounded border border-amber-700">7 / Num 7</kbd></div>
                <div className="flex justify-between items-center"><span className="text-slate-300">+2 Doble:</span><kbd className="bg-amber-900/50 text-white font-mono px-2 py-0.5 rounded border border-amber-700">8 / Num 8</kbd></div>
                <div className="flex justify-between items-center"><span className="text-slate-300">+3 Triple:</span><kbd className="bg-amber-900/50 text-white font-mono px-2 py-0.5 rounded border border-amber-700">9 / Num 9</kbd></div>
              </div>

              {/* Control de Reloj */}
              <div className="col-span-1 md:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-3 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="font-bold text-amber-400 uppercase text-[11px] block">Cronómetro & Posesión:</span>
                  <div className="flex justify-between items-center"><span className="text-slate-400">Iniciar / Pausar:</span><kbd className="bg-slate-800 text-slate-200 font-mono px-2 py-0.5 rounded">Espacio</kbd></div>
                  <div className="flex justify-between items-center"><span className="text-slate-400">Reset Shot Clock 24s:</span><kbd className="bg-slate-800 text-slate-200 font-mono px-2 py-0.5 rounded">Z</kbd></div>
                  <div className="flex justify-between items-center"><span className="text-slate-400">Reset Shot Clock 14s:</span><kbd className="bg-slate-800 text-slate-200 font-mono px-2 py-0.5 rounded">X</kbd></div>
                  <div className="flex justify-between items-center"><span className="text-slate-400">Flecha Posesión:</span><kbd className="bg-slate-800 text-slate-200 font-mono px-2 py-0.5 rounded">P</kbd></div>
                  <div className="flex justify-between items-center"><span className="text-slate-400">Bocina Manual:</span><kbd className="bg-slate-800 text-slate-200 font-mono px-2 py-0.5 rounded">B</kbd></div>
                </div>
                <div className="space-y-1.5">
                  <span className="font-bold text-amber-400 uppercase text-[11px] block">Ajuste Fino de Segundos:</span>
                  <div className="flex justify-between items-center"><span className="text-slate-400">Sumar 1 seg:</span><kbd className="bg-slate-800 text-emerald-300 font-mono px-2 py-0.5 rounded">Flecha Derecha (→)</kbd></div>
                  <div className="flex justify-between items-center"><span className="text-slate-400">Restar 1 seg:</span><kbd className="bg-slate-800 text-rose-300 font-mono px-2 py-0.5 rounded">Flecha Izquierda (←)</kbd></div>
                  <div className="flex justify-between items-center"><span className="text-slate-400">Sumar / Restar 5s:</span><kbd className="bg-slate-800 text-slate-200 font-mono px-2 py-0.5 rounded">Shift + → / ←</kbd></div>
                </div>
              </div>
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={() => setShowKeyboardModal(false)}
                className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition shadow-md"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ACTA OFICIAL */}
      {showScoresheet && (
        <ActaBaloncestoModal
          match={{
            ...match,
            goles_local: ptLocal,
            goles_visitante: ptVisitante,
            estadisticas: estadisticas
          }}
          onClose={() => setShowScoresheet(false)}
        />
      )}

      {/* FOOTER */}
      <div className="bg-slate-950 text-slate-400 border-t border-slate-800 p-2 text-center text-[10px] font-bold tracking-widest uppercase flex items-center justify-center gap-4">
        <span>Sistema Oficial de Puntuación de Baloncesto • FIBA & NBA</span>
        <span className="text-amber-500">•</span>
        <span>Reloj de 24s / 14s • Situación de Bonus (5 Faltas) • Alargue (OT 5:00)</span>
      </div>
    </div>
  );
}
