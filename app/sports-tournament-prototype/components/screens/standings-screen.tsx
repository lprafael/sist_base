"use client"

import { standings } from "@/lib/data"
import { cn } from "@/lib/utils"

export function StandingsScreen() {
  return (
    <div className="flex flex-col gap-4 px-5 pb-4 pt-2">
      <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
        <p className="mb-2 px-1 text-xs font-medium text-muted-foreground">Liga Apertura 2026 · Jornada 11</p>

        {/* Encabezado */}
        <div className="flex items-center gap-2 border-b border-border px-1 pb-2 text-[11px] font-semibold uppercase text-muted-foreground">
          <span className="w-5 text-center">#</span>
          <span className="flex-1">Equipo</span>
          <span className="w-6 text-center">PJ</span>
          <span className="w-6 text-center">DG</span>
          <span className="w-7 text-center">Pts</span>
        </div>

        <ol className="flex flex-col">
          {standings.map((team, i) => {
            const pos = i + 1
            const diff = team.goalsFor - team.goalsAgainst
            const zone =
              pos <= 4 ? "bg-primary" : pos >= standings.length - 1 ? "bg-destructive" : "bg-transparent"
            return (
              <li
                key={team.id}
                className="flex items-center gap-2 border-b border-border/60 py-2.5 last:border-0"
              >
                <div className="flex w-5 items-center justify-center">
                  <span className={cn("h-6 w-1 rounded-full", zone)} />
                </div>
                <span className="w-4 text-center text-sm font-bold tabular-nums text-foreground">{pos}</span>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-primary-foreground"
                    style={{ backgroundColor: team.color }}
                  >
                    {team.short}
                  </div>
                  <span className="truncate text-sm font-medium text-foreground">{team.name}</span>
                </div>
                <span className="w-6 text-center text-sm tabular-nums text-muted-foreground">{team.played}</span>
                <span
                  className={cn(
                    "w-6 text-center text-sm font-medium tabular-nums",
                    diff > 0 ? "text-primary" : diff < 0 ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {diff > 0 ? `+${diff}` : diff}
                </span>
                <span className="w-7 text-center text-sm font-bold tabular-nums text-foreground">{team.points}</span>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="flex items-center gap-4 px-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-1 rounded-full bg-primary" /> Clasificación
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-1 rounded-full bg-destructive" /> Descenso
        </span>
      </div>
    </div>
  )
}
