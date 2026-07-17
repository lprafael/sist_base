"use client"

import { teams } from "@/lib/data"
import { User, ChevronRight } from "lucide-react"

export function TeamsScreen() {
  return (
    <div className="flex flex-col gap-4 px-5 pb-4 pt-2">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
        <div>
          <p className="text-2xl font-bold text-foreground">{teams.length}</p>
          <p className="text-xs text-muted-foreground">Equipos inscritos</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">
            {teams.reduce((acc, t) => acc + t.players, 0)}
          </p>
          <p className="text-xs text-muted-foreground">Jugadores</p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {teams.map((team) => (
          <button
            key={team.id}
            type="button"
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left shadow-sm transition-transform active:scale-[0.99]"
          >
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-primary-foreground"
              style={{ backgroundColor: team.color }}
            >
              {team.short}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{team.name}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> {team.players} jugadores
                </span>
                <span>DT: {team.coach}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                {team.group}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
