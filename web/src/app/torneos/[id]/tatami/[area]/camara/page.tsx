"use client";
/**
 * /torneos/[id]/tatami/[area]/camara/page.tsx
 * 
 * Estación de Cámara Web Nativa para Tatami (Sin OBS)
 * 
 * Características:
 *  1. Captura cámara web o celular directamente en el navegador (1080p @ 60/30fps).
 *  2. Mantiene un Búfer Circular en memoria RAM de los últimos 45 segundos (MediaRecorder).
 *  3. Se conecta al WebSocket del tatami/combate.
 *  4. Al recibir el evento VR_SOLICITADO del árbitro, empaqueta el clip automáticamente
 *     y lo sube a la API para que el Juez VR lo reproduzca en su tablet en 1 segundo.
 *  5. Incluye botón de "Generar Replay Manual" para pruebas inmediatas.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  Camera,
  Video,
  Wifi,
  WifiOff,
  RotateCw,
  Maximize2,
  Minimize2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  Settings,
  ChevronRight,
  ShieldCheck
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";
const WS_URL  = API_URL.replace(/^http/, "ws");

const BUFFER_MAX_SECONDS = 45; // Duración máxima en memoria del búfer rodante

interface VideoChunk {
  blob: Blob;
  timestamp: number;
}

export default function TatamiCameraStation() {
  const params = useParams();
  const searchParams = useSearchParams();
  const torneoId = params.id as string;
  const area = params.area as string;
  const queryMatchId = searchParams.get("matchId");

  // Estado del combate
  const [matchId, setMatchId] = useState<string>(queryMatchId || "123");
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  // Cámara y video
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Búfer rodante en memoria
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<VideoChunk[]>([]);
  const [bufferSeconds, setBufferSeconds] = useState<number>(0);
  const [bufferSizeMB, setBufferSizeMB] = useState<string>("0.0");
  const [isRecordingBuffer, setIsRecordingBuffer] = useState<boolean>(false);

  // Estados de carga y eventos VR
  const [subiendoClip, setSubiendoClip] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("Iniciando cámara...");
  const [ultimoClipEnviado, setUltimoClipEnviado] = useState<string | null>(null);
  const [vrAlerta, setVrAlerta] = useState<{ activo: boolean; color: string; tipo: string } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  /* ─── 1. Detectar cámaras disponibles ─────────────────────────── */
  const listarDispositivos = useCallback(async () => {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devs.filter((d) => d.kind === "videoinput");
      setDevices(videoDevs);
      if (videoDevs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevs[0].deviceId);
      }
    } catch (err) {
      console.warn("No se pudieron listar cámaras:", err);
    }
  }, [selectedDeviceId]);

  /* ─── 2. Iniciar Cámara ───────────────────────────────────────── */
  const startCamera = useCallback(async (devId?: string) => {
    try {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      setStatusMessage("Solicitando acceso a la cámara...");

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: devId
          ? { deviceId: { exact: devId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : {
              facingMode: facingMode,
              width: { ideal: 1920, min: 1280 },
              height: { ideal: 1080, min: 720 },
              frameRate: { ideal: 60, min: 30 }
            }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setCameraActive(true);
      setStatusMessage("Cámara activa. Iniciando búfer circular...");
      await listarDispositivos();
    } catch (err: any) {
      console.error("Error al iniciar cámara:", err);
      setStatusMessage(`Error cámara: ${err.message || "Permiso denegado"}`);
      setCameraActive(false);
    }
  }, [facingMode, stream, listarDispositivos]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  /* ─── 3. Iniciar Búfer Circular (MediaRecorder) ─────────────────── */
  useEffect(() => {
    if (!stream || !cameraActive) return;

    // Detectar el mejor MIME type soportado por el navegador
    const mimeTypes = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4"
    ];
    let selectedMime = "";
    for (const m of mimeTypes) {
      if (MediaRecorder.isTypeSupported(m)) {
        selectedMime = m;
        break;
      }
    }

    try {
      const recorder = new MediaRecorder(stream, {
        mimeType: selectedMime || undefined,
        videoBitsPerSecond: 4_000_000 // 4 Mbps para nitidez marcial óptima
      });

      chunksRef.current = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          const now = Date.now();
          chunksRef.current.push({
            blob: event.data,
            timestamp: now
          });

          // Poda del búfer: conservar solo los últimos BUFFER_MAX_SECONDS
          const cutoff = now - BUFFER_MAX_SECONDS * 1000;
          chunksRef.current = chunksRef.current.filter((c) => c.timestamp >= cutoff);

          // Actualizar métricas visuales
          const totalBytes = chunksRef.current.reduce((acc, c) => acc + c.blob.size, 0);
          setBufferSizeMB((totalBytes / (1024 * 1024)).toFixed(1));

          if (chunksRef.current.length > 0) {
            const spanSecs = Math.round(
              (now - chunksRef.current[0].timestamp) / 1000
            );
            setBufferSeconds(Math.min(spanSecs, BUFFER_MAX_SECONDS));
          }
        }
      };

      recorder.start(1000); // Genera 1 chunk por segundo
      mediaRecorderRef.current = recorder;
      setIsRecordingBuffer(true);
      setStatusMessage("Búfer rodante activo (últimos 45s en memoria)");
    } catch (err) {
      console.error("Error al iniciar MediaRecorder:", err);
      setStatusMessage("Error al crear grabador de repeticiones");
    }

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, [stream, cameraActive]);

  /* ─── 4. Generar y Subir Clip de Video ─────────────────────────── */
  const ensamblarYSubirClip = useCallback(
    async (reviewId?: number, tipoReclamo?: string, colorCompetidor?: string) => {
      if (chunksRef.current.length === 0) {
        setStatusMessage("⚠️ Búfer vacío: aún no hay cuadros grabados");
        return;
      }

      setSubiendoClip(true);
      setStatusMessage("⚡ Extrayendo últimos segundos del búfer rodante...");

      try {
        const mimeType = mediaRecorderRef.current?.mimeType || "video/webm";
        const blobs = chunksRef.current.map((c) => c.blob);
        const replayBlob = new Blob(blobs, { type: mimeType });

        const ext = mimeType.includes("mp4") ? ".mp4" : ".webm";
        const filename = `clip_tatami_${area}_${matchId}_${Date.now()}${ext}`;

        const formData = new FormData();
        formData.append("file", replayBlob, filename);

        const urlUpload = `${API_URL}/api/vr/combates/${matchId}/subir-clip${
          reviewId ? `?review_id=${reviewId}` : ""
        }`;

        setStatusMessage("📤 Enviando clip al Juez VR por red local...");
        const res = await fetch(urlUpload, {
          method: "POST",
          body: formData
        });

        const data = await res.json();
        if (res.ok && data.ok) {
          setUltimoClipEnviado(data.clip_url);
          setStatusMessage(
            `✅ Replay enviado al Juez VR (${chunksRef.current.length}s de video)`
          );
        } else {
          setStatusMessage(`⚠️ Error en subida: ${data.detail || "Fallo del servidor"}`);
        }
      } catch (err: any) {
        console.error("Error al subir clip de video:", err);
        setStatusMessage(`❌ Error de conexión al subir clip: ${err.message}`);
      } finally {
        setSubiendoClip(false);
      }
    },
    [matchId, area]
  );

  /* ─── 5. Conexión WebSocket para Replay Automático ─────────────── */
  useEffect(() => {
    if (!matchId) return;

    let ws: WebSocket;
    const connectWS = () => {
      ws = new WebSocket(`${WS_URL}/api/vr/ws/${matchId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          // ALERTA DE VIDEO REVIEW SOLICITADO POR EL ÁRBITRO
          if (msg.event === "VR_SOLICITADO") {
            setVrAlerta({
              activo: true,
              color: msg.competidor_color,
              tipo: msg.tipo_solicitud
            });

            // DISPARO 100% AUTOMÁTICO: corta y sube el búfer al momento
            ensamblarYSubirClip(msg.review_id, msg.tipo_solicitud, msg.competidor_color);
          }

          if (msg.event === "VR_RESUELTO") {
            setVrAlerta(null);
          }
        } catch {}
      };

      ws.onclose = () => {
        setWsConnected(false);
        setTimeout(connectWS, 3000);
      };
    };

    connectWS();
    return () => {
      if (ws) ws.close();
    };
  }, [matchId, ensamblarYSubirClip]);

  /* ─── 6. Cambiar cámara (Frontal/Trasera) ───────────────────────── */
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
    setTimeout(() => startCamera(), 100);
  };

  /* ─── 7. Modo Pantalla Completa ───────────────────────────────── */
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="relative w-screen h-screen bg-black text-white font-sans overflow-hidden select-none flex flex-col justify-between">
      {/* ─── Video Live Preview ─────────────────────────────────── */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover z-0"
      />

      {/* ─── Overlay Sutil de Enfoque Marcial ────────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-10 border-[3px] border-white/10 m-3 rounded-2xl flex items-center justify-center">
        {/* Marcador central de encuadre */}
        <div className="w-16 h-16 border-2 border-white/20 rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
        </div>
      </div>

      {/* ─── HEADER SUPERIOR ─────────────────────────────────────── */}
      <div className="relative z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent backdrop-blur-sm">
        {/* Identificador de Tatami */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/90 border border-red-500/50 flex items-center justify-center shadow-lg shadow-red-950/50">
            <Video className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-red-400">
                Cámara Oficial
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/20 font-mono font-bold">
                TATAMI {area}
              </span>
            </div>
            <div className="text-sm font-black tracking-tight text-white flex items-center gap-2">
              <span>Match:</span>
              <input
                type="text"
                value={matchId}
                onChange={(e) => setMatchId(e.target.value)}
                className="w-24 bg-white/10 border border-white/20 rounded px-2 py-0.5 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                title="ID del combate activo"
              />
            </div>
          </div>
        </div>

        {/* Indicadores de Estado */}
        <div className="flex items-center gap-2">
          {/* WebSocket */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black ${
              wsConnected
                ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300"
                : "bg-red-950/80 border-red-500/50 text-red-300"
            }`}
          >
            {wsConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{wsConnected ? "ONLINE" : "OFFLINE"}</span>
          </div>

          {/* Búfer en RAM */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-bold text-blue-300">{bufferSeconds}s</span>
            <span className="text-slate-400 text-[10px]">({bufferSizeMB}MB)</span>
          </div>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition"
            title="Pantalla completa"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ─── BANNER DE ALERTA VR EN PROCESO ───────────────────────── */}
      {vrAlerta && (
        <div className="relative z-30 mx-4 bg-gradient-to-r from-amber-500 via-red-600 to-amber-500 p-0.5 rounded-2xl shadow-2xl animate-pulse">
          <div className="bg-slate-950/95 rounded-2xl px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-red-500 animate-ping" />
              <div>
                <div className="text-xs font-black tracking-widest text-amber-400 uppercase">
                  🎥 VIDEO REVIEW SOLICITADO · ESQUINA {vrAlerta.color?.toUpperCase()}
                </div>
                <div className="text-sm font-bold text-white">
                  Reclamo: {vrAlerta.tipo.replace("_", "-")} — Generando y enviando replay...
                </div>
              </div>
            </div>
            {subiendoClip && (
              <span className="text-xs font-black uppercase text-amber-300 animate-spin">
                ⏳ Subiendo...
              </span>
            )}
          </div>
        </div>
      )}

      {/* ─── FOOTER INFERIOR CON CONTROLES Y FEEDBACK ────────────── */}
      <div className="relative z-20 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent backdrop-blur-sm flex flex-col gap-3">
        {/* Barra de Estado Informativo */}
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium truncate">{statusMessage}</span>
          </div>
          {ultimoClipEnviado && (
            <span className="text-[10px] text-emerald-400 font-mono font-bold hidden sm:inline">
              ✓ Último Replay Transferido
            </span>
          )}
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center justify-between gap-3">
          {/* Selector de cámara si hay más de una */}
          <div className="flex items-center gap-2">
            {devices.length > 1 && (
              <select
                value={selectedDeviceId}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                  startCamera(e.target.value);
                }}
                className="bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500"
              >
                {devices.map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Cámara ${i + 1}`}
                  </option>
                ))}
              </select>
            )}

            {/* Alternar Frontal / Trasera (Móvil) */}
            <button
              onClick={toggleFacingMode}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold transition active:scale-95"
              title="Girar cámara"
            >
              <RotateCw className="w-4 h-4 text-slate-300" />
              <span className="hidden sm:inline">Girar</span>
            </button>
          </div>

          {/* BOTÓN DE DISPARO MANUAL (Para Pruebas Inmediatas) */}
          <button
            onClick={() => ensamblarYSubirClip()}
            disabled={subiendoClip}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition shadow-xl ${
              subiendoClip
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-white hover:opacity-95 active:scale-95 shadow-red-900/40"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{subiendoClip ? "Enviando Replay..." : "⚡ Disparar Replay Ahora (Prueba)"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
