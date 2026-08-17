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
  jugador_local_id?: string;
  jugador_visitante_id?: string;
  equipo_local_id?: string;
  equipo_visitante_id?: string;
  goles_local?: number;
  goles_visitante?: number;
  estado: string;
  jornada?: number | string;
  fase?: string;
  fecha_hora?: string;
  area?: number;
  estadisticas?: any;
}

interface ResultadoHistorico {
  id: string;
  texto: string;
  tiempo: string;
  tipo: 'victoria' | 'empate' | 'descalificacion' | 'walkover';
}

interface TournamentData {
  id: string;
  nombre: string;
  deporte: string;
  estado: string;
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

/* ─── Fighter Row (Combate WKF / ASAM) ────────────────────────────── */
function FighterRow({
  name, foto, score, faltas, salidas, stats, isWinner, isLive, accentColor, side
}: {
  name: string; foto?: string; score?: number; faltas?: number; salidas?: number; stats?: any; isWinner?: boolean;
  isLive?: boolean; accentColor: string; side: 'local' | 'visitante';
}) {
  const hasSenshu = stats?.senshu === true;
  const hasYuko = (stats?.yuko ?? 0) > 0;
  const hasWazaAri = (stats?.waza_ari ?? 0) > 0;
  const hasIppon = (stats?.ippon ?? 0) > 0;
  const isWkf = stats?.yuko !== undefined || stats?.waza_ari !== undefined || stats?.ippon !== undefined || stats?.tipo_reglamento === 'WKF';

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              fontWeight: 800, fontSize: 15, color: isWinner ? '#fff' : '#cbd5e1',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              letterSpacing: '0.01em'
            }}>{name || '—'}</div>
            {hasSenshu && (
              <span style={{
                fontSize: 9, fontWeight: 900, background: 'rgba(251,191,36,0.2)',
                color: '#fbbf24', border: '1px solid rgba(251,191,36,0.5)',
                borderRadius: 6, padding: '1px 5px', textTransform: 'uppercase'
              }}>
                SENSHU
              </span>
            )}
          </div>
          {isWinner && (
            <div style={{ fontSize: 10, color: accentColor, fontWeight: 700, marginTop: 2, letterSpacing: '0.08em' }}>
              ★ GANADOR
            </div>
          )}
          {isWkf ? (
            <div style={{ display: 'flex', gap: 6, marginTop: 4, fontSize: 10, fontWeight: 700 }}>
              {hasYuko && <span style={{ color: '#ef4444' }}>Y:{stats.yuko}</span>}
              {hasWazaAri && <span style={{ color: '#f59e0b' }}>W:{stats.waza_ari}</span>}
              {hasIppon && <span style={{ color: '#10b981' }}>I:{stats.ippon}</span>}
              {(stats?.jogai ?? 0) > 0 && <span style={{ color: '#94a3b8' }}>Jogai:{stats.jogai}</span>}
              {(stats?.penalizaciones ?? 0) > 0 && <span style={{ color: '#f43f5e' }}>Pen:{stats.penalizaciones}</span>}
            </div>
          ) : (
            ((faltas ?? 0) > 0 || (salidas ?? 0) > 0) && (
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                {(faltas ?? 0) > 0 && <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 700 }}>Faltas: {faltas}</span>}
                {(salidas ?? 0) > 0 && <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>Salidas: {salidas}</span>}
              </div>
            )
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

/* ─── Match Card (Combate 1v1) ────────────────────────────────────── */
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
      backdropFilter: 'blur(12px)', overflow: 'hidden', height: '100%',
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
          {partido.cancha_nombre ? `${partido.cancha_nombre} · ` : `ÁREA ${partido.area || areaIndex + 1} · `}{partido.fase || (partido.jornada ? `JORNADA ${partido.jornada}` : 'MATCH')}
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

      {/* VS body */}
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <FighterRow
          name={partido.jugador_local_nombre || partido.local_nombre || partido.equipo_local || '?'}
          score={partido.goles_local}
          faltas={partido.estadisticas?.local?.faltas}
          salidas={partido.estadisticas?.local?.salidas}
          stats={partido.estadisticas?.local}
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
          faltas={partido.estadisticas?.visitante?.faltas}
          salidas={partido.estadisticas?.visitante?.salidas}
          stats={partido.estadisticas?.visitante}
          isWinner={isFin && visitWins}
          isLive={isLive}
          accentColor='#ef4444'
          side="visitante"
        />
      </div>
    </div>
  );
}

/* ─── Formas Athlete Interface & Calculations ───────────────────── */
interface FormasAthlete {
  id: string;
  nombre: string;
  puntaje_final: number;
  jueces: number[];
  max_descartado: number;
  min_descartado: number;
  f1: number;
  f2: number;
  f3: number;
  f4: number;
  criterio_desempate: string;
  estado: string;
}

function computeFormasStandings(matches: Partido[]): FormasAthlete[] {
  const athletes: FormasAthlete[] = [];

  matches.forEach(m => {
    let stats: any = {};
    try {
      stats = typeof m.estadisticas === 'string' ? JSON.parse(m.estadisticas) : (m.estadisticas || {});
    } catch (e) {}

    const puntajeFinal = Number(stats.puntaje_final ?? m.goles_local ?? 0);
    const jueces: number[] = Array.isArray(stats.jueces) ? stats.jueces : [];
    const maxDescartado = Number(stats.puntaje_descartado_alto ?? (jueces.length > 0 ? Math.max(...jueces) : 0));
    const minDescartado = Number(stats.puntaje_descartado_bajo ?? (jueces.length > 0 ? Math.min(...jueces) : 0));
    const f1 = Number(stats.filtro1_min_no_descartado ?? 0);
    const f2 = Number(stats.filtro2_max_no_descartado ?? 0);
    const f3 = Number(stats.filtro3_min_descartado ?? minDescartado);
    const f4 = Number(stats.filtro4_max_descartado ?? maxDescartado);
    const nombre = m.jugador_local_nombre || m.local_nombre || m.equipo_local || 'Competidor';

    athletes.push({
      id: m.id,
      nombre,
      puntaje_final: puntajeFinal,
      jueces,
      max_descartado: maxDescartado,
      min_descartado: minDescartado,
      f1,
      f2,
      f3,
      f4,
      criterio_desempate: 'Puntaje Directo',
      estado: m.estado,
    });
  });

  // Algoritmo de 5 pasos en cascada ASAM
  athletes.sort((a, b) => {
    // Si uno no está finalizado, ponerlo al final
    if (a.estado === 'finalizado' && b.estado !== 'finalizado') return -1;
    if (a.estado !== 'finalizado' && b.estado === 'finalizado') return 1;

    // Paso 0: Puntaje total
    if (a.puntaje_final !== b.puntaje_final) {
      return b.puntaje_final - a.puntaje_final;
    }
    // Paso 1: Filtro 1 (Menor no eliminado)
    if (a.f1 !== b.f1) {
      a.criterio_desempate = `Filtro 1: Menor Válido (${a.f1} vs ${b.f1})`;
      b.criterio_desempate = `Filtro 1: Menor Válido (${a.f1} vs ${b.f1})`;
      return b.f1 - a.f1;
    }
    // Paso 2: Filtro 2 (Mayor no eliminado)
    if (a.f2 !== b.f2) {
      a.criterio_desempate = `Filtro 2: Mayor Válido (${a.f2} vs ${b.f2})`;
      b.criterio_desempate = `Filtro 2: Mayor Válido (${a.f2} vs ${b.f2})`;
      return b.f2 - a.f2;
    }
    // Paso 3: Filtro 3 (Menor descartado)
    if (a.f3 !== b.f3) {
      a.criterio_desempate = `Filtro 3: Mín Descartado (${a.f3} vs ${b.f3})`;
      b.criterio_desempate = `Filtro 3: Mín Descartado (${a.f3} vs ${b.f3})`;
      return b.f3 - a.f3;
    }
    // Paso 4: Filtro 4 (Mayor descartado)
    if (a.f4 !== b.f4) {
      a.criterio_desempate = `Filtro 4: Máx Descartado (${a.f4} vs ${b.f4})`;
      b.criterio_desempate = `Filtro 4: Máx Descartado (${a.f4} vs ${b.f4})`;
      return b.f4 - a.f4;
    }
    // Paso 5: Empate absoluto
    if (a.puntaje_final > 0) {
      a.criterio_desempate = `Empate Absoluto (Segunda forma)`;
      b.criterio_desempate = `Empate Absoluto (Segunda forma)`;
    }
    return 0;
  });

  return athletes;
}

function isFormasFase(faseStr: string, p?: Partido): boolean {
  const fLower = (faseStr || '').toLowerCase();
  return (
    fLower.includes('forma') ||
    fLower.includes('kata') ||
    fLower.includes('poomsae') ||
    fLower.includes('figura') ||
    Boolean(p && !p.jugador_visitante_id && !p.equipo_visitante_id && !p.jugador_visitante_nombre && !p.visitante_nombre && fLower.length > 0)
  );
}

/* ─── Formas Podium Card (Clasificación Oficial ASAM) ─────────────── */
function FormasPodiumCard({
  fase, division, partidos, areaIndex
}: {
  fase: string; division: string; partidos: Partido[]; areaIndex: number;
}) {
  const palette = AREA_COLORS[areaIndex % AREA_COLORS.length];
  const standings = computeFormasStandings(partidos);

  const hasLive = partidos.some(p => p.estado === 'en_curso');
  const allFin = partidos.length > 0 && partidos.every(p => p.estado === 'finalizado');
  const someFin = partidos.some(p => p.estado === 'finalizado');

  const medallas = ['🥇', '🥈', '🥉'];

  return (
    <div style={{
      background: 'linear-gradient(145deg, rgba(15,15,28,0.96) 0%, rgba(22,20,38,0.92) 100%)',
      border: `1px solid ${palette.border}44`,
      borderRadius: 20, padding: '14px 16px',
      boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${palette.border}22`,
      display: 'flex', flexDirection: 'column', gap: 8, position: 'relative',
      backdropFilter: 'blur(12px)', overflow: 'hidden', height: '100%',
    }}>
      {/* Accent top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, #f59e0b, ${palette.border})`,
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 10, fontWeight: 900, letterSpacing: '0.15em',
              color: '#f59e0b', textTransform: 'uppercase',
            }}>
              ÁREA {areaIndex + 1} · FORMAS
            </span>
            <span style={{
              fontSize: 9, fontWeight: 900, letterSpacing: '0.08em',
              color: '#fbbf24', background: 'rgba(245,158,11,0.18)',
              border: '1px solid rgba(245,158,11,0.4)', borderRadius: 12,
              padding: '1px 7px', textTransform: 'uppercase',
            }}>
              MODALIDAD FORMAS (ASAM)
            </span>
          </div>
          <div style={{
            fontSize: 13, fontWeight: 800, color: '#f8fafc',
            letterSpacing: '0.02em', marginTop: 2, textTransform: 'uppercase',
          }}>
            DIVISIÓN: {division || fase}
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px',
          borderRadius: 20, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
          background: hasLive ? 'rgba(239,68,68,0.15)' : allFin ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.12)',
          color: hasLive ? '#ef4444' : allFin ? '#10b981' : '#f59e0b',
          border: `1px solid ${hasLive ? '#ef4444' : allFin ? '#10b981' : '#f59e0b'}44`,
        }}>
          {hasLive && <div style={{
            width: 6, height: 6, borderRadius: '50%', background: '#ef4444',
            animation: 'pulse-dot 1.2s infinite',
          }} />}
          {hasLive ? 'EN VIVO' : allFin ? 'FINALIZADO' : someFin ? 'EN PROCESO' : 'PROG.'}
        </div>
      </div>

      {/* Tabla Clasificatoria / Podio Oficial */}
      <div style={{
        flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column',
        gap: 6, paddingRight: 2,
      }}>
        {standings.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#475569', fontSize: 12, fontWeight: 700, margin: 'auto' }}>
            Aún no hay calificaciones de formas registradas
          </div>
        ) : (
          standings.map((atleta, idx) => {
            const isPodium = idx < 3;
            const isFirst = idx === 0 && atleta.puntaje_final > 0;
            const rowBorderColor = isFirst ? '#f59e0b55' : isPodium ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)';
            const rowBg = isFirst 
              ? 'linear-gradient(90deg, rgba(245,158,11,0.18) 0%, rgba(245,158,11,0.04) 100%)'
              : 'rgba(255,255,255,0.03)';

            return (
              <div
                key={atleta.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 10px', borderRadius: 10,
                  background: rowBg,
                  border: `1px solid ${rowBorderColor}`,
                  gap: 8,
                  transition: 'all 0.3s ease',
                }}
              >
                {/* Posición + Avatar + Nombre */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: idx < 3 ? 16 : 11, fontWeight: 900,
                    color: idx < 3 ? '#fff' : '#64748b',
                    width: 22, textAlign: 'center', flexShrink: 0,
                    lineHeight: 1,
                  }}>
                    {idx < 3 ? medallas[idx] : `#${idx + 1}`}
                  </div>

                  <FighterAvatar
                    name={atleta.nombre}
                    size={30}
                    color={isFirst ? '#f59e0b' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#d97706' : '#475569'}
                  />

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontWeight: 800, fontSize: 12, color: isFirst ? '#fff' : '#e2e8f0',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {atleta.nombre}
                    </div>
                    <div style={{
                      fontSize: 9, color: isFirst ? '#fbbf24' : '#64748b',
                      fontWeight: 600, marginTop: 1,
                    }}>
                      {atleta.criterio_desempate}
                    </div>
                  </div>
                </div>

                {/* Notas de Jueces (Desglose ASAM con descartes tachados) */}
                {atleta.jueces.length > 0 && (
                  <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexShrink: 0 }}>
                    {atleta.jueces.map((nota, jIdx) => {
                      const isHigh = nota === atleta.max_descartado;
                      const isLow = nota === atleta.min_descartado;
                      const isDiscarded = isHigh || isLow;

                      return (
                        <span
                          key={jIdx}
                          style={{
                            fontSize: 9, fontWeight: 800,
                            padding: '1.5px 4px', borderRadius: 5,
                            background: isDiscarded ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)',
                            color: isDiscarded ? '#ef4444' : '#cbd5e1',
                            textDecoration: isDiscarded ? 'line-through' : 'none',
                            border: `1px solid ${isDiscarded ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.08)'}`,
                          }}
                          title={isDiscarded ? (isHigh ? 'Máx Descartado' : 'Mín Descartado') : 'Nota Válida'}
                        >
                          {nota.toFixed(1)}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Total Final */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
                  minWidth: 50, flexShrink: 0,
                }}>
                  <div style={{
                    fontSize: 18, fontWeight: 900,
                    fontFamily: "'Orbitron', monospace",
                    color: isFirst ? '#fbbf24' : atleta.puntaje_final > 0 ? '#f59e0b' : '#64748b',
                    textShadow: isFirst ? '0 0 12px rgba(245,158,11,0.5)' : 'none',
                    lineHeight: 1,
                  }}>
                    {atleta.puntaje_final > 0 ? atleta.puntaje_final.toFixed(2) : '--'}
                  </div>
                  <span style={{ fontSize: 8, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginTop: 1 }}>
                    PTS
                  </span>
                </div>
              </div>
            );
          })
        )}
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

/* ─── Type for Grid Areas ────────────────────────────────────────── */
type DisplayAreaItem = 
  | { type: 'combate'; partido: Partido; id: string; estado: string; fecha_hora?: string }
  | { type: 'formas'; fase: string; division: string; partidos: Partido[]; id: string; estado: string; fecha_hora?: string };

/* ─── MAIN PAGE ─────────────────────────────────────────────────── */
export default function TVLivePage() {
  const params = useParams();
  const id = params?.id as string;

  const [mounted, setMounted] = useState(false);
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [historico, setHistorico] = useState<ResultadoHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const tickRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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
            const isF = isFormasFase(p.fase || '', p);
            if (isF) {
              const atleta = p.jugador_local_nombre || p.local_nombre || p.equipo_local || 'Atleta';
              let stats: any = {};
              try { stats = typeof p.estadisticas === 'string' ? JSON.parse(p.estadisticas) : (p.estadisticas || {}); } catch(e) {}
              const scoreVal = Number(stats.puntaje_final ?? p.goles_local ?? 0);
              return {
                id: p.id,
                texto: `${atleta} (Formas) — ${scoreVal.toFixed(2)} pts`,
                tiempo: p.fecha_hora ? timeSince(p.fecha_hora) : 'Reciente',
                tipo: 'victoria'
              };
            }

            const lG = p.goles_local ?? 0, vG = p.goles_visitante ?? 0;
            const lN = p.jugador_local_nombre || p.local_nombre || p.equipo_local || '?';
            const vN = p.jugador_visitante_nombre || p.visitante_nombre || p.equipo_visitante || '?';
            const texto = lG === vG
              ? `Empate: ${lN} vs ${vN} (${lG}-${vG})`
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

  const isDemo = id === "demo" || id === "ficticio";

  /* Si no hay datos reales usamos mocks ÚNICAMENTE si la ruta es demo */
  const displayPartidos: Partido[] = isDemo && partidos.length === 0 ? [
    { id: '1', jugador_local_nombre: 'J. Perez', jugador_visitante_nombre: 'M. Gonzalez', goles_local: 4, goles_visitante: 2, estado: 'en_curso', fase: 'Combate Adultos' },
    { id: '2', jugador_local_nombre: 'Emma Valdez', goles_local: 8.3, estado: 'finalizado', fase: '2018-2019(Femenino) Formas - 1º Fase', estadisticas: { jueces: [8.3, 8.5, 8.0], puntaje_final: 8.3, puntaje_descartado_alto: 8.5, puntaje_descartado_bajo: 8.0 } as any },
    { id: '3', jugador_local_nombre: 'Arami Alderete', goles_local: 8.2, estado: 'finalizado', fase: '2018-2019(Femenino) Formas - 1º Fase', estadisticas: { jueces: [8.2, 8.3, 8.1], puntaje_final: 8.2, puntaje_descartado_alto: 8.3, puntaje_descartado_bajo: 8.1 } as any },
    { id: '4', jugador_local_nombre: 'Hatner Sotelo', goles_local: 8.1, estado: 'finalizado', fase: '2018-2019(Femenino) Formas - 1º Fase', estadisticas: { jueces: [8.1, 8.1, 8.1], puntaje_final: 8.1, puntaje_descartado_alto: 8.1, puntaje_descartado_bajo: 8.1 } as any },
    { id: '5', jugador_local_nombre: 'L. Gomez', jugador_visitante_nombre: 'F. Rojas', goles_local: 0, goles_visitante: 0, estado: 'en_curso', fase: 'Combate Juvenil' },
  ] : partidos;

  const displayHistorico: ResultadoHistorico[] = isDemo && historico.length === 0 ? [
    { id: '1', texto: 'Área 1: J. Perez vence a L. Silva (5-2)',       tiempo: 'Hace 1 min',  tipo: 'victoria'      },
    { id: '2', texto: 'Emma Valdez (Formas) — 8.30 pts',               tiempo: 'Hace 2 min',  tipo: 'victoria'      },
    { id: '3', texto: 'Área 3: R. Gomez vence por Descalificación',     tiempo: 'Hace 3 min',  tipo: 'descalificacion'},
    { id: '4', texto: 'Área 1: A. Ruiz vence por Hantei',               tiempo: 'Hace 4 min',  tipo: 'victoria'      },
    { id: '5', texto: 'Área 4: Empate técnico — decisión de jueces',    tiempo: 'Hace 7 min',  tipo: 'empate'        },
  ] : historico;

  type GridMode = '1x1' | '1x2' | '2x2' | '2x3';
  const [gridMode, setGridMode] = useState<GridMode>('2x2');
  const [rotationInterval, setRotationInterval] = useState<number>(8); // segundos, 0 = Pausa
  const [currentPage, setCurrentPage] = useState(0);

  // Filtros Checkbox
  const [filterEnVivo, setFilterEnVivo] = useState<boolean>(true);
  const [filterProgramados, setFilterProgramados] = useState<boolean>(true);
  const [filterFinalizados, setFilterFinalizados] = useState<boolean>(true);
  const [filterSoloHoy, setFilterSoloHoy] = useState<boolean>(false);

  const isToday = (dateStr?: string) => {
    if (!dateStr) return true;
    const d = new Date(dateStr);
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  };

  const filteredPartidos = displayPartidos.filter(p => {
    if (filterSoloHoy && p.fecha_hora && !isToday(p.fecha_hora)) return false;
    if (p.estado === 'en_curso') return filterEnVivo;
    if (p.estado === 'programado') return filterProgramados;
    if (p.estado === 'finalizado') return filterFinalizados;
    return true;
  });

  // Agrupación inteligente: Combate se muestra 1 a 1, Formas se agrupa por Fase/División
  const items: DisplayAreaItem[] = [];
  const formasByFase: Record<string, { division: string; partidos: Partido[] }> = {};

  filteredPartidos.forEach(p => {
    const fase = p.fase || 'Fase 1';
    if (isFormasFase(fase, p)) {
      let div = fase;
      if (fase.includes(' - ')) {
        const leftPart = fase.split(' - ')[0];
        const words = leftPart.split(' ');
        if (words.length > 1) {
          div = words[0];
        }
      }
      if (!formasByFase[fase]) {
        formasByFase[fase] = { division: div, partidos: [] };
      }
      formasByFase[fase].partidos.push(p);
    } else {
      items.push({
        type: 'combate',
        partido: p,
        id: p.id,
        estado: p.estado,
        fecha_hora: p.fecha_hora,
      });
    }
  });

  // Agregar los grupos de Formas
  Object.keys(formasByFase).forEach(faseKey => {
    const group = formasByFase[faseKey];
    const hasLive = group.partidos.some(p => p.estado === 'en_curso');
    const allFin = group.partidos.length > 0 && group.partidos.every(p => p.estado === 'finalizado');
    const estado = hasLive ? 'en_curso' : (allFin ? 'finalizado' : 'programado');

    items.push({
      type: 'formas',
      fase: faseKey,
      division: group.division,
      partidos: group.partidos,
      id: `formas-${faseKey}`,
      estado,
      fecha_hora: group.partidos[0]?.fecha_hora,
    });
  });

  const enCurso = items.filter(it => it.estado === 'en_curso');
  const otros   = items.filter(it => it.estado !== 'en_curso');
  const allAreas = [...enCurso, ...otros];

  const pageSizeMap: Record<GridMode, number> = {
    '1x1': 1,
    '1x2': 2,
    '2x2': 4,
    '2x3': 6,
  };

  const gridStyleMap: Record<GridMode, { cols: string; rows: string }> = {
    '1x1': { cols: '1fr', rows: '1fr' },
    '1x2': { cols: '1fr 1fr', rows: '1fr' },
    '2x2': { cols: '1fr 1fr', rows: '1fr 1fr' },
    '2x3': { cols: '1fr 1fr 1fr', rows: '1fr 1fr' },
  };

  const PAGE_SIZE = pageSizeMap[gridMode];
  const totalPages = Math.max(1, Math.ceil(allAreas.length / PAGE_SIZE));

  // Reset page if gridMode or filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [gridMode, filterEnVivo, filterProgramados, filterFinalizados, filterSoloHoy]);

  // Auto rotación según el intervalo configurado (si rotationInterval > 0 y totalPages > 1)
  useEffect(() => {
    if (rotationInterval === 0 || totalPages <= 1) {
      return;
    }
    const timer = setInterval(() => {
      setCurrentPage(prev => (prev + 1) % totalPages);
    }, rotationInterval * 1000);
    return () => clearInterval(timer);
  }, [totalPages, rotationInterval]);

  const startIndex = currentPage * PAGE_SIZE;
  const visibleItems = allAreas.slice(startIndex, startIndex + PAGE_SIZE);
  const emptyCount = Math.max(0, PAGE_SIZE - visibleItems.length);

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
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
              <img 
                src="/images/banner_micancha.jpg" 
                alt="Mi Cancha" 
                style={{ height: '45px', objectFit: 'contain', borderRadius: '6px' }} 
              />
            </div>
          </div>

          {/* Controls + Clock + Live badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Controles de Configuración de Grilla y Tiempo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.03)', padding: '6px 14px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
              
              {/* Selector de Grilla */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>GRILLA:</span>
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', padding: 3, borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                  {(['1x1', '1x2', '2x2', '2x3'] as GridMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setGridMode(mode)}
                      style={{
                        background: gridMode === mode ? 'linear-gradient(135deg, #00ff88, #10b981)' : 'transparent',
                        color: gridMode === mode ? '#060610' : '#94a3b8',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: 7,
                        fontWeight: 900,
                        fontSize: 11,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Separador */}
              <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />

              {/* Selector de Segundos de Rotación */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ROTACIÓN:</span>
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', padding: 3, borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                  {[
                    { label: '5s', val: 5 },
                    { label: '8s', val: 8 },
                    { label: '10s', val: 10 },
                    { label: '15s', val: 15 },
                    { label: '⏸️', val: 0 }
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => setRotationInterval(opt.val)}
                      style={{
                        background: rotationInterval === opt.val ? '#3b82f6' : 'transparent',
                        color: rotationInterval === opt.val ? '#ffffff' : '#94a3b8',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: 7,
                        fontWeight: 900,
                        fontSize: 11,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      title={opt.val === 0 ? 'Pausar rotación' : `Rotar cada ${opt.val} segundos`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{
              fontFamily: "'Orbitron', monospace", fontSize: 22, fontWeight: 900,
              color: '#e2e8f0', letterSpacing: '0.08em',
              textShadow: '0 0 20px rgba(0,255,136,0.3)',
            }}>
              {mounted ? now.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
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

            {/* Stats bar + Checkboxes Filter + Carousel indicator */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexShrink: 0 }}>
              
              {/* Checkboxes de Filtros */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 800, color: filterEnVivo ? '#ef4444' : '#64748b', userSelect: 'none' }}>
                  <input 
                    type="checkbox" 
                    checked={filterEnVivo} 
                    onChange={e => setFilterEnVivo(e.target.checked)}
                    style={{ accentColor: '#ef4444', width: 15, height: 15, cursor: 'pointer' }}
                  />
                  <span>En Vivo</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 800, color: filterProgramados ? '#38bdf8' : '#64748b', userSelect: 'none' }}>
                  <input 
                    type="checkbox" 
                    checked={filterProgramados} 
                    onChange={e => setFilterProgramados(e.target.checked)}
                    style={{ accentColor: '#38bdf8', width: 15, height: 15, cursor: 'pointer' }}
                  />
                  <span>Programados</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 800, color: filterFinalizados ? '#10b981' : '#64748b', userSelect: 'none' }}>
                  <input 
                    type="checkbox" 
                    checked={filterFinalizados} 
                    onChange={e => setFilterFinalizados(e.target.checked)}
                    style={{ accentColor: '#10b981', width: 15, height: 15, cursor: 'pointer' }}
                  />
                  <span>Finalizados</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 800, color: filterSoloHoy ? '#f59e0b' : '#64748b', userSelect: 'none' }}>
                  <input 
                    type="checkbox" 
                    checked={filterSoloHoy} 
                    onChange={e => setFilterSoloHoy(e.target.checked)}
                    style={{ accentColor: '#f59e0b', width: 15, height: 15, cursor: 'pointer' }}
                  />
                  <span>Solo de hoy</span>
                </label>
              </div>

              {/* Indicador de Carrusel si hay múltiples páginas */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px',
                  borderRadius: 12, background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.25)',
                  fontSize: 11, fontWeight: 800, color: '#00ff88', letterSpacing: '0.08em'
                }}>
                  <span>PÁGINA {currentPage + 1} / {totalPages}</span>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    {Array.from({ length: totalPages }).map((_, idx) => (
                      <div
                        key={idx}
                        onClick={() => setCurrentPage(idx)}
                        style={{
                          width: idx === currentPage ? 14 : 6,
                          height: 6,
                          borderRadius: 3,
                          background: idx === currentPage ? '#00ff88' : '#334155',
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Grid Configurable Dinámico */}
            {loading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 14, color: '#475569', fontWeight: 700, letterSpacing: '0.1em' }}>CARGANDO...</div>
              </div>
            ) : allAreas.length === 0 ? (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', textAlign: 'center', padding: '2.5rem',
                background: 'rgba(15,15,25,0.4)', borderRadius: 20,
                border: '1px dashed rgba(255,255,255,0.1)', margin: 'auto 0',
              }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>🏆</div>
                <div style={{
                  fontSize: 18, fontWeight: 900, fontFamily: "'Orbitron', monospace",
                  color: '#00ff88', letterSpacing: '0.06em', textTransform: 'uppercase'
                }}>
                  {tournament?.nombre || 'Torneo'}
                </div>
                <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 8, maxWidth: 460, lineHeight: 1.6 }}>
                  {displayPartidos.length === 0 
                    ? `Este torneo no tiene partidos ni combates registrados todavía.`
                    : `No hay encuentros que coincidan con los filtros seleccionados.`}
                </div>
                <Link href={`/torneos/${id}/resumen`} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 18,
                  padding: '10px 20px', borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,255,136,0.05))',
                  border: '1px solid rgba(0,255,136,0.35)',
                  color: '#00ff88', textDecoration: 'none', fontSize: 13, fontWeight: 800
                }}>
                  ← Volver al Resumen del Torneo
                </Link>
              </div>
            ) : (
              <div style={{
                flex: 1, display: 'grid',
                gridTemplateColumns: gridStyleMap[gridMode].cols,
                gridTemplateRows: gridStyleMap[gridMode].rows,
                gap: 12, overflow: 'hidden',
              }}>
                {visibleItems.map((item, i) => {
                  if (item.type === 'formas') {
                    return (
                      <FormasPodiumCard
                        key={item.id}
                        fase={item.fase}
                        division={item.division}
                        partidos={item.partidos}
                        areaIndex={startIndex + i}
                      />
                    );
                  }
                  return (
                    <MatchCard
                      key={item.id}
                      partido={item.partido}
                      areaIndex={startIndex + i}
                    />
                  );
                })}
                {Array.from({ length: emptyCount }).map((_, i) => (
                  <EmptyAreaCard key={`empty-${i}`} areaIndex={startIndex + visibleItems.length + i} />
                ))}
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
                <div style={{ textAlign: 'center', color: '#475569', fontSize: 12, fontWeight: 700, marginTop: 32, padding: '0 12px', lineHeight: 1.5 }}>
                  Sin resultados finalizados aún en este torneo
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
