"use client"

import { Home, CalendarDays, ListOrdered, Users, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

export type TabKey = "inicio" | "partidos" | "tabla" | "equipos"

const tabs: { key: TabKey; label: string; icon: typeof Home }[] = [
  { key: "inicio", label: "Inicio", icon: Home },
  { key: "partidos", label: "Partidos", icon: CalendarDays },
  { key: "tabla", label: "Tabla", icon: ListOrdered },
  { key: "equipos", label: "Equipos", icon: Users },
]

export function BottomNav({
  active,
  onChange,
}: {
  active: TabKey
  onChange: (tab: TabKey) => void
}) {
  return (
    <nav className="relative border-t border-border bg-card px-2 pb-6 pt-2">
      <div className="flex items-center justify-around">
        {tabs.slice(0, 2).map((tab) => (
          <NavButton key={tab.key} tab={tab} active={active === tab.key} onClick={() => onChange(tab.key)} />
        ))}

        <div className="flex w-16 justify-center">
          <button
            type="button"
            aria-label="Crear torneo"
            className="-mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>

        {tabs.slice(2).map((tab) => (
          <NavButton key={tab.key} tab={tab} active={active === tab.key} onClick={() => onChange(tab.key)} />
        ))}
      </div>
    </nav>
  )
}

function NavButton({
  tab,
  active,
  onClick,
}: {
  tab: { key: TabKey; label: string; icon: typeof Home }
  active: boolean
  onClick: () => void
}) {
  const Icon = tab.icon
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex w-16 flex-col items-center gap-1 rounded-lg py-1 text-xs font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
      {tab.label}
    </button>
  )
}
