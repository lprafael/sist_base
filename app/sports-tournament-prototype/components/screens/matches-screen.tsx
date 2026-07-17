"use client"

import { useState } from "react"
import { matches, type Match } from "@/lib/data"
import { MapPin, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

type Filter = "todos" | "live" | "upcoming" | "finished"

const filters: { key: Filter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "live", label: "En vivo" },
  { key: "upcoming", label: "Próximos" },
  { key: "finished", label: "Jugados" },
]

function TeamRow({ short, color, name, score, winner }: { short: string; color: string; name: string; score: number | null; winner: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-primary-foreground"
          style={{ backgroundColor: color }}
        >
          {short}
        </div>
        <span className={cn("truncate text-sm", winner ? "font-bold text-foreground" : "font-medium text-foreground")}>
          {name}
        </span>
      </div>
      {score !== null && (
        <span className={cn("font-mono text-lg tabular-nums", winner ? "font-bold text-foreground" : "text-muted-foreground")}>
          {score}
        </span>
      )}
    </div>
  )
}

function MatchCard({ m }: { m: Match }) {
  const homeWin = m.homeScore !== null && m.awayScore !== null && m.homeScore > m.awayScore
  const awayWin = m.homeScore !== null && m.awayScore !== null && m.awayScore > m.homeScore

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{m.round}</span>
        {m.status === "live" ? (
          <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive" /> {m.minute}&apos; EN VIVO
          </span>
        ) : m.status === "finished" ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">Final</span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
            <Clock className="h-3 w-3" /> {m.time}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <TeamRow short={m.homeShort} color={m.homeColor} name={m.home} score={m.homeScore} winner={homeWin} />
        <TeamRow short={m.awayShort} color={m.awayColor} name={m.away} score={m.awayScore} winner={awayWin} />
      </div>

      <div className="mt-3 flex items-center gap-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> {m.date} · {m.time}
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" /> {m.venue}
        </span>
      </div>
    </div>
  )
}

export function MatchesScreen() {
  const [filter, setFilter] = useState<Filter>("todos")
  const filtered = filter === "todos" ? matches : matches.filter((m) => m.status === filter)

  return (
    <div className="flex flex-col gap-4 px-5 pb-4 pt-2">
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map((m) => (
          <MatchCard key={m.id} m={m} />
        ))}
      </div>
    </div>
  )
}
