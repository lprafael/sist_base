"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";

/* ─── Types ─────────────────────────────────────────────────────── */
interface Partido {
  id: string;
  equipo_local?: string;
  equipo_visitante?: string;
  local_nombre?: string;
  visitante_nombre?: string;
  jugador_local_nombre?: string;
  jugador_visitante_nombre?: string;
  goles_local?: number;
  goles_visitante?: number;
  estado: string;
  jornada?: number | string;
  fase?: string;
  fecha_hora?: string;
  area?: number;
}
interface ResultadoHistorico {
  id: string;
  texto: string;
  tiempo: string;
  tipo: 'victoria' | 'empate' | 'descalificacion' | 'walkover';
}
interface TournamentData {
  id: string; nombre: string; deporte: string; estado: string;
}

/* ─── Helpers ─────────────────────────────────────────────────────── */
const AREA_COLORS = [
  { border: '#00ff88', glow: 'rgba(0,255,136,0.3)', accent: '#00ff88' },
  { border: '#ef4444', glow: 'rgba(239,68,68,0.3)',  accent: '#ef4444' },
  { border: '#3b82f6', glow: 'rgba(59,130,246,0.3)', accent: '#3b82f6' },
  { border: '#f59e0b', glow: 'rgba(245,158,11,0.3)', accent: '#f59e0b' },
  { border: '#8b5cf6', glow: 'rgba(139,92,246,0.3)', accent: '#8b5cf6' },
  { border: '#06b6d4', glow: 'rgba(6,182,212,0.3)',  accent: '#06b6d4' },
];

function initials(name: string) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function timeSince(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `Hace ${diff}s`;
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  return `Hace ${Math.floor(diff / 3600)}h`;
}

/* ─── Avatar ─────────────────────────────────────────────────────── */
function FighterAvatar({ name, foto, size = 52, color }: { name: string; foto?: string; size?: number; color: string }) {
  const [imgErr, setImgErr] = useState(false);
  if (foto && !imgErr) {
    return (
      <img
        src={foto}
        alt={name}
        onError={() => setImgErr(true)}
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover', border: `2px solid ${color}`,
          boxShadow: `0 0 12px ${color}55`, flexShrink: 0
        }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${color}33, ${color}11)`,
      border: `2px solid ${color}`, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: size * 0.34, fontWeight: 900,
      color, flexShrink: 0, boxShadow: `0 0 12px ${color}44`,
      letterSpacing: '-0.05em'
    }}>
      {initials(name)}
    </div>
  );
}

/* ─── Fighter Row ─────────────────────────────────────────────────── */
function FighterRow({
  name, foto, score, isWinner, isLive, accentColor, side
}: {
  name: string; foto?: string; score?: number; isWinner?: boolean;
  isLive?: boolean; accentColor: string; side: 'local' | 'visitante';
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: side === 'visitante' ? 'space-between' : 'space-between',
      gap: 12, padding: '10px 14px', borderRadius: 12,
      background: isWinner
        ? `linear-gradient(90deg, ${accentColor}18 0%, ${accentColor}08 100%)`
        : 'rgba(255,255,255,0.03)',
      border: `1px solid ${isWinner ? accentColor + '44' : 'rgba(255,255,255,0.06)'}`,
      boxShadow: isWinner ? `0 0 16px ${accentColor}22` : 'none',
      transition: 'all 0.4s ease',
      position: 'relative', overflow: 'hidden',
    }}>
      {isWinner && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          animation: 'shimmer 2s infinite',
        }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
        <FighterAvatar name={name} foto={foto} size={46} color={isWinner ? accentColor : '#475569'} />
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontWeight: 800, fontSize: 15, color: isWinner ? '#fff' : '#cbd5e1',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            letterSpacing: '0.01em'
          }}>{name || '—'}</div>
          {isWinner && (
            <div style={{ fontSize: 10, color: accentColor, fontWeight: 700, marginTop: 2, letterSpacing: '0.08em' }}>
              ★ GANADOR
            </div>
          )}
        </div>
      </div>
      <div style={{
        fontSize: 36, fontWeight: 900, color: isWinner ? accentColor : '#94a3b8',
        minWidth: 48, textAlign: 'right', lineHeight: 1,
        textShadow: isWinner ? `0 0 20px ${accentColor}88` : 'none',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {score ?? 0}
      </div>
    </div>
  );
}

/* ─── Match Card ─────────────────────────────────────────────────── */
function MatchCard({ partido, areaIndex }: { partido: Partido; areaIndex: number }) {
  const palette = AREA_COLORS[areaIndex % AREA_COLORS.length];
  const isLive = partido.estado === 'en_curso';
  const isFin  = partido.estado === 'finalizado';

  const localWins = (partido.goles_local ?? 0) > (partido.goles_visitante ?? 0);
  const visitWins = (partido.goles_visitante ?? 0) > (partido.goles_local ?? 0);

  return (
    <div style={{
      background: 'linear-gradient(145deg, rgba(15,15,25,0.95) 0%, rgba(20,20,35,0.9) 100%)',
      border: `1px solid ${palette.border}33`,
      borderRadius: 20, padding: '14px 16px',
      boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px ${palette.border}22`,
      display: 'flex', flexDirection: 'column', gap: 8, position: 'relative',
      backdropFilter: 'blur(12px)', overflow: 'hidden',
    }}>
      {/* Accent top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${palette.border}, ${palette.border}55)`,
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <div style={{
          fontSize: 10, fontWeight: 800, letterSpacing: '0.15em',
          color: palette.accent, textTransform: 'uppercase',
        }}>
          ÁREA {areaIndex + 1} · {partido.fase || `J${partido.jornada || 1}`}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px',
          borderRadius: 20, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
          background: isLive ? 'rgba(239,68,68,0.15)' : isFin ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)',
          color: isLive ? '#ef4444' : isFin ? '#10b981' : '#64748b',
          border: `1px solid ${isLive ? '#ef4444' : isFin ? '#10b981' : '#475569'}44`,
        }}>
          {isLive && <div style={{
            width: 6, height: 6, borderRadius: '50%', background: '#ef4444',
            animation: 'pulse-dot 1.2s infinite',
          }} />}
          {isLive ? 'EN VIVO' : isFin ? 'FINALIZADO' : 'PROG.'}
        </div>
      </div>

      {/* VS spacer */}
      <div style={{ position: 'relative' }}>
        <FighterRow
          name={partido.jugador_local_nombre || partido.local_nombre || partido.equipo_local || '?'}
          score={partido.goles_local}
          isWinner={isFin && localWins}
          isLive={isLive}
          accentColor={palette.accent}
          side="local"
        />
        <div style={{
          textAlign: 'center', fontSize: 10, fontWeight: 900, color: '#334155',
          letterSpacing: '0.2em', margin: '4px 0'
        }}>VS</div>
        <FighterRow
          name={partido.jugador_visitante_nombre || partido.visitante_nombre || partido.equipo_visitante || '?'}
          score={partido.goles_visitante}
          isWinner={isFin && visitWins}
          isLive={isLive}
          accentColor='#ef4444'
          side="visitante"
        />
      </div>
    </div>
  );
}

/* ─── Empty Card ─────────────────────────────────────────────────── */
function EmptyAreaCard({ areaIndex }: { areaIndex: number }) {
  const palette = AREA_COLORS[areaIndex % AREA_COLORS.length];
  return (
    <div style={{
      background: 'rgba(15,15,25,0.5)', border: `1px dashed ${palette.border}22`,
      borderRadius: 20, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 180,
      color: '#334155',
    }}>
      <div style={{ fontSize: 28 }}>🥋</div>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em' }}>ÁREA {areaIndex + 1}</div>
      <div style={{ fontSize: 11, color: '#1e293b' }}>Sin combate activo</div>
    </div>
  );
}

/* ─── Result Item ─────────────────────────────────────────────────── */
function ResultItem({ r, index }: { r: ResultadoHistorico; index: number }) {
  const colors: Record<string, string> = {
    victoria: '#10b981', empate: '#f59e0b',
    descalificacion: '#ef4444', walkover: '#8b5cf6',
  };
  const color = colors[r.tipo] || '#64748b';
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 12, marginBottom: 8,
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid rgba(255,255,255,0.06)`,
      borderLeft: `3px solid ${color}`,
      animation: index === 0 ? 'slideInRight 0.4s ease' : 'none',
      position: 'relative',
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 3, lineHeight: 1.4 }}>
        {r.texto}
      </div>
      <div style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>{r.tiempo}</div>
      <div style={{
        position: 'absolute', top: 10, right: 10, width: 8, height: 8,
        borderRadius: '50%', background: color, opacity: 0.8,
      }} />
    </div>
  );
}

/* ─── MAIN PAGE ─────────────────────────────────────────────────── */
export default function TVLivePage() {
  const params = useParams();
  const id = params?.id as string;

  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [historico, setHistorico] = useState<ResultadoHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const tickRef = useRef<NodeJS.Timeout | null>(null);

  /* Cargar datos reales */
  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [tRes, mRes] = await Promise.allSettled([
        fetch(`${API_URL}/cancha/torneos/${id}`),
        fetch(`${API_URL}/cancha/torneos/${id}/partidos`),
      ]);
      if (tRes.status === 'fulfilled' && tRes.value.ok)
        setTournament(await tRes.value.json());

      if (mRes.status === 'fulfilled' && mRes.value.ok) {
        const d = await mRes.value.json();
        const list: Partido[] = Array.isArray(d) ? d : d.partidos || [];
        setPartidos(list);

        const finalizados = list
          .filter(p => p.estado === 'finalizado')
          .sort((a, b) => (b.fecha_hora ?? '').localeCompare(a.fecha_hora ?? ''))
          .slice(0, 10)
          .map((p, i): ResultadoHistorico => {
            const lG = p.goles_local ?? 0, vG = p.goles_visitante ?? 0;
            const lN = p.jugador_local_nombre || p.local_nombre || p.equipo_local || '?';
            const vN = p.jugador_visitante_nombre || p.visitante_nombre || p.equipo_visitante || '?';
            const texto = lG === vG
              ? `Empate: ${lN} vs ${vN} (${lG}-${vN})`
              : lG > vG
              ? `${lN} vence a ${vN} (${lG}-${vG})`
              : `${vN} vence a ${lN} (${vG}-${lG})`;
            return {
              id: p.id, texto,
              tiempo: p.fecha_hora ? timeSince(p.fecha_hora) : 'Reciente',
              tipo: lG === vG ? 'empate' : 'victoria'
            };
          });
        setHistorico(finalizados);
      }
    } catch {/* silently handle */} finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
    // Polling cada 15s
    const poll = setInterval(loadData, 15_000);
    // Clock tick
    tickRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(poll);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [loadData]);

  /* Si no hay datos reales usamos mocks para la demo visual */
  const displayPartidos: Partido[] = partidos.length > 0 ? partidos : [
    { id: '1', equipo_local: 'J. Perez',   equipo_visitante: 'M. Gonzalez', goles_local: 4, goles_visitante: 2, estado: 'en_curso',   jornada: 1 },
    { id: '2', equipo_local: 'L. Gomez',   equipo_visitante: 'F. Rojas',    goles_local: 0, goles_visitante: 0, estado: 'en_curso',   jornada: 1 },
    { id: '3', equipo_local: 'C. Diaz',    equipo_visitante: 'R. Silva',    goles_local: 1, goles_visitante: 3, estado: 'finalizado', jornada: 1 },
    { id: '4', equipo_local: 'A. Ramirez', equipo_visitante: 'T. Morales',  goles_local: 2, goles_visitante: 2, estado: 'programado', jornada: 2 },
  ];

  const displayHistorico: ResultadoHistorico[] = historico.length > 0 ? historico : [
    { id: '1', texto: 'Área 1: J. Perez vence a L. Silva (5-2)',       tiempo: 'Hace 1 min',  tipo: 'victoria'      },
    { id: '2', texto: 'Área 2: M. Torres (Formas) - 27.5 pts',         tiempo: 'Hace 2 min',  tipo: 'victoria'      },
    { id: '3', texto: 'Área 3: R. Gomez vence por Descalificación',     tiempo: 'Hace 3 min',  tipo: 'descalificacion'},
    { id: '4', texto: 'Área 1: A. Ruiz vence por Hantei',               tiempo: 'Hace 4 min',  tipo: 'victoria'      },
    { id: '5', texto: 'Área 4: Empate técnico — decisión de jueces',    tiempo: 'Hace 7 min',  tipo: 'empate'        },
  ];

  const enCurso = displayPartidos.filter(p => p.estado === 'en_curso');
  const otros   = displayPartidos.filter(p => p.estado !== 'en_curso');
  // Mostrar primero en curso, luego otros, máximo 6 areas
  const displayAreas = [...enCurso, ...otros].slice(0, 6);

  const gridCols = displayAreas.length <= 2 ? '1fr 1fr' : displayAreas.length <= 4 ? '1fr 1fr' : '1fr 1fr 1fr';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Orbitron:wght@700;900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #060610; overflow: hidden; }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.7); }
        }
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(1);    opacity: 1; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
      `}</style>

      <div style={{
        height: '100vh', width: '100vw', overflow: 'hidden',
        background: 'radial-gradient(ellipse at 20% 50%, rgba(0,255,136,0.04) 0%, #060610 50%, rgba(239,68,68,0.04) 100%)',
        fontFamily: "'Inter', sans-serif",
        display: 'flex', flexDirection: 'column',
        color: '#e2e8f0',
      }}>

        {/* ── HEADER ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px',
          background: 'rgba(6,6,16,0.9)',
          borderBottom: '1px solid rgba(0,255,136,0.15)',
          backdropFilter: 'blur(20px)',
          flexShrink: 0,
          zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href={`/torneos/${id}/resumen`} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
              borderRadius: 12, background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8',
              textDecoration: 'none', fontSize: 13, fontWeight: 700,
              transition: 'all 0.2s', cursor: 'pointer',
            }}>
              ← Volver
            </Link>
            <div>
              <div style={{
                fontFamily: "'Orbitron', monospace", fontWeight: 900, fontSize: 20,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                background: 'linear-gradient(90deg, #00ff88, #10b981)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                Resultados en Vivo
              </div>
              <div style={{ fontSize: 12, color: '#475569', fontWeight: 600, marginTop: 2 }}>
                {tournament?.nombre || 'Cargando torneo...'}
              </div>
            </div>
          </div>

          {/* Clock + Live badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              fontFamily: "'Orbitron', monospace", fontSize: 22, fontWeight: 900,
              color: '#e2e8f0', letterSpacing: '0.08em',
              textShadow: '0 0 20px rgba(0,255,136,0.3)',
            }}>
              {now.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div style={{
                position: 'absolute', width: 36, height: 36, borderRadius: '50%',
                border: '2px solid #ef4444',
                animation: 'pulse-ring 1.5s ease-out infinite',
              }} />
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.08))',
                border: '1px solid rgba(239,68,68,0.5)',
                borderRadius: 20, padding: '8px 16px',
                fontSize: 13, fontWeight: 900, color: '#ef4444',
                letterSpacing: '0.12em',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse-dot 1s infinite' }} />
                LIVE
              </div>
            </div>
          </div>
        </div>

        {/* ── BODY ── */}
        <div style={{
          flex: 1, display: 'flex', gap: 0, overflow: 'hidden', minHeight: 0,
        }}>

          {/* ── LEFT: AREAS ── */}
          <div style={{ flex: 1, padding: '16px 12px 16px 16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {/* Stats bar */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexShrink: 0 }}>
              {[
                { label: 'EN VIVO', val: displayPartidos.filter(p => p.estado === 'en_curso').length,   color: '#ef4444' },
                { label: 'FINALIZADOS', val: displayPartidos.filter(p => p.estado === 'finalizado').length, color: '#10b981' },
                { label: 'PENDIENTES', val: displayPartidos.filter(p => p.estado === 'programado').length, color: '#64748b' },
                { label: 'TOTAL ÁREAS', val: displayAreas.length, color: '#00ff88' },
              ].map(s => (
                <div key={s.label} style={{
                  padding: '8px 16px', borderRadius: 10, fontSize: 11, fontWeight: 800,
                  background: 'rgba(255,255,255,0.03)', border: `1px solid ${s.color}33`,
                  display: 'flex', gap: 8, alignItems: 'center',
                }}>
                  <span style={{ color: s.color, fontSize: 16, fontWeight: 900 }}>{s.val}</span>
                  <span style={{ color: '#475569', letterSpacing: '0.08em' }}>{s.label}</span>
                </div>
              ))}
            </div>

            {/* Grid */}
            {loading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 14, color: '#475569', fontWeight: 700, letterSpacing: '0.1em' }}>CARGANDO...</div>
              </div>
            ) : (
              <div style={{
                flex: 1, display: 'grid',
                gridTemplateColumns: gridCols,
                gap: 12, overflow: 'hidden',
              }}>
                {displayAreas.map((p, i) => (
                  <MatchCard key={p.id} partido={p} areaIndex={i} />
                ))}
                {displayAreas.length === 0 && [0,1,2,3].map(i => <EmptyAreaCard key={i} areaIndex={i} />)}
              </div>
            )}
          </div>

          {/* ── RIGHT: HISTORICO ── */}
          <div style={{
            width: 300, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(6,6,16,0.7)', display: 'flex', flexDirection: 'column',
            backdropFilter: 'blur(10px)',
          }}>
            <div style={{
              padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14
                }}>🏆</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#e2e8f0', letterSpacing: '0.05em' }}>
                    Últimos Finalizados
                  </div>
                  <div style={{ fontSize: 10, color: '#475569', fontWeight: 600, marginTop: 1 }}>
                    Actualiza cada 15s
                  </div>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px' }}>
              {displayHistorico.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#334155', fontSize: 12, fontWeight: 700, marginTop: 32 }}>
                  Sin resultados aún
                </div>
              ) : (
                displayHistorico.map((r, i) => <ResultItem key={r.id} r={r} index={i} />)
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.05)',
              flexShrink: 0, textAlign: 'center',
            }}>
              <div style={{ fontSize: 10, color: '#1e293b', letterSpacing: '0.1em', fontWeight: 700 }}>
                MI CANCHA © {new Date().getFullYear()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
