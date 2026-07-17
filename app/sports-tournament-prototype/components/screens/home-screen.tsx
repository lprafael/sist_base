"use client"

import { tournaments, matches } from "@/lib/data"
import { Trophy, Users, ChevronRight, Radio } from "lucide-react"
import { cn } from "@/lib/utils"

function TeamDot({ color, short }: { color: string; short: string }) {
  return (
    <div
      className="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold text-primary-foreground"
      style={{ backgroundColor: color }}
    >
      {short}
    </div>
  )
}

export function HomeScreen({ onSeeMatches }: { onSeeMatches: () => void }) {
  const liveMatches = matches.filter((m) => m.status === "live")
  const activeTournaments = tournaments.filter((t) => t.status === "En curso")

  return (
    <div className="flex flex-col gap-6 px-5 pb-4 pt-2">
      {/* En vivo */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
          </span>
          <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">En vivo</h2>
        </div>

        <div className="flex flex-col gap-3">
          {liveMatches.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={onSeeMatches}
              className="rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-transform active:scale-[0.99]"
            >
              <div className="mb-3 flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">{m.round}</span>
                <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 font-semibold text-destructive">
                  <Radio className="h-3 w-3" />
                  {m.minute}&apos;
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-1 items-center gap-2">
                  <TeamDot color={m.homeColor} short={m.homeShort} />
                  <span className="text-sm font-semibold text-foreground">{m.homeShort}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-2xl font-bold tabular-nums text-foreground">
                  <span>{m.homeScore}</span>
                  <span className="text-muted-foreground">-</span>
                  <span>{m.awayScore}</span>
                </div>
                <div className="flex flex-1 items-center justify-end gap-2">
                  <span className="text-sm font-semibold text-foreground">{m.awayShort}</span>
                  <TeamDot color={m.awayColor} short={m.awayShort} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Mis torneos */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">Torneos activos</h2>
          <button type="button" className="flex items-center text-xs font-semibold text-primary">
            Ver todos <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {activeTournaments.map((t) => (
            <div key={t.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `color-mix(in oklch, ${t.accent} 18%, transparent)` }}
                >
                  <Trophy className="h-5 w-5" style={{ color: t.accent }} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold text-foreground">{t.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {t.sport} · {t.format}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> {t.teams} equipos
                    </span>
                    <span>Inicio {t.startDate}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                  <span>Progreso</span>
                  <span>{t.progress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${t.progress}%`, backgroundColor: t.accent }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Otros torneos */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">Próximos y finalizados</h2>
        <div className="flex flex-col gap-2">
          {tournaments
            .filter((t) => t.status !== "En curso")
            .map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `color-mix(in oklch, ${t.accent} 18%, transparent)` }}
                >
                  <Trophy className="h-4 w-4" style={{ color: t.accent }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.sport}</p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    t.status === "Inscripción"
                      ? "bg-accent/20 text-accent-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {t.status}
                </span>
              </div>
            ))}
        </div>
      </section>
    </div>
  )
}
