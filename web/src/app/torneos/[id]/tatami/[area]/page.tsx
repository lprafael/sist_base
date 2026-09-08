"use client";
/**
 * /torneos/[id]/tatami/[area]/page.tsx
 * 
 * Pantalla de Tatami — Diseñada para pantallas grandes (TV / monitor externo).
 * Muestra el marcador en tiempo real del combate activo en el área/tatami indicado.
 * Se conecta por WebSocket al backend y recibe:
 *   - SCORE_UPDATE        → actualiza marcador
 *   - VR_SOLICITADO       → muestra banner VIDEO REVIEW
 *   - VR_RESUELTO         → oculta banner y actualiza puntaje
 *   - TIMER_PAUSE/RESUME  → pausa/reanuda cronómetro visual
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
const WS_URL = API_URL.replace(/^http/, "ws");

/* ─── Types ──────────────────────────────────────────────────────── */
interface Fighter {
  nombre: string;
  puntos: number;
  yuko?: number;
  waza_ari?: number;
  ippon?: number;
  senshu?: boolean;
  jogai?: number;
  penalizaciones?: number;
  vr_card?: string;  // 'ACTIVE' | 'USED_AND_LOCKED'
}

interface VRAlert {
  activo: boolean;
  color: "Aka" | "Ao" | "Blanco" | "Rojo" | null;
  tipo: string;
  reviewId: number | null;
}

type Reglamento = "WKF" | "ASAM";

/* ─── Constantes de color ────────────────────────────────────────── */
const AKA_COLOR = "#ef4444";
const AO_COLOR  = "#3b82f6";
const BG_DARK   = "#050814";

/* ─── Helpers ───────────────────────────────────────────────────── */
function formatTiempo(seg: number) {
  const m = Math.floor(Math.abs(seg) / 60);
  const s = Math.abs(seg) % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

/* ─── Componente de puntuación individual ───────────────────────── */
function FighterPanel({
  fighter,
  color,
  lado,
  reglamento,
}: {
  fighter: Fighter;
  color: string;
  lado: "left" | "right";
  reglamento: Reglamento;
}) {
  const isLeft = lado === "left";
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        background: `linear-gradient(180deg, ${color}12 0%, transparent 60%)`,
        borderTop: `6px solid ${color}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Glow de fondo */}
      <div
        style={{
          position: "absolute",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Badge de esquina */}
      <div
        style={{
          background: color,
          color: "#fff",
          fontWeight: 900,
          fontSize: 13,
          letterSpacing: "0.12em",
          padding: "4px 18px",
          borderRadius: 20,
          marginBottom: 14,
          textTransform: "uppercase",
          boxShadow: `0 0 20px ${color}66`,
        }}
      >
        {reglamento === "WKF"
          ? isLeft ? "AKA — ROJO" : "AO — AZUL"
          : isLeft ? "BLANCO" : "ROJO"}
      </div>

      {/* Nombre */}
      <div
        style={{
          fontSize: "clamp(18px, 3vw, 32px)",
          fontWeight: 800,
          color: "#e2e8f0",
          textAlign: "center",
          marginBottom: 8,
          maxWidth: "90%",
          lineHeight: 1.2,
          letterSpacing: "0.02em",
        }}
      >
        {fighter.nombre || "—"}
      </div>

      {/* Senshu Badge */}
      {reglamento === "WKF" && fighter.senshu && (
        <div
          style={{
            background: "rgba(251,191,36,0.2)",
            border: "1px solid rgba(251,191,36,0.7)",
            color: "#fbbf24",
            fontSize: 11,
            fontWeight: 900,
            padding: "3px 12px",
            borderRadius: 12,
            marginBottom: 10,
            letterSpacing: "0.1em",
            animation: "pulse 1.8s infinite",
          }}
        >
          ★ SENSHU
        </div>
      )}

      {/* Puntaje principal */}
      <div
        style={{
          fontSize: "clamp(80px, 18vw, 180px)",
          fontWeight: 900,
          color,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          textShadow: `0 0 60px ${color}66`,
          letterSpacing: "-0.04em",
          margin: "12px 0",
          fontFamily: "'Roboto Mono', monospace",
        }}
      >
        {fighter.puntos ?? 0}
      </div>

      {/* Desglose WKF */}
      {reglamento === "WKF" && (
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 8,
          }}
        >
          {[
            { label: "Y", val: fighter.yuko ?? 0, col: "#ef4444" },
            { label: "W", val: fighter.waza_ari ?? 0, col: "#f59e0b" },
            { label: "I", val: fighter.ippon ?? 0, col: "#10b981" },
          ].map(({ label, val, col }) => (
            <div
              key={label}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${col}44`,
                borderRadius: 10,
                padding: "6px 16px",
                textAlign: "center",
                minWidth: 54,
              }}
            >
              <div style={{ fontSize: 10, color: col, fontWeight: 700, letterSpacing: "0.08em" }}>
                {label === "Y" ? "YUKO" : label === "W" ? "W-ARI" : "IPPON"}
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: col, fontFamily: "monospace" }}>
                {val}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Penalizaciones / Jogai */}
      {reglamento === "WKF" && ((fighter.penalizaciones ?? 0) > 0 || (fighter.jogai ?? 0) > 0) && (
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          {(fighter.jogai ?? 0) > 0 && (
            <span style={{ fontSize: 12, color: "#fb923c", fontWeight: 700 }}>
              Jogai: {fighter.jogai}
            </span>
          )}
          {(fighter.penalizaciones ?? 0) > 0 && (
            <span style={{ fontSize: 12, color: "#f87171", fontWeight: 700 }}>
              Pen: {fighter.penalizaciones}
            </span>
          )}
        </div>
      )}

      {/* VR Card estado */}
      {reglamento === "WKF" && (
        <div
          style={{
            marginTop: 14,
            fontSize: 11,
            fontWeight: 700,
            color: fighter.vr_card === "USED_AND_LOCKED" ? "#f87171" : "#34d399",
            letterSpacing: "0.08em",
          }}
        >
          VR: {fighter.vr_card === "USED_AND_LOCKED" ? "✗ BLOQUEADO" : "✓ DISPONIBLE"}
        </div>
      )}
    </div>
  );
}

/* ─── Banner de Video Review ─────────────────────────────────────── */
function VRBanner({ vr }: { vr: VRAlert }) {
  if (!vr.activo) return null;
  const isAka = vr.color === "Aka";
  const isBlanco = vr.color === "Blanco";
  const bannerColor = isAka || isBlanco ? AKA_COLOR : AO_COLOR;
  const colorLabel = vr.color?.toUpperCase() || "";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      {/* Overlay semitransparente */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(6px)",
        }}
      />

      {/* Banner principal */}
      <div
        style={{
          position: "relative",
          background: `linear-gradient(135deg, #0f0f1a, #1a1a2e)`,
          border: `4px solid ${bannerColor}`,
          borderRadius: 24,
          padding: "40px 80px",
          textAlign: "center",
          boxShadow: `0 0 80px ${bannerColor}66, 0 0 160px ${bannerColor}33`,
          animation: "vrPulse 1.2s ease-in-out infinite",
        }}
      >
        {/* Icono */}
        <div style={{ fontSize: 52, marginBottom: 10 }}>🎥</div>

        {/* Título */}
        <div
          style={{
            fontSize: "clamp(28px, 5vw, 56px)",
            fontWeight: 900,
            color: "#fff",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            lineHeight: 1,
            marginBottom: 8,
          }}
        >
          VIDEO REVIEW
        </div>

        {/* Subtítulo */}
        <div
          style={{
            fontSize: "clamp(16px, 3vw, 30px)",
            fontWeight: 700,
            color: bannerColor,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          RECLAMO {colorLabel}
          {vr.tipo && vr.tipo !== "OTRO" && (
            <span style={{ color: "#94a3b8", marginLeft: 10, fontSize: "0.7em" }}>
              · {vr.tipo.replace("_", "-")}
            </span>
          )}
        </div>

        {/* Línea inferior */}
        <div
          style={{
            marginTop: 20,
            height: 4,
            borderRadius: 2,
            background: `linear-gradient(90deg, transparent, ${bannerColor}, transparent)`,
          }}
        />
      </div>
    </div>
  );
}

/* ─── Página principal ───────────────────────────────────────────── */
export default function TatamiDisplay() {
  const params = useParams();
  const torneoId = params.id as string;
  const area = params.area as string;

  const [reglamento, setReglamento] = useState<Reglamento>("WKF");
  const [aka, setAka] = useState<Fighter>({ nombre: "AKA", puntos: 0 });
  const [ao, setAo]   = useState<Fighter>({ nombre: "AO",  puntos: 0 });
  const [tiempo, setTiempo] = useState(120);
  const [corriendo, setCorriendo] = useState(false);
  const [vr, setVr] = useState<VRAlert>({
    activo: false, color: null, tipo: "", reviewId: null
  });
  const [matchId, setMatchId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  /* ─── Cronómetro local ─────────────────────────────────────────── */
  useEffect(() => {
    if (corriendo && tiempo > 0) {
      timerRef.current = setInterval(() => setTiempo(t => t - 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [corriendo, tiempo]);

  /* ─── Cargar partido activo del área ──────────────────────────── */
  useEffect(() => {
    const fetchPartido = async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/torneos/${torneoId}/partidos/activo?area=${area}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.id) {
            setMatchId(data.id);
            const stats = data.estadisticas || {};
            if (stats.reglamento) setReglamento(stats.reglamento);
            loadStats(stats);
          }
        }
      } catch {
        // Usa datos demo si no hay partido activo
        setAka({ nombre: "Competidor AKA", puntos: 0 });
        setAo({ nombre: "Competidor AO",  puntos: 0 });
      }
    };
    fetchPartido();
    const poll = setInterval(fetchPartido, 5000);
    return () => clearInterval(poll);
  }, [torneoId, area]);

  const loadStats = (stats: any) => {
    if (stats.aka) setAka(prev => ({ ...prev, ...stats.aka }));
    if (stats.ao)  setAo(prev  => ({ ...prev, ...stats.ao  }));
    if (stats.blanco) setAka(prev => ({ ...prev, ...stats.blanco }));
    if (stats.rojo)   setAo(prev  => ({ ...prev, ...stats.rojo   }));
  };

  /* ─── WebSocket al match activo ───────────────────────────────── */
  useEffect(() => {
    if (!matchId) return;

    const connectWS = () => {
      const ws = new WebSocket(`${WS_URL}/api/vr/ws/${matchId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        console.log("[Tatami WS] Conectado a match", matchId);
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          handleWSEvent(msg);
        } catch {}
      };

      ws.onclose = () => {
        setConnected(false);
        // Reconectar en 3s
        setTimeout(connectWS, 3000);
      };
    };

    connectWS();
    return () => wsRef.current?.close();
  }, [matchId]);

  const handleWSEvent = useCallback((msg: any) => {
    switch (msg.event) {
      case "SCORE_UPDATE":
        loadStats(msg.state);
        if (msg.state?.reglamento) setReglamento(msg.state.reglamento);
        break;
      case "VR_SOLICITADO":
        setVr({
          activo: true,
          color: msg.competidor_color,
          tipo: msg.tipo_solicitud,
          reviewId: msg.review_id,
        });
        setCorriendo(false);
        break;
      case "VR_RESUELTO":
        setVr({ activo: false, color: null, tipo: "", reviewId: null });
        break;
      case "TIMER_PAUSE":
        setCorriendo(false);
        break;
      case "TIMER_RESUME":
        setCorriendo(true);
        break;
    }
  }, []);

  const timerColor =
    tiempo <= 10 ? "#ef4444" :
    tiempo <= 30 ? "#f59e0b" : "#ffffff";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700;900&family=Inter:wght@400;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${BG_DARK}; overflow: hidden; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes vrPulse {
          0%,100% { box-shadow: 0 0 80px ${AKA_COLOR}55, 0 0 160px ${AKA_COLOR}22; transform: scale(1); }
          50%      { box-shadow: 0 0 120px ${AKA_COLOR}88, 0 0 200px ${AKA_COLOR}44; transform: scale(1.01); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: BG_DARK,
          display: "flex",
          flexDirection: "column",
          fontFamily: "'Inter', sans-serif",
          color: "#fff",
          overflow: "hidden",
        }}
      >
        {/* ─── Header: Tatami info + cronómetro ──────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 28px",
            background: "rgba(255,255,255,0.03)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {/* Logo / Área */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 10, height: 10, borderRadius: "50%",
                background: connected ? "#34d399" : "#6b7280",
                boxShadow: connected ? "0 0 10px #34d39966" : "none",
              }}
            />
            <span style={{ fontSize: 13, color: "#64748b", fontWeight: 700, letterSpacing: "0.08em" }}>
              TATAMI {area}
            </span>
          </div>

          {/* Reglamento */}
          <div style={{
            fontSize: 12, fontWeight: 800, letterSpacing: "0.15em",
            color: reglamento === "WKF" ? "#ef4444" : "#f59e0b",
            textTransform: "uppercase",
          }}>
            {reglamento === "WKF" ? "WKF KUMITE" : "ASAM MMA"}
          </div>

          {/* Marca hora */}
          <div style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>
            {new Date().toLocaleTimeString("es-PY")}
          </div>
        </div>

        {/* ─── Marcador principal ────────────────────────────────── */}
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          {/* AKA / Blanco */}
          <FighterPanel
            fighter={aka}
            color={AKA_COLOR}
            lado="left"
            reglamento={reglamento}
          />

          {/* Centro: cronómetro */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 20px",
              minWidth: 200,
              gap: 16,
            }}
          >
            {/* VS */}
            <div style={{
              fontSize: 16, fontWeight: 900, color: "#334155",
              letterSpacing: "0.2em", textTransform: "uppercase"
            }}>
              VS
            </div>

            {/* Cronómetro */}
            <div
              style={{
                fontSize: "clamp(48px, 8vw, 88px)",
                fontWeight: 900,
                color: timerColor,
                fontFamily: "'Roboto Mono', monospace",
                letterSpacing: "0.04em",
                textShadow: tiempo <= 10 ? `0 0 30px ${timerColor}88` : "none",
                transition: "color 0.3s, text-shadow 0.3s",
              }}
            >
              {formatTiempo(tiempo)}
            </div>

            {/* Estado cronómetro */}
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.15em",
              color: corriendo ? "#34d399" : "#ef4444",
              textTransform: "uppercase",
            }}>
              {corriendo ? "▶ EN CURSO" : "■ DETENIDO"}
            </div>

            {/* Separador */}
            <div style={{
              width: 60, height: 2,
              background: "linear-gradient(90deg, transparent, #334155, transparent)"
            }} />

            {/* Area / Tatami */}
            <div style={{
              fontSize: 11, color: "#475569", fontWeight: 700,
              letterSpacing: "0.1em", textAlign: "center"
            }}>
              ÁREA {area}
            </div>
          </div>

          {/* AO / Rojo */}
          <FighterPanel
            fighter={ao}
            color={AO_COLOR}
            lado="right"
            reglamento={reglamento}
          />
        </div>

        {/* ─── Footer: branding y acceso a cámara ───────────────── */}
        <div style={{
          padding: "8px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}>
          <div style={{ fontSize: 11, color: "#334155", fontWeight: 700, letterSpacing: "0.2em" }}>
            MICANCHA · SISTEMA DE ARBITRAJE WKF
          </div>
          <a
            href={`/torneos/${torneoId}/tatami/${area}/camara`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 11,
              color: "#64748b",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontWeight: 600,
            }}
            title="Abrir Cámara Web Nativa de este Tatami"
          >
            <span>📷</span> Cámara Tatami {area}
          </a>
        </div>
      </div>

      {/* Banner de Video Review superpuesto */}
      <VRBanner vr={vr} />
    </>
  );
}
