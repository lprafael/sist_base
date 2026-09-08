"use client";
/**
 * /torneos/[id]/vr-station/page.tsx
 * 
 * Panel del Juez de Video Review — Interfaz táctil para tablet/monitor secundario.
 * El Juez VR usa esta pantalla para:
 *   1. Recibir alertas de solicitud de Video Review por WebSocket
 *   2. Reproducir el clip de video con controles frame-a-frame
 *   3. Emitir veredicto: ACEPTADO (+ puntos), RECHAZADO o MIENAI
 * 
 * Timer de 30 segundos de deliberación reglamentaria.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";

const getApiUrl = () => {
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return "https://api.micancha.com.py";
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
};
const API_URL = getApiUrl();
const WS_URL  = API_URL.replace(/^http/, "ws");

/* ─── Types ─────────────────────────────────────────────────────── */
interface VRRequest {
  reviewId: number;
  color: "Aka" | "Ao" | "Blanco" | "Rojo";
  tipo: string;
  tiempo: string;
  reglamento: "WKF" | "ASAM";
  clipUrl: string | null;
}

type Resultado = "ACEPTADO" | "RECHAZADO" | "MIENAI" | null;

/* ─── Constantes ────────────────────────────────────────────────── */
const DELIBERATION_SECS = 30;

/* ─── Panel del Juez VR ─────────────────────────────────────────── */
export default function VRStation() {
  const params = useParams();
  const torneoId = params.id as string;

  const [matchId, setMatchId] = useState<string>("123");
  const [matchInput, setMatchInput] = useState<string>("123");
  const [connected, setConnected] = useState(false);

  const [request, setRequest]   = useState<VRRequest | null>(null);
  const [resultado, setResultado] = useState<Resultado>(null);
  const [puntos, setPuntos]     = useState(0);

  // Timer de deliberación
  const [timerSecs, setTimerSecs] = useState(DELIBERATION_SECS);
  const [timerActive, setTimerActive] = useState(false);

  // Video player
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [clipUrl, setClipUrl] = useState<string | null>(null);

  // WebSocket
  const wsRef = useRef<WebSocket | null>(null);

  // Estado de tarjetas de los competidores
  const [vrCards, setVrCards] = useState<Record<string, string>>({});

  /* ─── Timer de deliberación ─────────────────────────────────── */
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timerSecs > 0) {
      interval = setInterval(() => setTimerSecs(t => t - 1), 1000);
    } else if (timerSecs === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSecs]);

  /* ─── Conectar WebSocket ────────────────────────────────────── */
  const connectWS = useCallback((mid: string) => {
    if (wsRef.current) wsRef.current.close();
    const ws = new WebSocket(`${WS_URL}/api/vr/ws/${mid}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        handleWSEvent(msg);
      } catch {}
    };

    ws.onclose = () => {
      setConnected(false);
      setTimeout(() => connectWS(mid), 3000);
    };
  }, []);

  const handleWSEvent = useCallback((msg: any) => {
    switch (msg.event) {
      case "VR_SOLICITADO":
        setRequest({
          reviewId: msg.review_id,
          color: msg.competidor_color,
          tipo: msg.tipo_solicitud,
          tiempo: msg.tiempo_cronometro,
          reglamento: msg.reglamento || "WKF",
          clipUrl: null,
        });
        setResultado(null);
        setPuntos(msg.tipo_solicitud === "YUKO" ? 1 :
                  msg.tipo_solicitud === "WAZA_ARI" ? 2 :
                  msg.tipo_solicitud === "IPPON" ? 3 : 0);
        setTimerSecs(DELIBERATION_SECS);
        setTimerActive(true);
        break;
      case "CLIP_DISPONIBLE":
        setClipUrl(msg.clip_url);
        setRequest(prev => prev ? { ...prev, clipUrl: msg.clip_url } : {
          reviewId: msg.review_id || 0,
          color: "Aka",
          tipo: "REPLAY DISPARADO",
          tiempo: "--:--",
          reglamento: "WKF",
          clipUrl: msg.clip_url,
        });
        if (videoRef.current) {
          videoRef.current.src = msg.clip_url;
          videoRef.current.currentTime = 0;
          videoRef.current.play().catch((err) => console.warn("Autoplay bloqueado:", err));
        }
        break;
      case "SCORE_UPDATE":
        setVrCards({
          aka:    msg.state?.vr_card_aka    || "ACTIVE",
          ao:     msg.state?.vr_card_ao     || "ACTIVE",
          blanco: msg.state?.vr_card_blanco || "ACTIVE",
          rojo:   msg.state?.vr_card_rojo   || "ACTIVE",
        });
        break;
      case "VR_RESUELTO":
        if (msg.resultado) {
          setRequest(null);
          setTimerActive(false);
          setTimerSecs(DELIBERATION_SECS);
        }
        break;
    }
  }, []);

  // Auto-conectar al montar el componente
  useEffect(() => {
    const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const initialId = urlParams?.get("matchId") || "123";
    setMatchId(initialId);
    setMatchInput(initialId);
    connectWS(initialId);
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWS]);

  const handleConnect = () => {
    const id = matchInput.trim();
    if (!id) return;
    setMatchId(id);
    connectWS(id);
  };

  /* ─── Controles de video ────────────────────────────────────── */
  const jumpBack6s = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 6);
    }
  };

  const stepFrame = (dir: 1 | -1) => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime += dir * (1 / 30);
    }
  };

  const setRate = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
  };

  /* ─── Enviar veredicto ──────────────────────────────────────── */
  const enviarVeredicto = async (res: "ACEPTADO" | "RECHAZADO" | "MIENAI", ptsOverride?: number) => {
    if (!request || !matchId) return;
    const pts = ptsOverride !== undefined ? ptsOverride : puntos;

    try {
      const r = await fetch(`${API_URL}/api/vr/combates/${matchId}/resolver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review_id: request.reviewId,
          resultado: res,
          puntos_otorgados: res === "ACEPTADO" ? pts : 0,
          clip_url: clipUrl,
        }),
      });
      const data = await r.json();
      if (data.ok) {
        setResultado(res);
        setRequest(null);
        setTimerActive(false);
        setTimerSecs(DELIBERATION_SECS);
      }
    } catch (e) {
      console.error("Error al enviar veredicto:", e);
    }
  };

  /* ─── Colores ─────────────────────────────────────────────── */
  const reqColor = request?.color === "Aka" || request?.color === "Blanco"
    ? "#ef4444" : "#3b82f6";
  const timerColor = timerSecs <= 5 ? "#ef4444" : timerSecs <= 10 ? "#f59e0b" : "#34d399";

  /* ─── Render ─────────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Roboto+Mono:wght@700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #030711; min-height: 100vh; }
        button { cursor: pointer; font-family: 'Inter', sans-serif; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes slideIn { from{transform:translateY(-20px);opacity:0} to{transform:translateY(0);opacity:1} }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #030711 0%, #0a0f1e 100%)",
        padding: "20px",
        fontFamily: "'Inter', sans-serif",
        color: "#e2e8f0",
      }}>

        {/* ─── Header ────────────────────────────────────────── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
          padding: "14px 20px",
          background: "rgba(255,255,255,0.04)",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 22 }}>🎥</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: "0.05em" }}>
                PANEL — JUEZ VIDEO REVIEW
              </div>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, letterSpacing: "0.1em" }}>
                WKF · ASAM
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: connected ? "#34d399" : "#6b7280",
              boxShadow: connected ? "0 0 8px #34d39966" : "none",
            }} />
            <span style={{ fontSize: 12, color: connected ? "#34d399" : "#6b7280", fontWeight: 700 }}>
              {connected ? `Conectado · Match ${matchId}` : "Sin conexión"}
            </span>
          </div>
        </div>

        {/* ─── Conectar a match ──────────────────────────────── */}
        {!connected && (
          <div style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: "24px",
            marginBottom: 20,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14, color: "#94a3b8" }}>
              Ingresar ID del combate para monitorear
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                type="text"
                placeholder="Ej: 123"
                value={matchInput}
                onChange={e => setMatchInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleConnect()}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10,
                  padding: "10px 16px",
                  color: "#e2e8f0",
                  fontSize: 16,
                  fontFamily: "'Roboto Mono', monospace",
                  fontWeight: 700,
                  outline: "none",
                }}
              />
              <button
                onClick={handleConnect}
                style={{
                  padding: "10px 24px",
                  background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                  border: "none",
                  borderRadius: 10,
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 14,
                }}
              >
                Conectar
              </button>
            </div>
          </div>
        )}

        {/* ─── Alerta VR activa ──────────────────────────────── */}
        {request && (
          <div style={{
            background: `linear-gradient(135deg, ${reqColor}18, ${reqColor}08)`,
            border: `2px solid ${reqColor}66`,
            borderRadius: 20,
            padding: "20px 24px",
            marginBottom: 20,
            animation: "slideIn 0.3s ease-out",
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}>
              <div style={{
                fontWeight: 900, fontSize: 18, color: reqColor,
                letterSpacing: "0.06em", textTransform: "uppercase",
              }}>
                🎥 VIDEO REVIEW · {request.color?.toUpperCase()}
              </div>

              {/* Timer de 30s */}
              <div style={{
                fontSize: 28, fontWeight: 900,
                color: timerColor,
                fontFamily: "'Roboto Mono', monospace",
                animation: timerSecs <= 5 ? "blink 0.5s infinite" : "none",
              }}>
                {timerSecs}s
              </div>
            </div>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 4 }}>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>
                <span style={{ color: "#64748b" }}>Reclamo: </span>
                <span style={{ fontWeight: 700, color: "#e2e8f0" }}>
                  {request.tipo.replace("_", "-")}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>
                <span style={{ color: "#64748b" }}>Tiempo: </span>
                <span style={{ fontWeight: 700, color: "#e2e8f0" }}>{request.tiempo}</span>
              </div>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>
                <span style={{ color: "#64748b" }}>Reglamento: </span>
                <span style={{ fontWeight: 700, color: reqColor }}>{request.reglamento}</span>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>

          {/* ─── Reproductor de video ──────────────────────── */}
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 20,
            overflow: "hidden",
          }}>
            {/* Video */}
            <div style={{ background: "#000", aspectRatio: "16/9", position: "relative" }}>
              <video
                ref={videoRef}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                controls={false}
                src={clipUrl || undefined}
                playsInline
              />
              {!clipUrl && (
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexDirection: "column", gap: 10, color: "#334155",
                }}>
                  <div style={{ fontSize: 48 }}>🎥</div>
                  <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.06em" }}>
                    ESPERANDO CLIP DE REPETICIÓN...
                  </div>
                  <div style={{ fontSize: 11, color: "#475569" }}>
                    El video se cargará automáticamente cuando se solicite Video Review
                  </div>
                </div>
              )}
            </div>

            {/* Controles de reproducción */}
            <div style={{ padding: "16px 20px" }}>
              {/* Velocidad */}
              <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginRight: 4 }}>
                  VEL:
                </span>
                {[0.25, 0.5, 1.0].map(rate => (
                  <button
                    key={rate}
                    onClick={() => setRate(rate)}
                    style={{
                      padding: "5px 14px",
                      borderRadius: 8,
                      border: "none",
                      background: playbackRate === rate
                        ? "linear-gradient(135deg, #3b82f6, #1d4ed8)"
                        : "rgba(255,255,255,0.06)",
                      color: playbackRate === rate ? "#fff" : "#94a3b8",
                      fontWeight: 800,
                      fontSize: 12,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {rate}×
                  </button>
                ))}
              </div>

              {/* Controles de salto y paso */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                {/* -6 segundos */}
                <button
                  onClick={jumpBack6s}
                  style={{
                    gridColumn: "span 2",
                    padding: "10px",
                    background: "rgba(239,68,68,0.12)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: 10,
                    color: "#fca5a5",
                    fontWeight: 800,
                    fontSize: 13,
                  }}
                >
                  ⏮ −6s
                </button>

                {/* Play / Pause */}
                <button
                  onClick={() => {
                    if (!clipUrl || !videoRef.current) return;
                    if (videoRef.current.paused) {
                      videoRef.current.play().catch((err) => console.warn("Error reproduciendo:", err));
                    } else {
                      videoRef.current.pause();
                    }
                  }}
                  disabled={!clipUrl}
                  title={!clipUrl ? "Aún no hay repetición disponible. Dispara el replay desde la cámara." : "Reproducir / Pausar"}
                  style={{
                    padding: "10px",
                    background: clipUrl ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${clipUrl ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.06)"}`,
                    borderRadius: 10,
                    color: clipUrl ? "#93c5fd" : "#475569",
                    fontWeight: 900,
                    fontSize: 16,
                    cursor: clipUrl ? "pointer" : "not-allowed",
                    opacity: clipUrl ? 1 : 0.6,
                  }}
                >
                  ▶/⏸
                </button>

                {/* Frame anterior */}
                <button
                  onClick={() => stepFrame(-1)}
                  style={{
                    padding: "10px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    color: "#94a3b8",
                    fontWeight: 800,
                    fontSize: 12,
                  }}
                >
                  ◀ F
                </button>

                {/* Frame siguiente */}
                <button
                  onClick={() => stepFrame(1)}
                  style={{
                    padding: "10px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    color: "#94a3b8",
                    fontWeight: 800,
                    fontSize: 12,
                  }}
                >
                  F ▶
                </button>
              </div>
            </div>
          </div>

          {/* ─── Panel de veredicto ───────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* ── ACEPTADO ── */}
            <div style={{
              background: "rgba(16,185,129,0.06)",
              border: "1px solid rgba(16,185,129,0.2)",
              borderRadius: 16,
              padding: "16px",
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#10b981",
                letterSpacing: "0.12em", marginBottom: 12, textTransform: "uppercase" }}>
                ✓ ACEPTADO — Otorgar Puntos
              </div>

              {request?.reglamento === "ASAM" ? (
                <button
                  onClick={() => enviarVeredicto("ACEPTADO", 1)}
                  disabled={!request}
                  style={{
                    width: "100%", padding: "16px",
                    background: request ? "linear-gradient(135deg, #10b981, #059669)" : "#1e293b",
                    border: "none", borderRadius: 12,
                    color: "#fff", fontWeight: 900, fontSize: 16,
                    opacity: request ? 1 : 0.4,
                  }}
                >
                  +1 PUNTO (ASAM)
                </button>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { label: "+1 YUKO",     pts: 1, color: "#ef4444" },
                    { label: "+2 WAZA-ARI", pts: 2, color: "#f59e0b" },
                    { label: "+3 IPPON",    pts: 3, color: "#10b981" },
                    { label: "SENSHU",      pts: 0, color: "#fbbf24" },
                  ].map(({ label, pts, color }) => (
                    <button
                      key={label}
                      onClick={() => {
                        setPuntos(pts);
                        enviarVeredicto("ACEPTADO", pts);
                      }}
                      disabled={!request}
                      style={{
                        gridColumn: label === "SENSHU" ? "span 2" : "span 1",
                        padding: "14px 8px",
                        background: request
                          ? `linear-gradient(135deg, ${color}22, ${color}11)`
                          : "#1e293b",
                        border: `1px solid ${request ? color + "66" : "transparent"}`,
                        borderRadius: 10,
                        color: request ? color : "#334155",
                        fontWeight: 900,
                        fontSize: 14,
                        opacity: request ? 1 : 0.4,
                        letterSpacing: "0.05em",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── RECHAZADO ── */}
            <button
              onClick={() => enviarVeredicto("RECHAZADO")}
              disabled={!request}
              style={{
                padding: "18px",
                background: request
                  ? "linear-gradient(135deg, rgba(239,68,68,0.25), rgba(239,68,68,0.1))"
                  : "#0f172a",
                border: `2px solid ${request ? "#ef444466" : "transparent"}`,
                borderRadius: 16,
                color: request ? "#f87171" : "#334155",
                fontWeight: 900,
                fontSize: 15,
                letterSpacing: "0.08em",
                opacity: request ? 1 : 0.4,
                textAlign: "center",
              }}
            >
              ✗ RECHAZADO
              <div style={{ fontSize: 10, fontWeight: 600, marginTop: 4, opacity: 0.7 }}>
                Coach pierde derecho a VR
              </div>
            </button>

            {/* ── MIENAI ── */}
            <button
              onClick={() => enviarVeredicto("MIENAI")}
              disabled={!request}
              style={{
                padding: "18px",
                background: request
                  ? "rgba(251,191,36,0.08)"
                  : "#0f172a",
                border: `2px solid ${request ? "#fbbf2444" : "transparent"}`,
                borderRadius: 16,
                color: request ? "#fbbf24" : "#334155",
                fontWeight: 900,
                fontSize: 15,
                letterSpacing: "0.08em",
                opacity: request ? 1 : 0.4,
                textAlign: "center",
              }}
            >
              👁 MIENAI
              <div style={{ fontSize: 10, fontWeight: 600, marginTop: 4, opacity: 0.7 }}>
                No visible / Ángulo bloqueado — Coach conserva VR
              </div>
            </button>

            {/* ── VR Cards estado ── */}
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 14,
              padding: "14px 16px",
            }}>
              <div style={{ fontSize: 11, color: "#475569", fontWeight: 700,
                letterSpacing: "0.1em", marginBottom: 10, textTransform: "uppercase" }}>
                Estado Tarjetas VR
              </div>
              {[
                { key: "aka",    label: "AKA (Rojo)",    color: "#ef4444" },
                { key: "ao",     label: "AO (Azul)",     color: "#3b82f6" },
                { key: "blanco", label: "Blanco (ASAM)", color: "#e2e8f0" },
                { key: "rojo",   label: "Rojo (ASAM)",   color: "#f87171" },
              ].map(({ key, label, color }) => {
                const estado = vrCards[key] || "ACTIVE";
                return (
                  <div key={key} style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", marginBottom: 6,
                  }}>
                    <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{label}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 800,
                      color: estado === "ACTIVE" ? "#34d399" : "#f87171",
                      letterSpacing: "0.06em",
                    }}>
                      {estado === "ACTIVE" ? "✓ DISP." : "✗ BLOQ."}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* ── Historial / resultado último ── */}
            {resultado && (
              <div style={{
                background: resultado === "ACEPTADO" ? "rgba(16,185,129,0.12)"
                  : resultado === "RECHAZADO" ? "rgba(239,68,68,0.12)"
                  : "rgba(251,191,36,0.08)",
                border: `1px solid ${resultado === "ACEPTADO" ? "#10b98144"
                  : resultado === "RECHAZADO" ? "#ef444444" : "#fbbf2444"}`,
                borderRadius: 12,
                padding: "12px 16px",
                textAlign: "center",
                fontWeight: 800,
                fontSize: 14,
                color: resultado === "ACEPTADO" ? "#34d399"
                  : resultado === "RECHAZADO" ? "#f87171" : "#fbbf24",
              }}>
                Último veredicto: {resultado}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
