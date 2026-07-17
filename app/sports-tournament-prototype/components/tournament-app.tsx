"use client"

import { useState } from "react"
import { Bell, Search, Trophy } from "lucide-react"
import { BottomNav, type TabKey } from "@/components/bottom-nav"
import { HomeScreen } from "@/components/screens/home-screen"
import { MatchesScreen } from "@/components/screens/matches-screen"
import { StandingsScreen } from "@/components/screens/standings-screen"
import { TeamsScreen } from "@/components/screens/teams-screen"

const titles: Record<TabKey, { title: string; subtitle: string }> = {
  inicio: { title: "TorneoPro", subtitle: "Hola, Organizador 👋" },
  partidos: { title: "Partidos", subtitle: "Liga Apertura 2026" },
  tabla: { title: "Tabla de posiciones", subtitle: "Liga Apertura 2026" },
  equipos: { title: "Equipos", subtitle: "Liga Apertura 2026" },
}

export function TournamentApp() {
  const [tab, setTab] = useState<TabKey>("inicio")
  const header = titles[tab]

  return (
    <>
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-5 pb-4 pt-8 sm:pt-9">
        <div className="flex items-center gap-2.5">
          {tab === "inicio" && (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Trophy className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold leading-tight text-foreground">{header.title}</h1>
            <p className="text-xs text-muted-foreground">{header.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Buscar"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Notificaciones"
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />
          </button>
        </div>
      </header>

      {/* Contenido con scroll */}
      <main className="flex-1 overflow-y-auto">
        {tab === "inicio" && <HomeScreen onSeeMatches={() => setTab("partidos")} />}
        {tab === "partidos" && <MatchesScreen />}
        {tab === "tabla" && <StandingsScreen />}
        {tab === "equipos" && <TeamsScreen />}
      </main>

      <BottomNav active={tab} onChange={setTab} />
    </>
  )
}
