"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Trophy, Calendar, Users, BarChart3, Target, Shield,
  Award, TrendingUp, ChevronRight, ChevronLeft,
  Swords, BookOpen, Clock, Activity, AlertCircle, RefreshCw
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";

/* ── Types ──────────────────────────────────────────────────── */
interface TournamentData {
  id: string; nombre: string; deporte: string; estado: string;
  fecha_inicio: string; fecha_fin?: string; descripcion?: string;
  formato?: string; max_equipos?: number;
  puntos_victoria?: number; puntos_empate?: number; puntos_derrota?: number;
}
interface Equipo { id: string; nombre?: string; nombre_equipo?: string; }
interface PosicionRow {
  id: string; torneo_equipo_id: string; nombre_equipo: string;
  pj: number; pg: number; pe: number; pp: number;
  gf: number; gc: number; dg: number; pts: number;
}
interface Partido {
  id: string; equipo_local: string; equipo_visitante: string;
  goles_local?: number; goles_visitante?: number;
  fecha_hora?: string; estado: string; jornada?: number | string; fase?: string;
}
interface Goleador { player_id: string; nombre: string; equipo: string; goles: number; }

/* ── Helpers ─────────────────────────────────────────────────── */
const TEAM_COLORS = ["#10b981","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899"];
const teamColor = (name: string) => TEAM_COLORS[(name?.charCodeAt(0) ?? 0) % TEAM_COLORS.length];

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtTime = (d?: string) =>
  d ? new Date(d).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" }) : "";

const ESTADO_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  finalizado: { color: "#10b981", bg: "rgba(16,185,129,0.12)", label: "FINALIZADO" },
  en_curso:   { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "EN CURSO" },
  programado: { color: "#64748b", bg: "rgba(100,116,139,0.12)", label: "PROGRAMADO" },
  walkover:   { color: "#ef4444", bg: "rgba(239,68,68,0.12)", label: "W.O." },
};

/* ── Tab config ──────────────────────────────────────────────── */
const TABS = [
  { id: "posiciones", label: "Posiciones", icon: BarChart3 },
  { id: "fixture",    label: "Fixture",    icon: Calendar },
  { id: "equipos",    label: "Equipos",    icon: Shield },
  { id: "goleadores", label: "Goleadores", icon: Target },
  { id: "resumen",    label: "Resumen",    icon: Activity },
];

/* ================================================================
   MAIN PAGE
   ================================================================ */
export default function TorneoResumenPage() {
  const params = useParams();
  const id = params?.id as string;

  const [tab, setTab] = useState("posiciones");
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [posiciones, setPosiciones] = useState<PosicionRow[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [goleadores, setGoleadores] = useState<Goleador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jornadaActiva, setJornadaActiva] = useState(1);

  const [isDemo, setIsDemo] = useState(false);

  const loadMockData = useCallback(() => {
    setIsDemo(true);
    setTournament({
      id: "demo",
      nombre: "Copa Mi Cancha 2026 (Demostración)",
      deporte: "Fútbol 5",
      estado: "en_curso",
      fecha_inicio: "2026-06-01",
      fecha_fin: "2026-07-15",
      descripcion: "Torneo demo interactivo. Visualiza la tabla de posiciones, fixture, equipos, goleadores y estadísticas completas de la competencia.",
      max_equipos: 8,
      puntos_victoria: 3,
      puntos_empate: 1,
      puntos_derrota: 0,
    });

    setEquipos([
      { id: "e1", nombre_equipo: "Real Mandril FC" },
      { id: "e2", nombre_equipo: "Barcelona Cancha FC" },
      { id: "e3", nombre_equipo: "Múnich United" },
      { id: "e4", nombre_equipo: "Milán Amateur" },
      { id: "e5", nombre_equipo: "PSG F5" },
      { id: "e6", nombre_equipo: "Chelsea Amateur" },
      { id: "e7", nombre_equipo: "Liverpool Cancha" },
      { id: "e8", nombre_equipo: "Boca Juniors F5" },
    ]);

    setPosiciones([
      { id: "p1", torneo_equipo_id: "e1", nombre_equipo: "Real Mandril FC", pj: 5, pg: 4, pe: 1, pp: 0, gf: 18, gc: 8, dg: 10, pts: 13 },
      { id: "p2", torneo_equipo_id: "e2", nombre_equipo: "Barcelona Cancha FC", pj: 5, pg: 3, pe: 1, pp: 1, gf: 14, gc: 9, dg: 5, pts: 10 },
      { id: "p3", torneo_equipo_id: "e3", nombre_equipo: "Múnich United", pj: 5, pg: 3, pe: 0, pp: 2, gf: 12, gc: 10, dg: 2, pts: 9 },
      { id: "p4", torneo_equipo_id: "e7", nombre_equipo: "Liverpool Cancha", pj: 5, pg: 2, pe: 2, pp: 1, gf: 11, gc: 9, dg: 2, pts: 8 },
      { id: "p5", torneo_equipo_id: "e8", nombre_equipo: "Boca Juniors F5", pj: 5, pg: 2, pe: 0, pp: 3, gf: 10, gc: 12, dg: -2, pts: 6 },
      { id: "p6", torneo_equipo_id: "e4", nombre_equipo: "Milán Amateur", pj: 5, pg: 1, pe: 2, pp: 2, gf: 8, gc: 10, dg: -2, pts: 5 },
      { id: "p7", torneo_equipo_id: "e6", nombre_equipo: "Chelsea Amateur", pj: 5, pg: 1, pe: 0, pp: 4, gf: 7, gc: 14, dg: -7, pts: 3 },
      { id: "p8", torneo_equipo_id: "e5", nombre_equipo: "PSG F5", pj: 5, pg: 0, pe: 2, pp: 3, gf: 6, gc: 14, dg: -8, pts: 2 },
    ]);

    setPartidos([
      { id: "m1", equipo_local: "Real Mandril FC", equipo_visitante: "Barcelona Cancha FC", goles_local: 3, goles_visitante: 2, estado: "finalizado", jornada: 1 },
      { id: "m2", equipo_local: "Múnich United", equipo_visitante: "Milán Amateur", goles_local: 2, goles_visitante: 1, estado: "finalizado", jornada: 1 },
      { id: "m3", equipo_local: "PSG F5", equipo_visitante: "Liverpool Cancha", goles_local: 1, goles_visitante: 1, estado: "finalizado", jornada: 1 },
      { id: "m4", equipo_local: "Chelsea Amateur", equipo_visitante: "Boca Juniors F5", goles_local: 0, goles_visitante: 2, estado: "finalizado", jornada: 1 },
      
      { id: "m5", equipo_local: "Real Mandril FC", equipo_visitante: "PSG F5", goles_local: 4, goles_visitante: 1, estado: "finalizado", jornada: 2 },
      { id: "m6", equipo_local: "Barcelona Cancha FC", equipo_visitante: "Múnich United", goles_local: 3, goles_visitante: 1, estado: "finalizado", jornada: 2 },
      { id: "m7", equipo_local: "Milán Amateur", equipo_visitante: "Liverpool Cancha", goles_local: 2, goles_visitante: 2, estado: "finalizado", jornada: 2 },
      { id: "m8", equipo_local: "Boca Juniors F5", equipo_visitante: "Chelsea Amateur", goles_local: 3, goles_visitante: 1, estado: "finalizado", jornada: 2 },
      
      { id: "m9", equipo_local: "Múnich United", equipo_visitante: "Boca Juniors F5", goles_local: 3, goles_visitante: 2, estado: "finalizado", jornada: 3 },
      { id: "m10", equipo_local: "Real Mandril FC", equipo_visitante: "Liverpool Cancha", goles_local: 2, goles_visitante: 2, estado: "finalizado", jornada: 3 },
      { id: "m11", equipo_local: "Barcelona Cancha FC", equipo_visitante: "PSG F5", goles_local: 2, goles_visitante: 0, estado: "finalizado", jornada: 3 },
      { id: "m12", equipo_local: "Chelsea Amateur", equipo_visitante: "Milán Amateur", goles_local: 1, goles_visitante: 0, estado: "finalizado", jornada: 3 },
      
      { id: "m13", equipo_local: "Real Mandril FC", equipo_visitante: "Chelsea Amateur", goles_local: 5, goles_visitante: 2, estado: "finalizado", jornada: 4 },
      { id: "m14", equipo_local: "Múnich United", equipo_visitante: "PSG F5", goles_local: 4, goles_visitante: 2, estado: "finalizado", jornada: 4 },
      { id: "m15", equipo_local: "Barcelona Cancha FC", equipo_visitante: "Liverpool Cancha", goles_local: 4, goles_visitante: 4, estado: "finalizado", jornada: 4 },
      { id: "m16", equipo_local: "Boca Juniors F5", equipo_visitante: "Milán Amateur", goles_local: 1, goles_visitante: 3, estado: "finalizado", jornada: 4 },
      
      { id: "m17", equipo_local: "Real Mandril FC", equipo_visitante: "Múnich United", goles_local: 4, goles_visitante: 1, estado: "finalizado", jornada: 5 },
      { id: "m18", equipo_local: "Barcelona Cancha FC", equipo_visitante: "Boca Juniors F5", goles_local: 3, goles_visitante: 1, estado: "finalizado", jornada: 5 },
      { id: "m19", equipo_local: "PSG F5", equipo_visitante: "Milán Amateur", goles_local: 2, goles_visitante: 2, estado: "finalizado", jornada: 5 },
      { id: "m20", equipo_local: "Chelsea Amateur", equipo_visitante: "Liverpool Cancha", goles_local: 3, goles_visitante: 4, estado: "finalizado", jornada: 5 },
      
      { id: "m21", equipo_local: "Real Mandril FC", equipo_visitante: "Milán Amateur", estado: "programado", jornada: 6, fecha_hora: new Date(Date.now() + 86400000).toISOString() },
      { id: "m22", equipo_local: "Barcelona Cancha FC", equipo_visitante: "Chelsea Amateur", estado: "programado", jornada: 6, fecha_hora: new Date(Date.now() + 90000000).toISOString() },
      { id: "m23", equipo_local: "Múnich United", equipo_visitante: "Liverpool Cancha", estado: "programado", jornada: 6, fecha_hora: new Date(Date.now() + 93600000).toISOString() },
      { id: "m24", equipo_local: "PSG F5", equipo_visitante: "Boca Juniors F5", estado: "programado", jornada: 6, fecha_hora: new Date(Date.now() + 97200000).toISOString() },
    ]);

    setGoleadores([
      { player_id: "g1", nombre: "Lionel Mesi", equipo: "Barcelona Cancha FC", goles: 8 },
      { player_id: "g2", nombre: "Cristiano Ronaldo", equipo: "Real Mandril FC", goles: 7 },
      { player_id: "g3", nombre: "Erling Haaland", equipo: "Múnich United", goles: 6 },
      { player_id: "g4", nombre: "Kylian Mbappé", equipo: "Real Mandril FC", goles: 5 },
      { player_id: "g5", nombre: "Mohamed Salah", equipo: "Liverpool Cancha", goles: 4 },
    ]);

    setJornadaActiva(5);
  }, []);

  const loadAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    if (id === "demo" || id === "ficticio") {
      loadMockData();
      setLoading(false);
      return;
    }
    try {
      let succeeded = false;
      const [tRes, eRes, mRes, pRes] = await Promise.allSettled([
        fetch(`${API_URL}/cancha/torneos/${id}`),
        fetch(`${API_URL}/cancha/torneos/${id}/equipos`),
        fetch(`${API_URL}/cancha/torneos/${id}/partidos`),
        fetch(`${API_URL}/cancha/torneos/${id}/posiciones`),
      ]);
      if (tRes.status === "fulfilled" && tRes.value.ok) {
        setTournament(await tRes.value.json());
        succeeded = true;
      }
      if (eRes.status === "fulfilled" && eRes.value.ok) {
        const d = await eRes.value.json();
        setEquipos(Array.isArray(d) ? d : d.equipos || []);
      }
      if (mRes.status === "fulfilled" && mRes.value.ok) {
        const d = await mRes.value.json();
        const list = Array.isArray(d) ? d : d.partidos || [];
        setPartidos(list);
        const jornadas = list.map((p: Partido) => Number(p.jornada)).filter(Boolean);
        if (jornadas.length) setJornadaActiva(Math.min(...jornadas));
      }
      if (pRes.status === "fulfilled" && pRes.value.ok) {
        const d = await pRes.value.json();
        setPosiciones(Array.isArray(d) ? d : d.posiciones || []);
      }
      try {
        const gRes = await fetch(`${API_URL}/cancha/torneos/${id}/goleadores`);
        if (gRes.ok) setGoleadores(await gRes.json());
      } catch {/* optional */}

      if (!succeeded) {
        console.warn("Backend down. Loading mock data...");
        loadMockData();
      }
    } catch {
      loadMockData();
    } finally {
      setLoading(false);
    }
  }, [id, loadMockData]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const jornadas = Array.from(new Set(partidos.map(p => Number(p.jornada)).filter(Boolean))).sort((a, b) => a - b);
  const maxJornada = Math.max(...jornadas, 1);
  const minJornada = Math.min(...jornadas, 1);
  const partidosFiltrados = jornadas.length > 0 ? partidos.filter(p => Number(p.jornada) === jornadaActiva) : partidos;

  const totalGoles = partidos.reduce((a, p) => a + (p.goles_local || 0) + (p.goles_visitante || 0), 0);
  const jugados = partidos.filter(p => p.estado === "finalizado").length;

  if (loading) return <LoadingScreen />;
  if (error || !tournament) return <ErrorScreen msg={error} onRetry={loadAll} />;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&family=Outfit:wght@700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        .tab-btn:hover { color: #10b981 !important; }
        .card-hover:hover { transform: translateY(-4px); border-color: #334155 !important; }
        .row-hover:hover { background: rgba(255,255,255,0.035) !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .fade-in { animation: fadeIn 0.3s ease; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#050a14", color: "#f8fafc", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

        {isDemo && (
          <div style={{
            background: "rgba(245,158,11,0.1)",
            borderBottom: "1px solid rgba(245,158,11,0.25)",
            color: "#f59e0b",
            padding: "12px 2rem",
            fontSize: 13,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 8,
            animation: "fadeIn 0.3s ease"
          }}>
            <AlertCircle size={16} /> Modo Demostración: La base de datos de producción está actualmente fuera de línea. Mostrando datos interactivos ficticios.
          </div>
        )}

        {/* ── HERO HEADER ─────────────────────────────────────────── */}
        <header style={{
          background: "linear-gradient(135deg, #0a1628 0%, #0d2044 50%, #071a36 100%)",
          borderBottom: "1px solid #1a2a45",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* decorative glows */}
          <div style={{ position: "absolute", top: -80, right: -80, width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle,rgba(16,185,129,0.1),transparent 65%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -100, left: 80, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle,rgba(59,130,246,0.08),transparent 65%)", pointerEvents: "none" }} />

          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "2.5rem 2rem" }}>
            {/* breadcrumb */}
            <Link href={`/torneos/${id}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#475569", fontSize: 13, marginBottom: "1.5rem", textDecoration: "none" }}>
              <ChevronLeft size={16} /> Volver al torneo
            </Link>

            {/* title row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.5rem" }}>
              <div>
                {/* badge */}
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 50, padding: "4px 16px", fontSize: 11, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>
                  <Trophy size={12} /> {tournament.deporte || "Fútbol"}
                  <span style={{ opacity: 0.4 }}>·</span>
                  <StatusBadge estado={tournament.estado} small />
                </div>

                <h1 style={{ fontSize: "clamp(1.8rem,4vw,3rem)", fontWeight: 900, letterSpacing: "-0.03em", fontFamily: "Outfit, sans-serif", margin: 0, lineHeight: 1.05, background: "linear-gradient(135deg,#f8fafc,#94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {tournament.nombre}
                </h1>

                {tournament.descripcion && (
                  <p style={{ color: "#64748b", marginTop: "0.75rem", fontSize: 15, maxWidth: 600, lineHeight: 1.6 }}>{tournament.descripcion}</p>
                )}

                <div style={{ display: "flex", gap: "1.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
                  <Pill icon={<Calendar size={13} />} text={`${fmtDate(tournament.fecha_inicio)}${tournament.fecha_fin ? ` → ${fmtDate(tournament.fecha_fin)}` : ""}`} />
                  <Pill icon={<Users size={13} />} text={`${equipos.length}${tournament.max_equipos ? `/${tournament.max_equipos}` : ""} equipos`} />
                  <Pill icon={<Swords size={13} />} text={`${jugados} partidos jugados`} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Link
                  href={`/torneos/${id}/tv-live`}
                  target="_blank"
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    background: "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.08))",
                    border: "1px solid rgba(239,68,68,0.4)",
                    borderRadius: 12, padding: "10px 18px",
                    color: "#ef4444", fontSize: 13, fontWeight: 800,
                    textDecoration: "none", flexShrink: 0,
                    letterSpacing: "0.05em",
                    boxShadow: "0 0 20px rgba(239,68,68,0.15)",
                    transition: "all 0.2s",
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "spin 0s linear, fadeIn 0s" }} />
                  📺 Ver EN VIVO
                </Link>
                <button onClick={loadAll} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "10px 18px", color: "#64748b", cursor: "pointer", fontSize: 13, flexShrink: 0 }}>
                  <RefreshCw size={14} /> Actualizar
                </button>
              </div>
            </div>

            {/* stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "1rem", marginTop: "2.5rem" }}>
              {[
                { label: "Equipos",    val: equipos.length, gradient: "135deg,#3b82f6,#1d4ed8", icon: Shield },
                { label: "Partidos",   val: partidos.length, gradient: "135deg,#10b981,#059669", icon: Swords },
                { label: "Jugados",    val: jugados, gradient: "135deg,#8b5cf6,#6d28d9", icon: Trophy },
                { label: "Goles",      val: totalGoles, gradient: "135deg,#f59e0b,#d97706", icon: Target },
                { label: "Pendientes", val: partidos.filter(p => p.estado === "programado").length, gradient: "135deg,#64748b,#475569", icon: Clock },
              ].map(s => (
                <StatCard key={s.label} {...s} />
              ))}
            </div>
          </div>
        </header>

        {/* ── STICKY TABS ─────────────────────────────────────────── */}
        <nav style={{ borderBottom: "1px solid #1a2a45", background: "#070d1b", position: "sticky", top: 0, zIndex: 50 }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 2rem", display: "flex", overflowX: "auto" }}>
            {TABS.map(t => (
              <button key={t.id} className="tab-btn"
                onClick={() => setTab(t.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "1rem 1.25rem",
                  fontSize: 13, fontWeight: 700, border: "none", background: "transparent",
                  cursor: "pointer", whiteSpace: "nowrap",
                  borderBottom: `2px solid ${tab === t.id ? "#10b981" : "transparent"}`,
                  color: tab === t.id ? "#10b981" : "#475569", transition: "all .2s",
                }}>
                <t.icon size={15} /> {t.label}
              </button>
            ))}
          </div>
        </nav>

        {/* ── CONTENT ─────────────────────────────────────────────── */}
        <main style={{ maxWidth: 1280, margin: "0 auto", padding: "2rem" }}>

          {/* POSICIONES */}
          {tab === "posiciones" && (
            <div className="fade-in">
              <SectionTitle icon={BarChart3} title="Tabla de Posiciones" />
              {posiciones.length === 0 ? (
                <EmptyState msg="La tabla de posiciones se actualizará cuando se carguen los primeros resultados." />
              ) : (
                <div style={{ overflowX: "auto", borderRadius: 20, border: "1px solid #1a2a45", background: "#090f1e" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
                    <thead>
                      <tr style={{ background: "#0c1425" }}>
                        {["#", "Equipo", "PJ", "PG", "PE", "PP", "GF", "GC", "DG", "PTS"].map(h => (
                          <th key={h} style={{ padding: "12px 16px", textAlign: h === "Equipo" ? "left" : "center", fontSize: 11, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...posiciones].sort((a, b) => (b.pts - a.pts) || (b.dg - a.dg) || (b.gf - a.gf)).map((row, i) => (
                        <tr key={row.id || row.torneo_equipo_id} className="row-hover"
                          style={{ borderTop: "1px solid #111827", background: i === 0 ? "rgba(16,185,129,0.05)" : i === 1 ? "rgba(59,130,246,0.03)" : "transparent", transition: "background .2s" }}>
                          <td style={{ padding: "14px 16px", textAlign: "center", width: 50 }}>
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span style={{ color: "#334155", fontWeight: 700, fontSize: 13 }}>{i + 1}</span>}
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <TeamAvatar name={row.nombre_equipo} size={32} />
                              <span style={{ fontWeight: 700, fontSize: 14 }}>{row.nombre_equipo}</span>
                            </div>
                          </td>
                          {[row.pj, row.pg, row.pe, row.pp, row.gf, row.gc].map((v, vi) => (
                            <td key={vi} style={{ padding: "14px 16px", textAlign: "center", fontSize: 14, color: "#94a3b8" }}>{v ?? 0}</td>
                          ))}
                          <td style={{ padding: "14px 16px", textAlign: "center", fontSize: 14, color: row.dg > 0 ? "#10b981" : row.dg < 0 ? "#ef4444" : "#94a3b8", fontWeight: 700 }}>
                            {row.dg > 0 ? `+${row.dg}` : row.dg ?? 0}
                          </td>
                          <td style={{ padding: "14px 16px", textAlign: "center" }}>
                            <span style={{ fontWeight: 900, fontSize: 15, background: i < 2 ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)", color: "#f8fafc", padding: "4px 14px", borderRadius: 8, display: "inline-block" }}>
                              {row.pts ?? 0}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {/* leyenda */}
              <div style={{ display: "flex", gap: "1.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
                <Legend color="#10b981" label="Líder" />
                <Legend color="#3b82f6" label="2.° lugar" />
                <Legend color="#334155" label="Resto" />
              </div>
            </div>
          )}

          {/* FIXTURE */}
          {tab === "fixture" && (
            <div className="fade-in">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
                <SectionTitle icon={Calendar} title="Fixture" />
                {jornadas.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#090f1e", border: "1px solid #1a2a45", borderRadius: 14, padding: "6px 8px" }}>
                    <NavBtn onClick={() => setJornadaActiva(j => Math.max(j - 1, minJornada))} disabled={jornadaActiva <= minJornada}><ChevronLeft size={16} /></NavBtn>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0", minWidth: 90, textAlign: "center" }}>Jornada {jornadaActiva}</span>
                    <NavBtn onClick={() => setJornadaActiva(j => Math.min(j + 1, maxJornada))} disabled={jornadaActiva >= maxJornada}><ChevronRight size={16} /></NavBtn>
                  </div>
                )}
              </div>

              {partidos.length === 0 ? (
                <EmptyState msg="El fixture aún no ha sido generado para este torneo." />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {partidosFiltrados.map(p => <MatchCard key={p.id} partido={p} />)}
                  {partidosFiltrados.length === 0 && <EmptyState msg={`No hay partidos para la jornada ${jornadaActiva}.`} />}
                </div>
              )}
            </div>
          )}

          {/* EQUIPOS */}
          {tab === "equipos" && (
            <div className="fade-in">
              <SectionTitle icon={Shield} title={`Equipos Participantes (${equipos.length})`} />
              {equipos.length === 0 ? (
                <EmptyState msg="No hay equipos inscriptos en este torneo aún." />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "1rem" }}>
                  {equipos.map((e, i) => {
                    const name = e.nombre || e.nombre_equipo || "?";
                    const pos = posiciones.find(p => p.torneo_equipo_id === e.id);
                    return (
                      <div key={e.id} className="card-hover"
                        style={{ background: "#090f1e", border: "1px solid #1a2a45", borderRadius: 20, padding: "1.5rem", textAlign: "center", transition: "all .25s", cursor: "default" }}>
                        <TeamAvatar name={name} size={56} style={{ margin: "0 auto 0.75rem" }} />
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{name}</div>
                        {pos ? (
                          <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginTop: 8 }}>
                            <Micro label="PTS" val={pos.pts} />
                            <Micro label="PJ" val={pos.pj} />
                            <Micro label="GD" val={pos.dg} />
                          </div>
                        ) : (
                          <div style={{ color: "#334155", fontSize: 12, marginTop: 4 }}>Sin partidos</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* GOLEADORES */}
          {tab === "goleadores" && (
            <div className="fade-in">
              <SectionTitle icon={Target} title="Tabla de Goleadores" />
              {goleadores.length === 0 ? (
                <EmptyState msg="Los goleadores aparecerán cuando se registren resultados con goles." />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {[...goleadores].sort((a, b) => b.goles - a.goles).map((g, i) => (
                    <div key={g.player_id || i} style={{ display: "flex", alignItems: "center", gap: "1rem", background: "#090f1e", border: "1px solid #1a2a45", borderRadius: 14, padding: "1rem 1.25rem" }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: i === 0 ? "linear-gradient(135deg,#f59e0b,#d97706)" : i === 1 ? "linear-gradient(135deg,#94a3b8,#64748b)" : i === 2 ? "linear-gradient(135deg,#b45309,#92400e)" : "rgba(255,255,255,0.05)",
                        display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, color: "white"
                      }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.nombre}</div>
                        <div style={{ color: "#475569", fontSize: 12, marginTop: 2 }}>{g.equipo}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "6px 16px", flexShrink: 0 }}>
                        <Target size={14} color="#10b981" />
                        <span style={{ fontWeight: 900, fontSize: 17, color: "#10b981" }}>{g.goles}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* RESUMEN GENERAL */}
          {tab === "resumen" && (
            <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "1.5rem" }}>
              <InfoCard title="Información del Torneo" icon={BookOpen}>
                <InfoRow label="Nombre" value={tournament.nombre} />
                <InfoRow label="Estado" value={<StatusBadge estado={tournament.estado} />} />
                <InfoRow label="Deporte" value={tournament.deporte || "Fútbol"} />
                <InfoRow label="Inicio" value={fmtDate(tournament.fecha_inicio)} />
                {tournament.fecha_fin && <InfoRow label="Fin" value={fmtDate(tournament.fecha_fin)} />}
                {tournament.max_equipos && <InfoRow label="Cupo máx." value={`${tournament.max_equipos} equipos`} />}
                {tournament.formato && <InfoRow label="Formato" value={tournament.formato} />}
              </InfoCard>

              <InfoCard title="Reglas de Puntuación" icon={Award}>
                <InfoRow label="Victoria" value={<strong style={{ color: "#10b981" }}>{tournament.puntos_victoria ?? 3} pts</strong>} />
                <InfoRow label="Empate" value={<strong style={{ color: "#f59e0b" }}>{tournament.puntos_empate ?? 1} pts</strong>} />
                <InfoRow label="Derrota" value={<strong style={{ color: "#ef4444" }}>{tournament.puntos_derrota ?? 0} pts</strong>} />
              </InfoCard>

              <InfoCard title="Estadísticas Generales" icon={TrendingUp}>
                <InfoRow label="Total partidos" value={partidos.length} />
                <InfoRow label="Partidos jugados" value={jugados} />
                <InfoRow label="Pendientes" value={partidos.filter(p => p.estado === "programado").length} />
                <InfoRow label="Total goles" value={totalGoles} />
                <InfoRow label="Promedio goles/partido" value={(() => {
                  const fin = partidos.filter(p => p.estado === "finalizado");
                  if (!fin.length) return "—";
                  return (totalGoles / fin.length).toFixed(1);
                })()} />
              </InfoCard>

              {/* LÍDER */}
              {posiciones.length > 0 && (() => {
                const sorted = [...posiciones].sort((a, b) => (b.pts - a.pts) || (b.dg - a.dg));
                const leader = sorted[0];
                return (
                  <InfoCard title="Equipo Líder" icon={Trophy}>
                    <div style={{ textAlign: "center", paddingBottom: "0.5rem" }}>
                      <TeamAvatar name={leader.nombre_equipo} size={64} style={{ margin: "0 auto 0.75rem" }} />
                      <div style={{ fontSize: 18, fontWeight: 900, fontFamily: "Outfit, sans-serif" }}>{leader.nombre_equipo}</div>
                      <div style={{ display: "flex", justifyContent: "center", gap: "2rem", marginTop: "1rem" }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 28, fontWeight: 900, color: "#10b981", fontFamily: "Outfit, sans-serif" }}>{leader.pts}</div>
                          <div style={{ fontSize: 11, color: "#475569", fontWeight: 700 }}>PTS</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 28, fontWeight: 900, color: "#3b82f6", fontFamily: "Outfit, sans-serif" }}>{leader.pg}</div>
                          <div style={{ fontSize: 11, color: "#475569", fontWeight: 700 }}>VICTORIAS</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 28, fontWeight: 900, color: "#f59e0b", fontFamily: "Outfit, sans-serif" }}>{leader.dg > 0 ? `+${leader.dg}` : leader.dg}</div>
                          <div style={{ fontSize: 11, color: "#475569", fontWeight: 700 }}>DIF. GOL</div>
                        </div>
                      </div>
                    </div>
                  </InfoCard>
                );
              })()}
            </div>
          )}

        </main>
      </div>
    </>
  );
}

/* ── Sub-components ──────────────────────────────────────────── */

function TeamAvatar({ name, size = 36, style = {} }: { name: string; size?: number; style?: React.CSSProperties }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: teamColor(name),
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.42, fontWeight: 900, color: "white", flexShrink: 0,
      ...style
    }}>
      {name?.charAt(0).toUpperCase()}
    </div>
  );
}

function StatCard({ label, val, gradient, icon: Icon }: { label: string; val: number; gradient: string; icon: any }) {
  const [c1, c2] = gradient.replace("135deg,", "").split(",");
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: "1.1rem 1.25rem", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg,${c1},${c2})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={18} color="white" />
      </div>
      <div>
        <div style={{ fontSize: "1.5rem", fontWeight: 900, fontFamily: "Outfit, sans-serif", lineHeight: 1 }}>{val}</div>
        <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

function MatchCard({ partido }: { partido: Partido }) {
  const finished = partido.estado === "finalizado";
  const s = ESTADO_STYLE[partido.estado] || ESTADO_STYLE.programado;
  return (
    <div style={{ background: "#090f1e", border: "1px solid #1a2a45", borderRadius: 16, padding: "1.1rem 1.5rem", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "1rem" }}>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{partido.equipo_local}</div>
        <div style={{ color: "#334155", fontSize: 11, marginTop: 2 }}>Local</div>
      </div>

      <div style={{ textAlign: "center", minWidth: 110 }}>
        {finished ? (
          <div style={{ fontSize: "1.6rem", fontWeight: 900, letterSpacing: "0.04em", fontFamily: "Outfit, sans-serif" }}>
            {partido.goles_local ?? 0}
            <span style={{ color: "#1e293b", margin: "0 6px" }}>–</span>
            {partido.goles_visitante ?? 0}
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>{partido.fecha_hora ? fmtDate(partido.fecha_hora) : "Por confirmar"}</div>
            {partido.fecha_hora && <div style={{ color: "#10b981", fontSize: 13, marginTop: 2, fontWeight: 700 }}>{fmtTime(partido.fecha_hora)}</div>}
          </div>
        )}
        <div style={{ marginTop: 6, display: "inline-block", fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20, color: s.color, background: s.bg }}>
          {s.label}
        </div>
      </div>

      <div>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{partido.equipo_visitante}</div>
        <div style={{ color: "#334155", fontSize: 11, marginTop: 2 }}>Visitante</div>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem" }}>
      <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={18} color="#10b981" />
      </div>
      <h2 style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0, fontFamily: "Outfit, sans-serif" }}>{title}</h2>
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#334155" }}>
      <AlertCircle size={48} style={{ margin: "0 auto 1rem", opacity: 0.4, display: "block" }} />
      <p style={{ fontSize: 15, margin: 0 }}>{msg}</p>
    </div>
  );
}

function InfoCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div style={{ background: "#090f1e", border: "1px solid #1a2a45", borderRadius: 20, padding: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "1px solid #111827" }}>
        <Icon size={16} color="#10b981" />
        <h3 style={{ fontWeight: 800, fontSize: 14, margin: 0, fontFamily: "Outfit, sans-serif" }}>{title}</h3>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14 }}>
      <span style={{ color: "#475569" }}>{label}</span>
      <span style={{ fontWeight: 600, color: "#e2e8f0" }}>{value}</span>
    </div>
  );
}

function StatusBadge({ estado, small }: { estado: string; small?: boolean }) {
  const MAP: Record<string, [string, string]> = {
    en_curso:    ["#10b981", "rgba(16,185,129,0.12)"],
    finalizado:  ["#3b82f6", "rgba(59,130,246,0.12)"],
    abierto:     ["#f59e0b", "rgba(245,158,11,0.12)"],
    cancelado:   ["#ef4444", "rgba(239,68,68,0.12)"],
    inscripcion: ["#8b5cf6", "rgba(139,92,246,0.12)"],
    borrador:    ["#64748b", "rgba(100,116,139,0.12)"],
  };
  const [color, bg] = MAP[estado?.toLowerCase()] || ["#64748b", "rgba(100,116,139,0.12)"];
  return (
    <span style={{ background: bg, color, padding: small ? "2px 8px" : "3px 12px", borderRadius: 20, fontSize: small ? 10 : 12, fontWeight: 700 }}>
      {estado?.toUpperCase()}
    </span>
  );
}

function NavBtn({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ width: 34, height: 34, borderRadius: 9, border: "none", background: "transparent", color: disabled ? "#1e293b" : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", cursor: disabled ? "not-allowed" : "pointer", transition: "color .2s" }}>
      {children}
    </button>
  );
}

function Pill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#64748b", fontSize: 13 }}>
      {icon}{text}
    </span>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569" }}>
      <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />{label}
    </div>
  );
}

function Micro({ label, val }: { label: string; val: number }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 15, fontWeight: 900, color: "#e2e8f0" }}>{val ?? 0}</div>
      <div style={{ fontSize: 10, color: "#334155", fontWeight: 700 }}>{label}</div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#050a14" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: "3px solid #1e293b", borderTopColor: "#10b981", borderRadius: "50%", margin: "0 auto 1rem", animation: "spin 1s linear infinite" }} />
        <p style={{ color: "#475569" }}>Cargando torneo...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}

function ErrorScreen({ msg, onRetry }: { msg: string | null; onRetry: () => void }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#050a14" }}>
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <AlertCircle size={56} color="#ef4444" style={{ margin: "0 auto 1rem", display: "block" }} />
        <h2 style={{ color: "#f8fafc", marginBottom: 8, fontFamily: "Outfit, sans-serif" }}>Error al cargar</h2>
        <p style={{ color: "#475569", marginBottom: "1.5rem" }}>{msg || "Torneo no encontrado."}</p>
        <button onClick={onRetry} style={{ background: "linear-gradient(135deg,#10b981,#059669)", color: "white", border: "none", borderRadius: 12, padding: "10px 28px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
          Reintentar
        </button>
      </div>
    </div>
  );
}
